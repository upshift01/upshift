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
            UpShift helps South African job seekers create professional, ATS-optimized CVs 
            and cover letters that stand out in today's competitive market.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/builder">
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-lg px-8">
                Start Building Your CV
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/improve">
              <Button size="lg" variant="outline" className="text-lg px-8 border-2 border-gray-300 hover:border-blue-600 hover:text-blue-600">
                Improve Existing CV
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
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Trusted by Job Seekers Across South Africa
            </h2>
            <p className="text-xl text-gray-600">
              See what our users have to say about their success stories
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial) => (
              <Card key={testimonial.id} className="border-gray-200">
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
            <Link to="/builder">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8">
                Get Started for Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
          
          <div className="mt-8 flex items-center justify-center space-x-6 text-white/80 text-sm">
            <div className="flex items-center">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              No credit card required
            </div>
            <div className="flex items-center">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Free templates
            </div>
            <div className="flex items-center">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Export to PDF
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
