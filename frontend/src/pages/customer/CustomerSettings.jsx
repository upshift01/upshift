import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { 
  User, 
  Mail, 
  Lock, 
  Bell, 
  Shield, 
  Save,
  Eye,
  EyeOff,
  CheckCircle,
  Loader2
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const CustomerSettings = () => {
  const { user, token, getAuthHeader, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const [profile, setProfile] = useState({
    full_name: '',
    email: '',
    phone: ''
  });
  
  const [passwords, setPasswords] = useState({
    current: '',
    new_password: '',
    confirm: ''
  });
  const [showPasswords, setShowPasswords] = useState(false);
  
  const [notifications, setNotifications] = useState({
    email_updates: true,
    marketing: false,
    tips: true
  });

  useEffect(() => {
    if (user) {
      setProfile({
        full_name: user.full_name || '',
        email: user.email || '',
        phone: user.phone || ''
      });
    }
  }, [user]);

  const handleSaveProfile = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const response = await fetch(`${API_URL}/api/customer/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify(profile)
      });
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        updateUser({ ...user, ...profile });
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.detail || 'Failed to update profile' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error updating profile' });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwords.new_password !== passwords.confirm) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }
    if (passwords.new_password.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }
    
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const response = await fetch(`${API_URL}/api/customer/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({
          current_password: passwords.current,
          new_password: passwords.new_password
        })
      });
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'Password changed successfully!' });
        setPasswords({ current: '', new_password: '', confirm: '' });
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.detail || 'Failed to change password' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error changing password' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const response = await fetch(`${API_URL}/api/customer/notifications`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify(notifications)
      });
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'Notification preferences saved!' });
      } else {
        setMessage({ type: 'error', text: 'Failed to save preferences' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error saving preferences' });
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell }
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
        <p className="text-gray-600">Manage your account preferences</p>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          <CheckCircle className="h-5 w-5" />
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Full Name</label>
              <Input
                value={profile.full_name}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                placeholder="Your full name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email Address</label>
              <Input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone Number</label>
              <Input
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                placeholder="+27 12 345 6789"
              />
            </div>
            <Button onClick={handleSaveProfile} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Profile
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Change Password
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Current Password</label>
              <div className="relative">
                <Input
                  type={showPasswords ? 'text' : 'password'}
                  value={passwords.current}
                  onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                  placeholder="Enter current password"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">New Password</label>
              <Input
                type={showPasswords ? 'text' : 'password'}
                value={passwords.new_password}
                onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })}
                placeholder="Enter new password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Confirm New Password</label>
              <Input
                type={showPasswords ? 'text' : 'password'}
                value={passwords.confirm}
                onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                placeholder="Confirm new password"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showPwd"
                checked={showPasswords}
                onChange={(e) => setShowPasswords(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="showPwd" className="text-sm text-gray-600">Show passwords</label>
            </div>
            <Button onClick={handleChangePassword} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Shield className="h-4 w-4 mr-2" />}
              Change Password
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">Email Updates</p>
                <p className="text-sm text-gray-500">Receive updates about your documents</p>
              </div>
              <input
                type="checkbox"
                checked={notifications.email_updates}
                onChange={(e) => setNotifications({ ...notifications, email_updates: e.target.checked })}
                className="h-5 w-5 rounded"
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">Marketing Emails</p>
                <p className="text-sm text-gray-500">Receive promotions and special offers</p>
              </div>
              <input
                type="checkbox"
                checked={notifications.marketing}
                onChange={(e) => setNotifications({ ...notifications, marketing: e.target.checked })}
                className="h-5 w-5 rounded"
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">Career Tips</p>
                <p className="text-sm text-gray-500">Get tips to improve your job search</p>
              </div>
              <input
                type="checkbox"
                checked={notifications.tips}
                onChange={(e) => setNotifications({ ...notifications, tips: e.target.checked })}
                className="h-5 w-5 rounded"
              />
            </div>
            <Button onClick={handleSaveNotifications} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Preferences
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CustomerSettings;
