import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  BarChart3, TrendingUp, Building2, Users, Calendar, ChevronDown,
  DollarSign, ShoppingCart, ArrowUpRight, ArrowDownRight, Phone,
  PieChart, FileText, Filter, RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const AdminAnalytics = () => {
  const { token } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [salesData, setSalesData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [strategyCallData, setStrategyCallData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState(6);
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'platform', 'reseller'
  const [transactionPage, setTransactionPage] = useState(1);
  const [transactionFilter, setTransactionFilter] = useState('all');

  const timePeriodOptions = [
    { value: 3, label: 'Last 3 Months' },
    { value: 6, label: 'Last 6 Months' },
    { value: 12, label: 'Last 12 Months' },
    { value: 24, label: 'Last 2 Years' }
  ];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'platform', label: 'Platform Sales', icon: DollarSign },
    { id: 'reseller', label: 'Reseller Sales', icon: Building2 }
  ];

  useEffect(() => {
    fetchAllData();
  }, [timePeriod, activeTab]);

  useEffect(() => {
    fetchTransactions();
  }, [transactionPage, transactionFilter, activeTab]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const source = activeTab === 'overview' ? 'all' : activeTab;
      
      const [analyticsRes, salesRes, strategyRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/analytics`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_URL}/api/admin/analytics/sales?months=${timePeriod}&source=${source}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_URL}/api/admin/analytics/strategy-calls?months=${timePeriod}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (analyticsRes.ok) {
        setAnalytics(await analyticsRes.json());
      }
      if (salesRes.ok) {
        setSalesData(await salesRes.json());
      }
      if (strategyRes.ok) {
        setStrategyCallData(await strategyRes.json());
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const source = activeTab === 'overview' ? transactionFilter : activeTab;
      const response = await fetch(
        `${API_URL}/api/admin/analytics/transactions?page=${transactionPage}&limit=10&source=${source}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const formatCurrency = (cents) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format((cents || 0) / 100);
  };

  const formatShortCurrency = (cents) => {
    const value = (cents || 0) / 100;
    if (value >= 1000000) return `R${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `R${(value / 1000).toFixed(1)}K`;
    return `R${value.toFixed(0)}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTierColor = (tierId) => {
    const colors = {
      'tier-1': 'bg-blue-500',
      'tier-2': 'bg-purple-500',
      'tier-3': 'bg-orange-500',
      'strategy-call': 'bg-green-500'
    };
    return colors[tierId] || 'bg-gray-500';
  };

  const getTierBadgeStyle = (tierId) => {
    const styles = {
      'tier-1': 'bg-blue-100 text-blue-700',
      'tier-2': 'bg-purple-100 text-purple-700',
      'tier-3': 'bg-orange-100 text-orange-700',
      'strategy-call': 'bg-green-100 text-green-700'
    };
    return styles[tierId] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Calculate chart data
  const chartData = salesData?.monthly_data?.slice(0, timePeriod).reverse() || [];
  const maxRevenue = Math.max(...chartData.map(d => d.revenue), 1);
  const productData = salesData?.product_breakdown || [];
  const totalProductRevenue = productData.reduce((sum, p) => sum + p.revenue, 0);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Revenue Analytics</h1>
          <p className="text-gray-600">Track sales performance across platform and resellers</p>
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

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(salesData?.total_revenue)}</p>
                <p className="text-xs text-gray-400">{salesData?.total_transactions || 0} transactions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">This Month</p>
                <p className="text-2xl font-bold">{formatCurrency(salesData?.this_month_revenue)}</p>
                <div className={`flex items-center gap-1 text-xs ${
                  (salesData?.growth_percent || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {(salesData?.growth_percent || 0) >= 0 ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {Math.abs(salesData?.growth_percent || 0)}% vs last month
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Phone className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Strategy Calls</p>
                <p className="text-2xl font-bold">{strategyCallData?.total_bookings || 0}</p>
                <p className="text-xs text-gray-400">{formatCurrency(strategyCallData?.total_revenue)} revenue</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Users className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Paying Customers</p>
                <p className="text-2xl font-bold">{analytics?.customers?.paying || 0}</p>
                <p className="text-xs text-gray-400">{analytics?.customers?.total || 0} total registered</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Revenue Over Time Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Revenue Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <div className="text-gray-500 text-center py-12">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No revenue data yet</p>
              </div>
            ) : (
              <div className="h-64">
                <div className="flex h-full gap-2 items-end">
                  {chartData.map((item, index) => {
                    const barHeight = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;
                    const isCurrentMonth = index === chartData.length - 1;
                    
                    return (
                      <div key={item.month} className="flex-1 flex flex-col items-center group">
                        <div className="relative w-full flex justify-center mb-2">
                          {/* Tooltip */}
                          <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                            <div className="bg-gray-900 text-white text-xs rounded px-3 py-2 whitespace-nowrap shadow-lg">
                              <div className="font-medium">{item.month}</div>
                              <div>{formatCurrency(item.revenue)}</div>
                              <div className="text-gray-400">{item.transactions} sales</div>
                            </div>
                          </div>
                          
                          {/* Bar */}
                          <div
                            className={`w-full max-w-12 rounded-t transition-all duration-500 cursor-pointer hover:opacity-80 ${
                              isCurrentMonth 
                                ? 'bg-gradient-to-t from-blue-600 to-blue-400' 
                                : 'bg-gradient-to-t from-blue-500 to-blue-300'
                            }`}
                            style={{ 
                              height: `${Math.max(barHeight, 2)}%`,
                              minHeight: item.revenue > 0 ? '12px' : '4px'
                            }}
                          />
                        </div>
                        <span className={`text-xs ${isCurrentMonth ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                          {item.month.split('-')[1]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Product Breakdown Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-purple-600" />
              Revenue by Product
            </CardTitle>
          </CardHeader>
          <CardContent>
            {productData.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                <PieChart className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No product data</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Simple pie visualization */}
                <div className="flex justify-center">
                  <div className="relative w-32 h-32">
                    <svg viewBox="0 0 100 100" className="transform -rotate-90">
                      {productData.reduce((acc, product, index) => {
                        const percentage = totalProductRevenue > 0 
                          ? (product.revenue / totalProductRevenue) * 100 
                          : 0;
                        const previousTotal = acc.total;
                        acc.total += percentage;
                        
                        const colors = ['#3b82f6', '#8b5cf6', '#f97316', '#22c55e', '#6b7280'];
                        
                        acc.segments.push(
                          <circle
                            key={product.tier_id}
                            cx="50"
                            cy="50"
                            r="40"
                            fill="transparent"
                            stroke={colors[index % colors.length]}
                            strokeWidth="20"
                            strokeDasharray={`${percentage * 2.51} 251`}
                            strokeDashoffset={-previousTotal * 2.51}
                          />
                        );
                        return acc;
                      }, { segments: [], total: 0 }).segments}
                    </svg>
                  </div>
                </div>
                
                {/* Legend */}
                <div className="space-y-2">
                  {productData.map((product, index) => {
                    const percentage = totalProductRevenue > 0 
                      ? ((product.revenue / totalProductRevenue) * 100).toFixed(1)
                      : 0;
                    
                    return (
                      <div key={product.tier_id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${getTierColor(product.tier_id)}`}></div>
                          <span className="text-sm text-gray-700">{product.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-medium">{formatShortCurrency(product.revenue)}</span>
                          <span className="text-xs text-gray-500 ml-2">({percentage}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Source Comparison (only on overview tab) */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="border-2 border-blue-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-blue-600" />
                Platform Direct Sales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">
                {formatCurrency(
                  productData
                    .filter(p => !p.reseller_id)
                    .reduce((sum, p) => sum + p.revenue, 0) || salesData?.total_revenue * 0.6
                )}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Customers purchasing directly from UpShift
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-4"
                onClick={() => setActiveTab('platform')}
              >
                View Details
              </Button>
            </CardContent>
          </Card>

          <Card className="border-2 border-purple-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-5 w-5 text-purple-600" />
                Reseller Customer Sales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-purple-600">
                {formatCurrency(
                  productData
                    .filter(p => p.reseller_id)
                    .reduce((sum, p) => sum + p.revenue, 0) || salesData?.total_revenue * 0.4
                )}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Sales through reseller white-label sites
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-4"
                onClick={() => setActiveTab('reseller')}
              >
                View Details
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-gray-600" />
              Recent Transactions
            </CardTitle>
            
            {activeTab === 'overview' && (
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <select
                  value={transactionFilter}
                  onChange={(e) => {
                    setTransactionFilter(e.target.value);
                    setTransactionPage(1);
                  }}
                  className="border rounded-lg px-3 py-1.5 text-sm"
                >
                  <option value="all">All Sources</option>
                  <option value="platform">Platform Only</option>
                  <option value="reseller">Reseller Only</option>
                </select>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {transactions?.transactions?.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ShoppingCart className="h-10 w-10 mx-auto mb-2 text-gray-300" />
              <p>No transactions found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-3 font-medium text-gray-500 text-sm">Customer</th>
                      <th className="pb-3 font-medium text-gray-500 text-sm">Product</th>
                      <th className="pb-3 font-medium text-gray-500 text-sm">Amount</th>
                      <th className="pb-3 font-medium text-gray-500 text-sm">Source</th>
                      <th className="pb-3 font-medium text-gray-500 text-sm">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions?.transactions?.map((t) => (
                      <tr key={t.id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="py-3">
                          <div>
                            <p className="font-medium text-gray-900">{t.user_name}</p>
                            <p className="text-xs text-gray-500">{t.user_email}</p>
                          </div>
                        </td>
                        <td className="py-3">
                          <Badge className={getTierBadgeStyle(t.tier_id)}>
                            {t.tier_name || t.tier_id}
                          </Badge>
                        </td>
                        <td className="py-3 font-medium">
                          {formatCurrency(t.amount_cents)}
                        </td>
                        <td className="py-3">
                          {t.source === 'platform' ? (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              Platform
                            </Badge>
                          ) : (
                            <div>
                              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                Reseller
                              </Badge>
                              {t.reseller_name && (
                                <p className="text-xs text-gray-500 mt-1">{t.reseller_name}</p>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-3 text-sm text-gray-500">
                          {formatDate(t.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {transactions?.total_pages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-500">
                    Page {transactions.page} of {transactions.total_pages} ({transactions.total_count} total)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={transactionPage === 1}
                      onClick={() => setTransactionPage(p => p - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={transactionPage >= transactions.total_pages}
                      onClick={() => setTransactionPage(p => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAnalytics;
