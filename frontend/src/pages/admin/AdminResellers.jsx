import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Building2,
  Plus,
  Search,
  MoreVertical,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Eye
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

const AdminResellers = () => {
  const { token } = useAuth();
  const [resellers, setResellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedReseller, setSelectedReseller] = useState(null);
  const [actionMenu, setActionMenu] = useState(null);

  useEffect(() => {
    fetchResellers();
  }, [statusFilter]);

  const fetchResellers = async () => {
    try {
      const url = new URL(`${process.env.REACT_APP_BACKEND_URL}/api/admin/resellers`);
      if (statusFilter) url.searchParams.append('status_filter', statusFilter);
      
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setResellers(data.resellers);
      }
    } catch (error) {
      console.error('Error fetching resellers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (resellerId, action) => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/admin/resellers/${resellerId}/${action}`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      if (response.ok) {
        fetchResellers();
      }
    } catch (error) {
      console.error(`Error ${action} reseller:`, error);
    }
    setActionMenu(null);
  };

  const filteredResellers = resellers.filter(r =>
    r.company_name.toLowerCase().includes(filter.toLowerCase()) ||
    r.brand_name.toLowerCase().includes(filter.toLowerCase())
  );

  const formatCurrency = (cents) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(cents / 100);
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      suspended: 'bg-red-100 text-red-800',
      deleted: 'bg-gray-100 text-gray-800'
    };
    const icons = {
      active: CheckCircle,
      pending: Clock,
      suspended: AlertCircle,
      deleted: XCircle
    };
    const Icon = icons[status] || Clock;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
        <Icon className="h-3 w-3" />
        {status}
      </span>
    );
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Resellers</h1>
          <p className="text-gray-600">Manage platform resellers</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Reseller
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search resellers..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredResellers.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No resellers found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Company</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Brand</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Domain</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Customers</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Revenue</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResellers.map((reseller) => (
                    <tr key={reseller.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="font-medium">{reseller.company_name}</div>
                        <div className="text-sm text-gray-500">{reseller.contact_info?.email}</div>
                      </td>
                      <td className="py-3 px-4">{reseller.brand_name}</td>
                      <td className="py-3 px-4">
                        <div className="text-sm">{reseller.subdomain}.upshift.co.za</div>
                        {reseller.custom_domain && (
                          <div className="text-xs text-gray-500">{reseller.custom_domain}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(reseller.status)}</td>
                      <td className="py-3 px-4">{reseller.stats?.total_customers || 0}</td>
                      <td className="py-3 px-4">{formatCurrency(reseller.stats?.total_revenue || 0)}</td>
                      <td className="py-3 px-4">
                        <div className="relative">
                          <button
                            onClick={() => setActionMenu(actionMenu === reseller.id ? null : reseller.id)}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                          {actionMenu === reseller.id && (
                            <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border z-10">
                              <button
                                onClick={() => setSelectedReseller(reseller)}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Eye className="h-4 w-4" /> View Details
                              </button>
                              {reseller.status === 'pending' && (
                                <button
                                  onClick={() => handleAction(reseller.id, 'approve')}
                                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-green-600"
                                >
                                  Approve
                                </button>
                              )}
                              {reseller.status === 'active' && (
                                <button
                                  onClick={() => handleAction(reseller.id, 'suspend')}
                                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-red-600"
                                >
                                  Suspend
                                </button>
                              )}
                              {reseller.status === 'suspended' && (
                                <button
                                  onClick={() => handleAction(reseller.id, 'activate')}
                                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-green-600"
                                >
                                  Activate
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reseller Detail Modal */}
      {selectedReseller && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold">{selectedReseller.company_name}</h2>
                  <p className="text-gray-500">{selectedReseller.brand_name}</p>
                </div>
                <button
                  onClick={() => setSelectedReseller(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  {getStatusBadge(selectedReseller.status)}
                </div>
                <div>
                  <p className="text-sm text-gray-500">Subdomain</p>
                  <p className="font-medium">{selectedReseller.subdomain}.upshift.co.za</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Custom Domain</p>
                  <p className="font-medium">{selectedReseller.custom_domain || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">API Key</p>
                  <p className="font-mono text-sm">{selectedReseller.api_key?.substring(0, 20)}...</p>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Contact Info</h3>
                <p className="text-sm">{selectedReseller.contact_info?.email}</p>
                <p className="text-sm">{selectedReseller.contact_info?.phone}</p>
              </div>

              <div>
                <h3 className="font-medium mb-2">Pricing</h3>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-xs text-gray-500">Tier 1</p>
                    <p className="font-medium">{formatCurrency(selectedReseller.pricing?.tier_1_price)}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-xs text-gray-500">Tier 2</p>
                    <p className="font-medium">{formatCurrency(selectedReseller.pricing?.tier_2_price)}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-xs text-gray-500">Tier 3</p>
                    <p className="font-medium">{formatCurrency(selectedReseller.pricing?.tier_3_price)}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-2">Branding</h3>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-6 h-6 rounded border"
                      style={{ backgroundColor: selectedReseller.branding?.primary_color }}
                    ></div>
                    <span className="text-sm">Primary</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-6 h-6 rounded border"
                      style={{ backgroundColor: selectedReseller.branding?.secondary_color }}
                    ></div>
                    <span className="text-sm">Secondary</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-2">Stats</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-xs text-gray-500">Customers</p>
                    <p className="text-xl font-bold">{selectedReseller.stats?.total_customers || 0}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-xs text-gray-500">Revenue</p>
                    <p className="text-xl font-bold">{formatCurrency(selectedReseller.stats?.total_revenue || 0)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Reseller Modal */}
      {showCreateModal && (
        <CreateResellerModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchResellers();
          }}
          token={token}
        />
      )}
    </div>
  );
};

const CreateResellerModal = ({ onClose, onSuccess, token }) => {
  const [formData, setFormData] = useState({
    company_name: '',
    brand_name: '',
    subdomain: '',
    custom_domain: '',
    owner_name: '',
    owner_email: '',
    owner_password: '',
    contact_info: {
      email: '',
      phone: ''
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/resellers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          contact_info: {
            email: formData.contact_info.email || formData.owner_email,
            phone: formData.contact_info.phone,
            address: ''
          }
        })
      });

      if (response.ok) {
        onSuccess();
      } else {
        const data = await response.json();
        setError(data.detail || 'Failed to create reseller');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">Create New Reseller</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Company Name *</label>
              <Input
                required
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Brand Name *</label>
              <Input
                required
                value={formData.brand_name}
                onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Subdomain *</label>
              <div className="flex">
                <Input
                  required
                  value={formData.subdomain}
                  onChange={(e) => setFormData({ ...formData, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  className="rounded-r-none"
                />
                <span className="bg-gray-100 border border-l-0 px-3 py-2 text-sm text-gray-500 rounded-r-lg">
                  .upshift.co.za
                </span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Custom Domain</label>
              <Input
                placeholder="custom.domain.com"
                value={formData.custom_domain}
                onChange={(e) => setFormData({ ...formData, custom_domain: e.target.value })}
              />
            </div>
          </div>

          <hr className="my-4" />
          <h3 className="font-medium">Owner Account</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Owner Name *</label>
              <Input
                required
                value={formData.owner_name}
                onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Owner Email *</label>
              <Input
                type="email"
                required
                value={formData.owner_email}
                onChange={(e) => setFormData({ ...formData, owner_email: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Owner Password *</label>
            <Input
              type="password"
              required
              minLength={6}
              value={formData.owner_password}
              onChange={(e) => setFormData({ ...formData, owner_password: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Contact Phone</label>
            <Input
              value={formData.contact_info.phone}
              onChange={(e) => setFormData({ 
                ...formData, 
                contact_info: { ...formData.contact_info, phone: e.target.value }
              })}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Creating...' : 'Create Reseller'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminResellers;
