import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Building2,
  Users,
  Receipt,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

const AdminDashboard = () => {
  const { token } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentResellers, setRecentResellers] = useState([]);

  useEffect(() => {
    fetchAnalytics();
    fetchRecentResellers();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/analytics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentResellers = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/resellers?limit=5`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setRecentResellers(data.resellers);
      }
    } catch (error) {
      console.error('Error fetching resellers:', error);
    }
  };

  const formatCurrency = (cents) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(cents / 100);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Platform Dashboard</h1>
        <p className="text-gray-600">Overview of the UpShift SaaS platform</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Resellers</p>
                <p className="text-3xl font-bold">{analytics?.resellers?.total || 0}</p>
              </div>
              <Building2 className="h-12 w-12 text-blue-500 opacity-20" />
            </div>
            <div className="mt-2 flex items-center gap-2 text-sm">
              <span className="text-green-600">{analytics?.resellers?.active || 0} active</span>
              <span className="text-gray-400">|</span>
              <span className="text-yellow-600">{analytics?.resellers?.pending || 0} pending</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Customers</p>
                <p className="text-3xl font-bold">{analytics?.customers?.total || 0}</p>
              </div>
              <Users className="h-12 w-12 text-green-500 opacity-20" />
            </div>
            <p className="mt-2 text-sm text-gray-500">Across all resellers</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-3xl font-bold">{formatCurrency(analytics?.revenue?.total || 0)}</p>
              </div>
              <TrendingUp className="h-12 w-12 text-purple-500 opacity-20" />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              This month: {formatCurrency(analytics?.revenue?.this_month || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Invoices</p>
                <p className="text-3xl font-bold">{analytics?.invoices?.pending || 0}</p>
              </div>
              <Receipt className="h-12 w-12 text-orange-500 opacity-20" />
            </div>
            {analytics?.invoices?.overdue > 0 && (
              <p className="mt-2 text-sm text-red-600">
                {analytics.invoices.overdue} overdue
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Resellers */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Resellers</CardTitle>
        </CardHeader>
        <CardContent>
          {recentResellers.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No resellers yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Company</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Brand</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Customers</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {recentResellers.map((reseller) => (
                    <tr key={reseller.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{reseller.company_name}</td>
                      <td className="py-3 px-4">{reseller.brand_name}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          reseller.status === 'active' ? 'bg-green-100 text-green-800' :
                          reseller.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {reseller.status === 'active' && <CheckCircle className="h-3 w-3" />}
                          {reseller.status === 'pending' && <Clock className="h-3 w-3" />}
                          {reseller.status === 'suspended' && <AlertCircle className="h-3 w-3" />}
                          {reseller.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">{reseller.stats?.total_customers || 0}</td>
                      <td className="py-3 px-4 text-gray-500">
                        {new Date(reseller.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
