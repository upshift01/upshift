import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { TrendingUp, ArrowUp, ArrowDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

const ResellerRevenue = () => {
  const { token } = useAuth();
  const { theme, formatPrice } = useTheme();
  const [stats, setStats] = useState(null);
  const [revenueData, setRevenueData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, revenueRes] = await Promise.all([
        fetch(`${process.env.REACT_APP_BACKEND_URL}/api/reseller/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${process.env.REACT_APP_BACKEND_URL}/api/reseller/revenue?months=6`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
      if (revenueRes.ok) {
        const revenueResult = await revenueRes.json();
        setRevenueData(revenueResult.monthly_revenue || []);
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

  const maxRevenue = Math.max(...revenueData.map(d => d.revenue), 1);
  const previousMonth = revenueData[1]?.revenue || 0;
  const currentMonth = stats?.this_month_revenue || 0;
  const growth = previousMonth > 0 ? ((currentMonth - previousMonth) / previousMonth * 100).toFixed(1) : 0;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Revenue Analytics</h1>
        <p className="text-gray-600">Track your earnings and performance</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
            <p className="text-3xl font-bold">{formatPrice(stats?.total_revenue || 0)}</p>
            <p className="text-sm text-gray-500 mt-2">All time earnings</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 mb-1">This Month</p>
            <p className="text-3xl font-bold">{formatPrice(stats?.this_month_revenue || 0)}</p>
            <div className={`flex items-center gap-1 mt-2 text-sm ${
              growth >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {growth >= 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
              <span>{Math.abs(growth)}% vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 mb-1">Active Customers</p>
            <p className="text-3xl font-bold">{stats?.active_customers || 0}</p>
            <p className="text-sm text-gray-500 mt-2">With paid plans</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Monthly Revenue
          </CardTitle>
        </CardHeader>
        <CardContent>
          {revenueData.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No revenue data yet</p>
              <p className="text-sm">Start getting customers to see your revenue chart</p>
            </div>
          ) : (
            <div className="space-y-4">
              {revenueData.slice().reverse().map((item) => (
                <div key={item.month} className="flex items-center gap-4">
                  <div className="w-20 text-sm text-gray-600">{item.month}</div>
                  <div className="flex-1">
                    <div className="h-8 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ 
                          width: `${(item.revenue / maxRevenue) * 100}%`,
                          backgroundColor: theme.primaryColor
                        }}
                      ></div>
                    </div>
                  </div>
                  <div className="w-28 text-right font-medium">{formatPrice(item.revenue)}</div>
                  <div className="w-20 text-right text-sm text-gray-500">
                    {item.transactions} sales
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ResellerRevenue;
