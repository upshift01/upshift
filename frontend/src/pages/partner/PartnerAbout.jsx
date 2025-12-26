import React from 'react';
import { Link } from 'react-router-dom';
import { usePartner } from '../../context/PartnerContext';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { 
  Target, 
  Shield, 
  Heart, 
  Globe, 
  ArrowRight,
  CheckCircle,
  Briefcase,
  Users,
  Award,
  Zap
} from 'lucide-react';

const PartnerAbout = () => {
  const { 
    brandName, 
    primaryColor, 
    secondaryColor, 
    baseUrl,
    partner
  } = usePartner();

  const values = [
    {
      icon: Target,
      title: 'Results-Driven',
      description: 'Every service we offer is designed to help you land more interviews and job offers.'
    },
    {
      icon: Shield,
      title: 'Privacy First',
      description: 'Your data is yours. We never sell or share your personal information.'
    },
    {
      icon: Heart,
      title: 'Accessible',
      description: 'Professional career tools at competitive prices. We offer free tools alongside premium services.'
    },
    {
      icon: Globe,
      title: 'Local Focus',
      description: 'Built specifically for the South African job market, with local industry knowledge.'
    }
  ];

  const stats = [
    { value: '10,000+', label: 'CVs Created' },
    { value: '95%', label: 'ATS Pass Rate' },
    { value: '50+', label: 'Industries Covered' },
    { value: '24/7', label: 'AI Support' }
  ];

  const services = [
    {
      icon: Target,
      title: 'ATS Resume Checker',
      description: 'Free tool to check if your CV will pass Applicant Tracking Systems.',
      badge: 'FREE',
      link: `${baseUrl}/ats-checker`
    },
    {
      icon: Zap,
      title: 'AI CV Enhancement',
      description: 'Transform your existing CV into a professional, keyword-optimised document.',
      link: `${baseUrl}/pricing`
    },
    {
      icon: Award,
      title: 'Professional Packages',
      description: 'Complete career packages including CV, cover letter, and LinkedIn optimisation.',
      link: `${baseUrl}/pricing`
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section 
        className="py-20"
        style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="mb-4 bg-white/20 text-white border-none">
            About {brandName}
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Empowering South African Careers
          </h1>
          <p className="text-xl text-white/80 max-w-3xl mx-auto">
            We're on a mission to help job seekers stand out in today's competitive market 
            with AI-powered tools designed specifically for the South African job market.
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-gray-50 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, idx) => (
              <div key={idx} className="text-center">
                <p 
                  className="text-3xl md:text-4xl font-bold"
                  style={{ color: primaryColor }}
                >
                  {stat.value}
                </p>
                <p className="text-gray-600 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Mission</h2>
            <p className="text-xl text-gray-600 leading-relaxed">
              To democratise access to professional career tools and help every South African 
              job seeker present their best self to potential employers.
            </p>
          </div>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <Badge 
                className="mb-4 border-none"
                style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
              >
                Our Journey
              </Badge>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Story</h2>
              <div className="space-y-4 text-gray-600">
                <p>
                  {brandName} was born from a simple observation: too many talented South Africans 
                  were being overlooked by employers simply because their CVs weren't optimised 
                  for modern hiring systems.
                </p>
                <p>
                  We built our platform to level the playing field. Our AI-powered tools help 
                  job seekers create professional, ATS-friendly CVs that get noticed by 
                  recruiters and hiring managers.
                </p>
                <p>
                  Today, we're proud to serve thousands of job seekers across South Africa, 
                  helping them take the next step in their careers.
                </p>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center">
                <div className="text-center p-8">
                  <div 
                    className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"
                    style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
                  >
                    <Briefcase className="h-12 w-12 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    Helping Careers Take Off
                  </h3>
                  <p className="text-gray-600">
                    Since day one, we've been focused on one thing: your success.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge 
              className="mb-4 border-none"
              style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
            >
              What We Stand For
            </Badge>
            <h2 className="text-3xl font-bold text-gray-900">Our Values</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, idx) => (
              <Card key={idx} className="text-center hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div 
                    className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4"
                    style={{ backgroundColor: `${primaryColor}15` }}
                  >
                    <value.icon className="h-7 w-7" style={{ color: primaryColor }} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{value.title}</h3>
                  <p className="text-gray-600 text-sm">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge 
              className="mb-4 border-none"
              style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
            >
              Our Services
            </Badge>
            <h2 className="text-3xl font-bold text-gray-900">What We Offer</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {services.map((service, idx) => (
              <Card key={idx} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
                    >
                      <service.icon className="h-6 w-6 text-white" />
                    </div>
                    {service.badge && (
                      <Badge className="bg-green-100 text-green-700">{service.badge}</Badge>
                    )}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{service.title}</h3>
                  <p className="text-gray-600 mb-4">{service.description}</p>
                  <Link to={service.link}>
                    <Button variant="outline" className="w-full group">
                      Learn More
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge 
            className="mb-4 border-none"
            style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
          >
            <Users className="mr-1 h-3 w-3" />
            Our Team
          </Badge>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Built by Career Experts</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Our team combines expertise in HR, recruitment, technology, and AI to bring you the best career tools.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {['HR Specialists', 'AI Engineers', 'Career Coaches', 'UX Designers'].map((role, idx) => (
              <Badge key={idx} variant="outline" className="px-4 py-2 text-sm">
                <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                {role}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section 
        className="py-16"
        style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Elevate Your Career?
          </h2>
          <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
            Join thousands of professionals who have transformed their job search with {brandName}.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to={`${baseUrl}/ats-checker`}>
              <Button size="lg" className="bg-white text-gray-900 hover:bg-gray-100">
                Try Free ATS Checker
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to={`${baseUrl}/pricing`}>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-white text-white hover:bg-white/10"
              >
                View Pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PartnerAbout;
