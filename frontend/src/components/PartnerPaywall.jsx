import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  Shield,
  Loader2,
  CreditCard
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const PartnerPaywall = ({ 
  title = "Unlock This Feature",
  description,
  features = [],
  requiredTier = "any", // "any", "tier-2", "tier-3"
  icon: CustomIcon
}) => {
  const { user, isAuthenticated, token } = useAuth();
  const { brandName, primaryColor, secondaryColor, baseUrl, pricing } = usePartner();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedTier, setSelectedTier] = useState(null);
  const [error, setError] = useState('');

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

  // Pricing tiers with Yoco integration
  const pricingTiers = [
    {
      id: 'tier-1',
      name: 'ATS Optimise',
      price: pricing?.tier_1_price || 499,
      description: 'Basic AI features',
      popular: false
    },
    {
      id: 'tier-2',
      name: 'Professional',
      price: pricing?.tier_2_price || 899,
      description: 'Full AI toolkit',
      popular: true
    },
    {
      id: 'tier-3',
      name: 'Executive Elite',
      price: pricing?.tier_3_price || 2999,
      description: 'Premium + Strategy Call',
      popular: false
    }
  ];

  // Handle Yoco Payment
  const handlePayment = async (tierId) => {
    if (!isAuthenticated || !token) {
      navigate(`${baseUrl}/login`);
      return;
    }

    setIsProcessing(true);
    setSelectedTier(tierId);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/payments/create-checkout?tier_id=${tierId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok && data.redirect_url) {
        // Redirect to Yoco checkout
        window.location.href = data.redirect_url;
      } else {
        setError(data.detail || 'Failed to initiate payment. Please try again.');
        setIsProcessing(false);
        setSelectedTier(null);
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError('Unable to connect to payment service. Please try again.');
      setIsProcessing(false);
      setSelectedTier(null);
    }
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
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Decorative top gradient */}
        <div 
          className="h-2"
          style={{ background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})` }}
        />
        
        <div className="p-6 md:p-8">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div 
              className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ 
                background: `linear-gradient(135deg, ${primaryColor}15, ${secondaryColor}15)`,
                border: `2px solid ${primaryColor}30`
              }}
            >
              <Icon className="h-8 w-8" style={{ color: primaryColor }} />
            </div>
          </div>

          {/* Title & Description */}
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {title}
            </h2>
            <p className="text-gray-600">
              {description || defaultDescription}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          {/* Features List */}
          {features.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                What you'll get
              </p>
              <ul className="space-y-2">
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
            <div className="space-y-4">
              {/* Quick Payment Options */}
              <p className="text-sm font-semibold text-gray-700 text-center">
                Choose a plan to unlock instantly:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {pricingTiers.map((tier) => {
                  const isDisabled = requiredTier === 'tier-2' && tier.id === 'tier-1';
                  const isDisabledTier3 = requiredTier === 'tier-3' && (tier.id === 'tier-1' || tier.id === 'tier-2');
                  const disabled = isDisabled || isDisabledTier3;
                  
                  return (
                    <div 
                      key={tier.id}
                      className={`relative border-2 rounded-xl p-4 transition-all ${
                        tier.popular 
                          ? 'border-blue-500 bg-blue-50/50' 
                          : disabled
                            ? 'border-gray-200 bg-gray-50 opacity-60'
                            : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      {tier.popular && (
                        <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs">
                          Popular
                        </Badge>
                      )}
                      
                      <div className="text-center mb-3">
                        <h3 className="font-semibold text-gray-900">{tier.name}</h3>
                        <p className="text-xs text-gray-500">{tier.description}</p>
                      </div>
                      
                      <div className="text-center mb-3">
                        <span className="text-2xl font-bold" style={{ color: primaryColor }}>
                          R{tier.price.toLocaleString()}
                        </span>
                        <span className="text-xs text-gray-500 block">once-off</span>
                      </div>
                      
                      <Button
                        onClick={() => handlePayment(tier.id)}
                        disabled={isProcessing || disabled}
                        className={`w-full text-sm ${
                          tier.popular 
                            ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                            : disabled
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : ''
                        }`}
                        style={!tier.popular && !disabled ? { 
                          background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                          color: 'white'
                        } : {}}
                      >
                        {isProcessing && selectedTier === tier.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : disabled ? (
                          'Not Available'
                        ) : (
                          <>
                            <CreditCard className="mr-2 h-4 w-4" />
                            Pay Now
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>

              <div className="text-center">
                <Link 
                  to={`${baseUrl}/pricing`} 
                  className="text-sm text-gray-500 hover:text-gray-700 underline"
                >
                  View full plan details
                </Link>
              </div>
            </div>
          )}

          {/* Trust Badges */}
          <div className="flex items-center justify-center gap-4 mt-6 pt-4 border-t border-gray-100">
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
