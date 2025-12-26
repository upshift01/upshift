import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Star, CheckCircle2, Sparkles, Zap } from 'lucide-react';
import * as Icons from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { usePartner } from '../../context/PartnerContext';

// Fallback data
import { features as fallbackFeatures, testimonials as fallbackTestimonials, sampleImprovements as fallbackImprovements } from '../../mockData';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const PartnerHome = () => {
  const { brandName, primaryColor, secondaryColor, baseUrl } = usePartner();
  const [features, setFeatures] = useState(fallbackFeatures);
  const [testimonials, setTestimonials] = useState(fallbackTestimonials);
  const [sampleImprovements, setSampleImprovements] = useState(fallbackImprovements);

  // Fetch content from API
  useEffect(() => {
    const fetchContent = async () => {
      try {
        const [featuresRes, testimonialsRes, improvementsRes] = await Promise.all([
          fetch(`${API_URL}/api/content/features`),
          fetch(`${API_URL}/api/content/testimonials`),
          fetch(`${API_URL}/api/content/sample-improvements`)
        ]);

        if (featuresRes.ok) {
          const data = await featuresRes.json();
          if (data.features && data.features.length > 0) {
            setFeatures(data.features);
          }
        }

        if (testimonialsRes.ok) {
          const data = await testimonialsRes.json();
          if (data.testimonials && data.testimonials.length > 0) {
            setTestimonials(data.testimonials);
          }
        }

        if (improvementsRes.ok) {
          const data = await improvementsRes.json();
          if (data.improvements && data.improvements.length > 0) {
            setSampleImprovements(data.improvements);
          }
        }
      } catch (error) {
        console.error('Error fetching homepage content:', error);
      }
    };

    fetchContent();
  }, []);

  // Feature Card Component with dynamic icons matching main site
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
    teal: 'bg-teal-100 text-teal-600',
    pink: 'bg-pink-100 text-pink-600'
  };

  const FeatureCard = ({ feature }) => {
    const IconComponent = Icons[feature.icon] || Icons.Sparkles;
    
    return (
      <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-gray-200">
        <CardHeader>
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-3 ${colorClasses[feature.color] || colorClasses.blue}`}>
            <IconComponent className="h-6 w-6" />
          </div>
          <CardTitle className="text-lg">{feature.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 text-sm">{feature.description}</p>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 px-4">
        <div 
          className="absolute inset-0 opacity-70"
          style={{ background: `linear-gradient(135deg, ${primaryColor}10, ${secondaryColor}10, ${primaryColor}05)` }}
        />
        <div className="relative max-w-6xl mx-auto text-center">
          <Badge 
            className="mb-6 text-white border-none"
            style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
          >
            <Sparkles className="mr-1 h-3 w-3" />
            AI-Powered CV Solutions for South Africa
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Transform Your Career with
            <span 
              className="block bg-clip-text text-transparent"
              style={{ backgroundImage: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
            >
              AI-Powered Resumes
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            {brandName} helps South African job seekers create professional, ATS-optimised CVs 
            and cover letters that stand out in today's competitive market.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to={`${baseUrl}/pricing`}>
              <Button 
                size="lg" 
                className="text-white text-lg px-8"
                style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
              >
                View Pricing & Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to={`${baseUrl}/templates`}>
              <Button size="lg" variant="outline" className="text-lg px-8 border-2 border-gray-300 hover:border-blue-600 hover:text-blue-600">
                View Templates
              </Button>
            </Link>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 max-w-4xl mx-auto">
            <div className="text-center">
              <div 
                className="text-4xl font-bold bg-clip-text text-transparent"
                style={{ backgroundImage: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
              >
                10,000+
              </div>
              <div className="text-gray-600 mt-2">CVs Created</div>
            </div>
            <div className="text-center">
              <div 
                className="text-4xl font-bold bg-clip-text text-transparent"
                style={{ backgroundImage: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
              >
                85%
              </div>
              <div className="text-gray-600 mt-2">Interview Success Rate</div>
            </div>
            <div className="text-center">
              <div 
                className="text-4xl font-bold bg-clip-text text-transparent"
                style={{ backgroundImage: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
              >
                24/7
              </div>
              <div className="text-gray-600 mt-2">AI Assistance</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <Badge 
              className="mb-4 border"
              style={{ backgroundColor: `${primaryColor}15`, color: primaryColor, borderColor: `${primaryColor}30` }}
            >
              <Zap className="mr-1 h-3 w-3" />
              Powerful Features
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Land Your Dream Job
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our AI-powered platform provides comprehensive tools tailored for the South African job market
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <FeatureCard key={feature.id} feature={feature} />
            ))}
          </div>
        </div>
      </section>

      {/* AI Improvement Example Section */}
      <section 
        className="py-20 px-4"
        style={{ background: `linear-gradient(135deg, ${primaryColor}08, ${secondaryColor}08)` }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <Badge 
              className="mb-4 text-white border-none"
              style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
            >
              <Sparkles className="mr-1 h-3 w-3" />
              AI Magic
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              See How AI Transforms Your CV
            </h2>
            <p className="text-xl text-gray-600">
              Watch generic statements become powerful achievements
            </p>
          </div>

          <div className="space-y-6">
            {sampleImprovements.map((improvement, index) => (
              <Card key={index} className="overflow-hidden border-2 border-gray-200 hover:border-blue-300 transition-all">
                <CardHeader className="bg-gray-50">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      {improvement.category}
                    </CardTitle>
                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                      AI Enhanced
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="p-4 bg-red-50 border-l-4 border-red-400 rounded">
                      <div className="text-xs font-semibold text-red-700 mb-1">BEFORE</div>
                      <p className="text-gray-700">{improvement.original}</p>
                    </div>
                    <div className="flex justify-center">
                      <ArrowRight className="h-6 w-6" style={{ color: primaryColor }} />
                    </div>
                    <div className="p-4 bg-green-50 border-l-4 border-green-400 rounded">
                      <div className="text-xs font-semibold text-green-700 mb-1">AFTER</div>
                      <p className="text-gray-700">{improvement.improved}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-green-100 text-green-700 border-green-200">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Real Success Stories
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Trusted by Job Seekers Across South Africa
            </h2>
            <p className="text-xl text-gray-600">
              Join thousands who have transformed their careers with {brandName}
            </p>
          </div>

          {/* Featured Success Stories */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {testimonials.slice(0, 3).map((testimonial) => (
              <Card key={testimonial.id} className="border-gray-200 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center space-x-4 mb-3">
                    <img
                      src={testimonial.avatar}
                      alt={testimonial.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div>
                      <div className="font-semibold text-gray-900">{testimonial.name}</div>
                      <div className="text-sm text-gray-500">{testimonial.role}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-sm italic">&ldquo;{testimonial.content}&rdquo;</p>
                  <p className="text-xs text-gray-400 mt-3">{testimonial.location}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* More Success Stories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {testimonials.slice(3, 9).map((testimonial) => (
              <div key={testimonial.id} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                <div className="flex items-start space-x-3">
                  <img
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900 text-sm truncate">{testimonial.name}</span>
                      <div className="flex items-center space-x-0.5">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">{testimonial.role} • {testimonial.location}</p>
                    <p className="text-sm text-gray-600 line-clamp-3">&ldquo;{testimonial.content}&rdquo;</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Stats Banner */}
          <div 
            className="mt-12 rounded-2xl p-8 text-white"
            style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-3xl md:text-4xl font-bold">10,000+</div>
                <div className="text-white/80 text-sm mt-1">CVs Created</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold">85%</div>
                <div className="text-white/80 text-sm mt-1">Interview Rate</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold">4.9★</div>
                <div className="text-white/80 text-sm mt-1">User Rating</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold">48hrs</div>
                <div className="text-white/80 text-sm mt-1">Avg. Response Time</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gray-900">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Transform Your Career?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join thousands of South Africans who have landed their dream jobs with {brandName}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to={`${baseUrl}/pricing`}>
              <Button 
                size="lg" 
                className="text-white text-lg px-8"
                style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
              >
                Get Started Today
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to={`${baseUrl}/ats-checker`}>
              <Button size="lg" variant="outline" className="text-lg px-8 border-white text-white hover:bg-white hover:text-gray-900">
                Try Free ATS Checker
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PartnerHome;
