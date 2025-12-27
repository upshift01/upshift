import React from 'react';
import EnhancedCVBuilder from '../components/EnhancedCVBuilder';

const ResumeBuilder = () => {
  return (
    <EnhancedCVBuilder 
      isPartner={false}
      baseUrl=""
      primaryColor="#1e40af"
      secondaryColor="#7c3aed"
    />
  );
};

export default ResumeBuilder;
