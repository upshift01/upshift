import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Zap, LogOut, User, ChevronDown, Users, UserPlus, Briefcase, CreditCard } from 'lucide-react';
import { Button } from './ui/button';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [talentDropdownOpen, setTalentDropdownOpen] = useState(false);
  const location = useLocation();
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
  };

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center transform group-hover:scale-105 transition-transform">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              UpShift
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
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
                  <Link
                    to={isAuthenticated ? "/dashboard/talent-pool" : "/register?redirect=/dashboard/talent-pool"}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                    onClick={() => setTalentDropdownOpen(false)}
                  >
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <UserPlus className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">For Job Seekers</div>
                      <div className="text-xs text-gray-500">Get discovered by recruiters</div>
                    </div>
                  </Link>
                </div>
              )}
            </div>
            
            {/* Remote Jobs Dropdown */}
            <div className="relative group">
              <Link
                to="/remote-jobs"
                className={`text-sm font-medium transition-colors hover:text-blue-600 whitespace-nowrap flex items-center gap-1 ${
                  location.pathname.includes('remote-jobs')
                    ? 'text-blue-600'
                    : 'text-gray-700'
                }`}
              >
                <Briefcase className="h-4 w-4" />
                Remote Jobs
                <ChevronDown className="h-3 w-3" />
              </Link>
              <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <Link
                  to="/remote-jobs"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg"
                >
                  Browse Jobs
                </Link>
                {isAuthenticated && (
                  <>
                    <Link
                      to="/remote-jobs/company-dashboard"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Company Dashboard
                    </Link>
                    <Link
                      to="/remote-jobs/my-jobs"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      My Posted Jobs
                    </Link>
                    <Link
                      to="/remote-jobs/recommendations"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Job Recommendations
                    </Link>
                    <Link
                      to="/remote-jobs/my-proposals"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      My Proposals
                    </Link>
                    <Link
                      to="/contracts"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      My Contracts
                    </Link>
                    <Link
                      to="/remote-jobs/post"
                      className="block px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-b-lg font-medium"
                    >
                      + Post a Job
                    </Link>
                  </>
                )}
              </div>
            </div>
            
            {isAuthenticated ? (
              <>
                {user?.role === 'super_admin' && (
                  <Link to="/admin/payment-settings">
                    <Button variant="ghost" size="sm" className="text-gray-600">
                      <CreditCard className="h-4 w-4 mr-2" />
                      Payment Settings
                    </Button>
                  </Link>
                )}
                <Link to={user?.role === 'recruiter' ? '/recruiter' : user?.role === 'super_admin' ? '/super-admin' : '/dashboard'}>
                  <Button variant="ghost" size="sm">
                    <User className="h-4 w-4 mr-2" />
                    Dashboard
                  </Button>
                </Link>
                <Button
                  onClick={handleLogout}
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
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
            className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden pb-4 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMenuOpen(false)}
                className={`block px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-100 rounded-md ${
                  location.pathname === item.path
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-700'
                }`}
              >
                {item.name}
                {item.isFree && (
                  <sup className="text-[8px] font-bold text-green-600">FREE</sup>
                )}
              </Link>
            ))}
            
            {/* Mobile Talent Pool Links */}
            <div className="px-4 py-2 border-t border-gray-100 mt-2">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Talent Pool</p>
              <Link
                to="/talent-pool"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-2 py-2 text-sm text-gray-700 hover:text-blue-600"
              >
                <Users className="h-4 w-4" />
                For Recruiters - Browse Talent
              </Link>
              <Link
                to={isAuthenticated ? "/dashboard/talent-pool" : "/register?redirect=/dashboard/talent-pool"}
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-2 py-2 text-sm text-gray-700 hover:text-green-600"
              >
                <UserPlus className="h-4 w-4" />
                For Job Seekers - Get Discovered
              </Link>
            </div>
            
            {isAuthenticated ? (
              <>
                <Link to="/dashboard" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start">
                    <User className="h-4 w-4 mr-2" />
                    Dashboard
                  </Button>
                </Link>
                <Button
                  onClick={handleLogout}
                  variant="ghost"
                  className="w-full justify-start text-red-600 hover:text-red-700"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </>
            ) : (
              <div className="px-4 pt-2 space-y-2">
                <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                  <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
                    Login
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;