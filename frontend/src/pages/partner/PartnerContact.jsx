import React, { useState } from 'react';
import { usePartner } from '../../context/PartnerContext';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Send, 
  Clock, 
  MessageSquare, 
  CheckCircle, 
  Loader2,
  Facebook,
  Twitter,
  Linkedin,
  Instagram
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const PartnerContact = () => {
  const { 
    brandName, 
    primaryColor, 
    secondaryColor, 
    contactEmail,
    contactPhone,
    partner
  } = usePartner();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/white-label/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSubmitted(true);
        setFormData({ name: '', email: '', subject: '', message: '' });
      } else {
        setError(data.detail || 'Failed to send message. Please try again.');
      }
    } catch (err) {
      setError('Failed to send message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const contactAddress = partner?.contact_address || '';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section 
        className="py-16"
        style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
      >
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Badge className="mb-4 bg-white/20 text-white border-none">
            Get in Touch
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Contact {brandName}
          </h1>
          <p className="text-xl text-white/80">
            Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
          </p>
        </div>
      </section>

      {/* Contact Cards */}
      <div className="max-w-6xl mx-auto px-4 py-12 -mt-8">
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {/* Email Card */}
          <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-6 text-center">
              <div 
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: `${primaryColor}15` }}
              >
                <Mail className="h-7 w-7" style={{ color: primaryColor }} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Email Us</h3>
              {contactEmail ? (
                <a 
                  href={`mailto:${contactEmail}`}
                  className="hover:underline break-all"
                  style={{ color: primaryColor }}
                >
                  {contactEmail}
                </a>
              ) : (
                <p className="text-gray-500">Contact form available</p>
              )}
              <p className="text-sm text-gray-500 mt-2">We'll respond within 24 hours</p>
            </CardContent>
          </Card>

          {/* Phone Card */}
          <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-6 text-center">
              <div 
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: `${primaryColor}15` }}
              >
                <Phone className="h-7 w-7" style={{ color: primaryColor }} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Call Us</h3>
              {contactPhone ? (
                <a 
                  href={`tel:${contactPhone.replace(/\s/g, '')}`}
                  className="hover:underline"
                  style={{ color: primaryColor }}
                >
                  {contactPhone}
                </a>
              ) : (
                <p className="text-gray-500">Phone support available</p>
              )}
              <p className="text-sm text-gray-500 mt-2">Mon-Fri, 8am-5pm SAST</p>
            </CardContent>
          </Card>

          {/* Location Card */}
          <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-6 text-center">
              <div 
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: `${primaryColor}15` }}
              >
                <MapPin className="h-7 w-7" style={{ color: primaryColor }} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Location</h3>
              {contactAddress ? (
                <p className="text-gray-600 text-sm">{contactAddress}</p>
              ) : (
                <p className="text-gray-500 text-sm">South Africa</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Contact Form */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" style={{ color: primaryColor }} />
                Send Us a Message
              </CardTitle>
            </CardHeader>
            <CardContent>
              {submitted ? (
                <div className="text-center py-8">
                  <div 
                    className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                    style={{ backgroundColor: '#22c55e15' }}
                  >
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Message Sent!</h3>
                  <p className="text-gray-600 mb-4">
                    Thank you for reaching out. We'll get back to you within 24 hours.
                  </p>
                  <Button 
                    variant="outline"
                    onClick={() => setSubmitted(false)}
                  >
                    Send Another Message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Your Name
                      </label>
                      <Input
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="John Smith"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address
                      </label>
                      <Input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="john@example.com"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subject
                    </label>
                    <Input
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      placeholder="How can we help you?"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Message
                    </label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="Tell us more about your enquiry..."
                      rows={5}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                  </div>
                  {error && (
                    <p className="text-red-500 text-sm">{error}</p>
                  )}
                  <Button 
                    type="submit" 
                    className="w-full"
                    style={{ backgroundColor: primaryColor }}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Message
                      </>
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          {/* FAQ & Business Hours */}
          <div className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" style={{ color: primaryColor }} />
                  Business Hours
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Monday - Friday</span>
                    <span className="font-medium">08:00 - 17:00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Saturday</span>
                    <span className="font-medium">09:00 - 13:00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Sunday</span>
                    <span className="font-medium text-gray-400">Closed</span>
                  </div>
                  <div className="pt-3 border-t">
                    <p className="text-sm text-gray-500">
                      All times are in South African Standard Time (SAST)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Frequently Asked Questions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">What is ATS and why does it matter?</h4>
                  <p className="text-sm text-gray-600">
                    ATS (Applicant Tracking System) is software used by 90% of large companies to filter CVs. Our AI optimises your CV to pass these systems.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">How long does it take to get my CV?</h4>
                  <p className="text-sm text-gray-600">
                    Standard delivery is 48 hours. Priority turnaround (24 hours) is available with our Professional package.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">Can I get a refund?</h4>
                  <p className="text-sm text-gray-600">
                    Yes, we offer a 7-day money-back guarantee if you're not satisfied with our service.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">What file formats are available?</h4>
                  <p className="text-sm text-gray-600">
                    You can download your CV in PDF, Word (DOCX), and plain text formats.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartnerContact;
