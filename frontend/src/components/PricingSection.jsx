import React, { useState } from 'react';
import { Check, Zap, Crown, Star } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { pricingTiers } from '../pricingData';

const PricingCard = ({ tier, onSelect, isSelected }) => {
  const IconComponent = tier.id === 'tier-1' ? Zap : tier.id === 'tier-2' ? Star : Crown;
  
  return (
    <Card 
      className={`relative overflow-hidden transition-all duration-300 ${
        isSelected 
          ? 'ring-2 ring-blue-600 shadow-2xl scale-105' 
          : tier.popular 
          ? 'border-2 border-blue-600 shadow-lg' 
          : 'hover:shadow-lg hover:scale-102'
      }`}
    >
      {tier.badge && (
        <div className="absolute top-0 right-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1 text-xs font-bold rounded-bl-lg">
          {tier.badge}
        </div>
      )}
      
      <CardHeader className="text-center pb-4">
        <div className="flex justify-center mb-4">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
            tier.id === 'tier-1' ? 'bg-blue-100' :
            tier.id === 'tier-2' ? 'bg-purple-100' :
            'bg-gradient-to-br from-yellow-100 to-orange-100'
          }`}>
            <IconComponent className={`h-8 w-8 ${
              tier.id === 'tier-1' ? 'text-blue-600' :
              tier.id === 'tier-2' ? 'text-purple-600' :
              'text-orange-600'
            }`} />
          </div>
        </div>
        <CardTitle className="text-2xl mb-2">{tier.name}</CardTitle>
        <div className="mt-4">
          <span className="text-4xl font-bold text-gray-900">R{tier.price}</span>
          <span className="text-gray-600 text-sm ml-1">once-off</span>
        </div>
        <CardDescription className="mt-3 text-base">
          {tier.description}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4 pb-6">
        <div className="space-y-2">
          {tier.features.map((feature, index) => (
            <div key={index} className="flex items-start space-x-3">
              <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-gray-700">{feature}</span>
            </div>
          ))}
        </div>
        
        <div className="pt-4 border-t border-gray-200 space-y-2">
          {tier.id === 'tier-3' && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Turnaround:</span>
              <span className="font-semibold text-gray-900">{tier.turnaround}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Support:</span>
            <span className="font-semibold text-gray-900">{tier.support}</span>
          </div>
        </div>
      </CardContent>
      
      <CardFooter>
        <Button
          onClick={() => onSelect(tier)}
          className={`w-full ${
            tier.popular
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
              : tier.id === 'tier-3'
              ? 'bg-gradient-to-r from-orange-600 to-yellow-600 hover:from-orange-700 hover:to-yellow-700'
              : 'bg-blue-600 hover:bg-blue-700'
          } text-white`}
          size="lg"
        >
          {isSelected ? 'Selected' : 'Choose Plan'}
        </Button>
      </CardFooter>
    </Card>
  );
};

const PricingSection = ({ onTierSelect }) => {
  const [selectedTier, setSelectedTier] = useState(null);

  const handleSelect = (tier) => {
    setSelectedTier(tier.id);
    onTierSelect(tier);
  };

  return (
    <div className="py-12 px-4 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white border-none">
            <Zap className="mr-1 h-3 w-3" />
            Professional Service Packages
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Choose Your Career Upgrade
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            One-time payment for professional AI-powered career documents tailored for the South African job market
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {pricingTiers.map((tier) => (
            <PricingCard
              key={tier.id}
              tier={tier}
              onSelect={handleSelect}
              isSelected={selectedTier === tier.id}
            />
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-gray-600">
            All prices in South African Rand (ZAR). Secure payment powered by Yoco.
          </p>
          <p className="text-xs text-gray-500 mt-2">
            VAT included where applicable. Money-back guarantee if not satisfied.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PricingSection;