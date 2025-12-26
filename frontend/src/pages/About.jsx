import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Target, 
  Award, 
  Zap, 
  CheckCircle, 
  ArrowRight,
  Briefcase,
  TrendingUp,
  Shield,
  Heart,
  Globe,
  Loader2
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const About = () => {
  const [config, setConfig] = useState(null);
  const [aboutContent, setAboutContent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const [configRes, aboutRes] = await Promise.all([
        fetch(`${API_URL}/api/white-label/config`),
        fetch(`${API_URL}/api/content/about`)
      ]);

      if (configRes.ok) {
        const data = await configRes.json();
        setConfig(data);
      }

      if (aboutRes.ok) {
        const data = await aboutRes.json();
        setAboutContent(data);
      }
    } catch (error) {
      console.error('Error fetching content:', error);
    } finally {
      setLoading(false);
    }
  };

  // Default content if not customised
  const defaultContent = {
    hero: {
      title: "Empowering South African Careers",
      subtitle: "We're on a mission to help job seekers stand out in today's competitive market with AI-powered tools designed specifically for the South African job market."
    },
    mission: {
      title: "Our Mission",
      description: "To democratise access to professional career tools and help every South African job seeker present their best self to potential employers."
    },
    story: {
      title: "Our Story",
      paragraphs: [
        "UpShift was born from a simple observation: too many talented South Africans were being overlooked by employers simply because their CVs weren't optimised for modern hiring systems.",
        "We built UpShift to level the playing field. Our AI-powered tools help job seekers create professional, ATS-friendly CVs that get noticed by recruiters and hiring managers.",
        "Today, we're proud to serve thousands of job seekers across South Africa, helping them take the next step in their careers."
      ]
    },
    values: [
      {
        icon: "Target",
        title: "Results-Driven",
        description: "Every feature we build is designed to help you land more interviews and job offers."
      },
      {
        icon: "Shield",
        title: "Privacy First",
        description: "Your data is yours. We never sell or share your personal information with third parties."
      },
      {
        icon: "Heart",
        title: "Accessible",
        description: "Professional career tools shouldn't be expensive. We offer free tools alongside premium services."
      },
      {
        icon: "Globe",
        title: "Local Focus",
        description: "Built specifically for the South African job market, with local industry knowledge."
      }
    ],
    stats: [
      { value: "10,000+", label: "CVs Created" },
      { value: "95%", label: "ATS Pass Rate" },
      { value: "50+", label: "Industries Covered" },
      { value: "24/7", label: "AI Support" }
    ],
    team: {
      title: "Built by Career Experts",
      description: "Our team combines expertise in HR, recruitment, technology, and AI to bring you the best career tools."
    }
  };

  const content = aboutContent || defaultContent;
  const companyName = config?.site_name || 'UpShift';
  const primaryColor = config?.branding?.primary_color || '#1e40af';

  const getIcon = (iconName) => {
    const icons = {
      Target: Target,
      Shield: Shield,
      Heart: Heart,
      Globe: Globe,
      Users: Users,
      Award: Award,
      Zap: Zap,
      Briefcase: Briefcase,
      TrendingUp: TrendingUp
    };
    return icons[iconName] || Target;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="pt-24 pb-16 bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="mb-4 bg-white/20 text-white border-none">
            About {companyName}
          </Badge>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
            {content.hero?.title || defaultContent.hero.title}
          </h1>
          <p className="text-xl text-blue-100 max-w-3xl mx-auto">
            {content.hero?.subtitle || defaultContent.hero.subtitle}
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-gray-50 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {(content.stats || defaultContent.stats).map((stat, idx) => (
              <div key={idx} className="text-center">
                <p className="text-3xl md:text-4xl font-bold text-blue-600">{stat.value}</p>
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
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              {content.mission?.title || defaultContent.mission.title}
            </h2>
            <p className="text-xl text-gray-600 leading-relaxed">
              {content.mission?.description || defaultContent.mission.description}
            </p>
          </div>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4 bg-blue-100 text-blue-700 border-none">
                Our Journey
              </Badge>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                {content.story?.title || defaultContent.story.title}
              </h2>
              <div className="space-y-4">
                {(content.story?.paragraphs || defaultContent.story.paragraphs).map((para, idx) => (
                  <p key={idx} className="text-gray-600 leading-relaxed">
                    {para}
                  </p>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center">
                <div className="text-center p-8">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
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
            <Badge className="mb-4 bg-purple-100 text-purple-700 border-none">
              What We Stand For
            </Badge>
            <h2 className="text-3xl font-bold text-gray-900">Our Values</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {(content.values || defaultContent.values).map((value, idx) => {
              const IconComponent = getIcon(value.icon);
              return (
                <Card key={idx} className="text-center hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <IconComponent className="h-7 w-7 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{value.title}</h3>
                    <p className="text-gray-600 text-sm">{value.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* What We Offer Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-green-100 text-green-700 border-none">
              Our Services
            </Badge>
            <h2 className="text-3xl font-bold text-gray-900">What We Offer</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Target,
                title: "ATS Resume Checker",
                description: "Free tool to check if your CV will pass Applicant Tracking Systems used by employers.",
                badge: "FREE",
                link: "/ats-checker"
              },
              {
                icon: Zap,
                title: "AI CV Enhancement",
                description: "Transform your existing CV into a professional, keyword-optimised document.",
                link: "/improve"
              },
              {
                icon: Award,
                title: "Professional Packages",
                description: "Complete career packages including CV, cover letter, and LinkedIn optimisation.",
                link: "/pricing"
              }
            ].map((service, idx) => (
              <Card key={idx} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
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
          <Badge className="mb-4 bg-blue-100 text-blue-700 border-none">
            <Users className="mr-1 h-3 w-3" />
            Our Team
          </Badge>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            {content.team?.title || defaultContent.team.title}
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            {content.team?.description || defaultContent.team.description}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {["HR Specialists", "AI Engineers", "Career Coaches", "UX Designers"].map((role, idx) => (
              <Badge key={idx} variant="outline" className="px-4 py-2 text-sm">
                <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                {role}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Elevate Your Career?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of South African professionals who have transformed their job search with {companyName}.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/ats-checker">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50">
                Try Free ATS Checker
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/pricing">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                View Pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default About;
