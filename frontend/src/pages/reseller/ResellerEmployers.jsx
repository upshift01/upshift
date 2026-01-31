import React from 'react';
import AdminEmployers from '../admin/AdminEmployers';

// ResellerEmployers wraps AdminEmployers with the same functionality
// The backend already filters employers by reseller if the user is a reseller
const ResellerEmployers = () => {
  return <AdminEmployers />;
};

export default ResellerEmployers;
