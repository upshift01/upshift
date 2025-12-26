import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePartner } from '../../context/PartnerContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { 
  CreditCard, 
  Receipt, 
  Download, 
  CheckCircle,
  Clock,
  Zap,
  ArrowRight,
  Loader2
} from 'lucide-react';
import PartnerCustomerLayout from '../../components/PartnerCustomerLayout';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const PartnerBilling = () => {
  const { user, getAuthHeader } = useAuth();
  const { primaryColor, brandName, baseUrl, pricing } = usePartner();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const response = await fetch(`${API_URL}/api/customer/payments`, {
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
      'tier-1': { name: 'ATS Optimise', price: pricing?.tier_1_price || 499 },
      'tier-2': { name: 'Professional Package', price: pricing?.tier_2_price || 899 },
      'tier-3': { name: 'Executive Elite', price: pricing?.tier_3_price || 2999 }
    };
    return tiers[tierId] || { name: 'Free', price: 0 };
  };

  const currentPlan = getTierInfo(user?.active_tier);

  return (
    <PartnerCustomerLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Billing & Payments</h1>
          <p className="text-gray-600">Manage your subscription and view payment history</p>
        </div>

        {/* Current Plan */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" style={{ color: primaryColor }} />
              Current Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            {user?.active_tier ? (
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-bold text-gray-900">{currentPlan.name}</h3>
                    <Badge style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}>
                      <CheckCircle className="h-3 w-3 mr-1" /> Active
                    </Badge>
                  </div>
                  <p className="text-gray-600">R{currentPlan.price.toLocaleString()} once-off payment</p>
                  {user.tier_activation_date && (
                    <p className="text-sm text-gray-500 mt-1">
                      Activated on {new Date(user.tier_activation_date).toLocaleDateString('en-ZA')}
                    </p>
                  )}
                </div>
                <Link to={`${baseUrl}/pricing`}>
                  <Button variant="outline">
                    View All Plans <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: `${primaryColor}15` }}>
                  <CreditCard className="h-8 w-8" style={{ color: primaryColor }} />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Plan</h3>
                <p className="text-gray-600 mb-4">Upgrade to unlock all AI-powered features</p>
                <Link to={`${baseUrl}/pricing`}>
                  <Button style={{ backgroundColor: primaryColor }} className="text-white">
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
            <CardDescription>View your past transactions</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" style={{ color: primaryColor }} />
              </div>
            ) : payments.length === 0 ? (
              <div className="text-center py-8">
                <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No payment history yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {payments.map((payment, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${payment.status === 'completed' ? 'bg-green-100' : 'bg-yellow-100'}`}>
                        {payment.status === 'completed' ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <Clock className="h-5 w-5 text-yellow-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{payment.tier_name || 'Payment'}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(payment.created_at).toLocaleDateString('en-ZA', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">R{(payment.amount_cents / 100).toLocaleString()}</p>
                      <Badge className={payment.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                        {payment.status === 'completed' ? 'Paid' : 'Pending'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PartnerCustomerLayout>
  );
};

export default PartnerBilling;
