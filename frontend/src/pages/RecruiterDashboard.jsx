import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Users, Crown, Search, Mail, CheckCircle, Clock, XCircle,
  Building2, ArrowRight, Loader2, AlertCircle, CreditCard
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const RecruiterDashboard = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [contactRequests, setContactRequests] = useState([]);
  const [stats, setStats] = useState({
    totalCandidatesViewed: 0,
    contactRequestsSent: 0,
    contactsApproved: 0
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Check subscription status
      const subRes = await fetch(`${API_URL}/api/talent-pool/recruiter/subscription`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (subRes.ok) {
        const data = await subRes.json();
        setSubscription(data.subscription);
      }

      // Get contact requests sent by this recruiter
      const requestsRes = await fetch(`${API_URL}/api/talent-pool/recruiter/my-requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (requestsRes.ok) {
        const data = await requestsRes.json();
        setContactRequests(data.requests || []);
        
        // Calculate stats
        const approved = data.requests?.filter(r => r.status === 'approved').length || 0;
        const pending = data.requests?.filter(r => r.status === 'pending').length || 0;
        setStats({
          totalCandidatesViewed: data.requests?.length || 0,
          contactRequestsSent: data.requests?.length || 0,
          contactsApproved: approved
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>,
      approved: <Badge className="bg-green-100 text-green-700"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>,
      rejected: <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Declined</Badge>
    };
    return badges[status] || badges.pending;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="h-8 w-8" />
            <h1 className="text-2xl font-bold">Recruiter Dashboard</h1>
          </div>
          <p className="text-purple-100">
            Welcome back, {user?.full_name}
            {user?.company_name && <span className="ml-2">• {user.company_name}</span>}
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Subscription Status */}
        {!subscription || subscription.status !== 'active' ? (
          <Card className="mb-8 border-2 border-orange-200 bg-orange-50">
            <CardContent className="py-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="h-6 w-6 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-orange-900 mb-1">No Active Subscription</h3>
                  <p className="text-orange-700 mb-4">
                    Subscribe to the Talent Pool to browse candidates, view their profiles, and send contact requests.
                  </p>
                  <Link to="/talent-pool">
                    <Button className="bg-orange-600 hover:bg-orange-700">
                      <Crown className="h-4 w-4 mr-2" />
                      Subscribe Now
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-8 border-2 border-green-200 bg-green-50">
            <CardContent className="py-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <Crown className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-green-900 mb-1">Active Subscription</h3>
                    <p className="text-green-700">
                      {subscription.plan_name} • Expires: {new Date(subscription.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Link to="/talent-pool">
                  <Button variant="outline" className="border-green-600 text-green-700 hover:bg-green-100">
                    <Search className="h-4 w-4 mr-2" />
                    Browse Talent
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.contactRequestsSent}</p>
                  <p className="text-sm text-gray-500">Contact Requests Sent</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.contactsApproved}</p>
                  <p className="text-sm text-gray-500">Contacts Approved</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Mail className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {contactRequests.filter(r => r.status === 'pending').length}
                  </p>
                  <p className="text-sm text-gray-500">Pending Responses</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/talent-pool')}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Search className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Browse Talent Pool</h3>
                    <p className="text-sm text-gray-500">Search and filter candidates</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/talent-pool')}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <CreditCard className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Manage Subscription</h3>
                    <p className="text-sm text-gray-500">View plans and billing</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Contact Requests */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Contact Requests</CardTitle>
            <CardDescription>Track your outreach to candidates</CardDescription>
          </CardHeader>
          <CardContent>
            {contactRequests.length === 0 ? (
              <div className="text-center py-8">
                <Mail className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No contact requests yet</p>
                <p className="text-sm text-gray-500 mt-2">
                  Browse the talent pool and send contact requests to candidates you're interested in.
                </p>
                <Link to="/talent-pool">
                  <Button className="mt-4" variant="outline">
                    <Search className="h-4 w-4 mr-2" />
                    Browse Talent
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {contactRequests.slice(0, 5).map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{request.candidate_name}</p>
                      <p className="text-sm text-gray-500">
                        Sent {new Date(request.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      {getStatusBadge(request.status)}
                      {request.status === 'approved' && request.candidate_email && (
                        <a href={`mailto:${request.candidate_email}`}>
                          <Button size="sm" variant="outline">
                            <Mail className="h-4 w-4 mr-1" />
                            Contact
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
                {contactRequests.length > 5 && (
                  <p className="text-center text-sm text-gray-500">
                    And {contactRequests.length - 5} more...
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RecruiterDashboard;
