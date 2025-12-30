import React from 'react';
import { usePartner } from '../../context/PartnerContext';
import SharedDocuments from '../../components/SharedDocuments';
import PartnerCustomerLayout from '../../components/PartnerCustomerLayout';

/**
 * Partner Documents - Uses shared documents component with partner branding
 */
const PartnerDocuments = () => {
  const { primaryColor, baseUrl } = usePartner();

  return (
    <PartnerCustomerLayout>
      <SharedDocuments
        isPartner={true}
        baseUrl={baseUrl}
        primaryColor={primaryColor}
      />
    </PartnerCustomerLayout>
  );
};

export default PartnerDocuments;
