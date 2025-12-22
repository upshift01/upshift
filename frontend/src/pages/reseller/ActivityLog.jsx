import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Activity, UserPlus, CreditCard, FileText, Mail, Eye, Filter, Calendar, Download, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';

const ActivityLog = () => {
  const { token } = useAuth();
  const { theme } = useTheme();
  const { darkMode } = useOutletContext() || {};
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [dateRange, setDateRange] = useState('7d');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchActivities();
  }, [filter, dateRange]);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/reseller/activity?filter=${filter}&range=${dateRange}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities || []);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'signup': return <UserPlus className="h-4 w-4" />;
      case 'payment': return <CreditCard className="h-4 w-4" />;
      case 'invoice': return <FileText className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'view': return <Eye className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case 'signup': return 'bg-green-100 text-green-600 dark:bg-green-900/30';
      case 'payment': return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30';
      case 'invoice': return 'bg-purple-100 text-purple-600 dark:bg-purple-900/30';
      case 'email': return 'bg-orange-100 text-orange-600 dark:bg-orange-900/30';
      default: return 'bg-gray-100 text-gray-600 dark:bg-gray-700';
    }
  };

  const filterOptions = [
    { value: 'all', label: 'All Activity' },
    { value: 'signup', label: 'Signups' },
    { value: 'payment', label: 'Payments' },
    { value: 'invoice', label: 'Invoices' },
    { value: 'email', label: 'Emails' },
  ];

  const dateOptions = [
    { value: '24h', label: 'Last 24 Hours' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' },
  ];

  const cardBg = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white';
  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-gray-400' : 'text-gray-600';

  const filteredActivities = activities.filter(activity =>
    activity.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    activity.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    activity.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${textPrimary}`}>Activity Log</h1>
          <p className={textSecondary}>Track all customer interactions and events</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchActivities}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className={cardBg}>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search activities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={darkMode ? 'bg-gray-700 border-gray-600' : ''}
              />
            </div>
            <div className="flex gap-2">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className={`px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
              >
                {filterOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className={`px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
              >
                {dateOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Timeline */}
      <Card className={cardBg}>
        <CardContent className="p-4 md:p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="text-center py-12">
              <Activity className={`h-16 w-16 mx-auto mb-4 ${textSecondary} opacity-50`} />
              <h3 className={`text-lg font-medium ${textPrimary}`}>No Activity Found</h3>
              <p className={textSecondary}>Activity will appear here as customers interact with your platform</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className={`absolute left-5 top-0 bottom-0 w-0.5 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />
              
              <div className="space-y-4">
                {filteredActivities.map((activity, index) => (
                  <div key={index} className="relative flex gap-4 pl-2">
                    <div className={`relative z-10 p-2 rounded-full ${getActivityColor(activity.type)}`}>
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className={`flex-1 p-4 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div>
                          <p className={`font-medium ${textPrimary}`}>{activity.title}</p>
                          <p className={`text-sm ${textSecondary}`}>{activity.description}</p>
                          {activity.customer_name && (
                            <p className={`text-sm ${textSecondary}`}>Customer: {activity.customer_name}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{activity.type}</Badge>
                          <span className={`text-xs ${textSecondary}`}>{activity.time_ago}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ActivityLog;
