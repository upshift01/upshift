import React from 'react';
import { usePartner } from '../../context/PartnerContext';
import SharedSettings from '../../components/SharedSettings';
import PartnerCustomerLayout from '../../components/PartnerCustomerLayout';

/**
 * Partner Settings - Uses shared settings component with partner branding
 */
const PartnerSettings = () => {
  const { brandName, primaryColor } = usePartner();

  return (
    <PartnerCustomerLayout>
      <SharedSettings
        isPartner={true}
        primaryColor={primaryColor}
        brandName={brandName}
      />
    </PartnerCustomerLayout>
  );
};

export default PartnerSettings;
