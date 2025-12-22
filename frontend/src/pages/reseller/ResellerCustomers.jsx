import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Users, Search, Eye, Mail, Phone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';

const ResellerCustomers = () => {
  const { token } = useAuth();
  const { formatPrice } = useTheme();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/reseller/customers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCustomers(data.customers);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerDetail = async (customerId) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/reseller/customers/${customerId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSelectedCustomer(data);
      }
    } catch (error) {
      console.error('Error fetching customer detail:', error);
    }
  };

  const filteredCustomers = customers.filter(c =>
    c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const getTierBadge = (tier) => {
    if (!tier) return <span className="text-gray-400">No plan</span>;
    const styles = {
      'tier-1': 'bg-blue-100 text-blue-800',
      'tier-2': 'bg-purple-100 text-purple-800',
      'tier-3': 'bg-amber-100 text-amber-800'
    };
    const names = {
      'tier-1': 'ATS Optimize',
      'tier-2': 'Professional',
      'tier-3': 'Executive Elite'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[tier] || 'bg-gray-100'}`}>
        {names[tier] || tier}
      </span>
    );
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <p className="text-gray-600">Manage your customers</p>
      </div>

      <Card>
        <CardHeader>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                {customers.length === 0 ? 'No customers yet' : 'No matching customers found'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Customer</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Email</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Plan</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Joined</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-medium text-sm">
                              {customer.full_name?.charAt(0) || 'U'}
                            </span>
                          </div>
                          <span className="font-medium">{customer.full_name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{customer.email}</td>
                      <td className="py-3 px-4">{getTierBadge(customer.active_tier)}</td>
                      <td className="py-3 px-4 text-gray-500">
                        {new Date(customer.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => fetchCustomerDetail(customer.id)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-lg">
                      {selectedCustomer.customer?.full_name?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{selectedCustomer.customer?.full_name}</h2>
                    {getTierBadge(selectedCustomer.customer?.active_tier)}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h3 className="font-medium mb-3">Contact Information</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="h-4 w-4" />
                    <span>{selectedCustomer.customer?.email}</span>
                  </div>
                  {selectedCustomer.customer?.phone && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="h-4 w-4" />
                      <span>{selectedCustomer.customer?.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-3">Payment History</h3>
                {selectedCustomer.payments?.length === 0 ? (
                  <p className="text-gray-500 text-sm">No payments yet</p>
                ) : (
                  <div className="space-y-2">
                    {selectedCustomer.payments?.map((payment) => (
                      <div key={payment.id} className="bg-gray-50 p-3 rounded-lg flex justify-between">
                        <div>
                          <p className="font-medium">{payment.tier_name}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(payment.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatPrice(payment.amount_cents)}</p>
                          <p className={`text-xs ${payment.status === 'succeeded' ? 'text-green-600' : 'text-gray-500'}`}>
                            {payment.status}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResellerCustomers;
