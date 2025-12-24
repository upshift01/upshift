import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Mail, FileText, Pencil } from 'lucide-react';

const CoverLetter = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
          Cover Letter Builder
        </h1>
        <p className="text-gray-700 mb-8">
          Create a professional cover letter to accompany your resume. A well-written cover letter can significantly increase your chances of getting an interview.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card>
            <CardHeader>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-2">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle>Templates</CardTitle>
              <CardDescription>
                Choose from professional cover letter templates designed for various industries.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-2">
                <Pencil className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle>Customise</CardTitle>
              <CardDescription>
                Easily edit and personalise your cover letter to match your unique experience.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-2">
                <Mail className="h-6 w-6 text-purple-600" />
              </div>
              <CardTitle>Send</CardTitle>
              <CardDescription>
                Download your cover letter and send it along with your resume to employers.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        <Card className="bg-white">
          <CardHeader>
            <CardTitle>How to Write an Effective Cover Letter</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">1. Start with a Strong Opening</h3>
              <p>
                Begin with a compelling introduction that captures the reader's attention. Mention the position you're applying for and how you learned about it.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">2. Highlight Your Relevant Experience</h3>
              <p>
                Demonstrate how your skills and experience align with the job requirements. Use specific examples and achievements.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">3. Show Your Knowledge of the Company</h3>
              <p>
                Research the company and explain why you're interested in working there. Show that you understand their mission and values.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">4. End with a Call to Action</h3>
              <p>
                Close by expressing your enthusiasm for the opportunity and indicating that you'd welcome the chance to discuss your qualifications further.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">Coming Soon</h3>
          <p className="text-sm text-blue-800">
            Our cover letter builder tool is currently under development. Check back soon for an easy-to-use interface to create professional cover letters in minutes!
          </p>
        </div>
      </div>
    </div>
  );
};

export default CoverLetter;