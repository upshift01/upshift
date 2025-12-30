import React from 'react';
import SharedDashboard from '../components/SharedDashboard';

/**
 * Main Dashboard - Uses shared dashboard component
 */
const Dashboard = () => {
  return (
    <SharedDashboard
      isPartner={false}
      primaryColor="#1e40af"
      secondaryColor="#7c3aed"
    />
  );
};

export default Dashboard;
