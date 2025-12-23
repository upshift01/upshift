import React, { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { 
  Users, TrendingUp, DollarSign, BarChart3, ArrowUpRight, ArrowDownRight,
  FileText, Mail, Settings, Palette, Globe, Zap, CheckCircle, Circle,
  PlusCircle, Send, Eye, UserPlus, CreditCard, Activity, Clock, Target
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';

const ResellerDashboard = () => {
  const { token } = useAuth();
  const { theme, formatPrice } = useTheme();
  const { darkMode } = useOutletContext() || {};
  const [stats, setStats] = useState(null);
  const [profile, setProfile] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [onboardingProgress, setOnboardingProgress] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, profileRes, activityRes] = await Promise.all([
        fetch(`${process.env.REACT_APP_BACKEND_URL}/api/reseller/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${process.env.REACT_APP_BACKEND_URL}/api/reseller/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${process.env.REACT_APP_BACKEND_URL}/api/reseller/activity?limit=5`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setProfile(profileData);
        calculateOnboardingProgress(profileData);
      }
      if (activityRes.ok) {
        const activityData = await activityRes.json();
        setRecentActivity(activityData.activities || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateOnboardingProgress = (profile) => {
    let completed = 0;
    const total = 6;
    if (profile?.brand_name) completed++;
    if (profile?.branding?.logo_url) completed++;
    if (profile?.branding?.primary_color) completed++;
    if (profile?.pricing?.tier_1_price) completed++;
    if (profile?.email_settings?.is_configured) completed++;
    if (profile?.yoco_settings?.is_configured) completed++;
    setOnboardingProgress(Math.round((completed / total) * 100));
  };

  const onboardingSteps = [
    { id: 'brand', label: 'Set up brand name', icon: Zap, link: '/reseller-dashboard/branding', done: !!profile?.brand_name },
    { id: 'logo', label: 'Upload your logo', icon: Palette, link: '/reseller-dashboard/branding', done: !!profile?.branding?.logo_url },
    { id: 'colors', label: 'Customise colours', icon: Palette, link: '/reseller-dashboard/branding', done: !!profile?.branding?.primary_color },
    { id: 'pricing', label: 'Set your pricing', icon: DollarSign, link: '/reseller-dashboard/pricing', done: !!profile?.pricing?.tier_1_price },
    { id: 'email', label: 'Configure email', icon: Mail, link: '/reseller-dashboard/settings', done: !!profile?.email_settings?.is_configured },
    { id: 'payments', label: 'Set up Yoco payments', icon: CreditCard, link: '/reseller-dashboard/settings', done: !!profile?.yoco_settings?.is_configured },
  ];

  const quickActions = [
    { label: 'Add Customer', icon: UserPlus, link: '/reseller-dashboard/customers', color: 'bg-blue-500' },
    { label: 'Create Invoice', icon: FileText, link: '/reseller-dashboard/invoices', color: 'bg-green-500' },
    { label: 'Send Campaign', icon: Send, link: '/reseller-dashboard/campaigns', color: 'bg-purple-500' },
    { label: 'View Analytics', icon: BarChart3, link: '/reseller-dashboard/revenue', color: 'bg-orange-500' },
  ];

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
      </div>
    );
  }

  const cardBg = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white';
  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-gray-400' : 'text-gray-600';

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold ${textPrimary}`}>Welcome back, {profile?.contact_name?.split(' ')[0] || 'Partner'}!</h1>
          <p className={textSecondary}>Here's what's happening with your business today</p>
        </div>
        <div className="flex gap-2">
          <Link to="/reseller-dashboard/customers">
            <Button style={{ backgroundColor: theme.primaryColor }} className="text-white">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Customer
            </Button>
          </Link>
        </div>
      </div>

      {/* Status Banner */}
      {profile?.status === 'pending' && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-yellow-600" />
            <div>
              <p className="text-yellow-800 dark:text-yellow-200 font-medium">Account Pending Approval</p>
              <p className="text-yellow-700 dark:text-yellow-300 text-sm">Your reseller account is being reviewed. You'll be notified once activated.</p>
            </div>
          </div>
        </div>
      )}

      {/* Onboarding Progress */}
      {onboardingProgress < 100 && (
        <Card className={cardBg}>
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className={`font-semibold ${textPrimary}`}>Complete Your Setup</h3>
                <p className={`text-sm ${textSecondary}`}>{onboardingProgress}% complete - finish setting up to start selling</p>
              </div>
              <Badge variant="outline" className="w-fit">{Math.round(onboardingProgress / 100 * 6)}/6 steps done</Badge>
            </div>
            <Progress value={onboardingProgress} className="h-2 mb-4" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
              {onboardingSteps.map((step) => (
                <Link 
                  key={step.id} 
                  to={step.link}
                  className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                    step.done 
                      ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' 
                      : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  {step.done ? <CheckCircle className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                  <span className="text-xs font-medium truncate">{step.label}</span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={cardBg}>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className={`text-sm ${textSecondary}`}>Total Customers</p>
                <p className={`text-2xl md:text-3xl font-bold ${textPrimary}`}>{stats?.total_customers || 0}</p>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowUpRight className="h-3 w-3 text-green-500" />
                  <span className="text-xs text-green-500">+{stats?.new_customers_month || 0} this month</span>
                </div>
              </div>
              <div className="p-3 rounded-xl" style={{ backgroundColor: `${theme.primaryColor}20` }}>
                <Users className="h-6 w-6" style={{ color: theme.primaryColor }} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cardBg}>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className={`text-sm ${textSecondary}`}>Total Revenue</p>
                <p className={`text-2xl md:text-3xl font-bold ${textPrimary}`}>{formatPrice(stats?.total_revenue || 0)}</p>
                <p className={`text-xs ${textSecondary} mt-1`}>{stats?.active_customers || 0} paying customers</p>
              </div>
              <div className="p-3 rounded-xl bg-green-100 dark:bg-green-900/30">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cardBg}>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className={`text-sm ${textSecondary}`}>This Month</p>
                <p className={`text-2xl md:text-3xl font-bold ${textPrimary}`}>{formatPrice(stats?.this_month_revenue || 0)}</p>
                <p className={`text-xs ${textSecondary} mt-1`}>Current period</p>
              </div>
              <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-900/30">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cardBg}>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className={`text-sm ${textSecondary}`}>Pending Payments</p>
                <p className={`text-2xl md:text-3xl font-bold ${textPrimary}`}>{stats?.pending_payments || 0}</p>
                <p className={`text-xs ${textSecondary} mt-1`}>Awaiting completion</p>
              </div>
              <div className="p-3 rounded-xl bg-orange-100 dark:bg-orange-900/30">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
                <Target className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className={cardBg}>
        <CardHeader className="pb-2">
          <CardTitle className={textPrimary}>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {quickActions.map((action, index) => (
              <Link 
                key={index}
                to={action.link}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all hover:shadow-md hover:-translate-y-0.5 ${darkMode ? 'border-gray-700 hover:border-gray-600' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <div className={`p-3 rounded-full ${action.color} text-white mb-2`}>
                  <action.icon className="h-5 w-5" />
                </div>
                <span className={`text-sm font-medium ${textPrimary}`}>{action.label}</span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card className={cardBg}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className={textPrimary}>Recent Activity</CardTitle>
            <Link to="/reseller-dashboard/activity" className="text-sm text-blue-600 hover:underline">View All</Link>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <div className="text-center py-8">
                <Activity className={`h-12 w-12 mx-auto mb-3 ${textSecondary} opacity-50`} />
                <p className={textSecondary}>No recent activity</p>
                <p className={`text-sm ${textSecondary}`}>Activity will appear here as customers interact</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((activity, index) => (
                  <div key={index} className={`flex items-start gap-3 p-3 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                    <div className={`p-2 rounded-full ${activity.type === 'signup' ? 'bg-green-100 text-green-600' : activity.type === 'payment' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                      {activity.type === 'signup' ? <UserPlus className="h-4 w-4" /> : activity.type === 'payment' ? <CreditCard className="h-4 w-4" /> : <Activity className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${textPrimary}`}>{activity.title}</p>
                      <p className={`text-xs ${textSecondary}`}>{activity.description}</p>
                    </div>
                    <span className={`text-xs ${textSecondary} whitespace-nowrap`}>{activity.time_ago}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Business Overview */}
        <Card className={cardBg}>
          <CardHeader>
            <CardTitle className={textPrimary}>Your Business</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={textSecondary}>Brand Name</span>
                <span className={`font-medium ${textPrimary}`}>{profile?.brand_name || 'Not set'}</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className={textSecondary}>Subdomain</span>
                <span className={`font-medium ${textPrimary}`}>{profile?.subdomain}.upshift.works</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className={textSecondary}>Custom Domain</span>
                <span className={`font-medium ${textPrimary}`}>{profile?.custom_domain || 'Not configured'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className={textSecondary}>Status</span>
                <Badge variant={profile?.status === 'active' ? 'default' : 'secondary'} className={profile?.status === 'active' ? 'bg-green-500' : ''}>
                  {profile?.status || 'Pending'}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Link to="/reseller-dashboard/branding" className={`p-3 rounded-lg border text-center transition-colors ${darkMode ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'}`}>
                <Palette className={`h-5 w-5 mx-auto mb-1 ${textSecondary}`} />
                <span className={`text-sm ${textPrimary}`}>Branding</span>
              </Link>
              <Link to="/reseller-dashboard/pricing" className={`p-3 rounded-lg border text-center transition-colors ${darkMode ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'}`}>
                <DollarSign className={`h-5 w-5 mx-auto mb-1 ${textSecondary}`} />
                <span className={`text-sm ${textPrimary}`}>Pricing</span>
              </Link>
              <Link to="/reseller-dashboard/domain-setup" className={`p-3 rounded-lg border text-center transition-colors ${darkMode ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'}`}>
                <Globe className={`h-5 w-5 mx-auto mb-1 ${textSecondary}`} />
                <span className={`text-sm ${textPrimary}`}>Domain</span>
              </Link>
              <Link to="/reseller-dashboard/settings" className={`p-3 rounded-lg border text-center transition-colors ${darkMode ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'}`}>
                <Settings className={`h-5 w-5 mx-auto mb-1 ${textSecondary}`} />
                <span className={`text-sm ${textPrimary}`}>Settings</span>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResellerDashboard;
