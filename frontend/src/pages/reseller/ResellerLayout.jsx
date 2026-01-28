import React, { useState, useEffect } from 'react';
import { Link, useLocation, Outlet, Navigate, useNavigate } from 'react-router-dom';
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
  LogOut,
  Bell,
  Menu,
  X,
  Moon,
  Sun,
  ChevronDown,
  Mail,
  Globe,
  Activity,
  HelpCircle,
  Zap,
  Calendar,
  Upload,
  CreditCard,
  UserSearch
} from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';

const ResellerLayout = () => {
  const { user, logout, token } = useAuth();
  const { theme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [resellerSubdomain, setResellerSubdomain] = useState(() => {
    // Try to get from localStorage first for immediate availability
    return localStorage.getItem('reseller_subdomain') || null;
  });

  // Fetch reseller subdomain for logout redirect
  const fetchResellerSubdomain = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/reseller/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setResellerSubdomain(data.subdomain);
        // Store in localStorage for immediate access on next login
        if (data.subdomain) {
          localStorage.setItem('reseller_subdomain', data.subdomain);
        }
      }
    } catch (error) {
      console.error('Error fetching reseller subdomain:', error);
    }
  };

  const handleLogout = () => {
    const subdomain = resellerSubdomain || localStorage.getItem('reseller_subdomain');
    // Clear the stored subdomain
    localStorage.removeItem('reseller_subdomain');
    
    // IMPORTANT: Navigate FIRST, then logout
    // This prevents the ResellerLayout's user check from redirecting to /login
    if (subdomain) {
      navigate(`/partner/${subdomain}`, { replace: true });
    } else {
      navigate('/', { replace: true });
    }
    
    // Logout after navigation is triggered
    setTimeout(() => {
      logout();
    }, 100);
  };

  const fetchNotifications = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/reseller/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unread_count || 0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const [trialStatus, setTrialStatus] = useState(null);
  
  const fetchTrialStatus = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/reseller/trial-status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTrialStatus(data);
      }
    } catch (error) {
      console.error('Error fetching trial status:', error);
    }
  };

  useEffect(() => {
    if (user && user.role === 'reseller_admin') {
      fetchNotifications();
      fetchResellerSubdomain();
      fetchTrialStatus();
    }
    // Toggle dark mode class on body
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode, user]);

  // Check if user is reseller admin
  if (!user || user.role !== 'reseller_admin') {
    return <Navigate to="/login" replace />;
  }

  // Check if trial expired and not on subscription page - redirect to subscription
  const isSubscriptionPage = location.pathname.includes('/subscription');
  if (trialStatus?.trial_expired && !isSubscriptionPage) {
    return <Navigate to="/reseller-dashboard/subscription" replace />;
  }

  const navItems = [
    { path: '/reseller-dashboard', icon: LayoutDashboard, label: 'Dashboard', exact: true },
    { path: '/reseller-dashboard/customers', icon: Users, label: 'Customers' },
    { path: '/reseller-dashboard/recruiters', icon: UserSearch, label: 'Recruiters', badge: 'New' },
    { path: '/reseller-dashboard/talent-pool', icon: UserSearch, label: 'Talent Pool' },
    { path: '/reseller-dashboard/calendar', icon: Calendar, label: 'Bookings' },
    { path: '/reseller-dashboard/revenue', icon: BarChart3, label: 'Analytics' },
    { path: '/reseller-dashboard/invoices', icon: Receipt, label: 'Invoices' },
    { path: '/reseller-dashboard/cv-templates', icon: Upload, label: 'CV Templates (.docx)', badge: 'New' },
    { path: '/reseller-dashboard/activity', icon: Activity, label: 'Activity Log', badge: 'New' },
    { path: '/reseller-dashboard/campaigns', icon: Mail, label: 'Email Campaigns', badge: 'New' },
  ];

  const settingsItems = [
    { path: '/reseller-dashboard/subscription', icon: CreditCard, label: 'Subscription', highlight: trialStatus?.is_trial || trialStatus?.trial_expired },
    { path: '/reseller-dashboard/pricing', icon: DollarSign, label: 'Pricing' },
    { path: '/reseller-dashboard/branding', icon: Palette, label: 'Branding' },
    { path: '/reseller-dashboard/domain-setup', icon: Globe, label: 'Domain Setup', badge: 'New' },
    { path: '/reseller-dashboard/email-templates', icon: Mail, label: 'Email Templates', badge: 'New' },
    { path: '/reseller-dashboard/settings', icon: Settings, label: 'Settings' },
  ];

  const isActive = (path, exact = false) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  const markNotificationRead = async (notificationId) => {
    try {
      await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/reseller/notifications/${notificationId}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchNotifications();
    } catch (error) {
      console.error('Error marking notification read:', error);
    }
  };

  return (
    <div className={`min-h-screen flex ${darkMode ? 'dark bg-gray-900' : 'bg-gray-100'}`}>
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 text-white flex flex-col transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        style={{ backgroundColor: darkMode ? '#1f2937' : theme.primaryColor }}
      >
        <div className="p-4 border-b border-white/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {theme.logoUrl ? (
                <img src={theme.logoUrl} alt={theme.brandName} className="h-8 w-auto" />
              ) : (
                <div className="h-10 w-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Zap className="h-5 w-5" />
                </div>
              )}
              <div>
                <h1 className="font-bold text-lg">{theme.brandName}</h1>
                <p className="text-xs opacity-70">Reseller Portal</p>
              </div>
            </div>
            <button 
              className="lg:hidden text-white/70 hover:text-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          {/* Main Navigation */}
          <p className="text-xs uppercase tracking-wider text-white/50 mb-3 px-3">Main</p>
          <ul className="space-y-1 mb-6">
            {navItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 ${
                    isActive(item.path, item.exact)
                      ? 'bg-white/20 text-white shadow-lg'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="h-5 w-5" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  {item.badge && (
                    <Badge className="bg-green-500 text-white text-xs px-1.5 py-0">{item.badge}</Badge>
                  )}
                </Link>
              </li>
            ))}
          </ul>

          {/* Settings Navigation */}
          <p className="text-xs uppercase tracking-wider text-white/50 mb-3 px-3">Settings</p>
          <ul className="space-y-1">
            {settingsItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 ${
                    isActive(item.path, item.exact)
                      ? 'bg-white/20 text-white shadow-lg'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="h-5 w-5" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  {item.badge && (
                    <Badge className="bg-green-500 text-white text-xs px-1.5 py-0">{item.badge}</Badge>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-white/20">
          <div className="flex items-center gap-3 mb-3">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
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
            onClick={handleLogout}
            className="flex items-center gap-2 text-white/70 hover:text-white w-full px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-sm"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className={`sticky top-0 z-30 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b px-4 py-3`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className={`h-5 w-5 ${darkMode ? 'text-white' : 'text-gray-600'}`} />
              </button>
              <div className="hidden sm:block">
                <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {navItems.find(item => isActive(item.path, item.exact))?.label || 
                   settingsItems.find(item => isActive(item.path))?.label || 
                   'Dashboard'}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Dark Mode Toggle */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-lg transition-colors ${darkMode ? 'bg-gray-700 text-yellow-400' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                title={darkMode ? 'Light Mode' : 'Dark Mode'}
              >
                {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>

              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={`p-2 rounded-lg transition-colors relative ${darkMode ? 'bg-gray-700 text-gray-300 hover:text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className={`absolute right-0 mt-2 w-80 rounded-xl shadow-xl border z-50 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <div className={`p-3 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                      <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Notifications</h3>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                          <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No new notifications</p>
                        </div>
                      ) : (
                        notifications.slice(0, 5).map((notif) => (
                          <div
                            key={notif.id}
                            onClick={() => markNotificationRead(notif.id)}
                            className={`p-3 border-b cursor-pointer transition-colors ${darkMode ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-100 hover:bg-gray-50'} ${!notif.read ? (darkMode ? 'bg-blue-900/20' : 'bg-blue-50') : ''}`}
                          >
                            <p className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>{notif.title}</p>
                            <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{notif.message}</p>
                            <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{notif.time_ago}</p>
                          </div>
                        ))
                      )}
                    </div>
                    {notifications.length > 0 && (
                      <div className="p-2 border-t border-gray-200 dark:border-gray-700">
                        <Link
                          to="/reseller-dashboard/activity"
                          className="block text-center text-sm text-blue-600 hover:text-blue-700 py-1"
                          onClick={() => setShowNotifications(false)}
                        >
                          View All Activity
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Help */}
              <button
                className={`p-2 rounded-lg transition-colors ${darkMode ? 'bg-gray-700 text-gray-300 hover:text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                title="Help & Support"
              >
                <HelpCircle className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className={`flex-1 overflow-auto ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
          <Outlet context={{ darkMode }} />
        </main>
      </div>

      {/* Click outside to close dropdowns */}
      {(showNotifications || showUserMenu) && (
        <div 
          className="fixed inset-0 z-20"
          onClick={() => {
            setShowNotifications(false);
            setShowUserMenu(false);
          }}
        />
      )}
    </div>
  );
};

export default ResellerLayout;
