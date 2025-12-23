import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState({
    isWhiteLabel: false,
    brandName: 'UpShift',
    logoUrl: null,
    primaryColor: '#1e40af',
    secondaryColor: '#7c3aed',
    faviconUrl: null,
    contactEmail: 'support@upshift.works',
    contactPhone: '+27 (0) 11 234 5678',
    contactAddress: '123 Main Street, Sandton, Johannesburg, 2196, South Africa',
    contactWhatsapp: '',
    businessHours: '',
    socialMedia: {
      facebook: '',
      twitter: '',
      linkedin: '',
      instagram: '',
      youtube: '',
      tiktok: ''
    },
    termsUrl: '/terms',
    privacyUrl: '/privacy',
    pricing: {
      tier1Price: 89900,
      tier2Price: 150000,
      tier3Price: 300000,
      currency: 'ZAR'
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWhiteLabelConfig();
  }, []);

  const fetchWhiteLabelConfig = async () => {
    try {
      // Add cache-busting parameter to ensure fresh data
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/white-label/config?_t=${Date.now()}`, {
        cache: 'no-store'
      });
      if (response.ok) {
        const data = await response.json();
        setTheme({
          isWhiteLabel: data.is_white_label,
          resellerId: data.reseller_id,
          brandName: data.brand_name,
          logoUrl: data.logo_url,
          primaryColor: data.primary_color,
          secondaryColor: data.secondary_color,
          faviconUrl: data.favicon_url,
          contactEmail: data.contact_email,
          contactPhone: data.contact_phone,
          contactAddress: data.contact_address,
          contactWhatsapp: data.contact_whatsapp || '',
          businessHours: data.business_hours || '',
          socialMedia: data.social_media || {
            facebook: '',
            twitter: '',
            linkedin: '',
            instagram: '',
            youtube: '',
            tiktok: ''
          },
          termsUrl: data.terms_url,
          privacyUrl: data.privacy_url,
          pricing: {
            tier1Price: data.pricing.tier_1_price,
            tier2Price: data.pricing.tier_2_price,
            tier3Price: data.pricing.tier_3_price,
            currency: data.pricing.currency
          }
        });
        
        // Apply CSS variables
        applyThemeColors(data.primary_color, data.secondary_color);
        
        // Update favicon if provided
        if (data.favicon_url) {
          updateFavicon(data.favicon_url);
        }
        
        // Update document title
        document.title = data.brand_name;
      }
    } catch (error) {
      console.error('Error fetching white-label config:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyThemeColors = (primary, secondary) => {
    const root = document.documentElement;
    root.style.setProperty('--primary-color', primary);
    root.style.setProperty('--secondary-color', secondary);
    
    // Generate lighter/darker variants
    root.style.setProperty('--primary-light', adjustColor(primary, 30));
    root.style.setProperty('--primary-dark', adjustColor(primary, -20));
    root.style.setProperty('--secondary-light', adjustColor(secondary, 30));
    root.style.setProperty('--secondary-dark', adjustColor(secondary, -20));
  };

  const adjustColor = (color, amount) => {
    const hex = color.replace('#', '');
    const num = parseInt(hex, 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + amount));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
    const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
    return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
  };

  const updateFavicon = (url) => {
    const link = document.querySelector("link[rel~='icon']") || document.createElement('link');
    link.rel = 'icon';
    link.href = url;
    document.head.appendChild(link);
  };

  const formatPrice = (cents) => {
    const amount = cents / 100;
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: theme.pricing.currency
    }).format(amount);
  };

  return (
    <ThemeContext.Provider value={{ theme, loading, formatPrice, fetchWhiteLabelConfig }}>
      {children}
    </ThemeContext.Provider>
  );
};
