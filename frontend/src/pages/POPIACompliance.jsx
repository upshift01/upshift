import React from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Shield, CheckCircle, Users, Lock, FileText, AlertCircle } from 'lucide-react';

const POPIACompliance = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-3 bg-green-100 rounded-full mb-4">
            <Shield className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">POPIA Compliance</h1>
          <p className="text-gray-600">Protection of Personal Information Act Compliance Statement</p>
        </div>

        <Card className="mb-8">
          <CardContent className="prose prose-gray max-w-none p-8">
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-8">
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle className="h-6 w-6 text-green-600" />
                <h3 className="text-xl font-bold text-green-800 m-0">POPIA Compliant</h3>
              </div>
              <p className="text-green-700 m-0">
                UpShift is fully compliant with the Protection of Personal Information Act (POPIA) 
                of South Africa, effective since 1 July 2021.
              </p>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Commitment</h2>
            <p className="text-gray-600 mb-6">
              As a South African company, we take the protection of your personal information seriously. 
              We comply with POPIA to ensure your data is processed lawfully, minimally, and securely.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">Your Rights Under POPIA</h2>
            <p className="text-gray-600 mb-4">As a data subject, you have the right to:</p>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                <Users className="h-5 w-5 text-blue-600 mt-1" />
                <div>
                  <strong className="text-gray-900">Access</strong>
                  <p className="text-gray-600 text-sm">Request access to your personal information we hold</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                <FileText className="h-5 w-5 text-purple-600 mt-1" />
                <div>
                  <strong className="text-gray-900">Correction</strong>
                  <p className="text-gray-600 text-sm">Request correction of inaccurate personal information</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                <Lock className="h-5 w-5 text-red-600 mt-1" />
                <div>
                  <strong className="text-gray-900">Deletion</strong>
                  <p className="text-gray-600 text-sm">Request deletion of your personal information</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                <AlertCircle className="h-5 w-5 text-orange-600 mt-1" />
                <div>
                  <strong className="text-gray-900">Object</strong>
                  <p className="text-gray-600 text-sm">Object to the processing of your personal information</p>
                </div>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">Information Officer</h2>
            <p className="text-gray-600 mb-6">
              Our designated Information Officer is responsible for ensuring POPIA compliance:
            </p>
            <div className="bg-gray-50 rounded-xl p-6 mb-6">
              <p className="text-gray-800"><strong>Information Officer:</strong> UpShift Privacy Team</p>
              <p className="text-gray-800"><strong>Email:</strong> privacy@upshift.works</p>
              <p className="text-gray-800"><strong>Address:</strong> 81 Botterklapper Street, The Willows, Pretoria</p>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">How to Exercise Your Rights</h2>
            <p className="text-gray-600 mb-4">To exercise any of your POPIA rights:</p>
            <ol className="list-decimal pl-6 text-gray-600 space-y-2 mb-6">
              <li>Email our Information Officer at privacy@upshift.works</li>
              <li>Include your full name and contact details</li>
              <li>Specify which right you wish to exercise</li>
              <li>We will respond within 30 days</li>
            </ol>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">Complaints</h2>
            <p className="text-gray-600">
              If you are not satisfied with our response, you have the right to lodge a complaint 
              with the Information Regulator of South Africa:<br /><br />
              <strong>Website:</strong> <a href="https://inforegulator.org.za" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">https://inforegulator.org.za</a><br />
              <strong>Email:</strong> enquiries@inforegulator.org.za
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default POPIACompliance;
