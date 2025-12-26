import React from 'react';
import { useNavigate } from 'react-router-dom';
import { usePartner } from '../../context/PartnerContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { XCircle, ArrowLeft, CreditCard } from 'lucide-react';

const PartnerPaymentCancel = () => {
  const navigate = useNavigate();
  const { brandName, primaryColor, baseUrl } = usePartner();

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex items-center justify-center py-12 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="h-10 w-10 text-orange-600" />
          </div>
          <CardTitle className="text-2xl text-gray-900">Payment Cancelled</CardTitle>
          <CardDescription>
            Your payment was not completed. No charges have been made to your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-sm text-gray-600">
            If you experienced any issues during checkout, please try again or contact {brandName} support for assistance.
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Why complete your purchase?</h3>
            <ul className="text-sm text-gray-600 text-left space-y-1">
              <li>✓ AI-powered CV optimization</li>
              <li>✓ ATS-friendly formatting</li>
              <li>✓ Professional templates</li>
              <li>✓ Expert career tools</li>
            </ul>
          </div>
          
          <div className="flex flex-col space-y-2">
            <Button
              onClick={() => navigate(`${baseUrl}/pricing`)}
              style={{ backgroundColor: primaryColor }}
              className="text-white"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button
              onClick={() => navigate(baseUrl)}
              variant="outline"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to {brandName}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PartnerPaymentCancel;
