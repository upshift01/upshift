import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PricingSection from '../components/PricingSection';
import { Badge } from '../components/ui/badge';
import { Zap } from 'lucide-react';
import axios from 'axios';
import { useToast } from '../hooks/use-toast';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const PricingPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, getAuthHeader } = useAuth();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleTierSelect = async (tier) => {
    if (!isAuthenticated) {
      // Redirect to register if not logged in
      navigate('/register', { state: { selectedTier: tier.id } });
      return;
    }

    setIsProcessing(true);

    try {
      // Create checkout with backend
      const response = await axios.post(
        `${API_URL}/api/payments/create-checkout?tier_id=${tier.id}`,
        {},
        { headers: getAuthHeader() }
      );

      // Handle both snake_case (from our backend) and camelCase (from Yoco directly)
      const redirectUrl = response.data.redirect_url || response.data.redirectUrl;
      const checkoutId = response.data.checkout_id || response.data.checkoutId;

      if (redirectUrl) {
        // Store checkout ID in localStorage for retrieval after Yoco redirect
        if (checkoutId) {
          localStorage.setItem('pending_checkout_id', checkoutId);
          localStorage.setItem('pending_checkout_tier', tier.id);
        }
        // Redirect to Yoco payment page
        window.location.href = redirectUrl;
      } else {
        throw new Error('No redirect URL received from payment gateway');
      }
    } catch (error) {
      console.error('Payment error:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to initiate payment. Please try again.';
      toast({
        title: 'Payment Error',
        description: errorMessage,
        variant: 'destructive'
      });
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto py-12 px-4">
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white border-none">
            <Zap className="mr-1 h-3 w-3" />
            Upgrade Your Career Today
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Professional AI Career Services
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Premium, one-time payment for professional, ATS-optimised career documents. No subscriptions - pay once, get results.
          </p>
        </div>

        <PricingSection onTierSelect={handleTierSelect} />

        {user?.active_tier && (
          <div className="mt-12 max-w-2xl mx-auto">
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 text-center">
              <h3 className="text-lg font-semibold text-green-900 mb-2">
                Active Plan: {user.active_tier === 'tier-1' ? 'ATS Optimise' : user.active_tier === 'tier-2' ? 'Professional Package' : 'Executive Elite'}
              </h3>
              <p className="text-green-700">
                You have full access to all features in your plan. Purchase additional services anytime!
              </p>
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-900 font-medium">Redirecting to payment...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PricingPage;
