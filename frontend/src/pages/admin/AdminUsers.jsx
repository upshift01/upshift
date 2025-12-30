import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Users, Search, Shield, Building2, UserCircle, Plus, MoreVertical, Edit2, Trash2, KeyRound, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useToast } from '../../components/ui/use-toast';

const AdminUsers = () => {
  const { token } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [resetPasswordUser, setResetPasswordUser] = useState(null);
  const [actionMenuUser, setActionMenuUser] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const fetchUsers = async () => {
    try {
      const url = new URL(`${process.env.REACT_APP_BACKEND_URL}/api/admin/users`);
      if (roleFilter) url.searchParams.append('role', roleFilter);
      
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Are you sure you want to delete ${user.full_name || user.email}?`)) {
      return;
    }
    
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/users/${user.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        toast({ title: 'User Deleted', description: 'User has been deleted successfully' });
        fetchUsers();
      } else {
        const data = await response.json();
        toast({ title: 'Error', description: data.detail || 'Failed to delete user', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete user', variant: 'destructive' });
    }
    setActionMenuUser(null);
  };

  const filteredUsers = users.filter(u =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const getRoleBadge = (role) => {
    const styles = {
      super_admin: 'bg-purple-100 text-purple-800',
      reseller_admin: 'bg-blue-100 text-blue-800',
      customer: 'bg-gray-100 text-gray-800'
    };
    const icons = {
      super_admin: Shield,
      reseller_admin: Building2,
      customer: UserCircle
    };
    const labels = {
      super_admin: 'Super Admin',
      reseller_admin: 'Reseller Admin',
      customer: 'Customer'
    };
    const Icon = icons[role] || UserCircle;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[role] || styles.customer}`}>
        <Icon className="h-3 w-3" />
        {labels[role] || role}
      </span>
    );
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-600">Manage platform users</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Admin
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Shield className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Super Admins</p>
                <p className="text-xl font-bold">
                  {users.filter(u => u.role === 'super_admin').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Reseller Admins</p>
                <p className="text-xl font-bold">
                  {users.filter(u => u.role === 'reseller_admin').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <UserCircle className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Customers</p>
                <p className="text-xl font-bold">
                  {users.filter(u => u.role === 'customer').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="">All Roles</option>
              <option value="super_admin">Super Admin</option>
              <option value="reseller_admin">Reseller Admin</option>
              <option value="customer">Customer</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">User</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Email</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Role</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Reseller</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Joined</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-medium text-sm">
                              {user.full_name?.charAt(0) || 'U'}
                            </span>
                          </div>
                          <span className="font-medium">{user.full_name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{user.email}</td>
                      <td className="py-3 px-4">{getRoleBadge(user.role)}</td>
                      <td className="py-3 px-4">
                        {user.reseller_name ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                            <Building2 className="h-3 w-3" />
                            {user.reseller_name}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.is_active !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {user.is_active !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="relative">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setActionMenuUser(actionMenuUser === user.id ? null : user.id)}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                          {actionMenuUser === user.id && (
                            <div className="absolute right-0 top-8 bg-white border rounded-lg shadow-lg z-10 py-1 min-w-[160px]">
                              <button 
                                onClick={() => { setEditingUser(user); setActionMenuUser(null); }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                              >
                                <Edit2 className="h-4 w-4" /> Edit User
                              </button>
                              <button 
                                onClick={() => { setResetPasswordUser(user); setActionMenuUser(null); }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                              >
                                <KeyRound className="h-4 w-4" /> Reset Password
                              </button>
                              <button 
                                onClick={() => handleDeleteUser(user)}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 text-red-600"
                              >
                                <Trash2 className="h-4 w-4" /> Delete User
                              </button>
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

      {/* Create Admin Modal */}
      {showCreateModal && (
        <CreateAdminModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchUsers();
          }}
          token={token}
        />
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSuccess={() => {
            setEditingUser(null);
            fetchUsers();
            toast({ title: 'User Updated', description: 'User details have been updated' });
          }}
          token={token}
        />
      )}

      {/* Reset Password Modal */}
      {resetPasswordUser && (
        <ResetPasswordModal
          user={resetPasswordUser}
          onClose={() => setResetPasswordUser(null)}
          onSuccess={() => {
            setResetPasswordUser(null);
            toast({ title: 'Password Reset', description: 'User password has been reset' });
          }}
          token={token}
        />
      )}
    </div>
  );
};

const CreateAdminModal = ({ onClose, onSuccess, token }) => {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/create-admin`, {
        method: 'POST',
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
        setError(data.detail || 'Failed to create admin');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">Create Super Admin</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>
          )}
          
          <div>
            <label className="block text-sm font-medium mb-1">Full Name *</label>
            <Input
              required
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email *</label>
            <Input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password *</label>
            <Input
              type="password"
              required
              minLength={6}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Creating...' : 'Create Admin'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

const EditUserModal = ({ user, onClose, onSuccess, token }) => {
  const [formData, setFormData] = useState({
    full_name: user.full_name || '',
    email: user.email || '',
    role: user.role || 'customer',
    is_active: user.is_active !== false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/users/${user.id}`, {
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
        setError(data.detail || 'Failed to update user');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold">Edit User</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>
          )}
          
          <div>
            <label className="block text-sm font-medium mb-1">Full Name *</label>
            <Input
              required
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email *</label>
            <Input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="customer">Customer</option>
              <option value="reseller_admin">Reseller Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="is_active" className="text-sm">Active User</label>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ResetPasswordModal = ({ user, onClose, onSuccess, token }) => {
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/users/${user.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ new_password: newPassword })
      });

      if (response.ok) {
        onSuccess();
      } else {
        const data = await response.json();
        setError(data.detail || 'Failed to reset password');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold">Reset Password</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>
          )}
          
          <p className="text-gray-600 text-sm">
            Reset password for <strong>{user.full_name || user.email}</strong>
          </p>

          <div>
            <label className="block text-sm font-medium mb-1">New Password *</label>
            <Input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminUsers;
