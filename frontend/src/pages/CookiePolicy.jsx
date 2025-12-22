import React from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Cookie, Settings, BarChart3, Shield } from 'lucide-react';

const CookiePolicy = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-3 bg-orange-100 rounded-full mb-4">
            <Cookie className="h-8 w-8 text-orange-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Cookie Policy</h1>
          <p className="text-gray-600">Last updated: December 2024</p>
        </div>

        <Card className="mb-8">
          <CardContent className="prose prose-gray max-w-none p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">What Are Cookies?</h2>
            <p className="text-gray-600 mb-6">
              Cookies are small text files stored on your device when you visit our website. 
              They help us provide you with a better experience by remembering your preferences 
              and understanding how you use our services.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">Types of Cookies We Use</h2>
            
            <div className="space-y-6 mb-8">
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                <Shield className="h-6 w-6 text-blue-600 mt-1" />
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">Essential Cookies</h3>
                  <p className="text-gray-600 text-sm">
                    Required for the website to function properly. These cannot be disabled. 
                    They include authentication cookies and security cookies.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                <Settings className="h-6 w-6 text-purple-600 mt-1" />
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">Functional Cookies</h3>
                  <p className="text-gray-600 text-sm">
                    Remember your preferences like language settings, theme choices, 
                    and previously entered information to enhance your experience.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                <BarChart3 className="h-6 w-6 text-green-600 mt-1" />
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">Analytics Cookies</h3>
                  <p className="text-gray-600 text-sm">
                    Help us understand how visitors interact with our website. 
                    We use this information to improve our services and user experience.
                  </p>
                </div>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">Managing Cookies</h2>
            <p className="text-gray-600 mb-4">
              You can control and manage cookies in several ways:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
              <li>Browser settings: Most browsers allow you to block or delete cookies</li>
              <li>Our cookie preferences: Use our cookie settings panel when available</li>
              <li>Opt-out links: Some third-party services provide opt-out options</li>
            </ul>
            <p className="text-gray-600 mb-6">
              Note: Disabling certain cookies may affect the functionality of our website.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">Third-Party Cookies</h2>
            <p className="text-gray-600 mb-6">
              We may use third-party services that set their own cookies, including:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
              <li>Google Analytics - for website analytics</li>
              <li>Yoco - for payment processing</li>
              <li>Social media platforms - for sharing features</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">Contact Us</h2>
            <p className="text-gray-600">
              If you have questions about our use of cookies, please contact us at: privacy@upshift.works
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CookiePolicy;
