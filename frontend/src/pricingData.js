// Pricing tiers for UpShift services
// ALL PRICES ARE STORED IN CENTS (e.g., 89900 = R899)

export const pricingTiers = [
  {
    id: 'tier-1',
    name: 'ATS Optimise',
    price: 89900,  // R899 in cents
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
    price: 150000,  // R1500 in cents
    description: 'Complete career toolkit for serious job seekers',
    features: [
      'Everything in ATS Optimise',
      'AI-driven CV creation from scratch',
      'Professional cover letter generation',
      'LinkedIn profile optimisation suggestions',
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
    price: 300000,  // R3000 in cents
    description: 'Premium service with personalised career strategy',
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

// Helper function to convert cents to Rands for display
export const formatPriceFromCents = (cents) => {
  const rands = Math.round(cents / 100);
  return `R${rands.toLocaleString()}`;
};