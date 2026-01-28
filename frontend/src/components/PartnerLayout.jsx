import React, { useState } from 'react';
import { useParams, Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { PartnerProvider, usePartner } from '../context/PartnerContext';
import { 
  Loader2, AlertCircle, Home, Menu, X, Zap, LogOut, User,
  Mail, Phone, MapPin, Facebook, Twitter, Linkedin, Instagram, Youtube
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';

// Partner Navbar Component - Mirrors main site Navbar
const PartnerNavbar = () => {
  const { brandName, logoUrl, primaryColor, secondaryColor, baseUrl, contactPhone } = usePartner();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();

  // Same nav items as main site, but without white-label option and About
  const navItems = [
    { name: 'AI Resume Builder', path: `${baseUrl}/builder` },
    { name: 'Improve Resume', path: `${baseUrl}/improve` },
    { name: 'Cover Letter', path: `${baseUrl}/cover-letter` },
    { name: 'ATS Checker', path: `${baseUrl}/ats-checker`, isFree: true },
    { name: 'Skills Generator', path: `${baseUrl}/skills-generator`, isFree: true },
    { name: 'Talent Pool', path: `${baseUrl}/talent-pool` },
    { name: 'Contact', path: `${baseUrl}/contact` }
  ];

  const handleLogout = () => {
    logout();
    setIsMenuOpen(false);
    // Redirect to partner home page after logout to show branded site
    navigate(baseUrl);
  };

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to={baseUrl} className="flex items-center space-x-2 group">
            {logoUrl ? (
              <>
                <img src={logoUrl} alt={brandName} className="h-10 w-auto" />
                <span 
                  className="text-2xl font-bold bg-clip-text text-transparent hidden sm:inline"
                  style={{ backgroundImage: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
                >
                  {brandName}
                </span>
              </>
            ) : (
              <>
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center transform group-hover:scale-105 transition-transform"
                  style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
                >
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <span 
                  className="text-2xl font-bold bg-clip-text text-transparent"
                  style={{ backgroundImage: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
                >
                  {brandName}
                </span>
              </>
            )}
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-6">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`text-sm font-medium transition-colors hover:text-blue-600 whitespace-nowrap ${
                  location.pathname === item.path ? 'text-blue-600' : 'text-gray-700'
                }`}
              >
                {item.name}
                {item.isFree && (
                  <sup className="text-[8px] font-bold text-green-600">FREE</sup>
                )}
              </Link>
            ))}
            
            {isAuthenticated ? (
              <>
                <Link to={`${baseUrl}/dashboard`}>
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
              <>
                <Link to={`${baseUrl}/login`}>
                  <Button variant="ghost" size="sm">Login</Button>
                </Link>
                <Link to={`${baseUrl}/pricing`}>
                  <Button 
                    size="sm"
                    style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
                    className="text-white"
                  >
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="lg:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="lg:hidden border-t py-4">
            <div className="space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.name}
                  {item.isFree && (
                    <span className="ml-2 text-xs text-green-600 font-bold">FREE</span>
                  )}
                </Link>
              ))}
              <div className="px-4 pt-4 flex gap-2">
                {isAuthenticated ? (
                  <>
                    <Link to={`${baseUrl}/dashboard`} className="flex-1">
                      <Button variant="outline" className="w-full">Dashboard</Button>
                    </Link>
                    <Button onClick={handleLogout} variant="outline" className="flex-1 text-red-600">Logout</Button>
                  </>
                ) : (
                  <>
                    <Link to={`${baseUrl}/login`} className="flex-1">
                      <Button variant="outline" className="w-full">Login</Button>
                    </Link>
                    <Link to={`${baseUrl}/pricing`} className="flex-1">
                      <Button className="w-full" style={{ backgroundColor: primaryColor }}>Get Started</Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

// Partner Footer Component - Mirrors main site Footer (without white-label link)
const PartnerFooter = () => {
  const { 
    brandName, 
    primaryColor,
    secondaryColor,
    logoUrl,
    contactEmail, 
    contactPhone, 
    contactAddress,
    contactWhatsapp,
    socialMedia,
    baseUrl 
  } = usePartner();

  const currentYear = new Date().getFullYear();

  const menuLinks = [
    { name: 'Home', path: baseUrl },
    { name: 'About', path: `${baseUrl}/about` },
    { name: 'AI Resume Builder', path: `${baseUrl}/builder` },
    { name: 'Improve Resume', path: `${baseUrl}/improve` },
    { name: 'Cover Letter', path: `${baseUrl}/cover-letter` },
    { name: 'Templates', path: `${baseUrl}/templates` },
    { name: 'ATS Checker', path: `${baseUrl}/ats-checker` },
  ];

  const serviceLinks = [
    { name: 'Pricing', path: `${baseUrl}/pricing` },
    { name: 'CV Templates', path: `${baseUrl}/templates` },
    { name: 'Cover Letter Templates', path: `${baseUrl}/cover-letter-templates` },
    { name: 'Skills Generator', path: `${baseUrl}/skills-generator` },
    { name: 'LinkedIn Tools', path: `${baseUrl}/linkedin-tools` },
    { name: 'Book Strategy Call', path: `${baseUrl}/book-strategy-call` },
    { name: 'Contact Us', path: `${baseUrl}/contact` },
  ];

  const legalLinks = [
    { name: 'Privacy Policy', path: `${baseUrl}/privacy-policy` },
    { name: 'Terms of Service', path: `${baseUrl}/terms-of-service` },
    { name: 'Refund Policy', path: `${baseUrl}/refund-policy` },
  ];

  const socialIcons = [
    socialMedia?.facebook && { name: 'Facebook', icon: Facebook, url: socialMedia.facebook },
    socialMedia?.twitter && { name: 'Twitter', icon: Twitter, url: socialMedia.twitter },
    socialMedia?.linkedin && { name: 'LinkedIn', icon: Linkedin, url: socialMedia.linkedin },
    socialMedia?.instagram && { name: 'Instagram', icon: Instagram, url: socialMedia.instagram },
    socialMedia?.youtube && { name: 'YouTube', icon: Youtube, url: socialMedia.youtube },
  ].filter(Boolean);

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Link to={baseUrl} className="flex items-center gap-2 mb-4">
              {logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt={brandName} 
                  className="h-10 w-auto max-w-[120px] object-contain"
                />
              ) : (
                <div 
                  className="h-10 w-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Zap className="h-5 w-5 text-white" />
                </div>
              )}
              <span className="text-2xl font-bold">{brandName}</span>
            </Link>
            <p className="text-gray-400 mb-6 max-w-md">
              Empowering South African job seekers with AI-powered CV and career tools. 
              Create professional, ATS-optimised CVs that get you noticed.
            </p>
            
            {/* Contact Info */}
            <div className="space-y-3 text-gray-400">
              {contactEmail && (
                <a href={`mailto:${contactEmail}`} className="flex items-center gap-2 hover:text-white transition-colors">
                  <Mail className="h-4 w-4" />
                  <span>{contactEmail}</span>
                </a>
              )}
              {contactPhone && (
                <a href={`tel:${contactPhone.replace(/\s/g, '')}`} className="flex items-center gap-2 hover:text-white transition-colors">
                  <Phone className="h-4 w-4" />
                  <span>{contactPhone}</span>
                </a>
              )}
              {contactAddress && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>{contactAddress}</span>
                </div>
              )}
            </div>

            {/* Social Links */}
            {socialIcons.length > 0 && (
              <div className="flex gap-4 mt-6">
                {socialIcons.map((social) => (
                  <a
                    key={social.name}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <social.icon className="h-5 w-5" />
                  </a>
                ))}
              </div>
            )}
          </div>
          
          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4 text-white">Quick Links</h4>
            <ul className="space-y-2">
              {menuLinks.map((link) => (
                <li key={link.path}>
                  <Link to={link.path} className="text-gray-400 hover:text-white transition-colors text-sm">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Services */}
          <div>
            <h4 className="font-semibold mb-4 text-white">Services</h4>
            <ul className="space-y-2">
              {serviceLinks.map((link) => (
                <li key={link.path}>
                  <Link to={link.path} className="text-gray-400 hover:text-white transition-colors text-sm">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Legal */}
          <div>
            <h4 className="font-semibold mb-4 text-white">Legal</h4>
            <ul className="space-y-2">
              {legalLinks.map((link) => (
                <li key={link.path}>
                  <Link to={link.path} className="text-gray-400 hover:text-white transition-colors text-sm">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-sm">
              &copy; {currentYear} {brandName}. All rights reserved.
            </p>
            <p className="text-gray-500 text-sm">
              Powered by <a href="/" className="text-blue-400 hover:underline">UpShift</a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

// Loading State Component
const PartnerLoading = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
);

// Error State Component
const PartnerError = ({ error, subdomain }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <AlertCircle className="h-8 w-8 text-red-600" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Partner Not Found</h1>
      <p className="text-gray-600 mb-6">
        {error || `The partner "${subdomain}" could not be found or is not currently active.`}
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link to="/">
          <Button className="w-full sm:w-auto">
            <Home className="h-4 w-4 mr-2" />
            Go to UpShift
          </Button>
        </Link>
        <Link to="/white-label">
          <Button variant="outline" className="w-full sm:w-auto">
            Become a Partner
          </Button>
        </Link>
      </div>
    </div>
  </div>
);

// Partner Content Wrapper (inside the provider)
const PartnerContent = () => {
  const { loading, error, isPartner, subdomain } = usePartner();
  const location = useLocation();
  
  // Check if we're on a dashboard/portal route - these have their own layout
  const isDashboardRoute = location.pathname.includes('/dashboard');

  if (loading) {
    return <PartnerLoading />;
  }

  if (error || !isPartner) {
    return <PartnerError error={error} subdomain={subdomain} />;
  }

  // For dashboard routes, render without navbar/footer (they have their own layout)
  if (isDashboardRoute) {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <PartnerNavbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <PartnerFooter />
    </div>
  );
};

// Main Partner Layout Component
const PartnerLayout = () => {
  const { subdomain } = useParams();

  return (
    <PartnerProvider subdomain={subdomain}>
      <PartnerContent />
    </PartnerProvider>
  );
};

export default PartnerLayout;
