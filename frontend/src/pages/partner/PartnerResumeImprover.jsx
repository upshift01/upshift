import React from 'react';
import { usePartner } from '../../context/PartnerContext';
import EnhancedResumeImprover from '../../components/EnhancedResumeImprover';
import PartnerPaywall from '../../components/PartnerPaywall';
import { useAuth } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';

const PartnerResumeImprover = () => {
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

  // Check if user has access (paid tier)
  const hasAccess = isAuthenticated && user?.active_tier;

  // Show paywall if not authenticated or no paid tier
  if (!hasAccess) {
    return (
      <PartnerPaywall
        title="Unlock CV Improver"
        description="Analyze your CV with AI, get improvement suggestions, and generate an enhanced version with professional templates."
        requiredTiers={['tier-1', 'tier-2', 'tier-3']}
      />
    );
  }

  return (
    <EnhancedResumeImprover 
      isPartner={true}
      baseUrl={baseUrl}
      primaryColor={primaryColor}
      secondaryColor={secondaryColor}
    />
  );
};

export default PartnerResumeImprover;
