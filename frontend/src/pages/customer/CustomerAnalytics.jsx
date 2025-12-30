import React from 'react';
import SharedAnalytics from '../../components/SharedAnalytics';

/**
 * Customer Analytics - Uses shared analytics component
 */
const CustomerAnalytics = () => {
  return (
    <SharedAnalytics
      isPartner={false}
      primaryColor="#1e40af"
      brandName="UpShift"
    />
  );
};

export default CustomerAnalytics;
