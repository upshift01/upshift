import React from 'react';
import { usePartner } from '../../context/PartnerContext';
import SharedAnalytics from '../../components/SharedAnalytics';
import PartnerCustomerLayout from '../../components/PartnerCustomerLayout';

/**
 * Partner Analytics - Uses shared analytics component with partner branding
 */
const PartnerAnalytics = () => {
  const { primaryColor, brandName } = usePartner();

  return (
    <PartnerCustomerLayout>
      <SharedAnalytics
        isPartner={true}
        primaryColor={primaryColor}
        brandName={brandName}
      />
    </PartnerCustomerLayout>
  );
};

export default PartnerAnalytics;
