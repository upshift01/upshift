import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  CreditCard, CheckCircle, AlertCircle, ExternalLink,
  ArrowLeft, Loader2, DollarSign, TrendingUp, Shield
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const StripeConnect = () => {
  const navigate = useNavigate();
  const { token, isAuthenticated, user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [connectStatus, setConnectStatus] = useState(null);
  const [processingOnboard, setProcessingOnboard] = useState(false);
  const [earnings, setEarnings] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchConnectStatus();
    fetchEarnings();
  }, [isAuthenticated, navigate, token]);

  const fetchConnectStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/stripe-connect/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setConnectStatus(data);
      }
    } catch (error) {
      console.error('Error fetching connect status:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEarnings = async () => {
    try {
      const res = await fetch(`${API_URL}/api/stripe-connect/earnings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setEarnings(data);
      }
    } catch (error) {
      console.error('Error fetching earnings:', error);
    }
  };

  const handleOnboard = async () => {
    try {
      setProcessingOnboard(true);
      const returnUrl = `${window.location.origin}/stripe-connect?status=complete`;
      const refreshUrl = `${window.location.origin}/stripe-connect?status=refresh`;
      
      const res = await fetch(`${API_URL}/api/stripe-connect/onboard`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ return_url: returnUrl, refresh_url: refreshUrl })
      });
      
      const data = await res.json();
      
      if (data.success && data.url) {
        window.location.href = data.url;
      } else {
        toast({
          title: 'Error',
          description: data.detail || 'Failed to start onboarding',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error starting onboarding:', error);
      toast({
        title: 'Error',
        description: 'Failed to start Stripe onboarding',
        variant: 'destructive'
      });
    } finally {
      setProcessingOnboard(false);
    }
  };

  const handleDashboard = async () => {
    try {
      const res = await fetch(`${API_URL}/api/stripe-connect/dashboard-link`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = await res.json();
      
      if (data.success && data.url) {
        window.open(data.url, '_blank');
      } else {
        toast({
          title: 'Error',
          description: data.detail || 'Failed to open dashboard',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error opening dashboard:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950" data-testid="stripe-connect-page">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/contracts')}
            className="text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Contracts
          </Button>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-purple-400" />
            Payout Settings
          </h1>
        </div>

        {/* Status Card */}
        <Card className="bg-slate-800/50 border-slate-700 mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <span>Stripe Connect Status</span>
              {connectStatus?.connected ? (
                <Badge 
                  className={
                    connectStatus.status === 'active' ? 'bg-green-500/20 text-green-400' :
                    connectStatus.status === 'pending_verification' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-slate-500/20 text-slate-400'
                  }
                >
                  {connectStatus.status === 'active' ? 'Active' : 
                   connectStatus.status === 'pending_verification' ? 'Pending' : 
                   'Incomplete'}
                </Badge>
              ) : (
                <Badge className="bg-red-500/20 text-red-400">Not Connected</Badge>
              )}
            </CardTitle>
            <CardDescription className="text-slate-400">
              {connectStatus?.message}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {connectStatus?.connected ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-900/50 rounded-lg p-4 text-center">
                    <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full mb-2 ${
                      connectStatus.details_submitted ? 'bg-green-500/20' : 'bg-slate-700'
                    }`}>
                      {connectStatus.details_submitted ? 
                        <CheckCircle className="h-4 w-4 text-green-400" /> :
                        <AlertCircle className="h-4 w-4 text-slate-400" />
                      }
                    </div>
                    <p className="text-white text-sm">Details Submitted</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-4 text-center">
                    <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full mb-2 ${
                      connectStatus.charges_enabled ? 'bg-green-500/20' : 'bg-slate-700'
                    }`}>
                      {connectStatus.charges_enabled ? 
                        <CheckCircle className="h-4 w-4 text-green-400" /> :
                        <AlertCircle className="h-4 w-4 text-slate-400" />
                      }
                    </div>
                    <p className="text-white text-sm">Charges Enabled</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-4 text-center">
                    <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full mb-2 ${
                      connectStatus.payouts_enabled ? 'bg-green-500/20' : 'bg-slate-700'
                    }`}>
                      {connectStatus.payouts_enabled ? 
                        <CheckCircle className="h-4 w-4 text-green-400" /> :
                        <AlertCircle className="h-4 w-4 text-slate-400" />
                      }
                    </div>
                    <p className="text-white text-sm">Payouts Enabled</p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  {!connectStatus.details_submitted && (
                    <Button 
                      onClick={handleOnboard}
                      disabled={processingOnboard}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      {processingOnboard ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : null}
                      Complete Setup
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    onClick={handleDashboard}
                    className="border-slate-600 text-white hover:bg-slate-800"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Stripe Dashboard
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
                  <CreditCard className="h-8 w-8 text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Connect Your Stripe Account</h3>
                <p className="text-slate-400 mb-6 max-w-md mx-auto">
                  Connect your bank account through Stripe to receive direct payouts when employers release milestone payments.
                </p>
                <Button 
                  onClick={handleOnboard}
                  disabled={processingOnboard}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {processingOnboard ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Connect with Stripe
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Earnings Summary */}
        {earnings && (
          <Card className="bg-slate-800/50 border-slate-700 mb-8">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-400" />
                Earnings Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-slate-900/50 rounded-lg p-4">
                  <p className="text-slate-400 text-sm">Total Earned</p>
                  <p className="text-2xl font-bold text-green-400">
                    ${(earnings.earnings?.total_net || 0).toLocaleString()}
                  </p>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-4">
                  <p className="text-slate-400 text-sm">Gross Earnings</p>
                  <p className="text-2xl font-bold text-white">
                    ${(earnings.earnings?.total_gross || 0).toLocaleString()}
                  </p>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-4">
                  <p className="text-slate-400 text-sm">Platform Fees</p>
                  <p className="text-2xl font-bold text-slate-400">
                    ${(earnings.earnings?.total_fees || 0).toLocaleString()}
                  </p>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-4">
                  <p className="text-slate-400 text-sm">Pending</p>
                  <p className="text-2xl font-bold text-amber-400">
                    ${(earnings.pending?.amount || 0).toLocaleString()}
                  </p>
                </div>
              </div>

              {earnings.recent_payouts?.length > 0 && (
                <div>
                  <h4 className="text-white font-medium mb-3">Recent Payouts</h4>
                  <div className="space-y-2">
                    {earnings.recent_payouts.map((payout) => (
                      <div key={payout.id} className="bg-slate-900/50 rounded-lg p-3 flex items-center justify-between">
                        <div>
                          <p className="text-white">Contract Payment</p>
                          <p className="text-slate-500 text-xs">
                            {new Date(payout.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-green-400 font-medium">
                            +${payout.net_amount?.toLocaleString()}
                          </p>
                          <p className="text-slate-500 text-xs">
                            Fee: ${payout.platform_fee?.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <Shield className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-white font-medium mb-1">How Payouts Work</h3>
                <ul className="text-slate-400 text-sm space-y-2">
                  <li>• Employers fund milestones which are held in escrow</li>
                  <li>• When you complete work and the employer approves, payment is released</li>
                  <li>• Funds are transferred directly to your connected bank account</li>
                  <li>• A 5% platform fee is deducted from each payout</li>
                  <li>• Payouts typically arrive within 2-3 business days</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StripeConnect;
