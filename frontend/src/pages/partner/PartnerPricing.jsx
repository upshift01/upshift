import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePartner } from '../../context/PartnerContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Check, Zap, ArrowRight, Loader2 } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const PartnerPricing = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, getAuthHeader } = useAuth();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const { 
    brandName, 
    primaryColor, 
    secondaryColor, 
    baseUrl,
    pricing,
    resellerId
  } = usePartner();

  const tiers = [
    {
      id: 'tier-1',
      name: 'ATS Optimise',
      price: pricing?.tier_1_price || 899,
      description: 'Perfect for job seekers who want an ATS-friendly CV',
      features: [
        'Professional CV rewrite',
        'ATS optimisation',
        'Cover letter included',
        'Keyword optimisation',
        '1 revision round',
        '48hr turnaround'
      ],
      popular: false
    },
    {
      id: 'tier-2',
      name: 'Professional Package',
      price: pricing?.tier_2_price || 1500,
      description: 'Complete career package for serious job seekers',
      features: [
        'Everything in ATS Optimise',
        'LinkedIn profile review',
        'Interview preparation guide',
        'Skills gap analysis',
        '3 revision rounds',
        '24hr priority turnaround'
      ],
      popular: true
    },
    {
      id: 'tier-3',
      name: 'Executive Elite',
      price: pricing?.tier_3_price || 3000,
      description: 'Premium service for executives and senior professionals',
      features: [
        'Everything in Professional',
        '1-on-1 consultation call',
        'Executive biography',
        'Board CV format',
        'Unlimited revisions',
        'Dedicated account manager'
      ],
      popular: false
    }
  ];

  const formatPrice = (price) => {
    return `R${price.toLocaleString()}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section 
        className="py-16"
        style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="mb-4 bg-white/20 text-white border-none">
            <Zap className="mr-1 h-3 w-3" />
            Professional Services
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Choose Your Path to Success
          </h1>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            Professional career services at competitive prices. One-time payment, lifetime value.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16 -mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            {tiers.map((tier) => (
              <Card 
                key={tier.id}
                className={`relative overflow-hidden transition-all hover:shadow-xl ${
                  tier.popular ? 'ring-2 shadow-lg scale-105' : ''
                }`}
                style={tier.popular ? { ringColor: primaryColor } : {}}
              >
                {tier.popular && (
                  <div 
                    className="absolute top-0 right-0 text-white text-xs font-bold px-3 py-1 rounded-bl-lg"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Most Popular
                  </div>
                )}
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl">{tier.name}</CardTitle>
                  <p className="text-gray-600 text-sm mt-1">{tier.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <span 
                      className="text-4xl font-bold"
                      style={{ color: primaryColor }}
                    >
                      {formatPrice(tier.price)}
                    </span>
                    <span className="text-gray-500 ml-1">once-off</span>
                  </div>
                  
                  <ul className="space-y-3 mb-6">
                    {tier.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check 
                          className="h-5 w-5 mt-0.5 flex-shrink-0" 
                          style={{ color: primaryColor }}
                        />
                        <span className="text-gray-600 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Link to={`${baseUrl}/register?tier=${tier.id}`}>
                    <Button 
                      className="w-full"
                      style={tier.popular ? { backgroundColor: primaryColor } : {}}
                      variant={tier.popular ? 'default' : 'outline'}
                    >
                      Get Started
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Money Back Guarantee */}
      <section className="py-12 bg-white border-t">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">100% Satisfaction Guarantee</h3>
          <p className="text-gray-600">
            Not happy with your CV? We offer a 7-day money-back guarantee. If you're not completely 
            satisfied with our work, we'll refund your payment in full - no questions asked.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section 
        className="py-16"
        style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Not Sure Which Package to Choose?
          </h2>
          <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
            Try our free ATS checker first to see how your current CV performs.
          </p>
          <Link to={`${baseUrl}/ats-checker`}>
            <Button size="lg" className="bg-white text-gray-900 hover:bg-gray-100">
              Free ATS Check
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default PartnerPricing;
