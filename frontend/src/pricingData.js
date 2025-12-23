// Pricing tiers for UpShift services

export const pricingTiers = [
  {
    id: 'tier-1',
    name: 'ATS Optimise',
    price: 899,
    priceCents: 89900,
    description: 'Perfect for job seekers who already have a CV',
    features: [
      'ATS-optimised CV review',
      'AI-powered CV cleanup and enhancement',
      'Keyword optimisation for South African market',
      'Professional formatting',
      'ATS compatibility check',
      'PDF download',
      'One revision included'
    ],
    popular: false,
    turnaround: '24 hours',
    support: 'Email support'
  },
  {
    id: 'tier-2',
    name: 'Professional Package',
    price: 1500,
    priceCents: 150000,
    description: 'Complete career toolkit for serious job seekers',
    features: [
      'Everything in ATS Optimize',
      'AI-driven CV creation from scratch',
      'Professional cover letter generation',
      'LinkedIn profile optimization suggestions',
      'Industry-specific keyword targeting',
      'Multiple CV format options',
      'Unlimited revisions (7 days)',
      'Priority processing'
    ],
    popular: true,
    turnaround: '48 hours',
    support: 'Email & WhatsApp support',
    badge: 'Most Popular'
  },
  {
    id: 'tier-3',
    name: 'Executive Elite',
    price: 3000,
    priceCents: 300000,
    description: 'Premium service with personalized career strategy',
    features: [
      'Everything in Professional Package',
      '30-minute career strategy call with expert',
      '12-hour turnaround time',
      '30 days of dedicated support',
      'Job application strategy guidance',
      'Interview preparation tips',
      'LinkedIn profile rewrite',
      'Unlimited revisions (30 days)',
      'Priority WhatsApp support line'
    ],
    popular: false,
    turnaround: '12 hours',
    support: 'Priority WhatsApp & Phone support',
    badge: 'Best Value'
  }
];