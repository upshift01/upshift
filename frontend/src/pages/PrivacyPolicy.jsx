import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Shield, Lock, Eye, Database, UserCheck, Mail } from 'lucide-react';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-3 bg-blue-100 rounded-full mb-4">
            <Shield className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
          <p className="text-gray-600">Last updated: December 2024</p>
        </div>

        <Card className="mb-8">
          <CardContent className="prose prose-gray max-w-none p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Introduction</h2>
            <p className="text-gray-600 mb-6">
              At UpShift ("we", "our", or "us"), we are committed to protecting your personal information 
              and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and 
              safeguard your information when you use our website and services.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">Information We Collect</h2>
            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-3">
                <UserCheck className="h-5 w-5 text-blue-600 mt-1" />
                <div>
                  <strong className="text-gray-900">Personal Information:</strong>
                  <p className="text-gray-600">Name, email address, phone number, and professional details you provide when creating your CV.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Database className="h-5 w-5 text-blue-600 mt-1" />
                <div>
                  <strong className="text-gray-900">Usage Data:</strong>
                  <p className="text-gray-600">Information about how you interact with our services, including pages visited and features used.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Lock className="h-5 w-5 text-blue-600 mt-1" />
                <div>
                  <strong className="text-gray-900">Payment Information:</strong>
                  <p className="text-gray-600">Payment details are processed securely through Yoco and are not stored on our servers.</p>
                </div>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">How We Use Your Information</h2>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
              <li>To provide and maintain our CV creation and career services</li>
              <li>To process your transactions and send related information</li>
              <li>To send you updates, marketing communications, and promotional offers (with your consent)</li>
              <li>To improve our services and develop new features</li>
              <li>To comply with legal obligations</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">Data Security</h2>
            <p className="text-gray-600 mb-6">
              We implement industry-standard security measures including SSL encryption, secure data storage, 
              and regular security audits. Your documents are stored securely and you can delete them at any time.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">Your Rights (POPIA)</h2>
            <p className="text-gray-600 mb-4">
              Under the Protection of Personal Information Act (POPIA), you have the right to:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
              <li>Access your personal information</li>
              <li>Correct inaccurate information</li>
              <li>Request deletion of your data</li>
              <li>Object to processing of your information</li>
              <li>Lodge a complaint with the Information Regulator</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">Contact Us</h2>
            <p className="text-gray-600">
              If you have questions about this Privacy Policy, please contact us at:
              <br /><br />
              <strong>Email:</strong> privacy@upshift.works<br />
              <strong>Address:</strong> 123 Main Street, Sandton, Johannesburg, 2196, South Africa
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
