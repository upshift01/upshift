import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { CheckCircle, Loader2 } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { getAuthHeader } = useAuth();
  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationResult, setVerificationResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkoutId = searchParams.get('id');
    if (checkoutId) {
      verifyPayment(checkoutId);
    } else {
      setError('No payment ID found');
      setIsVerifying(false);
    }
  }, [searchParams]);

  const verifyPayment = async (checkoutId) => {
    try {
      const response = await axios.post(
        `${API_URL}/api/payments/verify/${checkoutId}`,
        {},
        { headers: getAuthHeader() }
      );

      setVerificationResult(response.data);
      setIsVerifying(false);
    } catch (err) {
      console.error('Verification error:', err);
      setError(err.response?.data?.detail || 'Failed to verify payment');
      setIsVerifying(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-12 pb-12">
            <Loader2 className="h-16 w-16 animate-spin text-blue-600 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verifying Payment...</h2>
            <p className="text-gray-600">Please wait while we confirm your payment.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">❌</span>
            </div>
            <CardTitle className="text-2xl text-red-900">Verification Failed</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button
              onClick={() => navigate('/pricing')}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              Back to Pricing
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex items-center justify-center py-12 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl text-green-900">Payment Successful!</CardTitle>
          <CardDescription>
            {verificationResult?.message}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Active Plan</p>
            <p className="text-xl font-bold text-gray-900">
              {verificationResult?.tier_name}
            </p>
          </div>
          <p className="text-sm text-gray-600">
            You now have full access to all features in your plan. Start creating your professional CV!
          </p>
          <div className="flex flex-col space-y-2">
            <Button
              onClick={() => navigate('/builder')}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              Start Building CV
            </Button>
            <Button
              onClick={() => navigate('/dashboard')}
              variant="outline"
            >
              Go to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;