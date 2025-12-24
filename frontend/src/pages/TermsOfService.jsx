import React from 'react';
import { Card, CardContent } from '../components/ui/card';
import { FileText, CheckCircle, AlertTriangle, Scale } from 'lucide-react';

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-3 bg-purple-100 rounded-full mb-4">
            <FileText className="h-8 w-8 text-purple-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Terms of Service</h1>
          <p className="text-gray-600">Last updated: December 2024</p>
        </div>

        <Card className="mb-8">
          <CardContent className="prose prose-gray max-w-none p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-600 mb-6">
              By accessing and using UpShift's services, you agree to be bound by these Terms of Service. 
              If you do not agree to these terms, please do not use our services.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">2. Services Description</h2>
            <p className="text-gray-600 mb-6">
              UpShift provides AI-powered CV creation, cover letter generation, ATS optimisation, 
              and career assistance tools. Our services are designed to help job seekers in South Africa 
              create professional career documents.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">3. User Accounts</h2>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
              <li>You must provide accurate and complete information when creating an account</li>
              <li>You are responsible for maintaining the security of your account</li>
              <li>You must be at least 18 years old to use our services</li>
              <li>One person may not maintain multiple accounts</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">4. Payment Terms</h2>
            <p className="text-gray-600 mb-4">
              All prices are listed in South African Rand (ZAR). Payment is processed securely through Yoco.
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
              <li>Payment is required before service delivery</li>
              <li>All fees are non-refundable except as stated in our Refund Policy</li>
              <li>We reserve the right to change pricing with notice</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">5. Intellectual Property</h2>
            <p className="text-gray-600 mb-6">
              The content you create using our services remains your property. However, the UpShift platform, 
              templates, and underlying technology are owned by UpShift and protected by intellectual property laws.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">6. Prohibited Activities</h2>
            <p className="text-gray-600 mb-4">You agree not to:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
              <li>Use our services for any unlawful purpose</li>
              <li>Submit false or misleading information</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Interfere with other users' access to our services</li>
              <li>Resell or redistribute our services without authorization</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">7. Limitation of Liability</h2>
            <p className="text-gray-600 mb-6">
              UpShift provides career assistance tools but does not guarantee employment outcomes. 
              We are not liable for any indirect, incidental, or consequential damages arising from 
              the use of our services.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">8. Governing Law</h2>
            <p className="text-gray-600 mb-6">
              These Terms are governed by the laws of the Republic of South Africa. Any disputes 
              shall be resolved in the courts of Johannesburg, Gauteng.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">9. Contact</h2>
            <p className="text-gray-600">
              For questions about these Terms, contact us at: legal@upshift.works
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TermsOfService;
