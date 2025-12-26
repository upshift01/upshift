import React from 'react';
import { usePartner } from '../../context/PartnerContext';
import { Badge } from '../../components/ui/badge';
import { FileText } from 'lucide-react';

const PartnerTermsOfService = () => {
  const { brandName, primaryColor, secondaryColor, contactEmail } = usePartner();

  return (
    <div className="min-h-screen bg-gray-50">
      <section 
        className="py-12"
        style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
      >
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Badge className="mb-4 bg-white/20 text-white border-none">
            <FileText className="mr-1 h-3 w-3" />
            Legal
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Terms of Service
          </h1>
          <p className="text-lg text-white/80">
            Terms and conditions for using {brandName} services
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-sm p-8 space-y-8">
          <section>
            <h2 className="text-2xl font-bold mb-4" style={{ color: primaryColor }}>1. Acceptance of Terms</h2>
            <p className="text-gray-600">
              By accessing or using {brandName}'s services, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4" style={{ color: primaryColor }}>2. Services Description</h2>
            <p className="text-gray-600 mb-4">{brandName} provides:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Professional CV/resume writing and optimization services</li>
              <li>ATS (Applicant Tracking System) compatibility checking</li>
              <li>Cover letter generation</li>
              <li>LinkedIn profile optimization</li>
              <li>Career coaching and strategy consultations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4" style={{ color: primaryColor }}>3. User Responsibilities</h2>
            <p className="text-gray-600 mb-4">As a user, you agree to:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Provide accurate and truthful information about your qualifications</li>
              <li>Not misrepresent your credentials or experience</li>
              <li>Use our services for legitimate job-seeking purposes only</li>
              <li>Not share your account credentials with others</li>
              <li>Comply with all applicable laws and regulations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4" style={{ color: primaryColor }}>4. Payment Terms</h2>
            <p className="text-gray-600">
              All payments are processed securely through Yoco. Prices are displayed in South African Rand (ZAR). Payment is required before services are delivered. We offer various packages with different features and pricing.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4" style={{ color: primaryColor }}>5. Intellectual Property</h2>
            <p className="text-gray-600">
              Upon payment, you retain ownership of your personal information and the final CV/documents created. {brandName} retains rights to the templates, formatting, and AI-generated content structure. You may not resell or redistribute our templates.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4" style={{ color: primaryColor }}>6. Limitation of Liability</h2>
            <p className="text-gray-600">
              {brandName} provides career services to assist in your job search. We do not guarantee employment outcomes. Our services are provided "as is" and we are not liable for any indirect, incidental, or consequential damages arising from the use of our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4" style={{ color: primaryColor }}>7. Service Modifications</h2>
            <p className="text-gray-600">
              We reserve the right to modify, suspend, or discontinue any part of our services at any time. We will provide reasonable notice for significant changes that affect your purchased services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4" style={{ color: primaryColor }}>8. Governing Law</h2>
            <p className="text-gray-600">
              These terms are governed by the laws of the Republic of South Africa. Any disputes will be resolved in the courts of South Africa.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4" style={{ color: primaryColor }}>9. Contact</h2>
            <p className="text-gray-600">
              For questions about these Terms of Service, contact us at{' '}
              <a href={`mailto:${contactEmail}`} className="underline" style={{ color: primaryColor }}>{contactEmail}</a>.
            </p>
          </section>

          <div className="text-sm text-gray-500 pt-4 border-t">
            <p>Last updated: December 2025</p>
            <p>These terms are provided by {brandName}, powered by UpShift.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartnerTermsOfService;
