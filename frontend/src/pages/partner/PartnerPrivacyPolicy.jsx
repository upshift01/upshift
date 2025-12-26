import React from 'react';
import { usePartner } from '../../context/PartnerContext';
import { Badge } from '../../components/ui/badge';
import { Shield } from 'lucide-react';

const PartnerPrivacyPolicy = () => {
  const { brandName, primaryColor, secondaryColor, contactEmail } = usePartner();

  return (
    <div className="min-h-screen bg-gray-50">
      <section 
        className="py-12"
        style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
      >
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Badge className="mb-4 bg-white/20 text-white border-none">
            <Shield className="mr-1 h-3 w-3" />
            Legal
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Privacy Policy
          </h1>
          <p className="text-lg text-white/80">
            How {brandName} protects and handles your data
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-sm p-8 space-y-8">
          <section>
            <h2 className="text-2xl font-bold mb-4" style={{ color: primaryColor }}>1. Information We Collect</h2>
            <p className="text-gray-600 mb-4">We collect information you provide directly to us, including:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Name, email address, and contact information</li>
              <li>Resume/CV content and career information</li>
              <li>Payment information (processed securely via Yoco)</li>
              <li>Communications with our team</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4" style={{ color: primaryColor }}>2. How We Use Your Information</h2>
            <p className="text-gray-600 mb-4">We use the information we collect to:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Provide, maintain, and improve our services</li>
              <li>Process your CV and generate career documents</li>
              <li>Send you service-related communications</li>
              <li>Respond to your inquiries and support requests</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4" style={{ color: primaryColor }}>3. Data Security</h2>
            <p className="text-gray-600">
              We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction. Your CV data is encrypted in transit and at rest.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4" style={{ color: primaryColor }}>4. Data Retention</h2>
            <p className="text-gray-600">
              We retain your personal data only for as long as necessary to fulfill the purposes for which it was collected, including satisfying legal, accounting, or reporting requirements. You may request deletion of your data at any time.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4" style={{ color: primaryColor }}>5. Your Rights</h2>
            <p className="text-gray-600 mb-4">Under POPIA (Protection of Personal Information Act), you have the right to:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Access your personal information</li>
              <li>Correct inaccurate information</li>
              <li>Request deletion of your information</li>
              <li>Object to processing of your information</li>
              <li>Data portability</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4" style={{ color: primaryColor }}>6. Third-Party Services</h2>
            <p className="text-gray-600">
              We use trusted third-party services including Yoco for payment processing and AI services for document generation. These services have their own privacy policies and handle data according to their terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4" style={{ color: primaryColor }}>7. Contact Us</h2>
            <p className="text-gray-600">
              If you have any questions about this Privacy Policy or our data practices, please contact us at{' '}
              <a href={`mailto:${contactEmail}`} className="underline" style={{ color: primaryColor }}>{contactEmail}</a>.
            </p>
          </section>

          <div className="text-sm text-gray-500 pt-4 border-t">
            <p>Last updated: December 2025</p>
            <p>This privacy policy is provided by {brandName}, powered by UpShift.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartnerPrivacyPolicy;
