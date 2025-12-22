import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { 
  Facebook, 
  Twitter, 
  Linkedin, 
  Instagram, 
  Youtube,
  Mail,
  Phone,
  MapPin,
  Zap,
  ArrowUpRight
} from 'lucide-react';

const Footer = () => {
  const { theme } = useTheme();
  const currentYear = new Date().getFullYear();

  const menuLinks = [
    { name: 'Home', path: '/' },
    { name: 'AI Resume Builder', path: '/builder' },
    { name: 'Improve Resume', path: '/improve' },
    { name: 'Cover Letter', path: '/cover-letter' },
    { name: 'Templates', path: '/templates' },
    { name: 'ATS Checker', path: '/ats-checker' },
  ];

  const serviceLinks = [
    { name: 'Pricing', path: '/pricing' },
    { name: 'CV Templates', path: '/templates' },
    { name: 'Cover Letter Templates', path: '/cover-letter-templates' },
    { name: 'LinkedIn Tools', path: '/linkedin-tools' },
    { name: 'Book Strategy Call', path: '/book-strategy-call' },
    { name: 'White-Label Partners', path: '/white-label' },
    { name: 'Contact Us', path: '/contact' },
  ];

  const legalLinks = [
    { name: 'Privacy Policy', path: '/privacy-policy' },
    { name: 'Terms of Service', path: '/terms-of-service' },
    { name: 'Refund Policy', path: '/refund-policy' },
    { name: 'Cookie Policy', path: '/cookie-policy' },
    { name: 'POPIA Compliance', path: '/popia-compliance' },
  ];

  const socialLinks = [
    { name: 'Facebook', icon: Facebook, url: 'https://facebook.com/upshiftcv', color: '#1877F2' },
    { name: 'Twitter', icon: Twitter, url: 'https://twitter.com/upshiftcv', color: '#1DA1F2' },
    { name: 'LinkedIn', icon: Linkedin, url: 'https://linkedin.com/company/upshiftcv', color: '#0A66C2' },
    { name: 'Instagram', icon: Instagram, url: 'https://instagram.com/upshiftcv', color: '#E4405F' },
    { name: 'YouTube', icon: Youtube, url: 'https://youtube.com/@upshiftcv', color: '#FF0000' },
  ];

  return (
    <footer className="bg-gray-900 text-white">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div 
                className="h-10 w-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: theme.primaryColor }}
              >
                <Zap className="h-5 w-5 text-white" />
              </div>
              <span className="text-2xl font-bold">UpShift</span>
            </Link>
            <p className="text-gray-400 mb-6 max-w-md">
              Empowering South African job seekers with AI-powered CV and career tools. 
              Create professional, ATS-optimized resumes that get you noticed.
            </p>
            
            {/* Contact Info */}
            <div className="space-y-3 text-gray-400">
              <a href="mailto:support@upshift.works" className="flex items-center gap-2 hover:text-white transition-colors">
                <Mail className="h-4 w-4" />
                <span>support@upshift.works</span>
              </a>
              <a href="tel:+27112345678" className="flex items-center gap-2 hover:text-white transition-colors">
                <Phone className="h-4 w-4" />
                <span>+27 (0) 11 234 5678</span>
              </a>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5" />
                <span>123 Main Street, Sandton, Johannesburg, South Africa</span>
              </div>
            </div>

            {/* Social Media */}
            <div className="flex gap-3 mt-6">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors group"
                  title={social.name}
                >
                  <social.icon 
                    className="h-5 w-5 text-gray-400 group-hover:text-white transition-colors" 
                  />
                </a>
              ))}
            </div>
          </div>

          {/* Menu Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-3">
              {menuLinks.map((link) => (
                <li key={link.path}>
                  <Link 
                    to={link.path} 
                    className="text-gray-400 hover:text-white transition-colors flex items-center gap-1 group"
                  >
                    {link.name}
                    <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Services</h3>
            <ul className="space-y-3">
              {serviceLinks.map((link) => (
                <li key={link.path}>
                  <Link 
                    to={link.path} 
                    className="text-gray-400 hover:text-white transition-colors flex items-center gap-1 group"
                  >
                    {link.name}
                    <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Legal</h3>
            <ul className="space-y-3">
              {legalLinks.map((link) => (
                <li key={link.path}>
                  <Link 
                    to={link.path} 
                    className="text-gray-400 hover:text-white transition-colors flex items-center gap-1 group"
                  >
                    {link.name}
                    <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar / Trademark */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-gray-400 text-sm text-center md:text-left">
              <p>© {currentYear} UpShift. All rights reserved.</p>
              <p className="mt-1">
                UpShift™ is a registered trademark. Made with ❤️ in South Africa.
              </p>
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-500">
              <Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy</Link>
              <span>•</span>
              <Link to="/terms-of-service" className="hover:text-white transition-colors">Terms</Link>
              <span>•</span>
              <Link to="/cookie-policy" className="hover:text-white transition-colors">Cookies</Link>
              <span>•</span>
              <Link to="/sitemap" className="hover:text-white transition-colors">Sitemap</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
