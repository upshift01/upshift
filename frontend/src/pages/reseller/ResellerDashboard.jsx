import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Users, TrendingUp, DollarSign, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

const ResellerDashboard = () => {
  const { token } = useAuth();
  const { theme, formatPrice } = useTheme();
  const [stats, setStats] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, profileRes] = await Promise.all([
        fetch(`${process.env.REACT_APP_BACKEND_URL}/api/reseller/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${process.env.REACT_APP_BACKEND_URL}/api/reseller/profile`, {
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
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Welcome back!</h1>
        <p className="text-gray-600">Here's an overview of your business</p>
      </div>

      {/* Status Banner */}
      {profile?.status === 'pending' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800">
            <strong>Account Pending:</strong> Your reseller account is awaiting approval. 
            You'll be notified once it's activated.
          </p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Customers</p>
                <p className="text-3xl font-bold">{stats?.total_customers || 0}</p>
              </div>
              <Users className="h-12 w-12 opacity-20" style={{ color: theme.primaryColor }} />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              {stats?.active_customers || 0} with active plans
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-3xl font-bold">{formatPrice(stats?.total_revenue || 0)}</p>
              </div>
              <DollarSign className="h-12 w-12 opacity-20" style={{ color: theme.secondaryColor }} />
            </div>
            <p className="mt-2 text-sm text-gray-500">All time earnings</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">This Month</p>
                <p className="text-3xl font-bold">{formatPrice(stats?.this_month_revenue || 0)}</p>
              </div>
              <TrendingUp className="h-12 w-12 text-green-500 opacity-20" />
            </div>
            <p className="mt-2 text-sm text-gray-500">Current month revenue</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Subscription</p>
                <p className="text-3xl font-bold capitalize">{profile?.subscription?.status || 'N/A'}</p>
              </div>
              <BarChart3 className="h-12 w-12 text-purple-500 opacity-20" />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              R2,500/month platform fee
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Your Brand</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Brand Name</span>
                <span className="font-medium">{profile?.brand_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Subdomain</span>
                <span className="font-medium">{profile?.subdomain}.upshift.co.za</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Custom Domain</span>
                <span className="font-medium">{profile?.custom_domain || 'Not set'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Brand Colors</span>
                <div className="flex gap-2">
                  <div 
                    className="w-6 h-6 rounded border"
                    style={{ backgroundColor: profile?.branding?.primary_color }}
                    title="Primary"
                  ></div>
                  <div 
                    className="w-6 h-6 rounded border"
                    style={{ backgroundColor: profile?.branding?.secondary_color }}
                    title="Secondary"
                  ></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Pricing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">ATS Optimize</span>
                <span className="font-medium">{formatPrice(profile?.pricing?.tier_1_price || 89900)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Professional Package</span>
                <span className="font-medium">{formatPrice(profile?.pricing?.tier_2_price || 150000)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Executive Elite</span>
                <span className="font-medium">{formatPrice(profile?.pricing?.tier_3_price || 300000)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResellerDashboard;
