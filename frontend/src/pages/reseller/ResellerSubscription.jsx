import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { 
  CheckCircle2, 
  AlertCircle, 
  CreditCard, 
  Loader2, 
  Crown,
  Zap,
  Building2,
  ArrowRight,
  Clock,
  Shield,
  Mail
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';

const ResellerSubscription = () => {
  const { token } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [trialStatus, setTrialStatus] = useState(null);
  const [currentPlan, setCurrentPlan] = useState(null);
  
  // Check for success redirect
  const successPlan = searchParams.get('plan');
  const [showSuccess, setShowSuccess] = useState(!!successPlan);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Handle successful payment redirect
    if (successPlan) {
      confirmSubscription();
    }
  }, [successPlan]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch plans
      const plansRes = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/reseller/subscription/plans`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (plansRes.ok) {
        const plansData = await plansRes.json();
        setPlans(plansData.plans || []);
      }
      
      // Fetch trial status
      const trialRes = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/reseller/trial-status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (trialRes.ok) {
        const trialData = await trialRes.json();
        setTrialStatus(trialData);
        if (!trialData.is_trial && trialData.plan) {
          setCurrentPlan(trialData.plan);
        }
      }
      
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  const confirmSubscription = async () => {
    try {
      // Get checkout ID from URL or session storage
      const checkoutId = sessionStorage.getItem('reseller_checkout_id');
      
      if (!checkoutId) {
        // If no checkout ID, just refresh the page data
        await fetchData();
        setShowSuccess(true);
        return;
      }
      
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/reseller/subscription/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          checkout_id: checkoutId,
          plan_id: successPlan
        })
      });
      
      if (response.ok) {
        sessionStorage.removeItem('reseller_checkout_id');
        await fetchData();
        setShowSuccess(true);
      }
    } catch (err) {
      console.error('Error confirming subscription:', err);
    }
  };

  const handleSelectPlan = async (planId) => {
    if (planId === 'enterprise') {
      // Contact sales
      window.location.href = 'mailto:sales@upshift.works?subject=Enterprise Plan Inquiry';
      return;
    }
    
    try {
      setProcessing(true);
      setError(null);
      
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/reseller/subscription/upgrade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ plan_id: planId })
      });
      
      const data = await response.json();
      
      if (data.success && data.checkout_url) {
        // Store checkout ID for confirmation
        sessionStorage.setItem('reseller_checkout_id', data.checkout_id);
        // Redirect to Yoco checkout
        window.location.href = data.checkout_url;
      } else if (data.contact_sales) {
        window.location.href = 'mailto:sales@upshift.works?subject=Enterprise Plan Inquiry';
      } else {
        setError(data.message || 'Failed to initiate checkout');
      }
      
    } catch (err) {
      console.error('Error selecting plan:', err);
      setError('Failed to process your request. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const getPlanIcon = (planId) => {
    switch (planId) {
      case 'starter': return <Zap className="h-6 w-6" />;
      case 'professional': return <Crown className="h-6 w-6" />;
      case 'enterprise': return <Building2 className="h-6 w-6" />;
      default: return <CreditCard className="h-6 w-6" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Success State
  if (showSuccess && !trialStatus?.is_trial) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-green-800 mb-2">Subscription Activated!</h2>
            <p className="text-green-700 mb-6">
              Your reseller account is now active. You can start using all features immediately.
            </p>
            <Button 
              onClick={() => navigate('/reseller-dashboard')}
              style={{ backgroundColor: theme.primaryColor }}
            >
              Go to Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {trialStatus?.trial_expired ? 'Reactivate Your Account' : 
           trialStatus?.is_trial ? 'Upgrade Your Plan' : 'Manage Subscription'}
        </h1>
        <p className="text-gray-600">
          {trialStatus?.trial_expired 
            ? 'Your trial has ended. Choose a plan to continue using your platform.'
            : trialStatus?.is_trial 
              ? `Your trial ends in ${trialStatus.days_remaining} days. Upgrade now for uninterrupted service.`
              : 'Manage your reseller subscription'}
        </p>
      </div>

      {/* Trial/Suspended Warning Banner */}
      {(trialStatus?.trial_expired || trialStatus?.is_trial && trialStatus?.days_remaining <= 3) && (
        <div className={`mb-8 p-4 rounded-lg border ${
          trialStatus?.trial_expired 
            ? 'bg-red-50 border-red-200' 
            : 'bg-amber-50 border-amber-200'
        }`}>
          <div className="flex items-start gap-3">
            <AlertCircle className={`h-5 w-5 mt-0.5 ${
              trialStatus?.trial_expired ? 'text-red-600' : 'text-amber-600'
            }`} />
            <div>
              <p className={`font-medium ${
                trialStatus?.trial_expired ? 'text-red-800' : 'text-amber-800'
              }`}>
                {trialStatus?.trial_expired 
                  ? 'Your account is currently suspended'
                  : 'Your trial is ending soon'}
              </p>
              <p className={`text-sm mt-1 ${
                trialStatus?.trial_expired ? 'text-red-700' : 'text-amber-700'
              }`}>
                {trialStatus?.trial_expired 
                  ? 'Your partner portal is offline. Subscribe to a plan to reactivate immediately.'
                  : 'Subscribe now to avoid any interruption to your service.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </p>
        </div>
      )}

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {plans.map((plan) => (
          <Card 
            key={plan.id}
            className={`relative ${plan.popular ? 'border-2 border-blue-500 shadow-lg' : 'border'} ${
              currentPlan === plan.id ? 'ring-2 ring-green-500' : ''
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-blue-600 text-white px-3 py-1">Most Popular</Badge>
              </div>
            )}
            {currentPlan === plan.id && (
              <div className="absolute -top-3 right-4">
                <Badge className="bg-green-600 text-white px-3 py-1">Current Plan</Badge>
              </div>
            )}
            
            <CardHeader className="text-center pb-2">
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                style={{ backgroundColor: `${theme.primaryColor}20`, color: theme.primaryColor }}
              >
                {getPlanIcon(plan.id)}
              </div>
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              <div className="mt-2">
                <span className="text-3xl font-bold text-gray-900">{plan.price_display}</span>
                {plan.price > 0 && <span className="text-gray-500">/{plan.period}</span>}
              </div>
            </CardHeader>
            
            <CardContent>
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <Button
                className="w-full"
                variant={plan.popular ? 'default' : 'outline'}
                style={plan.popular ? { backgroundColor: theme.primaryColor } : {}}
                onClick={() => handleSelectPlan(plan.id)}
                disabled={processing || currentPlan === plan.id}
              >
                {processing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : currentPlan === plan.id ? (
                  'Current Plan'
                ) : plan.contact_sales ? (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Contact Sales
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    {trialStatus?.trial_expired ? 'Subscribe Now' : 'Select Plan'}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Trust Badges */}
      <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4" />
          <span>Secure Payment</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span>Cancel Anytime</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          <span>Instant Activation</span>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="mt-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 text-center">Frequently Asked Questions</h2>
        <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
          <Card>
            <CardContent className="pt-4">
              <h3 className="font-medium text-gray-900 mb-2">What happens after I subscribe?</h3>
              <p className="text-sm text-gray-600">Your account is activated immediately. If your account was suspended, your partner portal will be back online within minutes.</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <h3 className="font-medium text-gray-900 mb-2">Can I change plans later?</h3>
              <p className="text-sm text-gray-600">Yes! You can upgrade or downgrade your plan at any time. Changes take effect on your next billing cycle.</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <h3 className="font-medium text-gray-900 mb-2">What payment methods do you accept?</h3>
              <p className="text-sm text-gray-600">We accept all major credit and debit cards through our secure payment provider, Yoco.</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <h3 className="font-medium text-gray-900 mb-2">Is my data safe during suspension?</h3>
              <p className="text-sm text-gray-600">Absolutely. All your data, customers, and configurations are safely preserved during any suspension period.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ResellerSubscription;
