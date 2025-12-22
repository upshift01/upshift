import React from 'react';
import * as Icons from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

const FeatureCard = ({ feature }) => {
  const IconComponent = Icons[feature.icon] || Icons.Sparkles;
  
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
    teal: 'bg-teal-100 text-teal-600',
    pink: 'bg-pink-100 text-pink-600'
  };

  return (
    <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-gray-200">
      <CardHeader>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-3 ${colorClasses[feature.color] || colorClasses.blue}`}>
          <IconComponent className="h-6 w-6" />
        </div>
        <CardTitle className="text-lg">{feature.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-sm">
          {feature.description}
        </CardDescription>
      </CardContent>
    </Card>
  );
};

export default FeatureCard;