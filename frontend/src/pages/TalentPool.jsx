import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  Search, Users, Briefcase, MapPin, Award, Filter, ChevronRight,
  Loader2, Lock, Crown, FileText, Star, CheckCircle, Eye, UserPlus, PartyPopper, Globe
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const TalentPool = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, token, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [plans, setPlans] = useState([]);
  const [industries, setIndustries] = useState([]);
  const [experienceLevels, setExperienceLevels] = useState([]);
  
  // Filters
  const [filters, setFilters] = useState({
    search: '',
    industry: '',
    experience_level: '',
    location: '',
    skills: '',
    is_remote_worker: false
  });
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  // Verify payment directly without requiring auth
  const verifyPaymentDirect = async (subscriptionId) => {
    console.log('verifyPaymentDirect called with:', subscriptionId);
    try {
      const response = await fetch(`${API_URL}/api/talent-pool/verify-payment/${subscriptionId}`, {
        method: 'POST'
      });
      
      console.log('Verify response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Verify response data:', data);
        if (data.success) {
          setPaymentSuccess(true);
          setHasAccess(true);
          toast({
            title: 'Subscription Activated!',
            description: 'You now have access to the talent pool.'
          });
          // Reload the page to show talent pool
          window.location.href = '/talent-pool';
        } else {
          toast({
            title: 'Verification Pending',
            description: 'Please refresh the page in a moment.',
            variant: 'default'
          });
        }
      } else {
        toast({
          title: 'Verification Issue',
          description: 'Please contact support.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      toast({
        title: 'Error',
        description: 'Please refresh the page.',
        variant: 'destructive'
      });
    } finally {
      setVerifyingPayment(false);
    }
  };

  // Check for payment callback on mount
  useEffect(() => {
    const payment = searchParams.get('payment');
    const subscriptionId = searchParams.get('subscription_id');
    
    console.log('Payment callback check - payment:', payment, 'subscriptionId:', subscriptionId);
    
    if (payment === 'success' && subscriptionId) {
      // Verify payment immediately - no auth needed
      console.log('Starting payment verification...');
      setVerifyingPayment(true);
      verifyPaymentDirect(subscriptionId);
    } else if (payment === 'cancelled' || payment === 'failed') {
      toast({
        title: payment === 'cancelled' ? 'Payment Cancelled' : 'Payment Failed',
        description: 'Your subscription was not activated.',
        variant: 'destructive'
      });
      window.location.href = '/talent-pool';
    }
  }, []);

  useEffect(() => {
    // Only fetch initial data if not verifying payment and auth is loaded
    if (!verifyingPayment && !authLoading) {
      fetchInitialData();
    }
  }, [verifyingPayment, authLoading, isAuthenticated]);

  useEffect(() => {
    if (hasAccess) {
      fetchCandidates();
    }
  }, [filters, pagination.page, hasAccess]);

  const handleSubscribe = async (planId) => {
    if (!isAuthenticated) {
      sessionStorage.setItem('postAuthRedirect', '/talent-pool');
      navigate('/login');
      return;
    }
    
    setSubscribing(true);
    try {
      const response = await fetch(`${API_URL}/api/talent-pool/subscribe/${planId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.checkout_url) {
          // Redirect to Yoco payment page
          window.location.href = data.checkout_url;
        }
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.detail || 'Failed to start subscription',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to connect to payment service',
        variant: 'destructive'
      });
    } finally {
      setSubscribing(false);
    }
  };

  const fetchInitialData = async () => {
    try {
      // Fetch industries
      const industriesRes = await fetch(`${API_URL}/api/talent-pool/industries`);
      if (industriesRes.ok) {
        const data = await industriesRes.json();
        setIndustries(data.industries || []);
      }

      // Fetch experience levels
      const levelsRes = await fetch(`${API_URL}/api/talent-pool/experience-levels`);
      if (levelsRes.ok) {
        const data = await levelsRes.json();
        setExperienceLevels(data.levels || []);
      }

      // Fetch plans
      const plansRes = await fetch(`${API_URL}/api/talent-pool/recruiter/plans`);
      if (plansRes.ok) {
        const data = await plansRes.json();
        setPlans(data.plans || []);
      }

      // Check subscription if authenticated
      if (isAuthenticated && token) {
        const subRes = await fetch(`${API_URL}/api/talent-pool/recruiter/subscription`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (subRes.ok) {
          const data = await subRes.json();
          setHasAccess(data.has_subscription);
          setSubscription(data.subscription);
        }
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCandidates = async () => {
    if (!isAuthenticated || !token) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      });
      
      if (filters.search) params.append('search', filters.search);
      if (filters.industry) params.append('industry', filters.industry);
      if (filters.experience_level) params.append('experience_level', filters.experience_level);
      if (filters.location) params.append('location', filters.location);
      if (filters.skills) params.append('skills', filters.skills);
      if (filters.is_remote_worker) params.append('is_remote_worker', 'true');

      const response = await fetch(`${API_URL}/api/talent-pool/browse?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setCandidates(data.candidates || []);
        setPagination(prev => ({
          ...prev,
          total: data.total,
          totalPages: data.total_pages
        }));
      } else if (response.status === 403) {
        setHasAccess(false);
      }
    } catch (error) {
      console.error('Error fetching candidates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchCandidates();
  };

  const getExperienceBadgeColor = (level) => {
    const colors = {
      entry: 'bg-green-100 text-green-700',
      mid: 'bg-blue-100 text-blue-700',
      senior: 'bg-purple-100 text-purple-700',
      executive: 'bg-orange-100 text-orange-700'
    };
    return colors[level] || 'bg-gray-100 text-gray-700';
  };

  const formatExperienceLevel = (level) => {
    const found = experienceLevels.find(l => l.id === level);
    return found ? found.name : level;
  };

  // Recruiter Plans Section (shown when no access)
  const renderPlansSection = () => (
    <div className="py-16">
      <div className="text-center mb-12">
        <Badge className="mb-4 bg-blue-100 text-blue-700">
          <Crown className="mr-1 h-3 w-3" />
          Recruiter Access Required
        </Badge>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Unlock Access to Our Talent Pool
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Subscribe to browse candidates, view their full profiles and CVs, and request contact with top talent.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {plans.map((plan) => (
          <Card key={plan.id} className={`relative ${plan.popular ? 'border-2 border-blue-500 shadow-lg' : ''}`}>
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-blue-600">Most Popular</Badge>
              </div>
            )}
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              <div className="mt-4">
                <span className="text-4xl font-bold">R{(plan.price / 100).toLocaleString()}</span>
                <span className="text-gray-500">/{plan.duration_days} days</span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-sm mb-4">{plan.description}</p>
              <ul className="space-y-2 mb-6">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button 
                className="w-full"
                variant={plan.popular ? 'default' : 'outline'}
                disabled={subscribing || authLoading}
                onClick={() => handleSubscribe(plan.id)}
              >
                {subscribing ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</>
                ) : authLoading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Loading...</>
                ) : isAuthenticated ? (
                  'Subscribe Now'
                ) : (
                  'Login to Subscribe'
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sample Candidates Preview */}
      <div className="mt-16">
        <h3 className="text-xl font-semibold text-center mb-8 text-gray-700">
          Preview of Available Talent
        </h3>
        <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto opacity-60">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="relative overflow-hidden">
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center">
                <div className="text-center">
                  <Lock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Subscribe to view</p>
                </div>
              </div>
              <CardContent className="p-4">
                <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 w-24 bg-gray-100 rounded mb-3"></div>
                <div className="flex gap-1">
                  <div className="h-5 w-16 bg-gray-100 rounded"></div>
                  <div className="h-5 w-12 bg-gray-100 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );

  // Candidates List Section (shown when has access)
  const renderCandidatesSection = () => (
    <div className="py-8">
      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by name, job title, or skills..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="w-full"
                />
              </div>
              <Button type="submit">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Select
                value={filters.industry}
                onValueChange={(value) => setFilters(prev => ({ ...prev, industry: value === 'all' ? '' : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Industry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Industries</SelectItem>
                  {industries.map((ind) => (
                    <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.experience_level}
                onValueChange={(value) => setFilters(prev => ({ ...prev, experience_level: value === 'all' ? '' : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Experience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  {experienceLevels.map((level) => (
                    <SelectItem key={level.id} value={level.id}>{level.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                placeholder="Location"
                value={filters.location}
                onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
              />

              <Input
                placeholder="Skills (comma-separated)"
                value={filters.skills}
                onChange={(e) => setFilters(prev => ({ ...prev, skills: e.target.value }))}
              />

              {/* Remote Worker Toggle */}
              <button
                type="button"
                onClick={() => setFilters(prev => ({ ...prev, is_remote_worker: !prev.is_remote_worker }))}
                className={`flex items-center justify-center gap-2 px-4 py-2 rounded-md border transition-all ${
                  filters.is_remote_worker 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                }`}
                data-testid="remote-worker-filter"
              >
                <Globe className="h-4 w-4" />
                <span className="text-sm font-medium">Remote Workers</span>
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Results Info */}
      <div className="flex justify-between items-center mb-4">
        <p className="text-gray-600">
          {pagination.total} candidate{pagination.total !== 1 ? 's' : ''} found
        </p>
      </div>

      {/* Candidates Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : candidates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No candidates found</h3>
            <p className="text-gray-500">Try adjusting your filters</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {candidates.map((candidate) => (
            <Card key={candidate.id} className="hover:shadow-lg transition-shadow" data-testid={`candidate-card-${candidate.id}`}>
              <CardContent className="p-4">
                <div className="flex gap-3 mb-3">
                  {/* Profile Picture */}
                  <div className="flex-shrink-0">
                    {candidate.profile_picture_url ? (
                      <img 
                        src={`${API_URL}${candidate.profile_picture_url}`}
                        alt={candidate.full_name}
                        className="w-14 h-14 rounded-full object-cover border-2 border-gray-100"
                        data-testid="candidate-profile-picture"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg">
                        {candidate.full_name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-gray-900 truncate">{candidate.full_name}</h3>
                        <p className="text-sm text-gray-600 truncate">{candidate.job_title}</p>
                      </div>
                      <Badge className={`ml-2 flex-shrink-0 ${getExperienceBadgeColor(candidate.experience_level)}`}>
                        {formatExperienceLevel(candidate.experience_level).split(' ')[0]}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Briefcase className="h-4 w-4" />
                    <span>{candidate.industry}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span>{candidate.location}</span>
                  </div>
                  {candidate.is_remote_worker && (
                    <div className="flex items-center gap-2">
                      <Badge className="bg-blue-100 text-blue-700 gap-1">
                        <Globe className="h-3 w-3" />
                        Remote Worker
                      </Badge>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-1 mb-4">
                  {candidate.skills.slice(0, 4).map((skill, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                  {candidate.skills.length > 4 && (
                    <Badge variant="secondary" className="text-xs">
                      +{candidate.skills.length - 4} more
                    </Badge>
                  )}
                </div>

                <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                  {candidate.summary}
                </p>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => navigate(`/talent-pool/${candidate.id}`)}
                    data-testid="view-profile-btn"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View Profile
                  </Button>
                  {candidate.cv_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(candidate.cv_url, '_blank')}
                      title="Download CV"
                      data-testid="download-cv-btn"
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      CV
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <Button
            variant="outline"
            disabled={pagination.page === 1}
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
          >
            Previous
          </Button>
          <span className="flex items-center px-4 text-sm text-gray-600">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            disabled={pagination.page === pagination.totalPages}
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );

  // Render payment verification screen
  const renderPaymentVerification = () => (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
      <Card className="max-w-md mx-4">
        <CardContent className="pt-8 pb-8 text-center">
          <Loader2 className="h-16 w-16 animate-spin text-blue-600 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Verifying Payment</h2>
          <p className="text-gray-600">Please wait while we confirm your subscription...</p>
        </CardContent>
      </Card>
    </div>
  );

  // Render payment success screen
  const renderPaymentSuccess = () => (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center">
      <Card className="max-w-md mx-4">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <PartyPopper className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Subscription Activated!</h2>
          <p className="text-gray-600 mb-6">Welcome to the Talent Pool. You now have full access to browse and contact candidates.</p>
          <Button 
            onClick={() => {
              setPaymentSuccess(false);
              // Clear URL params and stay on talent pool to browse
              navigate('/talent-pool', { replace: true });
            }}
            className="bg-green-600 hover:bg-green-700"
          >
            <Users className="h-4 w-4 mr-2" />
            Start Browsing Talent
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  // Show verification screen while verifying
  if (verifyingPayment) {
    return renderPaymentVerification();
  }

  // Show success screen after payment verification
  if (paymentSuccess) {
    return renderPaymentSuccess();
  }

  // Show loading state while auth is loading or data is loading initially
  if (authLoading || (loading && plans.length === 0)) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading Talent Pool...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section - Clarified for Recruiters */}
      <section className="py-16 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <Badge className="mb-4 bg-white/20 text-white border-none">
            <Users className="mr-1 h-3 w-3" />
            For Recruiters & Hiring Managers
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Find Your Next Great Hire
          </h1>
          <p className="text-xl text-white/80 max-w-2xl mx-auto mb-6">
            Subscribe to access our curated talent pool of job-ready candidates. Filter by skills, experience, and location to find the perfect match for your team.
          </p>
          <p className="text-sm text-white/60">
            Looking for a job instead? <Link to={isAuthenticated ? "/dashboard/talent-pool" : "/register?redirect=/dashboard/talent-pool"} className="underline hover:text-white">Join the Talent Pool as a candidate →</Link>
          </p>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4">
        {hasAccess ? renderCandidatesSection() : renderPlansSection()}
      </div>
      
      {/* Job Seeker CTA Section */}
      {!hasAccess && (
        <section className="py-16 px-4 bg-gradient-to-r from-green-50 to-emerald-50 border-t">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-4 bg-green-100 text-green-700">
              <UserPlus className="mr-1 h-3 w-3" />
              For Job Seekers
            </Badge>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Looking for Your Next Opportunity?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
              Join our Talent Pool and get discovered by top recruiters. Create your profile, showcase your skills, and let opportunities come to you.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to={isAuthenticated ? "/dashboard/talent-pool" : "/register?redirect=/dashboard/talent-pool"}>
                <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white">
                  <UserPlus className="mr-2 h-5 w-5" />
                  {isAuthenticated ? "Join Talent Pool" : "Create Free Account & Join"}
                </Button>
              </Link>
            </div>
            <div className="mt-8 grid md:grid-cols-3 gap-6 text-left max-w-3xl mx-auto">
              <div className="flex gap-3">
                <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-gray-900">Free to Join</h4>
                  <p className="text-sm text-gray-600">No cost to create your profile</p>
                </div>
              </div>
              <div className="flex gap-3">
                <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-gray-900">Control Your Visibility</h4>
                  <p className="text-sm text-gray-600">Show or hide your profile anytime</p>
                </div>
              </div>
              <div className="flex gap-3">
                <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-gray-900">Approve Contacts</h4>
                  <p className="text-sm text-gray-600">You decide who gets your details</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default TalentPool;
