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
    { name: 'Contact Us', path: '/contact' },
    { name: 'Home', path: '/' },
    { name: 'About', path: '/about' },
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
    { name: 'Skills Generator', path: '/skills-generator' },
    { name: 'LinkedIn Tools', path: '/linkedin-tools' },
    { name: 'Book Strategy Call', path: '/book-strategy-call' },
    { name: 'White-Label Partners', path: '/white-label' },
  ];

  const legalLinks = [
    { name: 'Privacy Policy', path: '/privacy-policy' },
    { name: 'Terms of Service', path: '/terms-of-service' },
    { name: 'Refund Policy', path: '/refund-policy' },
    { name: 'Cookie Policy', path: '/cookie-policy' },
    { name: 'POPIA Compliance', path: '/popia-compliance' },
  ];

  // Build social links from theme
  const socialLinks = [
    theme.socialMedia?.facebook && { name: 'Facebook', icon: Facebook, url: theme.socialMedia.facebook, color: '#1877F2' },
    theme.socialMedia?.twitter && { name: 'Twitter', icon: Twitter, url: theme.socialMedia.twitter, color: '#1DA1F2' },
    theme.socialMedia?.linkedin && { name: 'LinkedIn', icon: Linkedin, url: theme.socialMedia.linkedin, color: '#0A66C2' },
    theme.socialMedia?.instagram && { name: 'Instagram', icon: Instagram, url: theme.socialMedia.instagram, color: '#E4405F' },
    theme.socialMedia?.youtube && { name: 'YouTube', icon: Youtube, url: theme.socialMedia.youtube, color: '#FF0000' },
  ].filter(Boolean);

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
              <span className="text-2xl font-bold">{theme.brandName}</span>
            </Link>
            <p className="text-gray-400 mb-6 max-w-md">
              Empowering South African job seekers with AI-powered CV and career tools. 
              Create professional, ATS-optimised CVs that get you noticed.
            </p>
            
            {/* Contact Info */}
            <div className="space-y-3 text-gray-400">
              {theme.contactEmail && (
                <a href={`mailto:${theme.contactEmail}`} className="flex items-center gap-2 hover:text-white transition-colors">
                  <Mail className="h-4 w-4" />
                  <span>{theme.contactEmail}</span>
                </a>
              )}
              {theme.contactPhone && (
                <a href={`tel:${theme.contactPhone.replace(/\s/g, '')}`} className="flex items-center gap-2 hover:text-white transition-colors">
                  <Phone className="h-4 w-4" />
                  <span>{theme.contactPhone}</span>
                </a>
              )}
              {theme.contactWhatsapp && (
                <a href={`https://wa.me/${theme.contactWhatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-white transition-colors">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  <span>WhatsApp</span>
                </a>
              )}
              {theme.contactAddress && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5" />
                  <span>{theme.contactAddress}</span>
                </div>
              )}
              {theme.businessHours && (
                <div className="flex items-start gap-2 text-sm">
                  <span className="text-gray-500">Hours:</span>
                  <span>{theme.businessHours}</span>
                </div>
              )}
            </div>

            {/* Social Media */}
            {socialLinks.length > 0 && (
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
            )}
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
              <p>© {currentYear} {theme.brandName}. All rights reserved.</p>
              <p className="mt-1">
                {theme.brandName}™ is a registered trademark. Made with ❤️ in South Africa.
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
