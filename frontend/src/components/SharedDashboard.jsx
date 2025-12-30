import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  FileText, Mail, CreditCard, Zap, Clock, CheckCircle, Target, ArrowRight, 
  Linkedin, Sparkles, TrendingUp, Award, Briefcase, MessageSquare, 
  ChevronRight, Loader2, Circle, Lock, Activity
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// Activity icon mapping
const ACTIVITY_ICONS = {
  cv_created: FileText,
  cv_downloaded: FileText,
  cv_enhanced: Sparkles,
  ats_check: CheckCircle,
  cover_letter: Mail,
  skills_generated: Zap,
  resume_improved: TrendingUp,
  document: FileText,
  ats: CheckCircle,
  default: Activity
};

/**
 * Shared Dashboard Component
 * Works for both main platform and partner sites
 */
const SharedDashboard = ({
  isPartner = false,
  baseUrl = '',
  brandName = 'UpShift',
  primaryColor = '#1e40af',
  secondaryColor = '#7c3aed',
  Layout = null // Optional custom layout wrapper
}) => {
  const { user, getAuthHeader, token } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchDashboardData();
    }
  }, [token]);

  const fetchDashboardData = async () => {
    try {
      const headers = getAuthHeader();
      const [statsRes, activityRes] = await Promise.all([
        fetch(`${API_URL}/api/customer/dashboard-stats`, { headers }),
        fetch(`${API_URL}/api/customer/recent-activity`, { headers })
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }
      if (activityRes.ok) {
        const data = await activityRes.json();
        setRecentActivity(data.activities || []);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTierInfo = (tierId) => {
    const tiers = {
      'tier-1': { name: 'ATS Optimise', level: 1 },
      'tier-2': { name: 'Professional Package', level: 2 },
      'tier-3': { name: 'Executive Elite', level: 3 }
    };
    return { ...tiers[tierId], color: primaryColor } || { name: 'Free', color: 'gray', level: 0 };
  };

  const getUrl = (path) => isPartner ? `${baseUrl}${path}` : path;

  const onboardingSteps = [
    { id: 'profile', label: 'Complete your profile', done: !!user?.full_name, link: getUrl('/dashboard/settings') },
    { id: 'ats', label: 'Check your CV with ATS', done: stats?.ats_checks > 0, link: getUrl('/ats-checker') },
    { id: 'cv', label: 'Create your first CV', done: stats?.total_documents > 0, link: getUrl('/builder') },
    { id: 'linkedin', label: 'Try LinkedIn tools', done: stats?.linkedin_used, link: getUrl('/linkedin-tools') },
    { id: 'plan', label: 'Upgrade your plan', done: !!user?.active_tier, link: getUrl('/pricing') }
  ];

  const quickActions = [
    { 
      title: 'Create CV', 
      description: 'Build a professional CV with AI', 
      icon: FileText, 
      link: getUrl('/builder'),
      color: primaryColor,
      locked: !user?.active_tier
    },
    { 
      title: 'Improve CV', 
      description: 'Enhance your existing CV', 
      icon: Sparkles, 
      link: getUrl('/improve'),
      color: secondaryColor,
      locked: !user?.active_tier
    },
    { 
      title: 'ATS Check', 
      description: 'Check ATS compatibility', 
      icon: Target, 
      link: getUrl('/ats-checker'),
      color: '#059669',
      locked: false // Free feature
    },
    { 
      title: 'Cover Letter', 
      description: 'Generate cover letters', 
      icon: Mail, 
      link: getUrl('/cover-letter'),
      color: '#dc2626',
      locked: !user?.active_tier
    },
    { 
      title: 'LinkedIn Tools', 
      description: 'Optimize your profile', 
      icon: Linkedin, 
      link: getUrl('/linkedin-tools'),
      color: '#0077b5',
      locked: !user?.active_tier || getTierInfo(user?.active_tier)?.level < 2
    },
    { 
      title: 'My Documents', 
      description: 'View saved documents', 
      icon: Briefcase, 
      link: getUrl('/dashboard/documents'),
      color: '#6366f1',
      locked: false
    }
  ];

  const completedSteps = onboardingSteps.filter(s => s.done).length;
  const progress = (completedSteps / onboardingSteps.length) * 100;

  const content = (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.full_name?.split(' ')[0] || 'User'}!
          </h1>
          <p className="text-gray-600">Manage your career documents and services</p>
        </div>

        {/* Stats Row */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: primaryColor }} />
          </div>
        ) : (
          <>
            {/* Plan Status & Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Active Plan Card */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Zap className="mr-2 h-5 w-5" style={{ color: primaryColor }} />
                    Your Active Plan
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {user?.active_tier ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900">
                            {getTierInfo(user.active_tier).name}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Activated on {new Date(user.tier_activation_date).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge className="bg-green-100 text-green-700 border-green-200">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Active
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                        <div>
                          <p className="text-sm text-gray-600">Documents</p>
                          <p className="text-2xl font-bold text-gray-900">{stats?.total_documents || 0}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">ATS Checks</p>
                          <p className="text-2xl font-bold text-gray-900">{stats?.ats_checks || 0}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">This Month</p>
                          <p className="text-2xl font-bold text-gray-900">{stats?.this_month_activity || 0}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-600 mb-4">No active plan. Upgrade to access AI features!</p>
                      <Link to={getUrl('/pricing')}>
                        <Button style={{ backgroundColor: primaryColor }}>
                          View Pricing Plans
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Onboarding Progress */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-base">
                    <Award className="mr-2 h-5 w-5" style={{ color: primaryColor }} />
                    Getting Started
                  </CardTitle>
                  <CardDescription>{completedSteps} of {onboardingSteps.length} complete</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all" 
                        style={{ width: `${progress}%`, backgroundColor: primaryColor }}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    {onboardingSteps.map((step) => (
                      <Link 
                        key={step.id} 
                        to={step.link}
                        className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {step.done ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <Circle className="h-4 w-4 text-gray-300" />
                          )}
                          <span className={`text-sm ${step.done ? 'text-gray-500 line-through' : 'text-gray-700'}`}>
                            {step.label}
                          </span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {quickActions.map((action) => (
                  <Link key={action.title} to={action.link}>
                    <Card className={`h-full hover:shadow-md transition-all cursor-pointer ${action.locked ? 'opacity-60' : ''}`}>
                      <CardContent className="p-4 text-center">
                        <div 
                          className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
                          style={{ backgroundColor: `${action.color}15` }}
                        >
                          {action.locked ? (
                            <Lock className="h-5 w-5 text-gray-400" />
                          ) : (
                            <action.icon className="h-5 w-5" style={{ color: action.color }} />
                          )}
                        </div>
                        <h3 className="font-medium text-gray-900 text-sm">{action.title}</h3>
                        <p className="text-xs text-gray-500 mt-1">{action.description}</p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-base">
                  <Clock className="mr-2 h-5 w-5" style={{ color: primaryColor }} />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentActivity.length > 0 ? (
                  <div className="space-y-3">
                    {recentActivity.slice(0, 8).map((activity, index) => {
                      const IconComponent = ACTIVITY_ICONS[activity.type] || ACTIVITY_ICONS.default;
                      return (
                        <div key={index} className="flex items-center gap-3 py-2 border-b last:border-0">
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: `${primaryColor}15` }}
                          >
                            <IconComponent className="h-4 w-4" style={{ color: primaryColor }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900 truncate">{activity.description}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(activity.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No recent activity yet</p>
                    <p className="text-sm">Start by creating your first CV!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );

  // If a custom layout is provided, wrap the content
  if (Layout) {
    return <Layout>{content}</Layout>;
  }

  return content;
};

export default SharedDashboard;
