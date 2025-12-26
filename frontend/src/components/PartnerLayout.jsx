import React, { useState } from 'react';
import { useParams, Outlet, Link, useNavigate } from 'react-router-dom';
import { PartnerProvider, usePartner } from '../context/PartnerContext';
import { Loader2, AlertCircle, Home, ChevronDown, FileText, Sparkles, Target, Zap, Mail, Menu, X } from 'lucide-react';
import { Button } from '../components/ui/button';

// Partner Navbar Component
const PartnerNavbar = () => {
  const { brandName, logoUrl, primaryColor, baseUrl, contactPhone } = usePartner();
  const [toolsOpen, setToolsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { name: 'Home', path: baseUrl || '/' },
    { name: 'Services', path: `${baseUrl}/pricing` },
    { name: 'About', path: `${baseUrl}/about` },
    { name: 'Contact', path: `${baseUrl}/contact` },
  ];

  const toolsItems = [
    { name: 'ATS Checker', path: `${baseUrl}/ats-checker`, icon: Target, badge: 'FREE' },
    { name: 'CV Builder', path: `${baseUrl}/cv-builder`, icon: FileText, badge: 'FREE' },
    { name: 'Cover Letter Creator', path: `${baseUrl}/cover-letter`, icon: Sparkles, badge: 'AI' },
    { name: 'Improve Resume', path: `${baseUrl}/improve-resume`, icon: Zap, badge: 'AI' },
    { name: 'Skills Generator', path: `${baseUrl}/skills-generator`, icon: Target, badge: 'FREE' },
    { name: 'CV Templates', path: `${baseUrl}/cv-templates`, icon: FileText },
    { name: 'Cover Letter Templates', path: `${baseUrl}/cover-letter-templates`, icon: Mail },
  ];

  return (
    <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to={baseUrl || '/'} className="flex items-center gap-2">
              {logoUrl ? (
                <img src={logoUrl} alt={brandName} className="h-8 w-auto" />
              ) : (
                <span 
                  className="text-xl font-bold"
                  style={{ color: primaryColor }}
                >
                  {brandName}
                </span>
              )}
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                {item.name}
              </Link>
            ))}
            
            {/* Tools Dropdown */}
            <div className="relative">
              <button
                onClick={() => setToolsOpen(!toolsOpen)}
                onBlur={() => setTimeout(() => setToolsOpen(false), 200)}
                className="flex items-center gap-1 text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                Tools
                <ChevronDown className={`h-4 w-4 transition-transform ${toolsOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {toolsOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border py-2 z-50">
                  {toolsItems.map((tool) => (
                    <Link
                      key={tool.name}
                      to={tool.path}
                      className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors"
                    >
                      <tool.icon className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-700">{tool.name}</span>
                      {tool.badge && (
                        <span 
                          className="ml-auto text-xs px-2 py-0.5 rounded-full"
                          style={{ 
                            backgroundColor: tool.badge === 'AI' ? `${primaryColor}20` : '#dcfce7',
                            color: tool.badge === 'AI' ? primaryColor : '#16a34a'
                          }}
                        >
                          {tool.badge}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {contactPhone && (
              <a href={`tel:${contactPhone}`} className="hidden lg:block text-sm text-gray-600">
                {contactPhone}
              </a>
            )}
            <Link to={`${baseUrl}/login`} className="hidden sm:block">
              <Button variant="outline" size="sm">Login</Button>
            </Link>
            <Link to={`${baseUrl}/register`} className="hidden sm:block">
              <Button 
                size="sm"
                style={{ backgroundColor: primaryColor }}
                className="text-white hover:opacity-90"
              >
                Get Started
              </Button>
            </Link>
            
            {/* Mobile menu button */}
            <button
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
        
        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t py-4">
            <div className="space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  className="block px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              <div className="px-4 py-2 text-sm font-semibold text-gray-400">Tools</div>
              {toolsItems.map((tool) => (
                <Link
                  key={tool.name}
                  to={tool.path}
                  className="flex items-center gap-3 px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <tool.icon className="h-4 w-4" />
                  {tool.name}
                  {tool.badge && (
                    <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-600">
                      {tool.badge}
                    </span>
                  )}
                </Link>
              ))}
              <div className="px-4 pt-4 flex gap-2">
                <Link to={`${baseUrl}/login`} className="flex-1">
                  <Button variant="outline" className="w-full">Login</Button>
                </Link>
                <Link to={`${baseUrl}/register`} className="flex-1">
                  <Button className="w-full" style={{ backgroundColor: primaryColor }}>Get Started</Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

// Partner Footer Component
const PartnerFooter = () => {
  const { 
    brandName, 
    primaryColor, 
    contactEmail, 
    contactPhone, 
    contactAddress,
    socialMedia,
    baseUrl 
  } = usePartner();

  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-1">
            <h3 className="text-xl font-bold mb-4" style={{ color: primaryColor }}>
              {brandName}
            </h3>
            <p className="text-gray-400 mb-4 text-sm">
              Professional career services powered by AI technology.
            </p>
            {contactAddress && (
              <p className="text-gray-400 text-sm">{contactAddress}</p>
            )}
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li><Link to={`${baseUrl}/pricing`} className="hover:text-white">Services</Link></li>
              <li><Link to={`${baseUrl}/about`} className="hover:text-white">About Us</Link></li>
              <li><Link to={`${baseUrl}/contact`} className="hover:text-white">Contact</Link></li>
              <li><Link to={`${baseUrl}/terms`} className="hover:text-white">Terms</Link></li>
              <li><Link to={`${baseUrl}/privacy`} className="hover:text-white">Privacy</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Free Tools</h4>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li><Link to={`${baseUrl}/ats-checker`} className="hover:text-white">ATS Checker</Link></li>
              <li><Link to={`${baseUrl}/cv-builder`} className="hover:text-white">CV Builder</Link></li>
              <li><Link to={`${baseUrl}/cover-letter`} className="hover:text-white">Cover Letter Creator</Link></li>
              <li><Link to={`${baseUrl}/skills-generator`} className="hover:text-white">Skills Generator</Link></li>
              <li><Link to={`${baseUrl}/improve-resume`} className="hover:text-white">Improve Resume</Link></li>
              <li><Link to={`${baseUrl}/cv-templates`} className="hover:text-white">CV Templates</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <ul className="space-y-2 text-gray-400 text-sm">
              {contactEmail && (
                <li>
                  <a href={`mailto:${contactEmail}`} className="hover:text-white">
                    {contactEmail}
                  </a>
                </li>
              )}
              {contactPhone && (
                <li>
                  <a href={`tel:${contactPhone}`} className="hover:text-white">
                    {contactPhone}
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400 text-sm">
          <p>&copy; {new Date().getFullYear()} {brandName}. All rights reserved.</p>
          <p className="mt-2">
            Powered by <a href="/" className="text-blue-400 hover:underline">UpShift</a>
          </p>
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
      <p className="text-gray-600">Loading partner site...</p>
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

  if (loading) {
    return <PartnerLoading />;
  }

  if (error || !isPartner) {
    return <PartnerError error={error} subdomain={subdomain} />;
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
