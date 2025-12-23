import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { 
  CreditCard, 
  Download, 
  CheckCircle, 
  Clock, 
  Zap,
  ArrowUpRight,
  Receipt,
  Loader2,
  Shield
} from 'lucide-react';
import { Link } from 'react-router-dom';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const CustomerBilling = () => {
  const { user, getAuthHeader } = useAuth();
  const { formatPrice } = useTheme();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const response = await fetch(`${API_URL}/api/payments/history`, {
        headers: getAuthHeader()
      });
      if (response.ok) {
        const data = await response.json();
        setPayments(data.payments || []);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTierInfo = (tierId) => {
    const tiers = {
      'tier-1': { name: 'ATS Optimise', price: 29900, color: 'blue' },
      'tier-2': { name: 'Professional Package', price: 49900, color: 'purple' },
      'tier-3': { name: 'Executive Elite', price: 99900, color: 'orange' }
    };
    return tiers[tierId] || { name: 'Unknown', price: 0, color: 'gray' };
  };

  const currentPlan = user?.active_tier ? getTierInfo(user.active_tier) : null;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Billing & Subscription</h1>
        <p className="text-gray-600">Manage your subscription and payment history</p>
      </div>

      {/* Current Plan */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Current Subscription
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentPlan ? (
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-full bg-${currentPlan.color}-100 flex items-center justify-center`}>
                  <Zap className={`h-7 w-7 text-${currentPlan.color}-600`} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{currentPlan.name}</h3>
                  <p className="text-gray-600">
                    Activated on {new Date(user.tier_activation_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge className="bg-green-100 text-green-700">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Active
                </Badge>
                <Link to="/pricing">
                  <Button variant="outline">
                    <ArrowUpRight className="h-4 w-4 mr-2" />
                    Upgrade Plan
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Plan</h3>
              <p className="text-gray-500 mb-4">Upgrade to unlock AI-powered features</p>
              <Link to="/pricing">
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600">
                  View Pricing Plans
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plan Features */}
      {currentPlan && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Plan Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                'Unlimited AI CV Improvements',
                'ATS Optimization',
                'Professional Templates',
                'Cover Letter Generator',
                'LinkedIn Profile Tools',
                'Priority Support'
              ].map((feature, idx) => (
                <div key={idx} className="flex items-center gap-2 text-gray-700">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  {feature}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Payment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No payments yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <CreditCard className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{payment.tier_name}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(payment.created_at).toLocaleDateString()} • {payment.payment_method || 'Card'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">
                      R {(payment.amount_cents / 100).toFixed(2)}
                    </p>
                    <Badge variant={payment.status === 'succeeded' ? 'default' : 'secondary'} className="text-xs">
                      {payment.status === 'succeeded' ? 'Paid' : payment.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Security */}
      <Card className="mt-6 border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-blue-600" />
            <div>
              <h4 className="font-medium text-blue-900">Secure Payments</h4>
              <p className="text-sm text-blue-700">All payments are processed securely by Yoco. We never store your card details.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerBilling;
