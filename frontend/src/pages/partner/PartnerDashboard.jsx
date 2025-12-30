import React from 'react';
import { usePartner } from '../../context/PartnerContext';
import SharedDashboard from '../../components/SharedDashboard';
import PartnerCustomerLayout from '../../components/PartnerCustomerLayout';

/**
 * Partner Dashboard - Uses shared dashboard component with partner branding
 */
const PartnerDashboard = () => {
  const { brandName, primaryColor, secondaryColor, baseUrl } = usePartner();

  return (
    <PartnerCustomerLayout>
      <SharedDashboard
        isPartner={true}
        baseUrl={baseUrl}
        brandName={brandName}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
      />
    </PartnerCustomerLayout>
  );
};

export default PartnerDashboard;
