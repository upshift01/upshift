import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import {
  AlertTriangle,
  CreditCard,
  Clock,
  FileText,
  Mail,
  Phone,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';

const AccountSuspended = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // If user is not suspended, redirect to dashboard
  if (user && user.status !== 'suspended') {
    navigate('/dashboard');
    return null;
  }

  const handleResubscribe = () => {
    if (user?.reseller_id) {
      // Redirect to reseller's pricing page
      navigate('/pricing');
    } else {
      navigate('/pricing');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Main Card */}
        <Card className="border-red-200 shadow-xl">
          <CardContent className="p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="h-10 w-10 text-red-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Subscription Expired
              </h1>
              <p className="text-gray-600 max-w-md mx-auto">
                Your 30-day subscription has ended. Renew now to continue accessing all premium features.
              </p>
            </div>

            {/* User Info */}
            {user && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-500 mb-1">Logged in as</p>
                <p className="font-semibold text-gray-900">{user.full_name}</p>
                <p className="text-sm text-gray-600">{user.email}</p>
              </div>
            )}

            {/* What Happened */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-gray-500" />
                What happened?
              </h2>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-red-600 text-xs">✕</span>
                  </div>
                  <span>Your subscription plan has expired after 30 days</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-red-600 text-xs">✕</span>
                  </div>
                  <span>Access to premium features (CV Builder, AI tools, etc.) has been disabled</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                  </div>
                  <span>Your saved documents and data are still safe</span>
                </li>
              </ul>
            </div>

            {/* Reactivate CTA */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 mb-6 border border-blue-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Reactivate Your Account
              </h2>
              <p className="text-gray-600 mb-4">
                Choose a plan to regain full access to all features and continue your career journey.
              </p>
              <Button 
                onClick={handleResubscribe}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 h-auto text-lg"
              >
                <CreditCard className="h-5 w-5 mr-2" />
                View Plans & Resubscribe
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </div>

            {/* What You Get */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                What you'll get with a subscription
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  'AI-Powered CV Builder',
                  'ATS Optimization',
                  'Cover Letter Generator',
                  'LinkedIn Optimization',
                  'Job Application Tracker',
                  'Interview Preparation'
                ].map((feature) => (
                  <div key={feature} className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Support Links */}
            <div className="border-t pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <a href="/contact" className="flex items-center gap-1 hover:text-blue-600 transition-colors">
                  <Mail className="h-4 w-4" />
                  Contact Support
                </a>
                <span className="text-gray-300">|</span>
                <a href="/help" className="flex items-center gap-1 hover:text-blue-600 transition-colors">
                  <FileText className="h-4 w-4" />
                  Help Center
                </a>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={logout}
                className="text-gray-500 hover:text-gray-700"
              >
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer Note */}
        <p className="text-center text-sm text-gray-500 mt-4">
          Questions about your account? Contact us at{' '}
          <a href="mailto:support@upshift.works" className="text-blue-600 hover:underline">
            support@upshift.works
          </a>
        </p>
      </div>
    </div>
  );
};

export default AccountSuspended;
