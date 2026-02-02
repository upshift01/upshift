import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Zap, LogOut, User, ChevronDown, Users, UserPlus, Briefcase, CreditCard, Settings, LayoutDashboard, Shield } from 'lucide-react';
import { Button } from './ui/button';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [talentDropdownOpen, setTalentDropdownOpen] = useState(false);
  const [remoteJobsDropdownOpen, setRemoteJobsDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();

  const navItems = [
    { name: 'AI Resume Builder', path: '/builder' },
    { name: 'Improve Resume', path: '/improve' },
    { name: 'Cover Letter', path: '/cover-letter' },
    { name: 'ATS Checker', path: '/ats-checker', isFree: true },
    { name: 'Skills Generator', path: '/skills-generator', isFree: true }
  ];

  const handleLogout = () => {
    logout();
    setIsMenuOpen(false);
    setUserMenuOpen(false);
  };

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDashboardPath = () => {
    if (!user) return '/dashboard';
    switch (user.role) {
      case 'recruiter': return '/recruiter';
      case 'employer': return '/employer';
      case 'super_admin': return '/super-admin';
      case 'reseller': return '/reseller-dashboard';
      default: return '/dashboard';
    }
  };

  const getRoleName = () => {
    if (!user) return 'User';
    switch (user.role) {
      case 'recruiter': return 'Recruiter';
      case 'employer': return 'Employer';
      case 'super_admin': return 'Admin';
      case 'reseller': return 'Reseller';
      case 'job_seeker': return 'Job Seeker';
      default: return 'User';
    }
  };

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group flex-shrink-0">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center transform group-hover:scale-105 transition-transform">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              UpShift
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-4 flex-1 justify-center">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`text-sm font-medium transition-colors hover:text-blue-600 whitespace-nowrap ${
                  location.pathname === item.path
                    ? 'text-blue-600'
                    : 'text-gray-700'
                }`}
              >
                {item.name}
                {item.isFree && (
                  <sup className="text-[8px] font-bold text-green-600">FREE</sup>
                )}
              </Link>
            ))}
            
            {/* Talent Pool Dropdown */}
            <div 
              className="relative"
              onMouseEnter={() => setTalentDropdownOpen(true)}
              onMouseLeave={() => setTalentDropdownOpen(false)}
            >
              <button
                className={`text-sm font-medium transition-colors hover:text-blue-600 whitespace-nowrap flex items-center gap-1 ${
                  location.pathname.includes('talent-pool')
                    ? 'text-blue-600'
                    : 'text-gray-700'
                }`}
              >
                Talent Pool
                <ChevronDown className="h-3 w-3" />
              </button>
              
              {talentDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  <Link
                    to="/talent-pool"
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                    onClick={() => setTalentDropdownOpen(false)}
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <Users className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">For Recruiters</div>
                      <div className="text-xs text-gray-500">Browse & hire talent</div>
                    </div>
                  </Link>
                  {/* Hide "Join Talent Pool" for employers - they hire, not join */}
                  {user?.role !== 'employer' && (
                    <Link
                      to={isAuthenticated ? "/dashboard/talent-pool" : "/register?redirect=/dashboard/talent-pool"}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                      onClick={() => setTalentDropdownOpen(false)}
                    >
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                        <UserPlus className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">Join Talent Pool</div>
                        <div className="text-xs text-gray-500">Get discovered by employers</div>
                      </div>
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* Remote Jobs Dropdown - Only for non-recruiters */}
            {user?.role !== 'recruiter' && (
            <div 
              className="relative"
              onMouseEnter={() => setRemoteJobsDropdownOpen(true)}
              onMouseLeave={() => setRemoteJobsDropdownOpen(false)}
            >
              <button
                className={`text-sm font-medium transition-colors hover:text-blue-600 whitespace-nowrap flex items-center gap-1 ${
                  location.pathname.includes('remote-jobs')
                    ? 'text-blue-600'
                    : 'text-gray-700'
                }`}
              >
                Remote Jobs
                <ChevronDown className="h-3 w-3" />
              </button>
              
              {remoteJobsDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  <Link
                    to="/remote-jobs"
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                    onClick={() => setRemoteJobsDropdownOpen(false)}
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <Briefcase className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">Browse Jobs</div>
                      <div className="text-xs text-gray-500">Find remote opportunities</div>
                    </div>
                  </Link>
                  {user?.role === 'employer' && (
                    <Link
                      to="/remote-jobs/post"
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                      onClick={() => setRemoteJobsDropdownOpen(false)}
                    >
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                        <UserPlus className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">Post a Job</div>
                        <div className="text-xs text-gray-500">Hire remote talent</div>
                      </div>
                    </Link>
                  )}
                  {isAuthenticated && user?.role !== 'employer' && user?.role !== 'recruiter' && user?.role !== 'super_admin' && user?.role !== 'reseller' && (
                    <Link
                      to="/remote-jobs/my-proposals"
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                      onClick={() => setRemoteJobsDropdownOpen(false)}
                    >
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                        <Users className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">My Proposals</div>
                        <div className="text-xs text-gray-500">Track your applications</div>
                      </div>
                    </Link>
                  )}
                  {!isAuthenticated && (
                    <Link
                      to="/login"
                      className="block px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-b-lg"
                    >
                      Login to Apply
                    </Link>
                  )}
                </div>
              )}
            </div>
            )}
          </div>

          {/* Right Side - Auth Actions */}
          <div className="hidden lg:flex items-center space-x-2 flex-shrink-0">
            {isAuthenticated ? (
              <>
                {/* Notification Bell */}
                <NotificationBell />
                
                {/* User Menu Dropdown */}
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      {user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                    </div>
                    <div className="text-left hidden xl:block">
                      <p className="text-sm font-medium text-gray-900 truncate max-w-[120px]">
                        {user?.full_name || 'User'}
                      </p>
                      <p className="text-xs text-gray-500">{getRoleName()}</p>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                      {/* User Info Header */}
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900 truncate">{user?.full_name || 'User'}</p>
                        <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">
                          {getRoleName()}
                        </span>
                      </div>
                      
                      {/* Menu Items */}
                      <div className="py-1">
                        <Link
                          to={getDashboardPath()}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <LayoutDashboard className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-700">Dashboard</span>
                        </Link>
                        
                        {user?.role === 'super_admin' && (
                          <Link
                            to="/super-admin/payment-settings"
                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <CreditCard className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-700">Payment Settings</span>
                          </Link>
                        )}
                        
                        {(user?.role === 'job_seeker' || user?.role === 'employer') && (
                          <Link
                            to="/contracts"
                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <Briefcase className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-700">My Contracts</span>
                          </Link>
                        )}
                        
                        {(user?.role === 'job_seeker' || user?.role === 'employer') && (
                          <Link
                            to="/escrow"
                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <Shield className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-700">Escrow Dashboard</span>
                          </Link>
                        )}
                        
                        {user?.role === 'job_seeker' && (
                          <Link
                            to="/stripe-connect"
                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <CreditCard className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-700">Payout Settings</span>
                          </Link>
                        )}
                        
                        <Link
                          to={user?.role === 'employer' ? '/employer/settings' : '/dashboard/settings'}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <Settings className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-700">Settings</span>
                        </Link>
                      </div>
                      
                      {/* Logout */}
                      <div className="border-t border-gray-100 pt-1">
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 transition-colors w-full text-left"
                        >
                          <LogOut className="h-4 w-4 text-red-500" />
                          <span className="text-sm text-red-600">Logout</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <Link to="/login">
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
                  Login
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="lg:hidden bg-white border-t border-gray-200 py-4">
          <div className="px-4 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`block py-2 text-base font-medium ${
                  location.pathname === item.path
                    ? 'text-blue-600'
                    : 'text-gray-700 hover:text-blue-600'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                {item.name}
                {item.isFree && (
                  <sup className="text-[8px] font-bold text-green-600 ml-1">FREE</sup>
                )}
              </Link>
            ))}
            
            <Link
              to="/talent-pool"
              className="block py-2 text-base font-medium text-gray-700 hover:text-blue-600"
              onClick={() => setIsMenuOpen(false)}
            >
              Talent Pool
            </Link>
            
            {user?.role !== 'recruiter' && (
              <Link
                to="/remote-jobs"
                className="block py-2 text-base font-medium text-gray-700 hover:text-blue-600"
                onClick={() => setIsMenuOpen(false)}
              >
                Remote Jobs
              </Link>
            )}
            
            {isAuthenticated ? (
              <div className="border-t border-gray-200 pt-4 mt-4 space-y-2">
                <div className="flex items-center gap-3 py-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                    {user?.full_name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{user?.full_name || 'User'}</p>
                    <p className="text-sm text-gray-500">{getRoleName()}</p>
                  </div>
                </div>
                
                <Link
                  to={getDashboardPath()}
                  className="flex items-center gap-3 py-2 text-gray-700 hover:text-blue-600"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <LayoutDashboard className="h-5 w-5" />
                  Dashboard
                </Link>
                
                <Link
                  to="/contracts"
                  className="flex items-center gap-3 py-2 text-gray-700 hover:text-blue-600"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Briefcase className="h-5 w-5" />
                  My Contracts
                </Link>
                
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 py-2 text-red-600 hover:text-red-700 w-full"
                >
                  <LogOut className="h-5 w-5" />
                  Logout
                </button>
              </div>
            ) : (
              <div className="border-t border-gray-200 pt-4 mt-4">
                <Link
                  to="/login"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
                    Login
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
