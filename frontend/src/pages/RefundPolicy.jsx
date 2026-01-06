import React from 'react';
import { Card, CardContent } from '../components/ui/card';
import { RotateCcw, CheckCircle, Clock, AlertCircle } from 'lucide-react';

const RefundPolicy = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-3 bg-green-100 rounded-full mb-4">
            <RotateCcw className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Refund Policy</h1>
          <p className="text-gray-600">Last updated: December 2024</p>
        </div>

        <Card className="mb-8">
          <CardContent className="prose prose-gray max-w-none p-8">
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-8">
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle className="h-6 w-6 text-green-600" />
                <h3 className="text-xl font-bold text-green-800 m-0">7-Day Money-Back Guarantee</h3>
              </div>
              <p className="text-green-700 m-0">
                We offer a full refund within 7 days of purchase if you're not satisfied with our service—no questions asked.
              </p>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">Eligibility for Refund</h2>
            <p className="text-gray-600 mb-4">You are eligible for a full refund if:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
              <li>Your request is made within 7 days of the original purchase</li>
              <li>You have not downloaded or used the final documents more than twice</li>
              <li>You provide a valid reason for your dissatisfaction</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">Non-Refundable Services</h2>
            <p className="text-gray-600 mb-4">The following are not eligible for refunds:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
              <li>Services purchased more than 7 days ago</li>
              <li>Strategy call consultations that have been completed</li>
              <li>Custom enterprise or bulk orders (subject to separate agreement)</li>
              <li>Services where the final deliverable has been fully utilised</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">How to Request a Refund</h2>
            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold text-sm">1</div>
                <div>
                  <strong className="text-gray-900">Contact Support</strong>
                  <p className="text-gray-600">Email us at refunds@upshift.works with your order details.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold text-sm">2</div>
                <div>
                  <strong className="text-gray-900">Provide Information</strong>
                  <p className="text-gray-600">Include your order number, email address, and reason for the refund.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold text-sm">3</div>
                <div>
                  <strong className="text-gray-900">Processing Time</strong>
                  <p className="text-gray-600">Refunds are processed within 5-7 business days to your original payment method.</p>
                </div>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">Contact Us</h2>
            <p className="text-gray-600">
              For refund requests or questions, contact us at:<br /><br />
              <strong>Email:</strong> {theme.contactEmail || 'support@upshift.works'}<br />
              <strong>Phone:</strong> {theme.contactPhone || '+27 (0) 12 345 6789'}<br />
              <strong>Hours:</strong> {theme.businessHours || 'Monday-Friday, 08:00-17:00 SAST'}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RefundPolicy;
