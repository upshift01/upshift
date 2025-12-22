import React, { useState, useEffect } from 'react';
import { Mail, Phone, MapPin, Send, Clock, MessageSquare, CheckCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

const Contact = () => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/white-label/config`);
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
      }
    } catch (error) {
      console.error('Error fetching config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      // Simulate form submission - in production, this would send to an API
      await new Promise(resolve => setTimeout(resolve, 1500));
      setSubmitted(true);
      setFormData({ name: '', email: '', subject: '', message: '' });
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const brandName = config?.brand_name || 'UpShift';
  const contactEmail = config?.contact_email || 'support@upshift.works';
  const contactPhone = config?.contact_phone || '+27 (0) 11 234 5678';
  const contactAddress = config?.contact_address || '123 Main Street, Sandton, Johannesburg, 2196, South Africa';
  const primaryColor = config?.primary_color || '#1e40af';

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <div 
        className="py-16 px-4 text-white"
        style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, #7c3aed 100%)` }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Get in Touch</h1>
          <p className="text-xl text-white/90">
            Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12 -mt-8">
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {/* Contact Cards */}
          <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-6 text-center">
              <div 
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: `${primaryColor}15` }}
              >
                <Mail className="h-7 w-7" style={{ color: primaryColor }} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Email Us</h3>
              <a 
                href={`mailto:${contactEmail}`}
                className="text-blue-600 hover:underline break-all"
              >
                {contactEmail}
              </a>
              <p className="text-sm text-gray-500 mt-2">We'll respond within 24 hours</p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-6 text-center">
              <div 
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: `${primaryColor}15` }}
              >
                <Phone className="h-7 w-7" style={{ color: primaryColor }} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Call Us</h3>
              <a 
                href={`tel:${contactPhone.replace(/\s/g, '')}`}
                className="text-blue-600 hover:underline"
              >
                {contactPhone}
              </a>
              <p className="text-sm text-gray-500 mt-2">Mon-Fri, 8am-5pm SAST</p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-6 text-center">
              <div 
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: `${primaryColor}15` }}
              >
                <MapPin className="h-7 w-7" style={{ color: primaryColor }} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Visit Us</h3>
              <p className="text-gray-600 text-sm">{contactAddress}</p>
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

          {/* FAQ / Additional Info */}
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
                  <h4 className="font-medium text-gray-900 mb-1">How long does it take to create a CV?</h4>
                  <p className="text-sm text-gray-600">
                    With our AI-powered tools, you can create a professional CV in as little as 15 minutes.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">Can I get a refund?</h4>
                  <p className="text-sm text-gray-600">
                    Yes, we offer a 7-day money-back guarantee if you're not satisfied with our service.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">Do you offer corporate packages?</h4>
                  <p className="text-sm text-gray-600">
                    Yes! Contact us for custom enterprise solutions for recruitment agencies and HR departments.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Map placeholder */}
            <Card className="shadow-lg overflow-hidden">
              <div className="h-48 bg-gray-200 flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">
                    {contactAddress.split(',')[0]}
                  </p>
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contactAddress)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 text-sm hover:underline"
                  >
                    View on Google Maps →
                  </a>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
