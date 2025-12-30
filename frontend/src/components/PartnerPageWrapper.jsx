import React from 'react';
import { usePartner } from '../context/PartnerContext';
import { useAuth } from '../context/AuthContext';
import PartnerPaywall from './PartnerPaywall';
import { Loader2 } from 'lucide-react';

/**
 * Higher-Order Component for Partner Pages
 * Handles common patterns: loading state, paywall, and partner branding injection
 * 
 * Usage:
 * const PartnerPage = withPartnerPage(MyComponent, {
 *   title: 'Feature Name',
 *   description: 'Feature description for paywall',
 *   requiredTiers: ['tier-1', 'tier-2', 'tier-3'],
 *   requiresAuth: true,
 *   requiresPaidTier: true
 * });
 */
export const withPartnerPage = (WrappedComponent, options = {}) => {
  const {
    title = 'Feature',
    description = 'Access this feature with a paid plan',
    requiredTiers = ['tier-1', 'tier-2', 'tier-3'],
    requiresAuth = true,
    requiresPaidTier = true,
    showPaywall = true
  } = options;

  return function PartnerPageWrapper(props) {
    const { brandName, primaryColor, secondaryColor, baseUrl } = usePartner();
    const { isAuthenticated, user, loading } = useAuth();

    // Show loading state while auth is being checked
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: primaryColor }} />
        </div>
      );
    }

    // Check access requirements
    const hasAuth = !requiresAuth || isAuthenticated;
    const hasPaidTier = !requiresPaidTier || user?.active_tier;
    const hasAccess = hasAuth && hasPaidTier;

    // Show paywall if required and user doesn't have access
    if (showPaywall && !hasAccess) {
      return (
        <PartnerPaywall
          title={`Unlock ${title}`}
          description={description}
          requiredTiers={requiredTiers}
        />
      );
    }

    // Render the wrapped component with partner props
    return (
      <WrappedComponent
        {...props}
        isPartner={true}
        baseUrl={baseUrl}
        brandName={brandName}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
      />
    );
  };
};

/**
 * Hook for partner page configuration
 * Use this in components that need partner branding
 */
export const usePartnerPage = () => {
  const { brandName, primaryColor, secondaryColor, baseUrl, resellerId, contactInfo } = usePartner();
  const { isAuthenticated, user, loading, token, getAuthHeader } = useAuth();

  const hasAccess = isAuthenticated && user?.active_tier;
  
  return {
    // Partner branding
    brandName,
    primaryColor,
    secondaryColor,
    baseUrl,
    resellerId,
    contactInfo,
    
    // Auth state
    isAuthenticated,
    user,
    loading,
    token,
    getAuthHeader,
    hasAccess,
    
    // Tier helpers
    getTierInfo: (tierId) => {
      const tiers = {
        'tier-1': { name: 'ATS Optimise', level: 1 },
        'tier-2': { name: 'Professional Package', level: 2 },
        'tier-3': { name: 'Executive Elite', level: 3 }
      };
      return { ...tiers[tierId], color: primaryColor } || { name: 'Free', color: 'gray', level: 0 };
    },
    
    // URL helper
    getPartnerUrl: (path) => `${baseUrl}${path}`
  };
};

/**
 * Simple wrapper component for pages that don't need HOC pattern
 */
export const PartnerPageContainer = ({ 
  children, 
  title,
  description,
  requiresPaidTier = true,
  requiredTiers = ['tier-1', 'tier-2', 'tier-3'],
  className = ''
}) => {
  const { primaryColor, loading, hasAccess } = usePartnerPage();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: primaryColor }} />
      </div>
    );
  }

  if (requiresPaidTier && !hasAccess) {
    return (
      <PartnerPaywall
        title={`Unlock ${title}`}
        description={description}
        requiredTiers={requiredTiers}
      />
    );
  }

  return <div className={className}>{children}</div>;
};

export default withPartnerPage;
