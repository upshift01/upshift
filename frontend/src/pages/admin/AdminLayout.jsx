import React from 'react';
import { Link, useLocation, Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Building2,
  Receipt,
  BarChart3,
  Settings,
  LogOut,
  Shield,
  DollarSign
} from 'lucide-react';

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  // Check if user is super admin
  if (!user || user.role !== 'super_admin') {
    return <Navigate to="/login" replace />;
  }

  const navItems = [
    { path: '/super-admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
    { path: '/super-admin/resellers', icon: Building2, label: 'Resellers' },
    { path: '/super-admin/users', icon: Users, label: 'Users' },
    { path: '/super-admin/invoices', icon: Receipt, label: 'Invoices' },
    { path: '/super-admin/pricing', icon: DollarSign, label: 'Pricing' },
    { path: '/super-admin/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/super-admin/settings', icon: Settings, label: 'Settings' },
  ];

  const isActive = (path, exact = false) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-blue-400" />
            <div>
              <h1 className="font-bold text-lg">Super Admin</h1>
              <p className="text-xs text-gray-400">UpShift Platform</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive(item.path, item.exact)
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              {user.full_name?.charAt(0) || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.full_name}</p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-gray-400 hover:text-white w-full px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
