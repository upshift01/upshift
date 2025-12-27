import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePartner } from '../context/PartnerContext';
import { 
  LayoutDashboard, 
  FileText, 
  BarChart3, 
  CreditCard, 
  Settings, 
  Briefcase, 
  MessageSquare,
  Target,
  Linkedin,
  Menu,
  X,
  LogOut,
  Sparkles,
  Zap,
  Mail
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';

const PartnerCustomerLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { brandName, primaryColor, secondaryColor, baseUrl, logoUrl } = usePartner();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    // Redirect to partner home page after logout
    navigate(baseUrl);
  };

  const navItems = [
    { path: `${baseUrl}/dashboard`, icon: LayoutDashboard, label: 'Dashboard', exact: true },
    { path: `${baseUrl}/dashboard/documents`, icon: FileText, label: 'My Documents' },
    { path: `${baseUrl}/dashboard/analytics`, icon: BarChart3, label: 'Usage & Analytics' },
    { path: `${baseUrl}/dashboard/billing`, icon: CreditCard, label: 'Billing' },
    { path: `${baseUrl}/dashboard/jobs`, icon: Briefcase, label: 'Job Tracker', badge: 'NEW' },
    { path: `${baseUrl}/dashboard/interview-prep`, icon: MessageSquare, label: 'Interview Prep', badge: 'NEW' },
    { path: `${baseUrl}/dashboard/settings`, icon: Settings, label: 'Settings' },
  ];

  const toolItems = [
    { path: `${baseUrl}/ats-checker`, icon: Target, label: 'ATS Checker', badge: 'FREE' },
    { path: `${baseUrl}/skills-generator`, icon: Sparkles, label: 'Skills Generator', badge: 'FREE' },
    { path: `${baseUrl}/builder`, icon: FileText, label: 'AI Resume Builder', badge: 'PRO' },
    { path: `${baseUrl}/improve`, icon: Zap, label: 'Improve CV', badge: 'PRO' },
    { path: `${baseUrl}/cover-letter`, icon: Mail, label: 'Cover Letter', badge: 'PRO' },
    { path: `${baseUrl}/linkedin-tools`, icon: Linkedin, label: 'LinkedIn Tools', badge: 'PRO' },
  ];

  const isActive = (path, exact = false) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const getTierName = (tier) => {
    const tiers = {
      'tier-1': 'ATS Optimise',
      'tier-2': 'Professional',
      'tier-3': 'Executive Elite'
    };
    return tiers[tier] || 'Free';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-white border-r border-gray-200
        transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-full flex flex-col">
          {/* Logo/Header */}
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <Link to={baseUrl} className="flex items-center space-x-2">
                {logoUrl ? (
                  <img src={logoUrl} alt={brandName} className="h-8 w-8 object-contain" />
                ) : (
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Zap className="h-4 w-4 text-white" />
                  </div>
                )}
                <span 
                  className="font-bold text-lg"
                  style={{ color: primaryColor }}
                >
                  {brandName}
                </span>
              </Link>
              <button 
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* User Info */}
          <div className="p-4 border-b bg-gray-50">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
                style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
              >
                {user?.full_name?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.full_name || 'User'}
                </p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
            <Badge 
              className="mt-2 text-xs"
              style={user?.active_tier ? { backgroundColor: `${primaryColor}20`, color: primaryColor } : {}}
            >
              {getTierName(user?.active_tier)}
            </Badge>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Portal
            </p>
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium
                  transition-colors duration-150
                  ${isActive(item.path, item.exact)
                    ? 'text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }
                `}
                style={isActive(item.path, item.exact) ? { backgroundColor: primaryColor } : {}}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </div>
                {item.badge && (
                  <Badge className={`text-xs ${isActive(item.path, item.exact) ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'}`}>
                    {item.badge}
                  </Badge>
                )}
              </Link>
            ))}

            <div className="pt-4 mt-4 border-t">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Tools
              </p>
              {toolItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium
                    transition-colors duration-150
                    ${isActive(item.path)
                      ? 'text-white'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }
                  `}
                  style={isActive(item.path) ? { backgroundColor: primaryColor } : {}}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </div>
                  {item.badge && (
                    <Badge className={`text-xs ${
                      isActive(item.path) 
                        ? 'bg-white/20 text-white' 
                        : item.badge === 'FREE' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-blue-100 text-blue-700'
                    }`}>
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              ))}
            </div>
          </nav>

          {/* Logout */}
          <div className="p-4 border-t">
            <Button 
              variant="ghost" 
              className="w-full justify-start text-gray-600 hover:text-red-600 hover:bg-red-50"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5 mr-3" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b px-4 py-3 flex items-center justify-between">
          <button 
            className="p-2 hover:bg-gray-100 rounded-lg"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link to={baseUrl} className="flex items-center space-x-2">
            {logoUrl ? (
              <img src={logoUrl} alt={brandName} className="h-8 w-8 object-contain" />
            ) : (
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: primaryColor }}
              >
                <Zap className="h-4 w-4 text-white" />
              </div>
            )}
            <span className="font-bold text-lg">{brandName}</span>
          </Link>
          <div className="w-10" /> {/* Spacer */}
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default PartnerCustomerLayout;
