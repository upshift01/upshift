import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Building2, Search, Plus, Edit, Key, Ban, CheckCircle,
  Loader2, MoreVertical, Briefcase, FileText, Crown,
  RefreshCw, Trash2, Eye, Copy, AlertTriangle
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const AdminEmployers = () => {
  const { token } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [employers, setEmployers] = useState([]);
  const [stats, setStats] = useState({});
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [subscriptionFilter, setSubscriptionFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedEmployer, setSelectedEmployer] = useState(null);
  const [processing, setProcessing] = useState(false);

  // Form states
  const [createForm, setCreateForm] = useState({
    email: '',
    full_name: '',
    company_name: '',
    phone: '',
    password: ''
  });
  const [editForm, setEditForm] = useState({});
  const [subscriptionForm, setSubscriptionForm] = useState({
    plan_id: 'employer-starter',
    status: 'active',
    duration_days: 30
  });
  const [generatedPassword, setGeneratedPassword] = useState('');

  const fetchEmployers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });
      if (search) params.append('search', search);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (subscriptionFilter !== 'all') params.append('subscription_status', subscriptionFilter);

      const res = await fetch(`${API_URL}/api/employer-management/employers?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.success) {
        setEmployers(data.employers || []);
        setStats(data.stats || {});
        setTotalPages(data.total_pages || 1);
      }
    } catch (error) {
      console.error('Error fetching employers:', error);
      toast({
        title: 'Error',
        description: 'Failed to load employers',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [token, page, search, statusFilter, subscriptionFilter, toast]);

  useEffect(() => {
    fetchEmployers();
  }, [fetchEmployers]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setProcessing(true);
    try {
      const res = await fetch(`${API_URL}/api/employer-management/employers`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(createForm)
      });
      const data = await res.json();
      
      if (data.success) {
        toast({ title: 'Success', description: 'Employer created successfully' });
        if (data.generated_password) {
          setGeneratedPassword(data.generated_password);
        } else {
          setShowCreateModal(false);
          setCreateForm({ email: '', full_name: '', company_name: '', phone: '', password: '' });
        }
        fetchEmployers();
      } else {
        toast({ title: 'Error', description: data.detail, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create employer', variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!selectedEmployer) return;
    setProcessing(true);
    try {
      const res = await fetch(`${API_URL}/api/employer-management/employers/${selectedEmployer.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editForm)
      });
      const data = await res.json();
      
      if (data.success) {
        toast({ title: 'Success', description: 'Employer updated successfully' });
        setShowEditModal(false);
        fetchEmployers();
      } else {
        toast({ title: 'Error', description: data.detail, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update employer', variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedEmployer) return;
    setProcessing(true);
    try {
      const res = await fetch(`${API_URL}/api/employer-management/employers/${selectedEmployer.id}/reset-password`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      const data = await res.json();
      
      if (data.success) {
        toast({ title: 'Success', description: 'Password reset successfully' });
        if (data.new_password) {
          setGeneratedPassword(data.new_password);
        }
      } else {
        toast({ title: 'Error', description: data.detail, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to reset password', variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handleSuspend = async (employer) => {
    if (!window.confirm(`Are you sure you want to suspend ${employer.full_name}? Their jobs will be paused.`)) return;
    
    try {
      const res = await fetch(`${API_URL}/api/employer-management/employers/${employer.id}/suspend`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.success) {
        toast({ title: 'Success', description: 'Employer suspended successfully' });
        fetchEmployers();
      } else {
        toast({ title: 'Error', description: data.detail, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to suspend employer', variant: 'destructive' });
    }
  };

  const handleReactivate = async (employer) => {
    try {
      const res = await fetch(`${API_URL}/api/employer-management/employers/${employer.id}/reactivate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.success) {
        toast({ title: 'Success', description: 'Employer reactivated successfully' });
        fetchEmployers();
      } else {
        toast({ title: 'Error', description: data.detail, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to reactivate employer', variant: 'destructive' });
    }
  };

  const handleUpdateSubscription = async (e) => {
    e.preventDefault();
    if (!selectedEmployer) return;
    setProcessing(true);
    try {
      const res = await fetch(`${API_URL}/api/employer-management/employers/${selectedEmployer.id}/subscription`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(subscriptionForm)
      });
      const data = await res.json();
      
      if (data.success) {
        toast({ title: 'Success', description: data.message });
        setShowSubscriptionModal(false);
        fetchEmployers();
      } else {
        toast({ title: 'Error', description: data.detail, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update subscription', variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const openEditModal = (employer) => {
    setSelectedEmployer(employer);
    setEditForm({
      full_name: employer.full_name || '',
      company_name: employer.company_name || '',
      phone: employer.phone || '',
      status: employer.status || 'active'
    });
    setShowEditModal(true);
  };

  const openPasswordModal = (employer) => {
    setSelectedEmployer(employer);
    setGeneratedPassword('');
    setShowPasswordModal(true);
  };

  const openSubscriptionModal = (employer) => {
    setSelectedEmployer(employer);
    setSubscriptionForm({
      plan_id: employer.employer_subscription?.plan_id || 'employer-starter',
      status: employer.employer_subscription?.status || 'active',
      duration_days: 30
    });
    setShowSubscriptionModal(true);
  };

  const openDetailsModal = async (employer) => {
    try {
      const res = await fetch(`${API_URL}/api/employer-management/employers/${employer.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSelectedEmployer(data.employer);
        setShowDetailsModal(true);
      }
    } catch (error) {
      console.error('Error fetching employer details:', error);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: 'Password copied to clipboard' });
  };

  const getStatusBadge = (status) => {
    if (status === 'active') return <Badge className="bg-green-100 text-green-700">Active</Badge>;
    if (status === 'suspended') return <Badge className="bg-red-100 text-red-700">Suspended</Badge>;
    return <Badge className="bg-gray-100 text-gray-600">{status}</Badge>;
  };

  const getSubscriptionBadge = (subscription) => {
    if (!subscription) return <Badge className="bg-gray-100 text-gray-600">None</Badge>;
    const status = subscription.status;
    if (status === 'active') return <Badge className="bg-blue-100 text-blue-700">Subscribed</Badge>;
    if (status === 'trial') return <Badge className="bg-amber-100 text-amber-700">Trial</Badge>;
    if (status === 'expired') return <Badge className="bg-red-100 text-red-700">Expired</Badge>;
    return <Badge className="bg-gray-100 text-gray-600">{status}</Badge>;
  };

  return (
    <div className="space-y-6" data-testid="admin-employers-page">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-white border-gray-200">
          <CardContent className="p-4">
            <p className="text-gray-500 text-sm">Total Employers</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-gray-200">
          <CardContent className="p-4">
            <p className="text-gray-500 text-sm">Active</p>
            <p className="text-2xl font-bold text-green-600">{stats.active || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-gray-200">
          <CardContent className="p-4">
            <p className="text-gray-500 text-sm">Suspended</p>
            <p className="text-2xl font-bold text-red-600">{stats.suspended || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-gray-200">
          <CardContent className="p-4">
            <p className="text-gray-500 text-sm">On Trial</p>
            <p className="text-2xl font-bold text-amber-600">{stats.trial || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-gray-200">
          <CardContent className="p-4">
            <p className="text-gray-500 text-sm">Subscribed</p>
            <p className="text-2xl font-bold text-blue-600">{stats.subscribed || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Header with Search and Actions */}
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-gray-900 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                Employer Management
              </CardTitle>
              <CardDescription className="text-gray-500">
                Create, edit, and manage employer accounts
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Add Employer
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, email, or company..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-gray-50 border-gray-300 text-gray-900"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 bg-gray-50 border-gray-300 text-gray-900">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-200">
                <SelectItem value="all" className="text-gray-900">All Status</SelectItem>
                <SelectItem value="active" className="text-gray-900">Active</SelectItem>
                <SelectItem value="suspended" className="text-gray-900">Suspended</SelectItem>
              </SelectContent>
            </Select>
            <Select value={subscriptionFilter} onValueChange={setSubscriptionFilter}>
              <SelectTrigger className="w-40 bg-gray-50 border-gray-300 text-gray-900">
                <SelectValue placeholder="Subscription" />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-200">
                <SelectItem value="all" className="text-gray-900">All Subscriptions</SelectItem>
                <SelectItem value="active" className="text-gray-900">Subscribed</SelectItem>
                <SelectItem value="trial" className="text-gray-900">Trial</SelectItem>
                <SelectItem value="expired" className="text-gray-900">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Employers Table */}
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : employers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No employers found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-gray-200">
                    <th className="pb-3 text-gray-600 font-medium">Employer</th>
                    <th className="pb-3 text-gray-600 font-medium">Company</th>
                    <th className="pb-3 text-gray-600 font-medium text-center">Status</th>
                    <th className="pb-3 text-gray-600 font-medium text-center">Subscription</th>
                    <th className="pb-3 text-gray-600 font-medium text-center">Jobs</th>
                    <th className="pb-3 text-gray-600 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employers.map((employer) => (
                    <tr key={employer.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4">
                        <p className="text-gray-900 font-medium">{employer.full_name}</p>
                        <p className="text-gray-500 text-sm">{employer.email}</p>
                      </td>
                      <td className="py-4">
                        <p className="text-gray-700">{employer.company_name || '-'}</p>
                      </td>
                      <td className="py-4 text-center">
                        {getStatusBadge(employer.status)}
                      </td>
                      <td className="py-4 text-center">
                        {getSubscriptionBadge(employer.employer_subscription)}
                      </td>
                      <td className="py-4 text-center">
                        <span className="text-gray-900">
                          {employer.employer_subscription?.jobs_posted || 0} / {employer.employer_subscription?.jobs_limit || 0}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDetailsModal(employer)}
                            title="View Details"
                            className="hover:bg-gray-100"
                          >
                            <Eye className="h-4 w-4 text-gray-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditModal(employer)}
                            title="Edit"
                            className="hover:bg-gray-100"
                          >
                            <Edit className="h-4 w-4 text-gray-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openPasswordModal(employer)}
                            title="Reset Password"
                            className="hover:bg-gray-100"
                          >
                            <Key className="h-4 w-4 text-gray-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openSubscriptionModal(employer)}
                            title="Manage Subscription"
                            className="hover:bg-gray-100"
                          >
                            <Crown className="h-4 w-4 text-gray-500" />
                          </Button>
                          {employer.status === 'active' ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleSuspend(employer)}
                              title="Suspend"
                              className="hover:bg-red-50"
                            >
                              <Ban className="h-4 w-4 text-red-600" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleReactivate(employer)}
                              title="Reactivate"
                              className="hover:bg-green-50"
                            >
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="border-gray-300 text-gray-700"
              >
                Previous
              </Button>
              <span className="text-gray-600 py-2 px-4">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                className="border-gray-300 text-gray-700"
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Employer Modal */}
      <Dialog open={showCreateModal} onOpenChange={(open) => {
        setShowCreateModal(open);
        if (!open) {
          setGeneratedPassword('');
          setCreateForm({ email: '', full_name: '', company_name: '', phone: '', password: '' });
        }
      }}>
        <DialogContent className="bg-white border-gray-200 text-gray-900">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Create New Employer</DialogTitle>
            <DialogDescription className="text-gray-500">
              Add a new employer account to the platform
            </DialogDescription>
          </DialogHeader>
          
          {generatedPassword ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-700 font-medium mb-2">Employer Created Successfully!</p>
                <p className="text-gray-600 text-sm mb-3">Save this auto-generated password:</p>
                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded p-2">
                  <code className="text-green-600 flex-1">{generatedPassword}</code>
                  <Button size="icon" variant="ghost" onClick={() => copyToClipboard(generatedPassword)} className="hover:bg-gray-100">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Button onClick={() => {
                setShowCreateModal(false);
                setGeneratedPassword('');
                setCreateForm({ email: '', full_name: '', company_name: '', phone: '', password: '' });
              }} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                Done
              </Button>
            </div>
          ) : (
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-sm text-gray-600">Email *</label>
                <Input
                  type="email"
                  required
                  value={createForm.email}
                  onChange={(e) => setCreateForm(f => ({ ...f, email: e.target.value }))}
                  className="bg-gray-50 border-gray-300 text-gray-900"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Full Name *</label>
                <Input
                  required
                  value={createForm.full_name}
                  onChange={(e) => setCreateForm(f => ({ ...f, full_name: e.target.value }))}
                  className="bg-gray-50 border-gray-300 text-gray-900"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Company Name</label>
                <Input
                  value={createForm.company_name}
                  onChange={(e) => setCreateForm(f => ({ ...f, company_name: e.target.value }))}
                  className="bg-gray-50 border-gray-300 text-gray-900"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Phone</label>
                <Input
                  value={createForm.phone}
                  onChange={(e) => setCreateForm(f => ({ ...f, phone: e.target.value }))}
                  className="bg-gray-50 border-gray-300 text-gray-900"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Password (leave empty to auto-generate)</label>
                <Input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm(f => ({ ...f, password: e.target.value }))}
                  className="bg-gray-50 border-gray-300 text-gray-900"
                  placeholder="Auto-generate if empty"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={processing} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Employer
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Employer Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="bg-white border-gray-200 text-gray-900">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Edit Employer</DialogTitle>
            <DialogDescription className="text-gray-500">
              Update employer details for {selectedEmployer?.email}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="text-sm text-gray-600">Full Name</label>
              <Input
                value={editForm.full_name || ''}
                onChange={(e) => setEditForm(f => ({ ...f, full_name: e.target.value }))}
                className="bg-gray-50 border-gray-300 text-gray-900"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Company Name</label>
              <Input
                value={editForm.company_name || ''}
                onChange={(e) => setEditForm(f => ({ ...f, company_name: e.target.value }))}
                className="bg-gray-50 border-gray-300 text-gray-900"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Phone</label>
              <Input
                value={editForm.phone || ''}
                onChange={(e) => setEditForm(f => ({ ...f, phone: e.target.value }))}
                className="bg-gray-50 border-gray-300 text-gray-900"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Status</label>
              <Select value={editForm.status} onValueChange={(v) => setEditForm(f => ({ ...f, status: v }))}>
                <SelectTrigger className="bg-gray-50 border-gray-300 text-gray-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  <SelectItem value="active" className="text-gray-900">Active</SelectItem>
                  <SelectItem value="suspended" className="text-gray-900">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={processing} className="bg-blue-600 hover:bg-blue-700 text-white">
                {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Password Reset Modal */}
      <Dialog open={showPasswordModal} onOpenChange={(open) => {
        setShowPasswordModal(open);
        if (!open) setGeneratedPassword('');
      }}>
        <DialogContent className="bg-white border-gray-200 text-gray-900">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Reset Password</DialogTitle>
            <DialogDescription className="text-gray-500">
              Reset password for {selectedEmployer?.email}
            </DialogDescription>
          </DialogHeader>
          
          {generatedPassword ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-700 font-medium mb-2">Password Reset Successfully!</p>
                <p className="text-gray-600 text-sm mb-3">New password:</p>
                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded p-2">
                  <code className="text-green-600 flex-1">{generatedPassword}</code>
                  <Button size="icon" variant="ghost" onClick={() => copyToClipboard(generatedPassword)} className="hover:bg-gray-100">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Button onClick={() => {
                setShowPasswordModal(false);
                setGeneratedPassword('');
              }} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                Done
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-gray-700 text-sm">
                    This will generate a new random password for the employer. 
                    Make sure to share it with them securely.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowPasswordModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleResetPassword} disabled={processing} className="bg-amber-600 hover:bg-amber-700 text-white">
                  {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Reset Password
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Subscription Modal */}
      <Dialog open={showSubscriptionModal} onOpenChange={setShowSubscriptionModal}>
        <DialogContent className="bg-white border-gray-200 text-gray-900">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Manage Subscription</DialogTitle>
            <DialogDescription className="text-gray-500">
              Update subscription for {selectedEmployer?.email}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateSubscription} className="space-y-4">
            <div>
              <label className="text-sm text-gray-600">Plan</label>
              <Select value={subscriptionForm.plan_id} onValueChange={(v) => setSubscriptionForm(f => ({ ...f, plan_id: v }))}>
                <SelectTrigger className="bg-gray-50 border-gray-300 text-gray-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  <SelectItem value="employer-starter" className="text-gray-900">Starter (3 jobs)</SelectItem>
                  <SelectItem value="employer-professional" className="text-gray-900">Professional (10 jobs)</SelectItem>
                  <SelectItem value="employer-enterprise" className="text-gray-900">Enterprise (Unlimited)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-gray-600">Status</label>
              <Select value={subscriptionForm.status} onValueChange={(v) => setSubscriptionForm(f => ({ ...f, status: v }))}>
                <SelectTrigger className="bg-gray-50 border-gray-300 text-gray-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  <SelectItem value="active" className="text-gray-900">Active</SelectItem>
                  <SelectItem value="trial" className="text-gray-900">Trial</SelectItem>
                  <SelectItem value="expired" className="text-gray-900">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-gray-600">Duration (days)</label>
              <Input
                type="number"
                min="1"
                value={subscriptionForm.duration_days}
                onChange={(e) => setSubscriptionForm(f => ({ ...f, duration_days: parseInt(e.target.value) || 30 }))}
                className="bg-gray-50 border-gray-300 text-gray-900"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowSubscriptionModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={processing} className="bg-blue-600 hover:bg-blue-700 text-white">
                {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Update Subscription
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Employer Details</DialogTitle>
          </DialogHeader>
          {selectedEmployer && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-500 text-sm">Full Name</p>
                  <p className="text-gray-900">{selectedEmployer.full_name}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Email</p>
                  <p className="text-gray-900">{selectedEmployer.email}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Company</p>
                  <p className="text-gray-900">{selectedEmployer.company_name || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Phone</p>
                  <p className="text-gray-900">{selectedEmployer.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Status</p>
                  {getStatusBadge(selectedEmployer.status)}
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Created</p>
                  <p className="text-gray-900">{new Date(selectedEmployer.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              
              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-gray-900 font-medium mb-3">Subscription</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-500 text-sm">Plan</p>
                    <p className="text-gray-900">{selectedEmployer.employer_subscription?.plan_id || 'None'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">Status</p>
                    {getSubscriptionBadge(selectedEmployer.employer_subscription)}
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">Jobs Posted</p>
                    <p className="text-gray-900">
                      {selectedEmployer.employer_subscription?.jobs_posted || 0} / {selectedEmployer.employer_subscription?.jobs_limit || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">Expires</p>
                    <p className="text-gray-900">
                      {selectedEmployer.employer_subscription?.expires_at 
                        ? new Date(selectedEmployer.employer_subscription.expires_at).toLocaleDateString()
                        : '-'}
                    </p>
                  </div>
                </div>
              </div>
              
              {selectedEmployer.stats && (
                <div className="border-t border-gray-200 pt-4">
                  <h4 className="text-gray-900 font-medium mb-3">Activity Stats</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-100">
                      <Briefcase className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                      <p className="text-2xl font-bold text-gray-900">{selectedEmployer.stats.jobs_posted}</p>
                      <p className="text-gray-500 text-xs">Jobs Posted</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-100">
                      <FileText className="h-5 w-5 text-purple-600 mx-auto mb-1" />
                      <p className="text-2xl font-bold text-gray-900">{selectedEmployer.stats.total_contracts}</p>
                      <p className="text-gray-500 text-xs">Total Contracts</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-100">
                      <CheckCircle className="h-5 w-5 text-green-600 mx-auto mb-1" />
                      <p className="text-2xl font-bold text-gray-900">{selectedEmployer.stats.active_contracts}</p>
                      <p className="text-gray-500 text-xs">Active Contracts</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminEmployers;
