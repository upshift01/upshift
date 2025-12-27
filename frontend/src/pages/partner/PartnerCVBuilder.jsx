import React from 'react';
import { usePartner } from '../../context/PartnerContext';
import EnhancedCVBuilder from '../../components/EnhancedCVBuilder';
import PartnerPaywall from '../../components/PartnerPaywall';
import { useAuth } from '../../context/AuthContext';

const PartnerCVBuilder = () => {
  const { brandName, primaryColor, secondaryColor, baseUrl } = usePartner();
  const { isAuthenticated, user } = useAuth();

  // Check if user has access (paid tier)
  const hasAccess = isAuthenticated && user?.active_tier;

  // Show paywall if not authenticated or no paid tier
  if (!hasAccess) {
    return (
      <PartnerPaywall
        title="Unlock AI Resume Builder"
        description="Build professional CVs with AI assistance, template selection, and PDF generation."
        requiredTiers={['tier-1', 'tier-2', 'tier-3']}
      />
    );
  }

  return (
    <EnhancedCVBuilder 
      isPartner={true}
      baseUrl={baseUrl}
      primaryColor={primaryColor}
      secondaryColor={secondaryColor}
    />
  );
};

export default PartnerCVBuilder;
