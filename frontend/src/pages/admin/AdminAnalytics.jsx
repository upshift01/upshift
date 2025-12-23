import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { BarChart3, TrendingUp, Building2, Users, Calendar, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

const AdminAnalytics = () => {
  const { token } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [revenueData, setRevenueData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState(6);
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);

  const timePeriodOptions = [
    { value: 3, label: 'Last 3 Months' },
    { value: 6, label: 'Last 6 Months' },
    { value: 12, label: 'Last 12 Months' },
    { value: 24, label: 'Last 2 Years' }
  ];

  useEffect(() => {
    fetchAnalytics();
  }, []);

  useEffect(() => {
    fetchRevenueData();
  }, [timePeriod]);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/analytics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRevenueData = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/analytics/revenue?months=${timePeriod}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setRevenueData(data.monthly_revenue || []);
      }
    } catch (error) {
      console.error('Error fetching revenue data:', error);
    }
  };

  const formatCurrency = (cents) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(cents / 100);
  };

  const formatShortCurrency = (cents) => {
    const value = cents / 100;
    if (value >= 1000000) return `R${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `R${(value / 1000).toFixed(1)}K`;
    return `R${value}`;
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const chartData = revenueData.slice().reverse();
  const maxRevenue = Math.max(...chartData.map(d => d.revenue), 1);
  const totalPeriodRevenue = chartData.reduce((sum, d) => sum + d.revenue, 0);
  const avgMonthlyRevenue = chartData.length > 0 ? totalPeriodRevenue / chartData.length : 0;

  // Calculate growth percentage
  const calculateGrowth = () => {
    if (chartData.length < 2) return 0;
    const lastMonth = chartData[chartData.length - 1]?.revenue || 0;
    const previousMonth = chartData[chartData.length - 2]?.revenue || 0;
    if (previousMonth === 0) return lastMonth > 0 ? 100 : 0;
    return ((lastMonth - previousMonth) / previousMonth) * 100;
  };
  const growthPercent = calculateGrowth();

  // Y-axis labels - create nice round numbers
  const getYAxisLabels = (max) => {
    if (max === 0) return [0];
    const step = Math.ceil(max / 4 / 100000) * 100000; // Round to nearest 1000 ZAR
    return [0, step, step * 2, step * 3, step * 4].filter(v => v <= max * 1.1);
  };
  const yAxisLabels = getYAxisLabels(maxRevenue).reverse();
  const chartMaxRevenue = yAxisLabels[0] || maxRevenue;

  // Format month label
  const formatMonthLabel = (monthStr) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const parts = monthStr.split('-');
    if (parts.length === 2) {
      const monthIndex = parseInt(parts[1]) - 1;
      return months[monthIndex] || monthStr;
    }
    return monthStr;
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-600">Platform performance metrics</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Active Resellers</p>
                <p className="text-2xl font-bold">{analytics?.resellers?.active || 0}</p>
                <p className="text-xs text-gray-400">{analytics?.resellers?.total || 0} total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Paying Customers</p>
                <p className="text-2xl font-bold">{analytics?.customers?.paying || 0}</p>
                <p className="text-xs text-gray-400">{analytics?.customers?.total || 0} total registered</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(analytics?.revenue?.total || 0)}</p>
                <p className="text-xs text-gray-400">
                  Fees: {formatShortCurrency(analytics?.revenue?.reseller_fees || 0)} • 
                  Sales: {formatShortCurrency(analytics?.revenue?.customer_payments || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">This Month</p>
                <p className="text-2xl font-bold">{formatCurrency(analytics?.revenue?.this_month || 0)}</p>
                <p className="text-xs text-gray-400">
                  {analytics?.invoices?.pending || 0} pending invoices
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Revenue Overview
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                Total: {formatCurrency(totalPeriodRevenue)} • Avg: {formatCurrency(avgMonthlyRevenue)}/month
              </p>
            </div>
            
            {/* Time Period Selector */}
            <div className="relative">
              <Button
                variant="outline"
                onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
                className="flex items-center gap-2"
              >
                <Calendar className="h-4 w-4" />
                {timePeriodOptions.find(o => o.value === timePeriod)?.label}
                <ChevronDown className={`h-4 w-4 transition-transform ${showPeriodDropdown ? 'rotate-180' : ''}`} />
              </Button>
              
              {showPeriodDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-10">
                  {timePeriodOptions.map(option => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setTimePeriod(option.value);
                        setShowPeriodDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg ${
                        timePeriod === option.value ? 'bg-blue-50 text-blue-600' : ''
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="text-gray-500 text-center py-12">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No revenue data yet</p>
            </div>
          ) : (
            <div className="mt-4">
              {/* Growth indicator */}
              <div className="flex items-center gap-4 mb-6">
                <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                  growthPercent >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  <TrendingUp className={`h-4 w-4 ${growthPercent < 0 ? 'rotate-180' : ''}`} />
                  {growthPercent >= 0 ? '+' : ''}{growthPercent.toFixed(1)}% vs last month
                </div>
              </div>

              {/* Chart Container */}
              <div className="relative h-80">
                {/* Y-axis labels */}
                <div className="absolute left-0 top-0 bottom-8 w-16 flex flex-col justify-between text-xs text-gray-500">
                  {yAxisLabels.map((value, i) => (
                    <span key={i} className="text-right pr-2">{formatShortCurrency(value)}</span>
                  ))}
                </div>

                {/* Chart area */}
                <div className="ml-16 h-full flex flex-col">
                  {/* Grid lines */}
                  <div className="flex-1 relative border-l border-b border-gray-200">
                    {[0, 25, 50, 75, 100].map(percent => (
                      <div
                        key={percent}
                        className="absolute w-full border-t border-gray-100"
                        style={{ top: `${percent}%` }}
                      />
                    ))}
                    
                    {/* Bars */}
                    <div className="absolute inset-0 flex items-end gap-1 px-2 pb-1">
                      {chartData.map((item, index) => {
                        const barHeight = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;
                        const isLastMonth = index === chartData.length - 1;
                        
                        return (
                          <div
                            key={item.month}
                            className="flex-1 flex flex-col items-center group relative"
                          >
                            {/* Tooltip */}
                            <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                              <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                                <div className="font-medium">{item.month}</div>
                                <div>{formatCurrency(item.revenue)}</div>
                              </div>
                            </div>
                            
                            {/* Bar */}
                            <div
                              className={`w-full rounded-t transition-all duration-500 cursor-pointer hover:opacity-80 ${
                                isLastMonth 
                                  ? 'bg-gradient-to-t from-blue-600 to-blue-400' 
                                  : 'bg-gradient-to-t from-blue-500 to-blue-300'
                              }`}
                              style={{ 
                                height: `${Math.max(barHeight, 1)}%`,
                                minHeight: item.revenue > 0 ? '8px' : '2px'
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* X-axis labels */}
                  <div className="flex gap-1 px-2 mt-2">
                    {chartData.map((item, index) => (
                      <div key={item.month} className="flex-1 text-center">
                        <span className={`text-xs ${
                          index === chartData.length - 1 ? 'text-blue-600 font-medium' : 'text-gray-500'
                        }`}>
                          {item.month.slice(0, 3)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="flex justify-center gap-6 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-blue-500"></div>
                  <span className="text-gray-600">Monthly Revenue</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-blue-600"></div>
                  <span className="text-gray-600">Current Month</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reseller Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Reseller Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Active</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ 
                        width: `${analytics?.resellers?.total ? (analytics.resellers.active / analytics.resellers.total) * 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                  <span className="font-medium w-8 text-right">{analytics?.resellers?.active || 0}</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Pending</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-yellow-500 h-2 rounded-full" 
                      style={{ 
                        width: `${analytics?.resellers?.total ? (analytics.resellers.pending / analytics.resellers.total) * 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                  <span className="font-medium w-8 text-right">{analytics?.resellers?.pending || 0}</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Suspended</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-red-500 h-2 rounded-full" 
                      style={{ 
                        width: `${analytics?.resellers?.total ? (analytics.resellers.suspended / analytics.resellers.total) * 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                  <span className="font-medium w-8 text-right">{analytics?.resellers?.suspended || 0}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoice Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Pending</span>
                <span className="text-2xl font-bold text-yellow-600">
                  {analytics?.invoices?.pending || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Overdue</span>
                <span className="text-2xl font-bold text-red-600">
                  {analytics?.invoices?.overdue || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminAnalytics;
