import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Star, CheckCircle2, Sparkles, Zap } from 'lucide-react';
import { Button } from '../components/ui/button';
import FeatureCard from '../components/FeatureCard';
import { features, testimonials, sampleImprovements } from '../mockData';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';

const Home = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 px-4">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 opacity-70"></div>
        <div className="relative max-w-6xl mx-auto text-center">
          <Badge className="mb-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white border-none">
            <Sparkles className="mr-1 h-3 w-3" />
            AI-Powered CV Solutions for South Africa
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Transform Your Career with
            <span className="block bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              AI-Powered Resumes
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            UpShift helps South African job seekers create professional, ATS-optimised CVs 
            and cover letters that stand out in today's competitive market.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/pricing">
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-lg px-8">
                View Pricing & Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/templates">
              <Button size="lg" variant="outline" className="text-lg px-8 border-2 border-gray-300 hover:border-blue-600 hover:text-blue-600">
                View Templates
              </Button>
            </Link>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                10,000+
              </div>
              <div className="text-gray-600 mt-2">CVs Created</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                85%
              </div>
              <div className="text-gray-600 mt-2">Interview Success Rate</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
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
            <Badge className="mb-4 bg-blue-100 text-blue-600 border-blue-200">
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
      <section className="py-20 px-4 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white border-none">
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
                      <ArrowRight className="h-6 w-6 text-blue-600" />
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
              Join thousands who have transformed their careers with UpShift
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
            {testimonials.slice(3, 12).map((testimonial) => (
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
          <div className="mt-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-3xl md:text-4xl font-bold">10,000+</div>
                <div className="text-blue-100 text-sm mt-1">CVs Created</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold">85%</div>
                <div className="text-blue-100 text-sm mt-1">Interview Rate</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold">4.9★</div>
                <div className="text-blue-100 text-sm mt-1">User Rating</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold">48hrs</div>
                <div className="text-blue-100 text-sm mt-1">Avg. Response Time</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-gray-600">
              Everything you need to know about UpShift's CV and career services
            </p>
          </div>
          
          <div className="space-y-4">
            {/* ATS Questions */}
            <details className="group bg-gray-50 rounded-xl overflow-hidden">
              <summary className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-100 transition-colors">
                <h3 className="font-semibold text-gray-900">What is ATS and why is it important?</h3>
                <span className="text-gray-500 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="px-5 pb-5 text-gray-600">
                ATS (Applicant Tracking System) is software used by over 90% of large companies in South Africa to automatically scan and filter CVs before a human recruiter sees them. If your CV isn't ATS-optimised, it may never reach a hiring manager—even if you're perfectly qualified. Our AI ensures your CV passes these systems.
              </div>
            </details>

            <details className="group bg-gray-50 rounded-xl overflow-hidden">
              <summary className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-100 transition-colors">
                <h3 className="font-semibold text-gray-900">How does the free ATS checker work?</h3>
                <span className="text-gray-500 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="px-5 pb-5 text-gray-600">
                Simply upload your CV and our AI analyses it against common ATS requirements. You'll receive a compatibility score (0-100) and specific recommendations to improve your CV's chances of passing automated screening systems. The basic check is completely free!
              </div>
            </details>

            <details className="group bg-gray-50 rounded-xl overflow-hidden">
              <summary className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-100 transition-colors">
                <h3 className="font-semibold text-gray-900">How long does it take to create a CV with UpShift?</h3>
                <span className="text-gray-500 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="px-5 pb-5 text-gray-600">
                With our AI-powered tools, you can create a professional, ATS-optimized CV in as little as 15-30 minutes. Our pre-built templates and intelligent suggestions make the process quick and easy—no design skills required.
              </div>
            </details>

            <details className="group bg-gray-50 rounded-xl overflow-hidden">
              <summary className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-100 transition-colors">
                <h3 className="font-semibold text-gray-900">What file formats can I download my CV in?</h3>
                <span className="text-gray-500 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="px-5 pb-5 text-gray-600">
                You can download your CV in PDF, Word (DOCX), and plain text formats. PDF is recommended for most job applications as it preserves formatting across all devices. Word format is useful when recruiters specifically request it.
              </div>
            </details>

            <details className="group bg-gray-50 rounded-xl overflow-hidden">
              <summary className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-100 transition-colors">
                <h3 className="font-semibold text-gray-900">What's the difference between your pricing plans?</h3>
                <span className="text-gray-500 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="px-5 pb-5 text-gray-600">
                <strong>ATS Optimize (R899):</strong> Professional CV rewrite, tailored cover letter, and full ATS optimization.<br/><br/>
                <strong>Professional Package (R1,500):</strong> Everything in ATS Optimize plus LinkedIn profile review and interview preparation materials.<br/><br/>
                <strong>Executive Elite (R3,000):</strong> Our premium service with 1-on-1 consultation, unlimited revisions, priority support, and 12-hour turnaround.
              </div>
            </details>

            <details className="group bg-gray-50 rounded-xl overflow-hidden">
              <summary className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-100 transition-colors">
                <h3 className="font-semibold text-gray-900">Can I use my LinkedIn profile to create a CV?</h3>
                <span className="text-gray-500 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="px-5 pb-5 text-gray-600">
                Yes! Our AI-powered LinkedIn tools can instantly convert your LinkedIn profile into a professionally formatted CV. You can also use our tools to create a new LinkedIn profile from scratch or enhance your existing one with AI-generated improvements.
              </div>
            </details>

            <details className="group bg-gray-50 rounded-xl overflow-hidden">
              <summary className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-100 transition-colors">
                <h3 className="font-semibold text-gray-900">Do you offer a money-back guarantee?</h3>
                <span className="text-gray-500 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="px-5 pb-5 text-gray-600">
                Absolutely! We offer a 7-day money-back guarantee on all our services. If you're not completely satisfied with your CV or cover letter, contact us within 7 days for a full refund—no questions asked.
              </div>
            </details>

            <details className="group bg-gray-50 rounded-xl overflow-hidden">
              <summary className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-100 transition-colors">
                <h3 className="font-semibold text-gray-900">What payment methods do you accept?</h3>
                <span className="text-gray-500 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="px-5 pb-5 text-gray-600">
                We accept all major South African credit and debit cards through Yoco, our trusted payment partner. This includes Visa, Mastercard, and local bank cards. For enterprise clients, we also offer EFT payment options.
              </div>
            </details>

            <details className="group bg-gray-50 rounded-xl overflow-hidden">
              <summary className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-100 transition-colors">
                <h3 className="font-semibold text-gray-900">Is my personal information secure?</h3>
                <span className="text-gray-500 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="px-5 pb-5 text-gray-600">
                Your privacy and security are our top priorities. We use industry-standard SSL encryption to protect all data transfers. Your personal information and documents are stored securely and are never shared with third parties. You can delete your data at any time from your account settings.
              </div>
            </details>

            <details className="group bg-gray-50 rounded-xl overflow-hidden">
              <summary className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-100 transition-colors">
                <h3 className="font-semibold text-gray-900">Do you offer services for businesses?</h3>
                <span className="text-gray-500 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="px-5 pb-5 text-gray-600">
                Yes! We offer white-label solutions for recruitment agencies, HR departments, career centers, and educational institutions. Our reseller program allows you to brand our platform as your own with custom pricing. Contact us at support@upshift.works to learn about partnership opportunities.
              </div>
            </details>
          </div>

          <div className="text-center mt-10">
            <p className="text-gray-600 mb-4">Still have questions?</p>
            <Link to="/contact">
              <Button variant="outline" className="border-2">
                Contact Our Support Team
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Ready to UpShift Your Career?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Join thousands of South Africans who have landed their dream jobs with AI-powered CVs
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/ats-checker">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8">
                Free ATS Checker
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
          
          <div className="mt-8 flex items-center justify-center space-x-6 text-white/80 text-sm">
            <div className="flex items-center">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Professional service
            </div>
            <div className="flex items-center">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              ATS-optimized
            </div>
            <div className="flex items-center">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Expert AI assistance
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
