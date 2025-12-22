import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { FileText, Clock, Shield, Download } from 'lucide-react';

const Templates = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
          Resume Templates Collection
        </h1>
        <p className="text-gray-700 mb-8">
          Browse our extensive collection of professional resume templates. Each template is designed by HR specialists and optimized for readability and visual appeal.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <Card>
            <CardHeader>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-2">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle>Classic Templates</CardTitle>
              <CardDescription>
                Traditional, professional designs suitable for corporate environments and conservative industries.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-2">
                <Clock className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle>Modern Templates</CardTitle>
              <CardDescription>
                Contemporary designs with clean layouts, perfect for tech, marketing, and creative professionals.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-2">
                <Download className="h-6 w-6 text-purple-600" />
              </div>
              <CardTitle>Creative Templates</CardTitle>
              <CardDescription>
                Bold, innovative designs for designers, artists, and creative professionals who want to stand out.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-2">
                <Shield className="h-6 w-6 text-orange-600" />
              </div>
              <CardTitle>ATS-Friendly Templates</CardTitle>
              <CardDescription>
                Optimized for Applicant Tracking Systems with clean formatting and keyword optimization.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        <div className="bg-white rounded-lg p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Why Choose Our Templates?
          </h2>
          <ul className="space-y-3 text-gray-700">
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span><strong>100% Free:</strong> All templates are completely free to download and use.</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span><strong>Easy to Edit:</strong> Fully editable in Microsoft Word, no advanced skills required.</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span><strong>Professional Design:</strong> Created by HR specialists and design professionals.</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span><strong>Multiple Formats:</strong> Download as DOCX or create PDF using our online builder.</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span><strong>Regular Updates:</strong> New templates added regularly to keep up with trends.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Templates;