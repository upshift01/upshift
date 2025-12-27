import React, { createContext, useState, useContext, useEffect } from 'react';

const PartnerContext = createContext(null);

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// Helper to convert relative URLs to full URLs
const getFullUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  if (url.startsWith('/api/uploads')) {
    return `${API_URL}${url}`;
  }
  return url;
};

export const PartnerProvider = ({ children, subdomain }) => {
  const [partner, setPartner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (subdomain) {
      fetchPartnerConfig();
    } else {
      setLoading(false);
    }
  }, [subdomain]);

  const fetchPartnerConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_URL}/api/white-label/partner/${subdomain}`);
      
      if (!response.ok) {
        let errorMessage = 'Partner not found';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch (parseError) {
          // If JSON parsing fails, use default error message
          console.error('Error parsing error response:', parseError);
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      setPartner(data);
      
      // Apply partner branding to document
43|      if (data.primary_color) {
        document.documentElement.style.setProperty('--partner-primary', data.primary_color);
      }
      if (data.secondary_color) {
        document.documentElement.style.setProperty('--partner-secondary', data.secondary_color);
      }
      // Set favicon - handle relative URLs
      const faviconUrl = getFullUrl(data.favicon_url);
      if (faviconUrl) {
        const favicon = document.querySelector("link[rel='icon']");
        if (favicon) {
          favicon.href = faviconUrl;
        }
        // Also update shortcut icon if it exists
        const shortcutIcon = document.querySelector("link[rel='shortcut icon']");
        if (shortcutIcon) {
          shortcutIcon.href = faviconUrl;
        }
      }
      if (data.brand_name) {
        document.title = `${data.brand_name} - Professional Career Services`;
      }
      
    } catch (err) {
      console.error('Error fetching partner config:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    partner,
    loading,
    error,
    isPartner: !!partner,
    subdomain,
    brandName: partner?.brand_name || 'UpShift',
    primaryColor: partner?.primary_color || '#1e40af',
    secondaryColor: partner?.secondary_color || '#7c3aed',
    logoUrl: partner?.logo_url,
    contactEmail: partner?.contact_email,
    contactPhone: partner?.contact_phone,
    resellerId: partner?.reseller_id,
    baseUrl: partner?.base_url || '',
    pricing: partner?.pricing || {}
  };

  return (
    <PartnerContext.Provider value={value}>
      {children}
    </PartnerContext.Provider>
  );
};

export const usePartner = () => {
  const context = useContext(PartnerContext);
  if (!context) {
    // Return default values if not in a partner context
    return {
      partner: null,
      loading: false,
      error: null,
      isPartner: false,
      subdomain: null,
      brandName: 'UpShift',
      primaryColor: '#1e40af',
      secondaryColor: '#7c3aed',
      logoUrl: null,
      contactEmail: null,
      contactPhone: null,
      resellerId: null,
      baseUrl: '',
      pricing: {}
    };
  }
  return context;
};

export default PartnerContext;
