import React from 'react';
import { Link } from 'react-router-dom';
import { usePartner } from '../../context/PartnerContext';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { 
  FileText, 
  Target, 
  Zap, 
  Award, 
  CheckCircle, 
  ArrowRight,
  Star,
  Users,
  TrendingUp
} from 'lucide-react';

const PartnerHome = () => {
  const { 
    brandName, 
    primaryColor, 
    secondaryColor, 
    baseUrl,
    partner
  } = usePartner();

  const features = [
    {
      icon: Target,
      title: 'ATS-Optimised CVs',
      description: 'Beat applicant tracking systems with our AI-powered optimisation.'
    },
    {
      icon: Zap,
      title: 'AI Enhancement',
      description: 'Transform your CV with intelligent suggestions and improvements.'
    },
    {
      icon: FileText,
      title: 'Cover Letters',
      description: 'Generate tailored cover letters for any job application.'
    },
    {
      icon: Award,
      title: 'Expert Review',
      description: 'Get personalised feedback from career professionals.'
    }
  ];

  const stats = [
    { value: '10,000+', label: 'CVs Created' },
    { value: '95%', label: 'ATS Pass Rate' },
    { value: '48hr', label: 'Average Turnaround' },
    { value: '4.9/5', label: 'Customer Rating' }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section 
        className="pt-20 pb-24 relative overflow-hidden"
        style={{ 
          background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` 
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center">
            <Badge className="mb-4 bg-white/20 text-white border-none">
              Professional Career Services
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
              Land Your Dream Job with<br />
              <span className="text-white/90">{brandName}</span>
            </h1>
            <p className="text-xl text-white/80 max-w-2xl mx-auto mb-8">
              AI-powered CV writing and career services designed to help you stand out 
              in the South African job market.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to={`${baseUrl}/ats-checker`}>
                <Button size="lg" className="bg-white text-gray-900 hover:bg-gray-100 w-full sm:w-auto">
                  Free ATS Check
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to={`${baseUrl}/pricing`}>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-white text-white hover:bg-white/10 w-full sm:w-auto"
                >
                  View Services
                </Button>
              </Link>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
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

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge 
              className="mb-4 border-none"
              style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
            >
              Our Services
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Succeed
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Comprehensive career services to help you land your next opportunity.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, idx) => (
              <Card key={idx} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <div 
                    className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4"
                    style={{ backgroundColor: `${primaryColor}15` }}
                  >
                    <feature.icon className="h-7 w-7" style={{ color: primaryColor }} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Upload Your CV', description: 'Upload your existing CV or start from scratch with our builder.' },
              { step: '2', title: 'AI Enhancement', description: 'Our AI analyzes and optimises your CV for ATS systems.' },
              { step: '3', title: 'Get Results', description: 'Download your polished, job-ready CV within 24-48 hours.' }
            ].map((item, idx) => (
              <div key={idx} className="text-center">
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold"
                  style={{ backgroundColor: primaryColor }}
                >
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section 
        className="py-20"
        style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Transform Your Career?
          </h2>
          <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
            Join thousands of professionals who have landed their dream jobs with our help.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to={`${baseUrl}/register`}>
              <Button size="lg" className="bg-white text-gray-900 hover:bg-gray-100 w-full sm:w-auto">
                Get Started Today
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to={`${baseUrl}/ats-checker`}>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-white text-white hover:bg-white/10 w-full sm:w-auto"
              >
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
