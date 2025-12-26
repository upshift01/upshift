import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePartner } from '../../context/PartnerContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { 
  BarChart3, 
  TrendingUp, 
  FileText, 
  Target, 
  Sparkles,
  Calendar,
  Loader2
} from 'lucide-react';
import PartnerCustomerLayout from '../../components/PartnerCustomerLayout';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const PartnerAnalytics = () => {
  const { getAuthHeader } = useAuth();
  const { primaryColor, brandName } = usePartner();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/customer/dashboard-stats`, {
        headers: getAuthHeader()
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: 'Documents Created', value: stats?.total_documents || 0, icon: FileText, color: 'blue' },
    { label: 'ATS Checks', value: stats?.ats_checks || 0, icon: Target, color: 'green' },
    { label: 'AI Generations', value: stats?.ai_generations || 0, icon: Sparkles, color: 'purple' },
    { label: 'Jobs Tracked', value: stats?.jobs_tracked || 0, icon: TrendingUp, color: 'orange' },
  ];

  return (
    <PartnerCustomerLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Usage & Analytics</h1>
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
                      <div className={`p-2 bg-${stat.color}-100 rounded-lg`}>
                        <stat.icon className={`h-5 w-5 text-${stat.color}-600`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Usage Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" style={{ color: primaryColor }} />
                    Activity Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <FileText className="h-4 w-4 text-blue-600" />
                        </div>
                        <span className="text-sm text-gray-700">CVs Created</span>
                      </div>
                      <Badge variant="outline">{stats?.cvs_created || 0}</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <FileText className="h-4 w-4 text-purple-600" />
                        </div>
                        <span className="text-sm text-gray-700">Cover Letters</span>
                      </div>
                      <Badge variant="outline">{stats?.cover_letters_created || 0}</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Target className="h-4 w-4 text-green-600" />
                        </div>
                        <span className="text-sm text-gray-700">ATS Scans</span>
                      </div>
                      <Badge variant="outline">{stats?.ats_checks || 0}</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 rounded-lg">
                          <Sparkles className="h-4 w-4 text-orange-600" />
                        </div>
                        <span className="text-sm text-gray-700">AI Improvements</span>
                      </div>
                      <Badge variant="outline">{stats?.ai_generations || 0}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" style={{ color: primaryColor }} />
                    Account Info
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500 mb-1">Member Since</p>
                      <p className="font-medium text-gray-900">
                        {stats?.member_since ? new Date(stats.member_since).toLocaleDateString('en-ZA', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        }) : 'N/A'}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500 mb-1">Last Activity</p>
                      <p className="font-medium text-gray-900">
                        {stats?.last_activity ? new Date(stats.last_activity).toLocaleDateString('en-ZA', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        }) : 'No recent activity'}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg" style={{ backgroundColor: `${primaryColor}10` }}>
                      <p className="text-sm text-gray-500 mb-1">Current Plan</p>
                      <p className="font-medium" style={{ color: primaryColor }}>
                        {stats?.active_tier === 'tier-1' ? 'ATS Optimise' :
                         stats?.active_tier === 'tier-2' ? 'Professional Package' :
                         stats?.active_tier === 'tier-3' ? 'Executive Elite' : 'Free'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </PartnerCustomerLayout>
  );
};

export default PartnerAnalytics;
