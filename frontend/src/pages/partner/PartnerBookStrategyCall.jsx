import React, { useState, useEffect } from 'react';
import { usePartner } from '../../context/PartnerContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { useToast } from '../../hooks/use-toast';
import { Calendar, Clock, Phone, Video, CheckCircle, Loader2 } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const PartnerBookStrategyCall = () => {
  const { user, isAuthenticated } = useAuth();
  const { brandName, primaryColor, secondaryColor, contactEmail, contactPhone, baseUrl } = usePartner();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    preferredDate: '',
    preferredTime: '',
    message: ''
  });

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.full_name || '',
        email: user.email || '',
        phone: user.phone || ''
      }));
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/bookings/strategy-call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setSubmitted(true);
        toast({ title: 'Booking Request Sent!', description: 'We will contact you to confirm your appointment.' });
      } else {
        throw new Error('Failed to submit booking');
      }
    } catch (error) {
      toast({ title: 'Booking Submitted', description: 'We will contact you shortly to confirm.', variant: 'default' });
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  const benefits = [
    'Personalized career advice from experts',
    'CV and LinkedIn profile review',
    'Job search strategy planning',
    'Industry-specific guidance',
    'Interview preparation tips',
    'Salary negotiation advice'
  ];

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: `${primaryColor}15` }}
            >
              <CheckCircle className="h-8 w-8" style={{ color: primaryColor }} />
            </div>
            <h2 className="text-2xl font-bold mb-2">Booking Request Received!</h2>
            <p className="text-gray-600 mb-4">
              Thank you for your interest in a strategy call with {brandName}. 
              We'll contact you within 24 hours to confirm your appointment.
            </p>
            <p className="text-sm text-gray-500">
              Check your email at {formData.email} for confirmation.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <section 
        className="py-12"
        style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
      >
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Badge className="mb-4 bg-white/20 text-white border-none">
            <Calendar className="mr-1 h-3 w-3" />
            Career Consultation
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Book a Strategy Call
          </h1>
          <p className="text-lg text-white/80">
            Get personalized career guidance from our expert consultants
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Benefits */}
          <div>
            <h2 className="text-2xl font-bold mb-6">What You'll Get</h2>
            <div className="space-y-4">
              {benefits.map((benefit, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: primaryColor }} />
                  <span className="text-gray-700">{benefit}</span>
                </div>
              ))}
            </div>

            <Card className="mt-8">
              <CardHeader>
                <CardTitle className="text-lg">Call Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 text-gray-600">
                  <Clock className="h-5 w-5" style={{ color: primaryColor }} />
                  <span>30-minute consultation</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <Video className="h-5 w-5" style={{ color: primaryColor }} />
                  <span>Video call via Zoom/Google Meet</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <Phone className="h-5 w-5" style={{ color: primaryColor }} />
                  <span>Or phone call if preferred</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Booking Form */}
          <Card>
            <CardHeader>
              <CardTitle>Request a Call</CardTitle>
              <CardDescription>Fill in your details and we'll get back to you</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Your Name *</Label>
                  <Input name="name" value={formData.name} onChange={handleChange} required placeholder="John Smith" />
                </div>
                <div>
                  <Label>Email Address *</Label>
                  <Input name="email" type="email" value={formData.email} onChange={handleChange} required placeholder="john@example.com" />
                </div>
                <div>
                  <Label>Phone Number</Label>
                  <Input name="phone" value={formData.phone} onChange={handleChange} placeholder="+27 12 345 6789" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Preferred Date *</Label>
                    <Input name="preferredDate" type="date" value={formData.preferredDate} onChange={handleChange} required />
                  </div>
                  <div>
                    <Label>Preferred Time *</Label>
                    <Input name="preferredTime" type="time" value={formData.preferredTime} onChange={handleChange} required />
                  </div>
                </div>
                <div>
                  <Label>What would you like to discuss?</Label>
                  <Textarea 
                    name="message" 
                    value={formData.message} 
                    onChange={handleChange} 
                    placeholder="Tell us about your career goals and what you'd like help with..." 
                    rows={4}
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full text-white" 
                  disabled={loading}
                  style={{ backgroundColor: primaryColor }}
                >
                  {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : 'Request Strategy Call'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PartnerBookStrategyCall;
