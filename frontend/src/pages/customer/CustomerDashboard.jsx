import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { 
  FileText, 
  Mail, 
  CreditCard, 
  Zap, 
  Clock, 
  CheckCircle, 
  Target, 
  ArrowRight, 
  Linkedin,
  Sparkles,
  TrendingUp,
  Award,
  Briefcase,
  MessageSquare,
  ChevronRight,
  Loader2,
  Circle
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const CustomerDashboard = () => {
  const { user, getAuthHeader } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, activityRes] = await Promise.all([
        fetch(`${API_URL}/api/customer/dashboard-stats`, { headers: getAuthHeader() }),
        fetch(`${API_URL}/api/customer/recent-activity`, { headers: getAuthHeader() })
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
      'tier-1': { name: 'ATS Optimise', color: 'blue' },
      'tier-2': { name: 'Professional Package', color: 'purple' },
      'tier-3': { name: 'Executive Elite', color: 'orange' }
    };
    return tiers[tierId] || { name: 'Free', color: 'gray' };
  };

  const onboardingSteps = [
    { id: 'profile', label: 'Complete your profile', done: !!user?.full_name, link: '/dashboard/settings' },
    { id: 'ats', label: 'Check your CV with ATS', done: stats?.ats_checks > 0, link: '/ats-checker' },
    { id: 'cv', label: 'Create your first CV', done: stats?.total_documents > 0, link: '/builder' },
    { id: 'linkedin', label: 'Try LinkedIn tools', done: stats?.linkedin_used, link: '/linkedin-tools' },
    { id: 'plan', label: 'Upgrade your plan', done: !!user?.active_tier, link: '/pricing' }
  ];

  const completedSteps = onboardingSteps.filter(s => s.done).length;
  const progressPercent = (completedSteps / onboardingSteps.length) * 100;

  const quickActions = [
    { icon: Target, label: 'ATS Checker', link: '/ats-checker', badge: 'FREE', color: 'green' },
    { icon: FileText, label: 'Build CV', link: '/builder', color: 'blue' },
    { icon: Zap, label: 'Improve CV', link: '/improve', color: 'purple' },
    { icon: Mail, label: 'Cover Letter', link: '/cover-letter', color: 'pink' },
    { icon: Linkedin, label: 'LinkedIn Tools', link: '/linkedin-tools', badge: 'NEW', color: 'blue' },
    { icon: Briefcase, label: 'Job Tracker', link: '/dashboard/jobs', badge: 'NEW', color: 'indigo' }
  ];

  return (
    <div className="p-6">
      {/* Welcome Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.full_name?.split(' ')[0] || 'there'}! 👋
        </h1>
        <p className="text-gray-600">Here's what's happening with your career journey</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Documents</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.total_documents || 0}</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">ATS Checks</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.ats_checks || 0}</p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <Target className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">AI Generations</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.ai_generations || 0}</p>
              </div>
              <div className="p-2 bg-purple-100 rounded-lg">
                <Sparkles className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Jobs Tracked</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.jobs_tracked || 0}</p>
              </div>
              <div className="p-2 bg-orange-100 rounded-lg">
                <Briefcase className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Current Plan */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-600" />
              Your Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            {user?.active_tier ? (
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {getTierInfo(user.active_tier).name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Activated {new Date(user.tier_activation_date).toLocaleDateString()}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className="bg-green-100 text-green-700">
                      <CheckCircle className="h-3 w-3 mr-1" /> Active
                    </Badge>
                  </div>
                </div>
                <Link to="/pricing">
                  <Button variant="outline">
                    <TrendingUp className="h-4 w-4 mr-2" /> Upgrade
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-600 mb-3">Unlock AI-powered features</p>
                <Link to="/pricing">
                  <Button className="bg-gradient-to-r from-blue-600 to-purple-600">
                    View Plans
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Onboarding Checklist */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              Getting Started
              <span className="text-sm font-normal text-gray-500">{completedSteps}/{onboardingSteps.length}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div 
                className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="space-y-2">
              {onboardingSteps.map((step) => (
                <Link 
                  key={step.id} 
                  to={step.link}
                  className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                    step.done ? 'bg-green-50' : 'hover:bg-gray-50'
                  }`}
                >
                  {step.done ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <Circle className="h-4 w-4 text-gray-300" />
                  )}
                  <span className={`text-sm ${step.done ? 'text-green-700 line-through' : 'text-gray-700'}`}>
                    {step.label}
                  </span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {quickActions.map((action) => (
              <Link key={action.link} to={action.link}>
                <div className="p-4 border rounded-lg hover:shadow-md transition-all hover:border-blue-300 text-center">
                  <div className={`w-10 h-10 mx-auto mb-2 rounded-lg bg-${action.color}-100 flex items-center justify-center`}>
                    <action.icon className={`h-5 w-5 text-${action.color}-600`} />
                  </div>
                  <p className="text-sm font-medium text-gray-900">{action.label}</p>
                  {action.badge && (
                    <Badge className={`mt-1 text-xs ${action.badge === 'FREE' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                      {action.badge}
                    </Badge>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <Clock className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                <p>No recent activity</p>
                <p className="text-sm">Start by checking your CV's ATS score!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivity.slice(0, 5).map((activity, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg">
                    <div className={`p-2 rounded-lg ${
                      activity.type === 'ats' ? 'bg-green-100' :
                      activity.type === 'document' ? 'bg-blue-100' :
                      activity.type === 'ai' ? 'bg-purple-100' : 'bg-gray-100'
                    }`}>
                      {activity.type === 'ats' ? <Target className="h-4 w-4 text-green-600" /> :
                       activity.type === 'document' ? <FileText className="h-4 w-4 text-blue-600" /> :
                       activity.type === 'ai' ? <Sparkles className="h-4 w-4 text-purple-600" /> :
                       <Clock className="h-4 w-4 text-gray-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate">{activity.description}</p>
                      <p className="text-xs text-gray-500">{new Date(activity.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Feature Highlights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Featured Tools
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to="/ats-checker" className="block p-3 border rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Target className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">ATS Resume Checker</p>
                    <p className="text-sm text-gray-500">Check your CV's ATS compatibility</p>
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-700">FREE</Badge>
              </div>
            </Link>
            <Link to="/linkedin-tools" className="block p-3 border rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Linkedin className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">LinkedIn Tools</p>
                    <p className="text-sm text-gray-500">Optimise your LinkedIn profile</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            </Link>
            <Link to="/dashboard/interview-prep" className="block p-3 border rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <MessageSquare className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Interview Prep</p>
                    <p className="text-sm text-gray-500">Practice with AI feedback</p>
                  </div>
                </div>
                <Badge className="bg-purple-100 text-purple-700">NEW</Badge>
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CustomerDashboard;
