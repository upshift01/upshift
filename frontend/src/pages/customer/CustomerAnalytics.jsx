import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { 
  BarChart3, 
  TrendingUp, 
  Target, 
  FileText, 
  Sparkles,
  Calendar,
  Award,
  Clock,
  CheckCircle,
  Loader2
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const CustomerAnalytics = () => {
  const { getAuthHeader } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [atsHistory, setAtsHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const [analyticsRes, atsRes] = await Promise.all([
        fetch(`${API_URL}/api/customer/analytics`, { headers: getAuthHeader() }),
        fetch(`${API_URL}/api/customer/ats-history`, { headers: getAuthHeader() })
      ]);

      if (analyticsRes.ok) {
        const data = await analyticsRes.json();
        setAnalytics(data);
      }
      if (atsRes.ok) {
        const data = await atsRes.json();
        setAtsHistory(data.history || []);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const stats = analytics || {
    total_documents: 0,
    ai_generations: 0,
    ats_checks: 0,
    avg_ats_score: 0,
    this_month_activity: 0
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Usage & Analytics</h1>
        <p className="text-gray-600">Track your activity and progress</p>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Documents Created</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total_documents}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">AI Generations</p>
                <p className="text-3xl font-bold text-gray-900">{stats.ai_generations}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Sparkles className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">ATS Checks</p>
                <p className="text-3xl font-bold text-gray-900">{stats.ats_checks}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Target className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Avg ATS Score</p>
                <p className={`text-3xl font-bold ${getScoreColor(stats.avg_ats_score)}`}>
                  {stats.avg_ats_score}%
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <Award className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              This Month's Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-gray-500" />
                  <span className="text-sm">Active Days</span>
                </div>
                <span className="font-bold">{stats.this_month_activity || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-blue-500" />
                  <span className="text-sm">Documents Created</span>
                </div>
                <span className="font-bold">{stats.documents_this_month || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Target className="h-5 w-5 text-green-500" />
                  <span className="text-sm">ATS Checks</span>
                </div>
                <span className="font-bold">{stats.ats_checks_this_month || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { name: 'First CV Created', done: stats.total_documents > 0 },
                { name: 'First ATS Check', done: stats.ats_checks > 0 },
                { name: 'Score Above 70%', done: stats.avg_ats_score >= 70 },
                { name: '5 Documents Created', done: stats.total_documents >= 5 },
                { name: 'Score Above 90%', done: stats.avg_ats_score >= 90 }
              ].map((achievement, idx) => (
                <div 
                  key={idx}
                  className={`flex items-center gap-3 p-3 rounded-lg ${achievement.done ? 'bg-green-50' : 'bg-gray-50'}`}
                >
                  <CheckCircle className={`h-5 w-5 ${achievement.done ? 'text-green-500' : 'text-gray-300'}`} />
                  <span className={achievement.done ? 'text-green-700' : 'text-gray-500'}>
                    {achievement.name}
                  </span>
                  {achievement.done && <Badge className="ml-auto bg-green-100 text-green-700">Unlocked</Badge>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ATS Score History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            ATS Score History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {atsHistory.length === 0 ? (
            <div className="text-center py-8">
              <Target className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No ATS checks yet</p>
              <p className="text-sm text-gray-400">Check your CV's ATS compatibility to see your scores here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {atsHistory.slice(0, 10).map((check, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getScoreBg(check.score)}`}>
                      <span className={`text-lg font-bold ${getScoreColor(check.score)}`}>
                        {check.score}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{check.filename || 'Resume'}</p>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(check.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge className={getScoreBg(check.score) + ' ' + getScoreColor(check.score)}>
                    {check.score >= 80 ? 'Excellent' : check.score >= 60 ? 'Good' : 'Needs Work'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerAnalytics;
