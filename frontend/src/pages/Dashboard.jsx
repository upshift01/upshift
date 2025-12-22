import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { FileText, Mail, CreditCard, Zap, Clock, CheckCircle } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const Dashboard = () => {
  const { user, getAuthHeader } = useAuth();
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPaymentHistory();
  }, []);

  const fetchPaymentHistory = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/api/payments/history`,
        { headers: getAuthHeader() }
      );
      setPaymentHistory(response.data.payments || []);
    } catch (error) {
      console.error('Error fetching payment history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTierInfo = (tierId) => {
    const tiers = {
      'tier-1': { name: 'ATS Optimize', color: 'blue' },
      'tier-2': { name: 'Professional Package', color: 'purple' },
      'tier-3': { name: 'Executive Elite', color: 'orange' }
    };
    return tiers[tierId] || { name: 'Unknown', color: 'gray' };
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.full_name}!
          </h1>
          <p className="text-gray-600">Manage your career documents and services</p>
        </div>

        {/* Active Tier Card */}
        <div className=\"grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8\">
          <Card className=\"lg:col-span-2\">
            <CardHeader>
              <CardTitle className=\"flex items-center\">
                <Zap className=\"mr-2 h-5 w-5 text-blue-600\" />
                Your Active Plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              {user?.active_tier ? (
                <div className=\"space-y-4\">
                  <div className=\"flex items-center justify-between\">
                    <div>
                      <h3 className=\"text-2xl font-bold text-gray-900\">
                        {getTierInfo(user.active_tier).name}
                      </h3>
                      <p className=\"text-sm text-gray-600\">
                        Activated on {new Date(user.tier_activation_date).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge className=\"bg-green-100 text-green-700 border-green-200\">
                      <CheckCircle className=\"mr-1 h-3 w-3\" />
                      Active
                    </Badge>
                  </div>
                  <div className=\"grid grid-cols-2 gap-4 pt-4 border-t\">
                    <div>
                      <p className=\"text-sm text-gray-600\">Documents Created</p>
                      <p className=\"text-2xl font-bold text-gray-900\">0</p>
                    </div>
                    <div>
                      <p className=\"text-sm text-gray-600\">AI Improvements</p>
                      <p className=\"text-2xl font-bold text-gray-900\">Unlimited</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className=\"text-center py-8\">
                  <p className=\"text-gray-600 mb-4\">No active plan. Upgrade to access AI features!</p>
                  <Link to=\"/pricing\">
                    <Button className=\"bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700\">
                      View Pricing Plans
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className=\"space-y-2\">
              <Link to=\"/builder\">
                <Button variant=\"outline\" className=\"w-full justify-start\">
                  <FileText className=\"mr-2 h-4 w-4\" />
                  Build New CV
                </Button>
              </Link>
              <Link to=\"/improve\">
                <Button variant=\"outline\" className=\"w-full justify-start\">
                  <Zap className=\"mr-2 h-4 w-4\" />
                  Improve Existing CV
                </Button>
              </Link>
              <Link to=\"/cover-letter\">
                <Button variant=\"outline\" className=\"w-full justify-start\">
                  <Mail className=\"mr-2 h-4 w-4\" />
                  Generate Cover Letter
                </Button>
              </Link>
              <Link to=\"/pricing\">
                <Button variant=\"outline\" className=\"w-full justify-start\">
                  <CreditCard className=\"mr-2 h-4 w-4\" />
                  Upgrade Plan
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Payment History */}
        <Card>
          <CardHeader>
            <CardTitle className=\"flex items-center\">
              <CreditCard className=\"mr-2 h-5 w-5\" />
              Payment History
            </CardTitle>
            <CardDescription>View all your transactions</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className=\"text-center py-8 text-gray-600\">Loading...</div>
            ) : paymentHistory.length > 0 ? (
              <div className=\"space-y-4\">
                {paymentHistory.map((payment) => (
                  <div key={payment.id} className=\"flex items-center justify-between p-4 border rounded-lg\">
                    <div className=\"flex items-center space-x-4\">
                      <div className=\"w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center\">
                        <CreditCard className=\"h-5 w-5 text-blue-600\" />
                      </div>
                      <div>
                        <p className=\"font-medium text-gray-900\">{payment.tier_name}</p>
                        <p className=\"text-sm text-gray-600\">
                          {new Date(payment.created_at).toLocaleDateString()} at{' '}
                          {new Date(payment.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <div className=\"text-right\">
                      <p className=\"font-bold text-gray-900\">
                        R{(payment.amount_cents / 100).toFixed(2)}
                      </p>
                      <Badge variant={payment.status === 'succeeded' ? 'default' : 'secondary'}>
                        {payment.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className=\"text-center py-8\">
                <Clock className=\"h-12 w-12 text-gray-400 mx-auto mb-4\" />
                <p className=\"text-gray-600\">No payment history yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
