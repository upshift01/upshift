import React from 'react';
import { usePartner } from '../../context/PartnerContext';
import SharedBilling from '../../components/SharedBilling';
import PartnerCustomerLayout from '../../components/PartnerCustomerLayout';

/**
 * Partner Billing - Uses shared billing component with partner branding
 */
const PartnerBilling = () => {
  const { primaryColor, brandName, baseUrl, pricing } = usePartner();

  return (
    <PartnerCustomerLayout>
      <SharedBilling
        isPartner={true}
        baseUrl={baseUrl}
        primaryColor={primaryColor}
        brandName={brandName}
        pricing={pricing}
      />
    </PartnerCustomerLayout>
  );
};

export default PartnerBilling;
