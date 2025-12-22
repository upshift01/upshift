import React from 'react';
import { Link, useLocation, Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  LayoutDashboard,
  Users,
  Settings,
  Receipt,
  BarChart3,
  Palette,
  DollarSign,
  LogOut
} from 'lucide-react';

const ResellerLayout = () => {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const location = useLocation();

  // Check if user is reseller admin
  if (!user || user.role !== 'reseller_admin') {
    return <Navigate to="/login" replace />;
  }

  const navItems = [
    { path: '/reseller-dashboard', icon: LayoutDashboard, label: 'Dashboard', exact: true },
    { path: '/reseller-dashboard/customers', icon: Users, label: 'Customers' },
    { path: '/reseller-dashboard/revenue', icon: BarChart3, label: 'Revenue' },
    { path: '/reseller-dashboard/invoices', icon: Receipt, label: 'Invoices' },
    { path: '/reseller-dashboard/pricing', icon: DollarSign, label: 'Pricing' },
    { path: '/reseller-dashboard/branding', icon: Palette, label: 'Branding' },
    { path: '/reseller-dashboard/settings', icon: Settings, label: 'Settings' },
  ];

  const isActive = (path, exact = false) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside 
        className="w-64 text-white flex flex-col"
        style={{ backgroundColor: theme.primaryColor }}
      >
        <div className="p-4 border-b border-white/20">
          <div className="flex items-center gap-2">
            {theme.logoUrl ? (
              <img src={theme.logoUrl} alt={theme.brandName} className="h-8 w-auto" />
            ) : (
              <div className="h-8 w-8 bg-white/20 rounded-lg flex items-center justify-center">
                <span className="font-bold">{theme.brandName?.charAt(0) || 'R'}</span>
              </div>
            )}
            <div>
              <h1 className="font-bold text-lg">{theme.brandName}</h1>
              <p className="text-xs opacity-70">Reseller Dashboard</p>
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
                      ? 'bg-white/20 text-white'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-white/20">
          <div className="flex items-center gap-3 mb-3">
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: theme.secondaryColor }}
            >
              {user.full_name?.charAt(0) || 'R'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.full_name}</p>
              <p className="text-xs opacity-70 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-white/70 hover:text-white w-full px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
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

export default ResellerLayout;
