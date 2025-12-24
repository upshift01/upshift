import React, { useState, useEffect, useRef } from 'react';
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
  Eye,
  Edit,
  Save,
  X,
  Gift,
  Calendar,
  RefreshCw,
  Power,
  ToggleLeft,
  ToggleRight
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
  const [editingReseller, setEditingReseller] = useState(null);
  const [actionMenu, setActionMenu] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });

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

  const handleAction = async (resellerId, action, extraParams = {}) => {
    try {
      const url = new URL(`${process.env.REACT_APP_BACKEND_URL}/api/admin/resellers/${resellerId}/${action}`);
      
      // Add query params for extend-trial
      if (action === 'extend-trial' && extraParams.days) {
        url.searchParams.append('days', extraParams.days);
      }
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.message) {
          alert(data.message);
        }
        fetchResellers();
      } else {
        const error = await response.json();
        alert(error.detail || 'Action failed');
      }
    } catch (error) {
      console.error(`Error ${action} reseller:`, error);
    }
    setActionMenu(null);
  };

  const handleExtendTrial = (resellerId) => {
    const days = prompt('Enter number of days to extend the trial:', '7');
    if (days && !isNaN(parseInt(days))) {
      handleAction(resellerId, 'extend-trial', { days: parseInt(days) });
    }
  };

  const handleToggleStatus = async (reseller) => {
    const isActive = reseller.status === 'active' || reseller.status === 'pending';
    const action = isActive ? 'deactivate' : 'activate';
    const confirmMsg = isActive 
      ? `Are you sure you want to deactivate "${reseller.company_name}"? They will lose access to their portal.`
      : `Are you sure you want to activate "${reseller.company_name}"?`;
    
    if (!window.confirm(confirmMsg)) return;
    
    try {
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/admin/resellers/${reseller.id}/${action}`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      if (response.ok) {
        const data = await response.json();
        alert(data.message || `Reseller ${action}d successfully`);
        fetchResellers();
      } else {
        const error = await response.json();
        alert(error.detail || `Failed to ${action} reseller`);
      }
    } catch (error) {
      console.error(`Error ${action} reseller:`, error);
      alert(`Error ${action} reseller`);
    }
  };

  const handleEditReseller = (reseller) => {
    setEditingReseller({
      ...reseller,
      contact_info: reseller.contact_info || { email: '', phone: '', address: '' },
      pricing: reseller.pricing || { tier_1_price: 89900, tier_2_price: 150000, tier_3_price: 300000 }
    });
    setSelectedReseller(null);
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

  const getStatusBadge = (status, subscription = {}) => {
    const isTrialStatus = subscription?.is_trial || subscription?.status === 'trial' || subscription?.status === 'trial_expired';
    
    // Handle trial statuses
    if (isTrialStatus) {
      const trialEnd = subscription?.trial_end_date;
      let daysRemaining = 0;
      let trialExpired = subscription?.status === 'trial_expired';
      
      if (trialEnd && !trialExpired) {
        const endDate = new Date(trialEnd);
        const now = new Date();
        daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
        trialExpired = daysRemaining < 0;
      }
      
      if (trialExpired || subscription?.status === 'trial_expired') {
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <AlertCircle className="h-3 w-3" />
            Trial Expired
          </span>
        );
      }
      
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          <Gift className="h-3 w-3" />
          Trial ({daysRemaining}d left)
        </span>
      );
    }
    
    const styles = {
      active: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      suspended: 'bg-red-100 text-red-800',
      inactive: 'bg-gray-100 text-gray-500',
      deleted: 'bg-gray-100 text-gray-800'
    };
    const icons = {
      active: CheckCircle,
      pending: Clock,
      suspended: AlertCircle,
      inactive: Power,
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

      <Card className="overflow-visible">
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
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="overflow-visible">
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
            <div className="overflow-x-auto overflow-y-visible">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Company</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Brand</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Domain</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-600">Active</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Customers</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Revenue</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResellers.map((reseller) => {
                    const isActive = reseller.status === 'active' || reseller.status === 'pending';
                    const canToggle = reseller.status !== 'suspended' && reseller.status !== 'deleted';
                    
                    return (
                    <tr key={reseller.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="font-medium">{reseller.company_name}</div>
                        <div className="text-sm text-gray-500">{reseller.contact_info?.email}</div>
                      </td>
                      <td className="py-3 px-4">{reseller.brand_name}</td>
                      <td className="py-3 px-4">
                        <div className="text-sm">{reseller.subdomain}.upshift.works</div>
                        {reseller.custom_domain && (
                          <div className="text-xs text-gray-500">{reseller.custom_domain}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(reseller.status, reseller.subscription)}</td>
                      <td className="py-3 px-4 text-center">
                        {canToggle ? (
                          <button
                            onClick={() => handleToggleStatus(reseller)}
                            className={`p-1 rounded-lg transition-colors ${
                              isActive 
                                ? 'text-green-600 hover:bg-green-50' 
                                : 'text-gray-400 hover:bg-gray-100'
                            }`}
                            title={isActive ? 'Click to deactivate' : 'Click to activate'}
                          >
                            {isActive ? (
                              <ToggleRight className="h-6 w-6" />
                            ) : (
                              <ToggleLeft className="h-6 w-6" />
                            )}
                          </button>
                        ) : (
                          <span className="text-gray-300">
                            <Power className="h-5 w-5 mx-auto" />
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">{reseller.stats?.total_customers || 0}</td>
                      <td className="py-3 px-4">{formatCurrency(reseller.stats?.total_revenue || 0)}</td>
                      <td className="py-3 px-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (actionMenu === reseller.id) {
                              setActionMenu(null);
                            } else {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setMenuPosition({
                                top: rect.bottom + 4,
                                right: window.innerWidth - rect.right
                              });
                              setActionMenu(reseller.id);
                            }
                          }}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          )}

          {/* Dropdown Menu Portal */}
          {actionMenu && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setActionMenu(null)}
              />
              <div 
                className="fixed z-50 w-48 bg-white rounded-lg shadow-xl border py-1"
                style={{
                  top: `${menuPosition.top}px`,
                  right: `${menuPosition.right}px`
                }}
              >
                {(() => {
                  const reseller = resellers.find(r => r.id === actionMenu);
                  if (!reseller) return null;
                  const isOnTrial = reseller.subscription?.is_trial || reseller.subscription?.status === 'trial';
                  const isTrialExpired = reseller.subscription?.status === 'trial_expired';
                  
                  return (
                    <>
                      <button
                        onClick={() => {
                          setSelectedReseller(reseller);
                          setActionMenu(null);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2 transition-colors"
                      >
                        <Eye className="h-4 w-4 text-gray-500" /> View Details
                      </button>
                      <button
                        onClick={() => handleEditReseller(reseller)}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 flex items-center gap-2 text-blue-600 transition-colors"
                      >
                        <Edit className="h-4 w-4" /> Edit Reseller
                      </button>
                      <div className="border-t my-1"></div>
                      
                      {/* Trial Actions */}
                      {(isOnTrial || isTrialExpired) && (
                        <>
                          <button
                            onClick={() => handleAction(reseller.id, 'convert-trial')}
                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-green-50 text-green-600 flex items-center gap-2 transition-colors"
                          >
                            <CheckCircle className="h-4 w-4" /> Convert to Paid
                          </button>
                          <button
                            onClick={() => handleExtendTrial(reseller.id)}
                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-purple-50 text-purple-600 flex items-center gap-2 transition-colors"
                          >
                            <Calendar className="h-4 w-4" /> Extend Trial
                          </button>
                          <div className="border-t my-1"></div>
                        </>
                      )}
                      
                      {reseller.status === 'pending' && (
                        <button
                          onClick={() => handleAction(reseller.id, 'approve')}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-green-50 text-green-600 flex items-center gap-2 transition-colors"
                        >
                          <CheckCircle className="h-4 w-4" /> Approve
                        </button>
                      )}
                      {reseller.status === 'active' && !isOnTrial && (
                        <button
                          onClick={() => handleAction(reseller.id, 'suspend')}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-red-50 text-red-600 flex items-center gap-2 transition-colors"
                        >
                          <AlertCircle className="h-4 w-4" /> Suspend
                        </button>
                      )}
                      {reseller.status === 'suspended' && (
                        <button
                          onClick={() => handleAction(reseller.id, 'activate')}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-green-50 text-green-600 flex items-center gap-2 transition-colors"
                        >
                          <CheckCircle className="h-4 w-4" /> Activate
                        </button>
                      )}
                    </>
                  );
                })()}
              </div>
            </>
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
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditReseller(selectedReseller)}
                  >
                    <Edit className="h-4 w-4 mr-1" /> Edit
                  </Button>
                  <button
                    onClick={() => setSelectedReseller(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>
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
                  <p className="font-medium">{selectedReseller.subdomain}.upshift.works</p>
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
                <p className="text-sm">{selectedReseller.contact_info?.address}</p>
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

      {/* Edit Reseller Modal */}
      {editingReseller && (
        <EditResellerModal
          reseller={editingReseller}
          onClose={() => setEditingReseller(null)}
          onSuccess={() => {
            setEditingReseller(null);
            fetchResellers();
          }}
          token={token}
        />
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

const EditResellerModal = ({ reseller, onClose, onSuccess, token }) => {
  const [formData, setFormData] = useState({
    company_name: reseller.company_name || '',
    brand_name: reseller.brand_name || '',
    subdomain: reseller.subdomain || '',
    custom_domain: reseller.custom_domain || '',
    status: reseller.status || 'pending',
    contact_info: {
      email: reseller.contact_info?.email || '',
      phone: reseller.contact_info?.phone || '',
      address: reseller.contact_info?.address || ''
    },
    pricing: {
      tier_1_price: reseller.pricing?.tier_1_price || 89900,
      tier_2_price: reseller.pricing?.tier_2_price || 150000,
      tier_3_price: reseller.pricing?.tier_3_price || 300000
    },
    branding: {
      primary_color: reseller.branding?.primary_color || '#1e40af',
      secondary_color: reseller.branding?.secondary_color || '#7c3aed'
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/resellers/${reseller.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        onSuccess();
      } else {
        const data = await response.json();
        setError(data.detail || 'Failed to update reseller');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">Edit Reseller</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
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
              <label className="block text-sm font-medium mb-1">Subdomain</label>
              <div className="flex">
                <Input
                  value={formData.subdomain}
                  onChange={(e) => setFormData({ ...formData, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  className="rounded-r-none"
                />
                <span className="bg-gray-100 border border-l-0 px-3 py-2 text-sm text-gray-500 rounded-r-lg">
                  .upshift.works
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

          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          <hr className="my-4" />
          <h3 className="font-medium">Contact Information</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <Input
                type="email"
                value={formData.contact_info.email}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  contact_info: { ...formData.contact_info, email: e.target.value }
                })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <Input
                value={formData.contact_info.phone}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  contact_info: { ...formData.contact_info, phone: e.target.value }
                })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Address</label>
            <Input
              value={formData.contact_info.address}
              onChange={(e) => setFormData({ 
                ...formData, 
                contact_info: { ...formData.contact_info, address: e.target.value }
              })}
            />
          </div>

          <hr className="my-4" />
          <h3 className="font-medium">Pricing (in cents)</h3>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tier 1 Price</label>
              <Input
                type="number"
                value={formData.pricing.tier_1_price}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  pricing: { ...formData.pricing, tier_1_price: parseInt(e.target.value) }
                })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tier 2 Price</label>
              <Input
                type="number"
                value={formData.pricing.tier_2_price}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  pricing: { ...formData.pricing, tier_2_price: parseInt(e.target.value) }
                })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tier 3 Price</label>
              <Input
                type="number"
                value={formData.pricing.tier_3_price}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  pricing: { ...formData.pricing, tier_3_price: parseInt(e.target.value) }
                })}
              />
            </div>
          </div>

          <hr className="my-4" />
          <h3 className="font-medium">Branding</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Primary Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={formData.branding.primary_color}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    branding: { ...formData.branding, primary_color: e.target.value }
                  })}
                  className="w-12 h-10 rounded border cursor-pointer"
                />
                <Input
                  value={formData.branding.primary_color}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    branding: { ...formData.branding, primary_color: e.target.value }
                  })}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Secondary Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={formData.branding.secondary_color}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    branding: { ...formData.branding, secondary_color: e.target.value }
                  })}
                  className="w-12 h-10 rounded border cursor-pointer"
                />
                <Input
                  value={formData.branding.secondary_color}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    branding: { ...formData.branding, secondary_color: e.target.value }
                  })}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
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
                  .upshift.works
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
