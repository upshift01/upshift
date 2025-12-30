import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchCurrentUser = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setUser(response.data);
    } catch (error) {
      console.error('Error fetching user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const register = async (email, password, fullName, phone, resellerId = null) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/register`, {
        email,
        password,
        full_name: fullName,
        phone,
        reseller_id: resellerId
      });
      const { access_token, user: userData } = response.data;
      localStorage.setItem('token', access_token);
      setToken(access_token);
      setUser(userData);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Registration failed'
      };
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        email,
        password
      });
      const { access_token, user: userData } = response.data;
      localStorage.setItem('token', access_token);
      setToken(access_token);
      setUser(userData);
      return { success: true, user: userData };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Login failed'
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const getAuthHeader = () => {
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const hasTier = (requiredTiers) => {
    if (!user || !user.active_tier) return false;
    return requiredTiers.includes(user.active_tier);
  };

  // Check if user's account is suspended
  const isSuspended = () => {
    return user?.status === 'suspended';
  };

  // Check if subscription is expiring soon (within 7 days)
  const isSubscriptionExpiringSoon = () => {
    if (!user?.subscription_expires_at) return false;
    const expiryDate = new Date(user.subscription_expires_at);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry > 0 && daysUntilExpiry <= 7;
  };

  // Get days until subscription expires
  const getDaysUntilExpiry = () => {
    if (!user?.subscription_expires_at) return null;
    const expiryDate = new Date(user.subscription_expires_at);
    const now = new Date();
    return Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
  };

  const value = {
    user,
    loading,
    token,
    register,
    login,
    logout,
    getAuthHeader,
    hasTier,
    isSuspended,
    isSubscriptionExpiringSoon,
    getDaysUntilExpiry,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};