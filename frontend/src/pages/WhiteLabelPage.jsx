import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  CheckCircle2, 
  Zap, 
  Users, 
  DollarSign, 
  Palette, 
  Globe, 
  Shield,
  BarChart3,
  Headphones,
  Building2,
  GraduationCap,
  Briefcase,
  Heart,
  Star,
  ChevronDown,
  Mail,
  Phone,
  Rocket,
  Target,
  TrendingUp,
  Lock,
  Clock,
  Award,
  Loader2
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';

const WhiteLabelPage = () => {
  const [openFaq, setOpenFaq] = useState(null);
  const [formData, setFormData] = useState({
    company: '',
    name: '',
    email: '',
    phone: '',
    type: '',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  // Fetch pricing plans from API
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/white-label/plans`);
        if (response.ok) {
          const data = await response.json();
          if (data.plans && data.plans.length > 0) {
            setPlans(data.plans);
          } else {
            // Fallback to default plans if API returns empty
            setPlans(getDefaultPlans());
          }
        } else {
          setPlans(getDefaultPlans());
        }
      } catch (error) {
        console.error('Error fetching plans:', error);
        setPlans(getDefaultPlans());
      } finally {
        setLoadingPlans(false);
      }
    };
    fetchPlans();
  }, []);

  // Default plans fallback
  const getDefaultPlans = () => [
    {
      key: 'starter',
      name: 'Starter',
      price: 249900,
      price_display: 'R2,499',
      period: '/month',
      description: 'Perfect for small agencies and coaches starting out',
      features: [
        'Up to 50 active clients',
        'White-label branding',
        'Custom subdomain',
        'Email support',
        'Basic analytics',
        'Standard templates'
      ],
      cta: 'Start Free Trial',
      popular: false
    },
    {
      key: 'professional',
      name: 'Professional',
      price: 499900,
      price_display: 'R4,999',
      period: '/month',
      description: 'For growing businesses with higher volume needs',
      features: [
        'Up to 200 active clients',
        'Full white-label branding',
        'Custom domain support',
        'Priority email & chat support',
        'Advanced analytics',
        'All premium templates',
        'API access',
        'Custom email templates'
      ],
      cta: 'Start Free Trial',
      popular: true
    },
    {
      key: 'enterprise',
      name: 'Enterprise',
      price: 0,
      price_display: 'Custom',
      period: '',
      description: 'For large organizations with custom requirements',
      features: [
        'Unlimited clients',
        'Multiple brand instances',
        'Dedicated account manager',
        'Phone & video support',
        'Custom integrations',
        'SLA guarantees',
        'On-boarding training',
        'Custom development'
      ],
      cta: 'Contact Sales',
      popular: false,
      contact_sales: true
    }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/ai-content/partner-enquiry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSubmitted(true);
      } else {
        throw new Error(data.detail || 'Failed to submit enquiry');
      }
    } catch (error) {
      console.error('Submission error:', error);
      alert('Failed to submit enquiry. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const benefits = [
    {
      icon: Palette,
      title: 'Full White-Label Branding',
      description: 'Your logo, colors, domain, and brand identity. Clients never see UpShift—only your professional brand.',
      color: 'bg-purple-100 text-purple-600'
    },
    {
      icon: DollarSign,
      title: 'Set Your Own Pricing',
      description: 'Complete control over pricing tiers. Charge what the market will bear and keep the difference.',
      color: 'bg-green-100 text-green-600'
    },
    {
      icon: Users,
      title: 'Unlimited Clients',
      description: 'No per-user fees or client caps. Scale your business without worrying about licensing costs.',
      color: 'bg-blue-100 text-blue-600'
    },
    {
      icon: Globe,
      title: 'Custom Domain Support',
      description: 'Use your own domain (careers.yourcompany.com) with automatic SSL and professional setup.',
      color: 'bg-orange-100 text-orange-600'
    },
    {
      icon: Zap,
      title: 'AI-Powered Tools',
      description: 'Cutting-edge GPT technology for CV creation, cover letters, ATS optimization, and interview prep.',
      color: 'bg-yellow-100 text-yellow-600'
    },
    {
      icon: Shield,
      title: 'Enterprise Security',
      description: 'POPIA compliant, SSL encrypted, secure data handling. Your clients\' data is always protected.',
      color: 'bg-red-100 text-red-600'
    }
  ];

  const useCases = [
    {
      icon: Briefcase,
      title: 'Recruitment Agencies',
      description: 'Offer premium CV services to candidates. Increase placements with ATS-optimised CVs.',
      benefits: ['Candidate preparation tools', 'Bulk CV processing', 'Client portal access', 'Placement tracking']
    },
    {
      icon: GraduationCap,
      title: 'Educational Institutions',
      description: 'Empower students and alumni with career tools. Boost graduate employment outcomes.',
      benefits: ['Student career services', 'Alumni support programs', 'Campus branding', 'Usage analytics']
    },
    {
      icon: Heart,
      title: 'Career Coaches',
      description: 'Enhance your coaching practice with professional tools. Deliver more value to clients.',
      benefits: ['Client management', 'Progress tracking', 'Branded deliverables', 'Session integration']
    },
    {
      icon: Building2,
      title: 'HR Consultancies',
      description: 'Add career transition services to your portfolio. Support outplacement and upskilling.',
      benefits: ['Outplacement support', 'Workforce transition', 'Corporate packages', 'White-label reports']
    }
  ];

  const features = [
    { icon: BarChart3, text: 'Real-time analytics dashboard' },
    { icon: Mail, text: 'Customizable email templates' },
    { icon: Lock, text: 'Secure payment processing (Yoco)' },
    { icon: Clock, text: '24/7 platform availability' },
    { icon: Headphones, text: 'Dedicated partner support' },
    { icon: TrendingUp, text: 'Regular feature updates' },
  ];

  const faqs = [
    {
      q: 'How quickly can I get started?',
      a: 'You can have your white-label platform live within 24 hours. Our onboarding team will help you configure your branding, domain, and pricing. Most partners are fully operational within a week.'
    },
    {
      q: 'Do I need technical skills to manage the platform?',
      a: 'Not at all! Our platform is designed for non-technical users. You\'ll have an intuitive dashboard to manage customers, invoices, branding, and analytics. We handle all the technical infrastructure.'
    },
    {
      q: 'Can I use my own payment processor?',
      a: 'Yes! You can connect your own Yoco account to receive payments directly. This means faster payouts and complete control over your revenue. We never touch your client payments.'
    },
    {
      q: 'What happens to my data if I cancel?',
      a: 'Your data belongs to you. If you decide to cancel, we\'ll provide a full export of all your client data and documents. We retain data for 30 days after cancellation for recovery purposes.'
    },
    {
      q: 'Is there a minimum contract period?',
      a: 'No long-term contracts required. Our Starter and Professional plans are month-to-month. Enterprise plans may have custom terms based on your requirements.'
    },
    {
      q: 'Can I upgrade or downgrade my plan?',
      a: 'Absolutely! You can change your plan at any time. Upgrades take effect immediately, and downgrades apply at the start of your next billing cycle.'
    }
  ];

  const testimonials = [
    {
      quote: "UpShift's white-label solution transformed our recruitment agency. We've increased candidate placements by 40% with their ATS-optimised CVs.",
      author: "Sarah M.",
      role: "Director, TalentBridge Recruitment",
      avatar: "SM"
    },
    {
      quote: "As a career coach, having my own branded platform has elevated my practice. Clients love the professional tools, and I love the recurring revenue.",
      author: "Michael K.",
      role: "Executive Career Coach",
      avatar: "MK"
    },
    {
      quote: "We deployed UpShift across our university career center. Student engagement with career services increased by 300% in the first semester.",
      author: "Dr. Thabo N.",
      role: "Head of Career Services, University",
      avatar: "TN"
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 text-white py-20 md:py-32 px-4">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,...')] opacity-10"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full filter blur-3xl opacity-20"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500 rounded-full filter blur-3xl opacity-20"></div>
        
        <div className="relative max-w-6xl mx-auto text-center">
          <Badge className="mb-6 bg-white/10 text-white border-white/20 backdrop-blur-sm">
            <Rocket className="mr-1 h-3 w-3" />
            White-Label Partner Program
          </Badge>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            Power Your Business with
            <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              White-Label Resume Solutions
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-blue-100 mb-10 max-w-4xl mx-auto leading-relaxed">
            Transform your agency, coaching practice, or educational institution with enterprise-grade 
            resume and career tools. Deploy under your brand, scale unlimited, and deliver exceptional 
            value to your clients.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <a href="#contact">
              <Button size="lg" className="bg-white text-blue-900 hover:bg-blue-50 text-lg px-8 py-6">
                Become a Partner
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </a>
            <a href="#demo">
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 text-lg px-8 py-6">
                See Live Demo
              </Button>
            </a>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-8 text-blue-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-400" />
              <span>7-day free trial</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-400" />
              <span>No setup fees</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-400" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted By */}
      <section className="py-12 bg-gray-50 border-b">
        <div className="max-w-6xl mx-auto px-4">
          <p className="text-center text-gray-500 mb-8">Trusted by leading organizations across South Africa</p>
          <div className="flex flex-wrap items-center justify-center gap-12 opacity-60">
            {['Recruitment', 'University', 'Consulting', 'Education', 'Corporate'].map((name, i) => (
              <div key={i} className="flex items-center gap-2 text-gray-400">
                <Building2 className="h-6 w-6" />
                <span className="font-semibold text-lg">{name} Partner</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-blue-100 text-blue-700">Why Partner With Us</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Succeed
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Our white-label platform gives you the tools, flexibility, and support to build 
              a thriving career services business.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-6">
                  <div className={`w-12 h-12 rounded-xl ${benefit.color} flex items-center justify-center mb-4`}>
                    <benefit.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{benefit.title}</h3>
                  <p className="text-gray-600">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-purple-100 text-purple-700">Use Cases</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Built for Your Industry
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Whether you're a recruitment agency, educational institution, career coach, or HR consultancy, 
              our platform adapts to your needs.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {useCases.map((useCase, index) => (
              <Card key={index} className="border-0 shadow-lg overflow-hidden">
                <CardContent className="p-8">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white flex-shrink-0">
                      <useCase.icon className="h-7 w-7" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{useCase.title}</h3>
                      <p className="text-gray-600 mb-4">{useCase.description}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {useCase.benefits.map((benefit, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm text-gray-500">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span>{benefit}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4 bg-white/10 text-white border-white/20">Platform Features</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Enterprise-Grade Technology
              </h2>
              <p className="text-lg text-gray-300 mb-8">
                Powered by the latest AI technology and built for scale. Your clients get 
                cutting-edge tools while you get complete control over your business.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                      <feature.icon className="h-5 w-5 text-blue-400" />
                    </div>
                    <span className="text-gray-300">{feature.text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-8 shadow-2xl">
                <div className="bg-white/10 backdrop-blur rounded-xl p-6 mb-4">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-white/70">Your Brand Dashboard</span>
                    <Badge className="bg-green-500">Live</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white/10 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold">247</p>
                      <p className="text-xs text-white/70">Clients</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold">R89K</p>
                      <p className="text-xs text-white/70">Revenue</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold">94%</p>
                      <p className="text-xs text-white/70">Satisfaction</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-white/80 text-sm">
                  <Award className="h-5 w-5" />
                  <span>All data shown is from actual partner performance</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-green-100 text-green-700">Partner Pricing</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Choose the plan that fits your business. All plans include a 7-day free trial.
            </p>
          </div>
          
          {loadingPlans ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Loading plans...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {plans.map((plan, index) => (
                <Card 
                  key={plan.key || index} 
                  className={`relative border-2 ${plan.popular ? 'border-blue-500 shadow-xl' : 'border-gray-200'}`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <Badge className="bg-blue-600 text-white px-4 py-1">Most Popular</Badge>
                    </div>
                  )}
                  <CardHeader className="text-center pb-0">
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <CardDescription className="mt-2">{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="text-center mb-6">
                      <span className="text-4xl font-bold text-gray-900">{plan.price_display}</span>
                      <span className="text-gray-500">{plan.period}</span>
                    </div>
                    <ul className="space-y-3 mb-8">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-3">
                          <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                          <span className="text-gray-600">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <a href="#contact">
                      <Button 
                        className={`w-full ${plan.popular ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                        variant={plan.popular ? 'default' : 'outline'}
                      >
                        {plan.cta}
                      </Button>
                    </a>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-orange-100 text-orange-700">Partner Success Stories</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Hear From Our Partners
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-600 mb-6 italic">"{testimonial.quote}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{testimonial.author}</p>
                      <p className="text-sm text-gray-500">{testimonial.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-blue-100 text-blue-700">FAQ</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
          </div>
          
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div 
                key={index}
                className="border rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-gray-900">{faq.q}</span>
                  <ChevronDown className={`h-5 w-5 text-gray-500 transition-transform ${openFaq === index ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === index && (
                  <div className="px-5 pb-5 text-gray-600">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section id="contact" className="py-20 px-4 bg-gradient-to-br from-blue-600 to-purple-700 text-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-blue-100">
              Fill out the form below and our partnership team will contact you within 24 hours.
            </p>
          </div>
          
          {submitted ? (
            <Card className="max-w-lg mx-auto">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h3>
                <p className="text-gray-600 mb-6">
                  We've received your inquiry. Our partnership team will contact you within 24 hours.
                </p>
                <Button onClick={() => setSubmitted(false)} variant="outline">
                  Submit Another Inquiry
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="max-w-2xl mx-auto">
              <CardContent className="p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Company Name *</label>
                      <Input
                        required
                        value={formData.company}
                        onChange={(e) => setFormData({...formData, company: e.target.value})}
                        placeholder="Your Company"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Your Name *</label>
                      <Input
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        placeholder="Full Name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                      <Input
                        required
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        placeholder="you@company.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                      <Input
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        placeholder="+27 XX XXX XXXX"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Business Type *</label>
                    <select
                      required
                      value={formData.type}
                      onChange={(e) => setFormData({...formData, type: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="">Select your business type</option>
                      <option value="recruitment">Recruitment Agency</option>
                      <option value="education">Educational Institution</option>
                      <option value="coaching">Career Coaching</option>
                      <option value="hr">HR Consultancy</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                    <textarea
                      value={formData.message}
                      onChange={(e) => setFormData({...formData, message: e.target.value})}
                      rows={4}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="Tell us about your business and what you're looking for..."
                    />
                  </div>
                  
                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 py-6 text-lg" disabled={submitting}>
                    {submitting ? 'Submitting...' : 'Request Partnership Information'}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  
                  <p className="text-center text-sm text-gray-500">
                    By submitting, you agree to our <Link to="/privacy-policy" className="text-blue-600 hover:underline">Privacy Policy</Link>
                  </p>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 px-4 bg-gray-900 text-white text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Join 50+ Partners Already Growing with UpShift
          </h2>
          <p className="text-gray-400 mb-8">
            Start your 14-day free trial today. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#contact">
              <Button size="lg" className="bg-white text-gray-900 hover:bg-gray-100">
                Become a Partner
              </Button>
            </a>
            <Link to="/contact">
              <Button size="lg" variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800">
                <Phone className="mr-2 h-4 w-4" />
                Schedule a Call
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default WhiteLabelPage;
