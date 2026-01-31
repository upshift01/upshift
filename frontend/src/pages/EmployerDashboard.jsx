import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Briefcase, Users, FileText, Clock, CheckCircle, AlertCircle,
  Plus, Crown, Search, Building2, Loader2, TrendingUp, Target,
  Calendar, CreditCard, ArrowRight, Sparkles, Globe, DollarSign
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const EmployerDashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { token, isAuthenticated, user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [stats, setStats] = useState({
    total_jobs: 0,
    active_jobs: 0,
    total_proposals: 0,
    pending_proposals: 0,
    total_contracts: 0,
    active_contracts: 0
  });
  const [plans, setPlans] = useState([]);
  const [canPostJob, setCanPostJob] = useState(false);
  const [jobsPosted, setJobsPosted] = useState(0);
  
  // Currency and payment method selection
  const [selectedCurrency, setSelectedCurrency] = useState('ZAR');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (user?.role !== 'employer') {
      toast({
        title: 'Access Denied',
        description: 'This dashboard is for employers only',
        variant: 'destructive'
      });
      navigate('/dashboard');
      return;
    }

    // Check for subscription success/cancel
    const subStatus = searchParams.get('subscription');
    if (subStatus === 'success') {
      toast({
        title: 'Subscription Activated!',
        description: 'Your employer subscription is now active'
      });
      // Clear the param
      navigate('/employer', { replace: true });
    } else if (subStatus === 'cancelled') {
      toast({
        title: 'Subscription Cancelled',
        description: 'Your subscription was not completed',
        variant: 'destructive'
      });
      navigate('/employer', { replace: true });
    }

    fetchDashboardData();
  }, [isAuthenticated, user]);

  const fetchDashboardData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [subRes, statsRes, plansRes, canPostRes] = await Promise.all([
        fetch(`${API_URL}/api/employer/subscription`, { headers }),
        fetch(`${API_URL}/api/employer/dashboard-stats`, { headers }),
        fetch(`${API_URL}/api/employer/plans`, { headers }),
        fetch(`${API_URL}/api/employer/can-post-job`, { headers })
      ]);

      if (subRes.ok) {
        const data = await subRes.json();
        setSubscription(data.subscription);
        setJobsPosted(data.jobs_posted);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats);
      }

      if (plansRes.ok) {
        const data = await plansRes.json();
        setPlans(data.plans);
      }

      if (canPostRes.ok) {
        const data = await canPostRes.json();
        setCanPostJob(data.can_post);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openPaymentModal = (plan) => {
    setSelectedPlan(plan);
    setShowPaymentModal(true);
  };

  const handleSubscribe = async (provider) => {
    if (!selectedPlan) return;
    
    setProcessingPayment(true);
    try {
      const response = await fetch(`${API_URL}/api/employer/subscribe/${selectedPlan.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ provider })
      });

      if (response.ok) {
        const data = await response.json();
        window.location.href = data.checkout_url;
      } else {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to start checkout');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
      setProcessingPayment(false);
    }
  };

  const getSubscriptionBadge = () => {
    if (!subscription || !subscription.status) {
      return <Badge variant="secondary">No Subscription</Badge>;
    }
    switch (subscription.status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>;
      case 'trial':
        return <Badge className="bg-blue-100 text-blue-800"><Clock className="h-3 w-3 mr-1" />Trial</Badge>;
      case 'expired':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Expired</Badge>;
      default:
        return <Badge variant="secondary">{subscription.status}</Badge>;
    }
  };

  const getJobsProgress = () => {
    if (!subscription) return 0;
    const limit = subscription.jobs_limit;
    if (limit === -1) return 100; // Unlimited
    return Math.min((jobsPosted / limit) * 100, 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Building2 className="h-7 w-7 text-green-600" />
                Employer Dashboard
              </h1>
              <p className="text-gray-600 mt-1">
                Welcome back, {user?.full_name || 'Employer'}
                {user?.company_name && <span className="text-green-600 font-medium"> • {user.company_name}</span>}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {getSubscriptionBadge()}
              {canPostJob && (
                <Link to="/remote-jobs/post">
                  <Button className="bg-green-600 hover:bg-green-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Post a Job
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Subscription Status Card */}
        {(!subscription || subscription.status === 'expired') ? (
          <Card className="mb-8 border-2 border-orange-200 bg-orange-50">
            <CardContent className="py-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="h-6 w-6 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-orange-900 mb-1">
                    {subscription?.status === 'expired' ? 'Subscription Expired' : 'No Active Subscription'}
                  </h3>
                  <p className="text-orange-700 mb-4">
                    Subscribe to start posting jobs and find the best candidates for your positions.
                  </p>
                  <a href="#plans">
                    <Button className="bg-orange-600 hover:bg-orange-700">
                      <Crown className="h-4 w-4 mr-2" />
                      View Plans
                    </Button>
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : subscription.status === 'trial' ? (
          <Card className="mb-8 border-2 border-blue-200 bg-blue-50">
            <CardContent className="py-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-1">Free Trial Active</h3>
                    <p className="text-blue-700">
                      You can post up to {subscription.jobs_limit} jobs during your trial.
                      Trial expires: {new Date(subscription.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <a href="#plans">
                  <Button variant="outline" className="border-blue-600 text-blue-700 hover:bg-blue-100">
                    <Crown className="h-4 w-4 mr-2" />
                    Upgrade Now
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-8 border-2 border-green-200 bg-green-50">
            <CardContent className="py-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <Crown className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-green-900 mb-1">
                      {subscription.plan_name} Plan Active
                    </h3>
                    <p className="text-green-700">
                      {subscription.jobs_limit === -1 
                        ? 'Unlimited job postings' 
                        : `${jobsPosted} / ${subscription.jobs_limit} jobs posted`}
                      {subscription.expires_at && ` • Expires: ${new Date(subscription.expires_at).toLocaleDateString()}`}
                    </p>
                    {subscription.jobs_limit !== -1 && (
                      <Progress value={getJobsProgress()} className="mt-2 h-2 w-64" />
                    )}
                  </div>
                </div>
                <Link to="/remote-jobs/my-jobs">
                  <Button variant="outline" className="border-green-600 text-green-700 hover:bg-green-100">
                    <Briefcase className="h-4 w-4 mr-2" />
                    Manage Jobs
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                  <Briefcase className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.active_jobs}</p>
                  <p className="text-sm text-gray-500">Active Jobs</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.pending_proposals}</p>
                  <p className="text-sm text-gray-500">New Proposals</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.active_contracts}</p>
                  <p className="text-sm text-gray-500">Active Contracts</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/employer/analytics')}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_proposals}</p>
                  <p className="text-sm text-gray-500">Total Proposals</p>
                  <p className="text-xs text-blue-600 hover:underline">View Analytics →</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <Plus className="h-5 w-5 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Post a New Job</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Create a new job posting and start receiving proposals from qualified candidates.
              </p>
              <Link to="/remote-jobs/post">
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700" 
                  disabled={!canPostJob}
                >
                  {canPostJob ? 'Post Job' : 'Upgrade to Post'}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Target className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Review Proposals</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Review and respond to proposals from job seekers interested in your positions.
              </p>
              <Link to="/remote-jobs/my-jobs">
                <Button variant="outline" className="w-full">
                  View Proposals
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Manage Contracts</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                View and manage your active contracts with hired candidates.
              </p>
              <Link to="/contracts">
                <Button variant="outline" className="w-full">
                  View Contracts
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Subscription Plans */}
        <div id="plans" className="scroll-mt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Crown className="h-6 w-6 text-green-600" />
              Employer Subscription Plans
            </h2>
            
            {/* Currency Toggle */}
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setSelectedCurrency('ZAR')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  selectedCurrency === 'ZAR' 
                    ? 'bg-white shadow text-green-700' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                🇿🇦 ZAR
              </button>
              <button
                onClick={() => setSelectedCurrency('USD')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  selectedCurrency === 'USD' 
                    ? 'bg-white shadow text-blue-700' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                🌍 USD
              </button>
            </div>
          </div>
          
          <p className="text-sm text-gray-500 mb-4">
            {selectedCurrency === 'ZAR' 
              ? 'Pay with Yoco (South African Rand)' 
              : 'Pay with Stripe (International USD)'}
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan, index) => (
              <Card 
                key={plan.id} 
                className={`relative ${plan.popular ? 'border-2 border-green-500 shadow-lg' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-green-600">Most Popular</Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-gray-900">
                      {selectedCurrency === 'ZAR' ? `R${plan.price_zar}` : `$${plan.price_usd}`}
                    </span>
                    <span className="text-gray-500">/month</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    {plan.jobs_limit === -1 ? 'Unlimited jobs' : `Up to ${plan.jobs_limit} jobs`}
                  </p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                        <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className={`w-full ${plan.popular ? 'bg-green-600 hover:bg-green-700' : ''}`}
                    variant={plan.popular ? 'default' : 'outline'}
                    onClick={() => openPaymentModal(plan)}
                    disabled={subscription?.plan_id === plan.id && subscription?.status === 'active'}
                  >
                    {subscription?.plan_id === plan.id && subscription?.status === 'active' 
                      ? 'Current Plan' 
                      : 'Subscribe'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Payment Method Selection Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-green-600" />
              Select Payment Method
            </DialogTitle>
            <DialogDescription>
              Choose how you would like to pay for the {selectedPlan?.name} plan
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Yoco Option - ZAR */}
            <button
              onClick={() => handleSubscribe('yoco')}
              disabled={processingPayment}
              className="w-full p-4 rounded-lg border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 transition-all text-left group disabled:opacity-50"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-[#00A3FF] flex items-center justify-center text-white text-xs font-bold">
                    YOCO
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 group-hover:text-green-700">
                      Pay with Yoco
                    </p>
                    <p className="text-sm text-gray-500">South African Rand (ZAR)</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">R{selectedPlan?.price_zar}</p>
                  <p className="text-xs text-gray-500">🇿🇦 Local payment</p>
                </div>
              </div>
            </button>

            {/* Stripe Option - USD */}
            <button
              onClick={() => handleSubscribe('stripe')}
              disabled={processingPayment}
              className="w-full p-4 rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all text-left group disabled:opacity-50"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center">
                    <CreditCard className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 group-hover:text-blue-700">
                      Pay with Stripe
                    </p>
                    <p className="text-sm text-gray-500">US Dollars (USD)</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">${selectedPlan?.price_usd}</p>
                  <p className="text-xs text-gray-500">🌍 International</p>
                </div>
              </div>
            </button>
          </div>

          {processingPayment && (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Redirecting to payment...
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployerDashboard;
