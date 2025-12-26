import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePartner } from '../../context/PartnerContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { CheckCircle, Loader2, Calendar, Zap } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const PartnerPaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { getAuthHeader } = useAuth();
  const { brandName, primaryColor, secondaryColor, baseUrl } = usePartner();
  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationResult, setVerificationResult] = useState(null);
  const [bookingResult, setBookingResult] = useState(null);
  const [error, setError] = useState(null);
  const [paymentType, setPaymentType] = useState(null);

  useEffect(() => {
    const checkoutId = searchParams.get('id');
    const bookingId = searchParams.get('booking');
    
    if (bookingId) {
      setPaymentType('booking');
      confirmBookingPayment(bookingId);
    } else if (checkoutId) {
      setPaymentType('subscription');
      verifyPayment(checkoutId);
    } else {
      setError('No payment ID found');
      setIsVerifying(false);
    }
  }, [searchParams]);

  const confirmBookingPayment = async (bookingId) => {
    try {
      const response = await axios.post(
        `${API_URL}/api/booking/${bookingId}/confirm-payment`,
        {}
      );
      setBookingResult(response.data);
      setIsVerifying(false);
    } catch (err) {
      console.error('Booking confirmation error:', err);
      setError(err.response?.data?.detail || 'Failed to confirm booking payment');
      setIsVerifying(false);
    }
  };

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
            <Loader2 className="h-16 w-16 animate-spin mx-auto mb-6" style={{ color: primaryColor }} />
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
              onClick={() => navigate(paymentType === 'booking' ? `${baseUrl}/book-strategy-call` : `${baseUrl}/pricing`)}
              style={{ backgroundColor: primaryColor }}
              className="text-white"
            >
              {paymentType === 'booking' ? 'Back to Booking' : 'Back to Pricing'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Booking payment success
  if (paymentType === 'booking' && bookingResult) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: `${primaryColor}20` }}
            >
              <CheckCircle className="h-10 w-10" style={{ color: primaryColor }} />
            </div>
            <CardTitle className="text-2xl" style={{ color: primaryColor }}>Booking Confirmed!</CardTitle>
            <CardDescription>{bookingResult.message}</CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <Calendar className="h-8 w-8 mx-auto mb-2" style={{ color: primaryColor }} />
              <p className="text-sm text-gray-600 mb-1">Your Strategy Call with {brandName}</p>
              <p className="text-lg font-bold text-gray-900">Confirmed</p>
            </div>
            
            {bookingResult.meeting_link && (
              <div className="rounded-lg p-4" style={{ backgroundColor: `${primaryColor}10` }}>
                <p className="text-sm text-gray-600 mb-2">Meeting Link</p>
                <a 
                  href={bookingResult.meeting_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium break-all hover:underline"
                  style={{ color: primaryColor }}
                >
                  {bookingResult.meeting_link}
                </a>
              </div>
            )}
            
            {bookingResult.email_sent && (
              <p className="text-sm" style={{ color: primaryColor }}>
                ✓ A confirmation email has been sent to your email address
              </p>
            )}
            
            <p className="text-sm text-gray-600">
              We look forward to speaking with you! Please check your email for full details.
            </p>
            
            <Button
              onClick={() => navigate(baseUrl)}
              style={{ backgroundColor: primaryColor }}
              className="w-full text-white"
            >
              Back to {brandName}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Subscription payment success
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex items-center justify-center py-12 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: `${primaryColor}20` }}
          >
            <CheckCircle className="h-10 w-10" style={{ color: primaryColor }} />
          </div>
          <CardTitle className="text-2xl" style={{ color: primaryColor }}>Payment Successful!</CardTitle>
          <CardDescription>{verificationResult?.message}</CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <Zap className="h-8 w-8 mx-auto mb-2" style={{ color: primaryColor }} />
            <p className="text-sm text-gray-600 mb-1">Active Plan</p>
            <p className="text-xl font-bold text-gray-900">
              {verificationResult?.tier_name}
            </p>
          </div>
          <p className="text-sm text-gray-600">
            You now have full access to all features in your plan. Start creating your professional CV with {brandName}!
          </p>
          <div className="flex flex-col space-y-2">
            <Button
              onClick={() => navigate(`${baseUrl}/builder`)}
              style={{ backgroundColor: primaryColor }}
              className="text-white"
            >
              Start Building CV
            </Button>
            <Button
              onClick={() => navigate(`${baseUrl}/dashboard`)}
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

export default PartnerPaymentSuccess;
