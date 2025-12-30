import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { 
  BarChart3, TrendingUp, FileText, Target, Sparkles, Calendar, 
  Loader2, Activity, Clock, CheckCircle, Mail, Briefcase
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// Activity icon mapping
const ACTIVITY_ICONS = {
  cv_created: FileText,
  cv_downloaded: FileText,
  cv_enhanced: Sparkles,
  ats_check: CheckCircle,
  cover_letter: Mail,
  skills_generated: Sparkles,
  resume_improved: TrendingUp,
  document: FileText,
  ats: Target,
  default: Activity
};

/**
 * Shared Analytics Component
 * Works for both main platform and partner sites
 */
const SharedAnalytics = ({
  isPartner = false,
  primaryColor = '#1e40af',
  brandName = 'UpShift'
}) => {
  const { getAuthHeader, token } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  const fetchData = async () => {
    try {
      const headers = getAuthHeader ? getAuthHeader() : { Authorization: `Bearer ${token}` };
      
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
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { 
      label: 'Documents Created', 
      value: stats?.total_documents || 0, 
      icon: FileText, 
      color: primaryColor,
      bgColor: `${primaryColor}15`
    },
    { 
      label: 'ATS Checks', 
      value: stats?.ats_checks || 0, 
      icon: Target, 
      color: '#059669',
      bgColor: '#05966915'
    },
    { 
      label: 'AI Generations', 
      value: stats?.ai_generations || 0, 
      icon: Sparkles, 
      color: '#7c3aed',
      bgColor: '#7c3aed15'
    },
    { 
      label: 'Jobs Tracked', 
      value: stats?.jobs_tracked || 0, 
      icon: Briefcase, 
      color: '#ea580c',
      bgColor: '#ea580c15'
    },
  ];

  const activityByType = stats?.activity_by_type || {};
  const thisMonthActivity = stats?.this_month_activity || 0;
  const totalActivity = stats?.total_activity || 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Usage & Analytics</h1>
          <p className="text-gray-600">Track your activity and usage on {brandName}</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: primaryColor }} />
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {statCards.map((stat, idx) => (
                <Card key={idx}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">{stat.label}</p>
                        <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                      </div>
                      <div 
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: stat.bgColor }}
                      >
                        <stat.icon className="h-5 w-5" style={{ color: stat.color }} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Activity Summary Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <Card>
                <CardContent className="p-4 text-center">
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2"
                    style={{ backgroundColor: `${primaryColor}15` }}
                  >
                    <Calendar className="h-6 w-6" style={{ color: primaryColor }} />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{thisMonthActivity}</p>
                  <p className="text-sm text-gray-500">This Month</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2"
                    style={{ backgroundColor: '#7c3aed15' }}
                  >
                    <Activity className="h-6 w-6" style={{ color: '#7c3aed' }} />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{totalActivity}</p>
                  <p className="text-sm text-gray-500">Total Activities</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2"
                    style={{ backgroundColor: '#05966915' }}
                  >
                    <TrendingUp className="h-6 w-6" style={{ color: '#059669' }} />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats?.linkedin_used ? 'Yes' : 'No'}
                  </p>
                  <p className="text-sm text-gray-500">LinkedIn Tools Used</p>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Activity Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" style={{ color: primaryColor }} />
                    Activity Breakdown
                  </CardTitle>
                  <CardDescription>Usage by feature type</CardDescription>
                </CardHeader>
                <CardContent>
                  {Object.keys(activityByType).length === 0 ? (
                    <div className="text-center py-8">
                      <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No activity data yet</p>
                      <p className="text-sm text-gray-400">Start using features to see breakdown</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {Object.entries(activityByType).map(([type, count], idx) => {
                        const IconComponent = ACTIVITY_ICONS[type] || ACTIVITY_ICONS.default;
                        const percentage = totalActivity > 0 ? Math.round((count / totalActivity) * 100) : 0;
                        
                        return (
                          <div key={idx} className="flex items-center gap-3">
                            <div 
                              className="w-8 h-8 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: `${primaryColor}15` }}
                            >
                              <IconComponent className="h-4 w-4" style={{ color: primaryColor }} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-gray-700 capitalize">
                                  {type.replace(/_/g, ' ')}
                                </span>
                                <span className="text-sm text-gray-500">{count}</span>
                              </div>
                              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div 
                                  className="h-full rounded-full transition-all"
                                  style={{ 
                                    width: `${percentage}%`, 
                                    backgroundColor: primaryColor 
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" style={{ color: primaryColor }} />
                    Recent Activity
                  </CardTitle>
                  <CardDescription>Your latest actions</CardDescription>
                </CardHeader>
                <CardContent>
                  {recentActivity.length === 0 ? (
                    <div className="text-center py-8">
                      <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No recent activity</p>
                      <p className="text-sm text-gray-400">Your actions will appear here</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {recentActivity.slice(0, 10).map((activity, idx) => {
                        const IconComponent = ACTIVITY_ICONS[activity.type] || ACTIVITY_ICONS.default;
                        const createdAt = activity.created_at 
                          ? new Date(activity.created_at) 
                          : new Date();
                        
                        return (
                          <div key={idx} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50">
                            <div 
                              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                              style={{ backgroundColor: `${primaryColor}15` }}
                            >
                              <IconComponent className="h-4 w-4" style={{ color: primaryColor }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-900 truncate">
                                {activity.description}
                              </p>
                              <p className="text-xs text-gray-500">
                                {createdAt.toLocaleDateString('en-ZA', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Tips Card */}
            <Card className="mt-6">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${primaryColor}15` }}
                  >
                    <TrendingUp className="h-6 w-6" style={{ color: primaryColor }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Boost Your Career</h3>
                    <p className="text-sm text-gray-600">
                      Regular use of our AI tools can significantly improve your job search success. 
                      Try to check your CV with ATS at least once a week and keep your documents updated 
                      with new achievements.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default SharedAnalytics;
