import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { TrendingUp, ArrowUp, ArrowDown, Calendar, BarChart3, GitCompare, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';

const ResellerRevenue = () => {
  const { token } = useAuth();
  const { theme, formatPrice } = useTheme();
  const [stats, setStats] = useState(null);
  const [revenueData, setRevenueData] = useState([]);
  const [previousPeriodData, setPreviousPeriodData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('6');
  const [compareWithPrevious, setCompareWithPrevious] = useState(false);

  const periodOptions = [
    { value: '3', label: '3 Months' },
    { value: '6', label: '6 Months' },
    { value: '12', label: '12 Months' },
    { value: '24', label: '2 Years' }
  ];

  useEffect(() => {
    fetchData();
  }, [selectedPeriod, compareWithPrevious]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const months = parseInt(selectedPeriod);
      const fetchMonths = compareWithPrevious ? months * 2 : months;
      
      const [statsRes, revenueRes] = await Promise.all([
        fetch(`${process.env.REACT_APP_BACKEND_URL}/api/reseller/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${process.env.REACT_APP_BACKEND_URL}/api/reseller/revenue?months=${fetchMonths}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
      if (revenueRes.ok) {
        const revenueResult = await revenueRes.json();
        const allData = revenueResult.monthly_revenue || [];
        
        if (compareWithPrevious && allData.length > months) {
          // Split data into current and previous periods
          setRevenueData(allData.slice(0, months));
          setPreviousPeriodData(allData.slice(months, months * 2));
        } else {
          setRevenueData(allData.slice(0, months));
          setPreviousPeriodData([]);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals for comparison
  const currentPeriodTotal = revenueData.reduce((sum, d) => sum + d.revenue, 0);
  const previousPeriodTotal = previousPeriodData.reduce((sum, d) => sum + d.revenue, 0);
  const periodGrowth = previousPeriodTotal > 0 
    ? ((currentPeriodTotal - previousPeriodTotal) / previousPeriodTotal * 100).toFixed(1) 
    : 0;

  const currentTransactions = revenueData.reduce((sum, d) => sum + (d.transactions || 0), 0);
  const previousTransactions = previousPeriodData.reduce((sum, d) => sum + (d.transactions || 0), 0);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
      </div>
    );
  }

  const maxRevenue = Math.max(...revenueData.map(d => d.revenue), ...previousPeriodData.map(d => d.revenue), 1);
  const previousMonth = revenueData[1]?.revenue || 0;
  const currentMonth = stats?.this_month_revenue || 0;
  const monthGrowth = previousMonth > 0 ? ((currentMonth - previousMonth) / previousMonth * 100).toFixed(1) : 0;

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Revenue Analytics</h1>
          <p className="text-gray-600">Track your earnings and performance</p>
        </div>
        
        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Period Selector */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            {periodOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setSelectedPeriod(option.value)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  selectedPeriod === option.value
                    ? 'bg-white shadow text-gray-900'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          
          {/* Compare Toggle */}
          <Button
            variant={compareWithPrevious ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCompareWithPrevious(!compareWithPrevious)}
            className={compareWithPrevious ? '' : ''}
            style={compareWithPrevious ? { backgroundColor: theme.primaryColor } : {}}
          >
            <GitCompare className="h-4 w-4 mr-2" />
            Compare Period
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
              monthGrowth >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {monthGrowth >= 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
              <span>{Math.abs(monthGrowth)}% vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 mb-1">Selected Period</p>
            <p className="text-3xl font-bold">{formatPrice(currentPeriodTotal)}</p>
            {compareWithPrevious && previousPeriodTotal > 0 && (
              <div className={`flex items-center gap-1 mt-2 text-sm ${
                periodGrowth >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {periodGrowth >= 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                <span>{Math.abs(periodGrowth)}% vs previous period</span>
              </div>
            )}
            {!compareWithPrevious && (
              <p className="text-sm text-gray-500 mt-2">Last {selectedPeriod} months</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 mb-1">Transactions</p>
            <p className="text-3xl font-bold">{currentTransactions}</p>
            {compareWithPrevious && previousTransactions > 0 && (
              <div className={`flex items-center gap-1 mt-2 text-sm ${
                currentTransactions >= previousTransactions ? 'text-green-600' : 'text-red-600'
              }`}>
                {currentTransactions >= previousTransactions ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                <span>{previousTransactions} in previous period</span>
              </div>
            )}
            {!compareWithPrevious && (
              <p className="text-sm text-gray-500 mt-2">{stats?.active_customers || 0} active customers</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Comparison Summary (when comparing) */}
      {compareWithPrevious && previousPeriodTotal > 0 && (
        <Card className="mb-8 border-2 border-blue-200 bg-blue-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <GitCompare className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-blue-900">Period Comparison</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-blue-700 mb-1">Current Period</p>
                <p className="text-xl font-bold text-blue-900">{formatPrice(currentPeriodTotal)}</p>
                <p className="text-xs text-blue-600">{currentTransactions} transactions</p>
              </div>
              <div>
                <p className="text-sm text-blue-700 mb-1">Previous Period</p>
                <p className="text-xl font-bold text-blue-900">{formatPrice(previousPeriodTotal)}</p>
                <p className="text-xs text-blue-600">{previousTransactions} transactions</p>
              </div>
              <div>
                <p className="text-sm text-blue-700 mb-1">Revenue Change</p>
                <p className={`text-xl font-bold ${periodGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {periodGrowth >= 0 ? '+' : ''}{periodGrowth}%
                </p>
                <p className="text-xs text-blue-600">
                  {periodGrowth >= 0 ? '+' : ''}{formatPrice(currentPeriodTotal - previousPeriodTotal)}
                </p>
              </div>
              <div>
                <p className="text-sm text-blue-700 mb-1">Avg Monthly</p>
                <p className="text-xl font-bold text-blue-900">
                  {formatPrice(Math.round(currentPeriodTotal / parseInt(selectedPeriod)))}
                </p>
                <p className="text-xs text-blue-600">
                  vs {formatPrice(Math.round(previousPeriodTotal / parseInt(selectedPeriod)))} before
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Monthly Revenue
            </CardTitle>
            {compareWithPrevious && (
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.primaryColor }}></div>
                  <span className="text-gray-600">Current Period</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                  <span className="text-gray-600">Previous Period</span>
                </div>
              </div>
            )}
          </div>
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
              {revenueData.slice().reverse().map((item, index) => {
                const previousItem = previousPeriodData[previousPeriodData.length - 1 - index];
                const itemGrowth = previousItem && previousItem.revenue > 0
                  ? ((item.revenue - previousItem.revenue) / previousItem.revenue * 100).toFixed(0)
                  : null;
                
                return (
                  <div key={item.month} className="space-y-2">
                    <div className="flex items-center gap-4">
                      <div className="w-20 text-sm text-gray-600 font-medium">{item.month}</div>
                      <div className="flex-1">
                        <div className="h-8 bg-gray-100 rounded-full overflow-hidden relative">
                          {/* Previous period bar (behind) */}
                          {compareWithPrevious && previousItem && (
                            <div
                              className="h-full rounded-full absolute top-0 left-0 bg-gray-300"
                              style={{ 
                                width: `${(previousItem.revenue / maxRevenue) * 100}%`
                              }}
                            ></div>
                          )}
                          {/* Current period bar (front) */}
                          <div
                            className="h-full rounded-full relative z-10 transition-all duration-300"
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
                      {compareWithPrevious && itemGrowth !== null && (
                        <div className={`w-16 text-right text-sm font-medium ${
                          parseFloat(itemGrowth) >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {parseFloat(itemGrowth) >= 0 ? '+' : ''}{itemGrowth}%
                        </div>
                      )}
                    </div>
                    {/* Previous period label */}
                    {compareWithPrevious && previousItem && (
                      <div className="flex items-center gap-4 pl-24 text-xs text-gray-400">
                        <div className="flex-1"></div>
                        <div className="w-28 text-right">{formatPrice(previousItem.revenue)}</div>
                        <div className="w-20 text-right">{previousItem.transactions} sales</div>
                        <div className="w-16"></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ResellerRevenue;
