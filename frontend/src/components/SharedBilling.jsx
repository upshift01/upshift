import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  CreditCard, Receipt, Download, CheckCircle, Clock, Zap, 
  ArrowRight, Loader2, AlertCircle, Calendar, ExternalLink
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

/**
 * Shared Billing Component
 * Works for both main platform and partner sites
 */
const SharedBilling = ({
  isPartner = false,
  baseUrl = '',
  primaryColor = '#1e40af',
  brandName = 'UpShift',
  pricing = null
}) => {
  const { user, getAuthHeader, token } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const getUrl = (path) => isPartner ? `${baseUrl}${path}` : path;

  useEffect(() => {
    if (token) {
      fetchPayments();
    }
  }, [token]);

  const fetchPayments = async () => {
    try {
      const headers = getAuthHeader ? getAuthHeader() : { Authorization: `Bearer ${token}` };
      const response = await fetch(`${API_URL}/api/customer/payments`, { headers });
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
    const defaultPricing = {
      'tier-1': { name: 'ATS Optimise', price: pricing?.tier_1_price || 499, features: ['ATS Score Check', 'Basic CV Templates', 'Email Support'] },
      'tier-2': { name: 'Professional Package', price: pricing?.tier_2_price || 899, features: ['Everything in Tier 1', 'AI CV Enhancement', 'Cover Letter Generator', 'LinkedIn Tools'] },
      'tier-3': { name: 'Executive Elite', price: pricing?.tier_3_price || 2999, features: ['Everything in Tier 2', 'Executive Templates', 'Priority Support', 'Career Coaching Session'] }
    };
    return defaultPricing[tierId] || { name: 'Free', price: 0, features: [] };
  };

  const getPaymentStatusBadge = (status) => {
    const statusConfig = {
      'completed': { label: 'Paid', color: 'bg-green-100 text-green-700', icon: CheckCircle },
      'pending': { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
      'failed': { label: 'Failed', color: 'bg-red-100 text-red-700', icon: AlertCircle },
      'refunded': { label: 'Refunded', color: 'bg-gray-100 text-gray-700', icon: Receipt }
    };
    return statusConfig[status] || statusConfig['pending'];
  };

  const currentPlan = getTierInfo(user?.active_tier);
  const currency = pricing?.currency || 'ZAR';
  const currencySymbol = currency === 'ZAR' ? 'R' : currency === 'USD' ? '$' : currency;

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Billing & Payments</h1>
          <p className="text-gray-600">Manage your subscription and view payment history</p>
        </div>

        {/* Current Plan Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" style={{ color: primaryColor }} />
              Current Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            {user?.active_tier ? (
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-bold text-gray-900">{currentPlan.name}</h3>
                    <Badge style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}>
                      <CheckCircle className="h-3 w-3 mr-1" /> Active
                    </Badge>
                  </div>
                  <p className="text-gray-600 mb-3">
                    {currencySymbol}{currentPlan.price.toLocaleString()} once-off payment
                  </p>
                  {user.tier_activation_date && (
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Activated on {new Date(user.tier_activation_date).toLocaleDateString('en-ZA')}
                    </p>
                  )}
                  
                  {/* Plan Features */}
                  {currentPlan.features?.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm font-medium text-gray-700 mb-2">Your plan includes:</p>
                      <ul className="space-y-1">
                        {currentPlan.features.map((feature, idx) => (
                          <li key={idx} className="text-sm text-gray-600 flex items-center gap-2">
                            <CheckCircle className="h-3 w-3" style={{ color: primaryColor }} />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Link to={getUrl('/pricing')}>
                    <Button variant="outline" className="w-full md:w-auto">
                      View All Plans <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: `${primaryColor}15` }}
                >
                  <CreditCard className="h-8 w-8" style={{ color: primaryColor }} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Plan</h3>
                <p className="text-gray-600 mb-4">Upgrade to unlock AI-powered features and premium templates</p>
                <Link to={getUrl('/pricing')}>
                  <Button style={{ backgroundColor: primaryColor }}>
                    View Pricing Plans
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" style={{ color: primaryColor }} />
              Payment History
            </CardTitle>
            <CardDescription>View your past transactions and invoices</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" style={{ color: primaryColor }} />
              </div>
            ) : payments.length === 0 ? (
              <div className="text-center py-8">
                <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No payment history yet</p>
                <p className="text-sm text-gray-400">Your transactions will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {payments.map((payment, idx) => {
                  const statusInfo = getPaymentStatusBadge(payment.status);
                  const StatusIcon = statusInfo.icon;
                  const tierInfo = getTierInfo(payment.tier_id);
                  
                  return (
                    <div 
                      key={idx} 
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: `${primaryColor}15` }}
                        >
                          <CreditCard className="h-5 w-5" style={{ color: primaryColor }} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{tierInfo.name}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(payment.created_at).toLocaleDateString('en-ZA', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            {currencySymbol}{(payment.amount || tierInfo.price).toLocaleString()}
                          </p>
                          <Badge className={statusInfo.color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusInfo.label}
                          </Badge>
                        </div>
                        {payment.invoice_url && (
                          <Button variant="ghost" size="sm" asChild>
                            <a href={payment.invoice_url} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods (optional section) */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" style={{ color: primaryColor }} />
              Payment Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <CreditCard className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Secure Payments</p>
                  <p className="text-sm text-gray-500">All payments are processed securely via Yoco</p>
                </div>
              </div>
              <a 
                href="https://www.yoco.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                Learn more <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SharedBilling;
