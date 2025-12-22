import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { XCircle } from 'lucide-react';

const PaymentCancel = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex items-center justify-center py-12 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="h-10 w-10 text-yellow-600" />
          </div>
          <CardTitle className="text-2xl text-gray-900">Payment Cancelled</CardTitle>
          <CardDescription>
            Your payment was cancelled. No charges have been made.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-sm text-gray-600">
            If you experienced any issues or have questions, please contact our support team.
          </p>
          <div className="flex flex-col space-y-2">
            <Button
              onClick={() => navigate('/pricing')}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              Back to Pricing
            </Button>
            <Button
              onClick={() => navigate('/')}
              variant="outline"
            >
              Go to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentCancel;