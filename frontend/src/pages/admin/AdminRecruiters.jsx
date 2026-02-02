import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Switch } from '../../components/ui/switch';
import {
  Building2, Search, Loader2, Edit, Key, Trash2, Plus, X, Check,
  Mail, Phone, Calendar, Users, Crown, CheckCircle, XCircle, Eye, EyeOff
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const AdminRecruiters = () => {
  const { token } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [recruiters, setRecruiters] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [selectedRecruiter, setSelectedRecruiter] = useState(null);
  const [saving, setSaving] = useState(false);
  
  // Form states
  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    company_name: ''
  });
  
  const [subscriptionForm, setSubscriptionForm] = useState({
    plan_id: 'recruiter-monthly',
    duration_days: 30,
    status: 'active'
  });
  
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [newRecruiter, setNewRecruiter] = useState({
    full_name: '',
    email: '',
    phone: '',
    company_name: '',
    password: ''
  });

  useEffect(() => {
    fetchRecruiters();
  }, []);

  const fetchRecruiters = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/recruiters`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setRecruiters(data.recruiters || []);
      }
    } catch (error) {
      console.error('Error fetching recruiters:', error);
      toast({
        title: 'Error',
        description: 'Failed to load recruiters',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (recruiter) => {
    setSelectedRecruiter(recruiter);
    setEditForm({
      full_name: recruiter.full_name || '',
      email: recruiter.email || '',
      phone: recruiter.phone || '',
      company_name: recruiter.company_name || ''
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedRecruiter) return;
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/recruiters/${selectedRecruiter.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      });
      
      if (response.ok) {
        toast({ title: 'Success', description: 'Recruiter details updated' });
        setShowEditModal(false);
        fetchRecruiters();
      } else {
        const data = await response.json();
        toast({
          title: 'Error',
          description: data.detail || 'Failed to update recruiter',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update recruiter',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordClick = (recruiter) => {
    setSelectedRecruiter(recruiter);
    setNewPassword('');
    setShowPasswordModal(true);
  };

  const handleResetPassword = async () => {
    if (!selectedRecruiter || !newPassword) return;
    if (newPassword.length < 6) {
      toast({
        title: 'Error',
        description: 'Password must be at least 6 characters',
        variant: 'destructive'
      });
      return;
    }
    
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/recruiters/${selectedRecruiter.id}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ password: newPassword })
      });
      
      if (response.ok) {
        toast({ title: 'Success', description: 'Password has been reset' });
        setShowPasswordModal(false);
        setNewPassword('');
      } else {
        toast({
          title: 'Error',
          description: 'Failed to reset password',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reset password',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (recruiter) => {
    try {
      const newStatus = recruiter.status === 'active' ? 'suspended' : 'active';
      const response = await fetch(`${API_URL}/api/admin/recruiters/${recruiter.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (response.ok) {
        toast({
          title: 'Success',
          description: `Recruiter ${newStatus === 'active' ? 'activated' : 'deactivated'}`
        });
        fetchRecruiters();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteRecruiter = async (recruiter) => {
    if (!confirm(`Are you sure you want to delete ${recruiter.full_name}? This action cannot be undone.`)) {
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/api/admin/recruiters/${recruiter.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        toast({ title: 'Success', description: 'Recruiter deleted' });
        fetchRecruiters();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete recruiter',
        variant: 'destructive'
      });
    }
  };

  const handleAddRecruiter = async () => {
    if (!newRecruiter.full_name || !newRecruiter.email || !newRecruiter.password || !newRecruiter.company_name) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }
    
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/recruiters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newRecruiter)
      });
      
      if (response.ok) {
        toast({ title: 'Success', description: 'Recruiter account created' });
        setShowAddModal(false);
        setNewRecruiter({
          full_name: '',
          email: '',
          phone: '',
          company_name: '',
          password: ''
        });
        fetchRecruiters();
      } else {
        const data = await response.json();
        toast({
          title: 'Error',
          description: data.detail || 'Failed to create recruiter',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create recruiter',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  // Filter recruiters
  const filteredRecruiters = recruiters.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        r.full_name?.toLowerCase().includes(search) ||
        r.email?.toLowerCase().includes(search) ||
        r.company_name?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recruiter Management</h1>
          <p className="text-gray-600">Manage recruiter accounts and subscriptions</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} data-testid="add-recruiter-btn">
          <Plus className="h-4 w-4 mr-2" />
          Add Recruiter
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, email, or company..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="search-recruiters"
                />
              </div>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{recruiters.length}</p>
                <p className="text-sm text-gray-500">Total Recruiters</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{recruiters.filter(r => r.status === 'active').length}</p>
                <p className="text-sm text-gray-500">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Crown className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{recruiters.filter(r => r.has_subscription).length}</p>
                <p className="text-sm text-gray-500">Subscribed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recruiters List */}
      <div className="space-y-4">
        {filteredRecruiters.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No recruiters found</p>
              <p className="text-sm text-gray-500 mt-2">Add a recruiter account to get started</p>
            </CardContent>
          </Card>
        ) : (
          filteredRecruiters.map(recruiter => (
            <Card key={recruiter.id} data-testid={`recruiter-card-${recruiter.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{recruiter.full_name}</h3>
                      <Badge className={recruiter.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                        {recruiter.status === 'active' ? (
                          <><CheckCircle className="h-3 w-3 mr-1" />Active</>
                        ) : (
                          <><XCircle className="h-3 w-3 mr-1" />Suspended</>
                        )}
                      </Badge>
                      {recruiter.has_subscription && (
                        <Badge className="bg-purple-100 text-purple-700">
                          <Crown className="h-3 w-3 mr-1" />Subscribed
                        </Badge>
                      )}
                    </div>
                    <p className="text-gray-600 font-medium mb-2">
                      <Building2 className="h-4 w-4 inline mr-1" />
                      {recruiter.company_name || 'No company'}
                    </p>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Mail className="h-4 w-4" />
                        {recruiter.email}
                      </span>
                      {recruiter.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-4 w-4" />
                          {recruiter.phone}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Joined {new Date(recruiter.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditClick(recruiter)}
                      data-testid="edit-recruiter-btn"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePasswordClick(recruiter)}
                      data-testid="reset-password-btn"
                    >
                      <Key className="h-4 w-4 mr-1" />
                      Password
                    </Button>
                    <Button
                      size="sm"
                      variant={recruiter.status === 'active' ? 'outline' : 'default'}
                      onClick={() => handleToggleStatus(recruiter)}
                      data-testid="toggle-status-btn"
                    >
                      {recruiter.status === 'active' ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleDeleteRecruiter(recruiter)}
                      data-testid="delete-recruiter-btn"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && selectedRecruiter && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Edit Recruiter</CardTitle>
              <CardDescription>Update recruiter account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Full Name</Label>
                <Input
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  data-testid="edit-full-name"
                />
              </div>
              <div>
                <Label>Company Name</Label>
                <Input
                  value={editForm.company_name}
                  onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })}
                  data-testid="edit-company-name"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  data-testid="edit-email"
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  data-testid="edit-phone"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowEditModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Password Reset Modal */}
      {showPasswordModal && selectedRecruiter && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Reset Password</CardTitle>
              <CardDescription>Set a new password for {selectedRecruiter.full_name}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>New Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    minLength={6}
                    data-testid="new-password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowPasswordModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleResetPassword} disabled={saving || !newPassword}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Reset Password
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Recruiter Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Add New Recruiter</CardTitle>
              <CardDescription>Create a new recruiter account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Full Name *</Label>
                <Input
                  value={newRecruiter.full_name}
                  onChange={(e) => setNewRecruiter({ ...newRecruiter, full_name: e.target.value })}
                  placeholder="John Smith"
                  data-testid="new-recruiter-name"
                />
              </div>
              <div>
                <Label>Company Name *</Label>
                <Input
                  value={newRecruiter.company_name}
                  onChange={(e) => setNewRecruiter({ ...newRecruiter, company_name: e.target.value })}
                  placeholder="Acme Corporation"
                  data-testid="new-recruiter-company"
                />
              </div>
              <div>
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={newRecruiter.email}
                  onChange={(e) => setNewRecruiter({ ...newRecruiter, email: e.target.value })}
                  placeholder="john@company.com"
                  data-testid="new-recruiter-email"
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={newRecruiter.phone}
                  onChange={(e) => setNewRecruiter({ ...newRecruiter, phone: e.target.value })}
                  placeholder="+27 12 345 6789"
                />
              </div>
              <div>
                <Label>Password *</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={newRecruiter.password}
                    onChange={(e) => setNewRecruiter({ ...newRecruiter, password: e.target.value })}
                    placeholder="••••••••"
                    minLength={6}
                    data-testid="new-recruiter-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddRecruiter} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  Create Recruiter
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminRecruiters;
