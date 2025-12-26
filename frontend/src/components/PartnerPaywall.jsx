import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePartner } from '../context/PartnerContext';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Lock, 
  Sparkles, 
  CheckCircle, 
  ArrowRight,
  Crown,
  Zap,
  Shield
} from 'lucide-react';

const PartnerPaywall = ({ 
  title = "Unlock This Feature",
  description,
  features = [],
  requiredTier = "any", // "any", "tier-2", "tier-3"
  icon: CustomIcon
}) => {
  const { user, isAuthenticated } = useAuth();
  const { brandName, primaryColor, secondaryColor, baseUrl, pricing } = usePartner();

  const Icon = CustomIcon || Lock;

  const getTierName = (tier) => {
    const tiers = {
      'tier-1': 'ATS Optimise',
      'tier-2': 'Professional Package',
      'tier-3': 'Executive Elite'
    };
    return tiers[tier] || tier;
  };

  const getRequiredTierText = () => {
    if (requiredTier === 'tier-2') return 'Professional Package or higher';
    if (requiredTier === 'tier-3') return 'Executive Elite';
    return 'any paid plan';
  };

  const defaultDescription = !isAuthenticated 
    ? `Sign in to your ${brandName} account to access this feature`
    : `Upgrade to ${getRequiredTierText()} to unlock this powerful tool`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-gray-900/80 to-gray-900/90 backdrop-blur-sm"
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Decorative top gradient */}
        <div 
          className="h-2"
          style={{ background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})` }}
        />
        
        <div className="p-8">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div 
              className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ 
                background: `linear-gradient(135deg, ${primaryColor}15, ${secondaryColor}15)`,
                border: `2px solid ${primaryColor}30`
              }}
            >
              <Icon className="h-10 w-10" style={{ color: primaryColor }} />
            </div>
          </div>

          {/* Title & Description */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {title}
            </h2>
            <p className="text-gray-600">
              {description || defaultDescription}
            </p>
          </div>

          {/* Features List */}
          {features.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                What you'll get
              </p>
              <ul className="space-y-3">
                {features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-3">
                    <div 
                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${primaryColor}20` }}
                    >
                      <CheckCircle className="h-3 w-3" style={{ color: primaryColor }} />
                    </div>
                    <span className="text-sm text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* CTA Buttons */}
          {!isAuthenticated ? (
            <div className="space-y-3">
              <Link to={`${baseUrl}/login`} className="block">
                <Button 
                  className="w-full h-12 text-base font-semibold text-white shadow-lg hover:shadow-xl transition-shadow"
                  style={{ 
                    background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` 
                  }}
                >
                  Sign In to Continue
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">or</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              <Link to={`${baseUrl}/register`} className="block">
                <Button variant="outline" className="w-full h-12 text-base font-semibold">
                  Create Free Account
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <Link to={`${baseUrl}/pricing`} className="block">
                <Button 
                  className="w-full h-12 text-base font-semibold text-white shadow-lg hover:shadow-xl transition-shadow"
                  style={{ 
                    background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` 
                  }}
                >
                  <Crown className="mr-2 h-5 w-5" />
                  View Pricing Plans
                </Button>
              </Link>
              <p className="text-center text-xs text-gray-500">
                Starting from R{pricing?.tier_1_price || 499} once-off
              </p>
            </div>
          )}

          {/* Trust Badges */}
          <div className="flex items-center justify-center gap-4 mt-6 pt-6 border-t border-gray-100">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Shield className="h-3 w-3" />
              <span>Secure Payment</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Zap className="h-3 w-3" />
              <span>Instant Access</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Sparkles className="h-3 w-3" />
              <span>AI-Powered</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartnerPaywall;
