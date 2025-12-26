import React from 'react';
import { usePartner } from '../../context/PartnerContext';
import { Badge } from '../../components/ui/badge';
import { RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

const PartnerRefundPolicy = () => {
  const { brandName, primaryColor, secondaryColor, contactEmail } = usePartner();

  return (
    <div className="min-h-screen bg-gray-50">
      <section 
        className="py-12"
        style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
      >
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Badge className="mb-4 bg-white/20 text-white border-none">
            <RefreshCw className="mr-1 h-3 w-3" />
            Legal
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Refund Policy
          </h1>
          <p className="text-lg text-white/80">
            Our commitment to your satisfaction
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Guarantee Banner */}
        <Card className="mb-8 border-2" style={{ borderColor: primaryColor }}>
          <CardContent className="p-6 text-center">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: `${primaryColor}15` }}
            >
              <CheckCircle className="h-8 w-8" style={{ color: primaryColor }} />
            </div>
            <h2 className="text-2xl font-bold mb-2">7-Day Money-Back Guarantee</h2>
            <p className="text-gray-600">
              If you're not completely satisfied with our service, we'll refund your payment within 7 days of purchase - no questions asked.
            </p>
          </CardContent>
        </Card>

        <div className="bg-white rounded-lg shadow-sm p-8 space-y-8">
          <section>
            <h2 className="text-2xl font-bold mb-4" style={{ color: primaryColor }}>Refund Eligibility</h2>
            
            <div className="grid md:grid-cols-2 gap-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    Eligible for Refund
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-gray-600">
                    <li>• Request within 7 days of purchase</li>
                    <li>• Service not yet delivered</li>
                    <li>• Quality does not meet description</li>
                    <li>• Technical issues preventing delivery</li>
                    <li>• First-time purchase only</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <XCircle className="h-5 w-5" />
                    Not Eligible for Refund
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-gray-600">
                    <li>• Request after 7 days</li>
                    <li>• Service fully delivered and accepted</li>
                    <li>• Multiple revision requests completed</li>
                    <li>• Abuse of refund policy</li>
                    <li>• Change of mind after delivery</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4" style={{ color: primaryColor }}>How to Request a Refund</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0" style={{ backgroundColor: primaryColor }}>1</div>
                <div>
                  <h3 className="font-semibold">Contact Us</h3>
                  <p className="text-gray-600">Email us at <a href={`mailto:${contactEmail}`} className="underline" style={{ color: primaryColor }}>{contactEmail}</a> with your order details and reason for refund.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0" style={{ backgroundColor: primaryColor }}>2</div>
                <div>
                  <h3 className="font-semibold">Review Process</h3>
                  <p className="text-gray-600">Our team will review your request within 1-2 business days.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0" style={{ backgroundColor: primaryColor }}>3</div>
                <div>
                  <h3 className="font-semibold">Refund Processing</h3>
                  <p className="text-gray-600">Approved refunds are processed within 5-7 business days to your original payment method.</p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4" style={{ color: primaryColor }}>Revision Policy</h2>
            <p className="text-gray-600 mb-4">
              Before requesting a refund, we encourage you to use our revision service:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li><strong>ATS Optimise Package:</strong> 1 round of revisions included</li>
              <li><strong>Professional Package:</strong> 3 rounds of revisions included</li>
              <li><strong>Executive Elite Package:</strong> Unlimited revisions included</li>
            </ul>
          </section>

          <section>
            <Card className="bg-gray-50">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Clock className="h-6 w-6 flex-shrink-0" style={{ color: primaryColor }} />
                  <div>
                    <h3 className="font-semibold mb-2">Processing Times</h3>
                    <ul className="text-gray-600 space-y-1">
                      <li>• Refund review: 1-2 business days</li>
                      <li>• Refund processing: 5-7 business days</li>
                      <li>• Bank processing: Additional 3-5 business days</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4" style={{ color: primaryColor }}>Contact Us</h2>
            <p className="text-gray-600">
              Have questions about our refund policy? Contact us at{' '}
              <a href={`mailto:${contactEmail}`} className="underline" style={{ color: primaryColor }}>{contactEmail}</a>.
              We're here to help!
            </p>
          </section>

          <div className="text-sm text-gray-500 pt-4 border-t">
            <p>Last updated: December 2025</p>
            <p>This refund policy is provided by {brandName}, powered by UpShift.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartnerRefundPolicy;
