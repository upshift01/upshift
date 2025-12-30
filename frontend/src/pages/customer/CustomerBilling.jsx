import React from 'react';
import SharedBilling from '../../components/SharedBilling';

/**
 * Customer Billing - Uses shared billing component
 */
const CustomerBilling = () => {
  return (
    <SharedBilling
      isPartner={false}
      primaryColor="#1e40af"
      brandName="UpShift"
    />
  );
};

export default CustomerBilling;
