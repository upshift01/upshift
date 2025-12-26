import React from 'react';
import { useParams, Outlet, Link, useNavigate } from 'react-router-dom';
import { PartnerProvider, usePartner } from '../context/PartnerContext';
import { Loader2, AlertCircle, ArrowLeft, Home } from 'lucide-react';
import { Button } from '../components/ui/button';

// Partner Navbar Component
const PartnerNavbar = () => {
  const { brandName, logoUrl, primaryColor, baseUrl, contactPhone } = usePartner();
  const navigate = useNavigate();

  const navItems = [
    { name: 'Home', path: baseUrl || '/' },
    { name: 'Services', path: `${baseUrl}/pricing` },
    { name: 'ATS Checker', path: `${baseUrl}/ats-checker` },
    { name: 'Contact', path: `${baseUrl}/contact` },
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
          </div>
          
          <div className="flex items-center gap-4">
            {contactPhone && (
              <a href={`tel:${contactPhone}`} className="hidden md:block text-sm text-gray-600">
                {contactPhone}
              </a>
            )}
            <Link to={`${baseUrl}/login`}>
              <Button variant="outline" size="sm">Login</Button>
            </Link>
            <Link to={`${baseUrl}/register`}>
              <Button 
                size="sm"
                style={{ backgroundColor: primaryColor }}
                className="text-white hover:opacity-90"
              >
                Get Started
              </Button>
            </Link>
          </div>
        </div>
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
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-xl font-bold mb-4" style={{ color: primaryColor }}>
              {brandName}
            </h3>
            <p className="text-gray-400 mb-4">
              Professional career services powered by AI technology.
            </p>
            {contactAddress && (
              <p className="text-gray-400 text-sm">{contactAddress}</p>
            )}
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-gray-400">
              <li><Link to={`${baseUrl}/pricing`} className="hover:text-white">Services</Link></li>
              <li><Link to={`${baseUrl}/ats-checker`} className="hover:text-white">ATS Checker</Link></li>
              <li><Link to={`${baseUrl}/contact`} className="hover:text-white">Contact</Link></li>
              <li><Link to={`${baseUrl}/terms`} className="hover:text-white">Terms</Link></li>
              <li><Link to={`${baseUrl}/privacy`} className="hover:text-white">Privacy</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <ul className="space-y-2 text-gray-400">
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
