import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePartner } from '../../context/PartnerContext';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { FileText, Star, Briefcase, Sparkles, GraduationCap, Users, ArrowRight, Mail } from 'lucide-react';

const PartnerCoverLetterTemplates = () => {
  const { brandName, primaryColor, secondaryColor, baseUrl } = usePartner();
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', name: 'All Templates', icon: Mail },
    { id: 'professional', name: 'Professional', icon: Briefcase },
    { id: 'entry-level', name: 'Entry Level', icon: GraduationCap },
    { id: 'career-change', name: 'Career Change', icon: Users },
  ];

  const templates = [
    {
      id: 1,
      name: 'Professional Standard',
      category: 'professional',
      description: 'Traditional format suitable for most industries',
      popular: true,
      features: ['Formal Tone', 'Classic Structure', 'Achievement Focus']
    },
    {
      id: 2,
      name: 'Modern Executive',
      category: 'professional',
      description: 'Polished design for senior-level positions',
      popular: true,
      features: ['Leadership Focus', 'Results-Driven', 'Executive Style']
    },
    {
      id: 3,
      name: 'Fresh Graduate',
      category: 'entry-level',
      description: 'Perfect for those starting their career',
      popular: true,
      features: ['Education Highlight', 'Enthusiasm', 'Transferable Skills']
    },
    {
      id: 4,
      name: 'Career Transition',
      category: 'career-change',
      description: 'Highlight transferable skills and new direction',
      popular: false,
      features: ['Skills Bridge', 'Story-Based', 'Motivation Clear']
    },
    {
      id: 5,
      name: 'Tech Industry',
      category: 'professional',
      description: 'Technical focus with project highlights',
      popular: true,
      features: ['Technical Skills', 'Project Examples', 'Modern Tone']
    },
    {
      id: 6,
      name: 'Creative Professional',
      category: 'professional',
      description: 'Show personality while staying professional',
      popular: false,
      features: ['Creative Flair', 'Portfolio Links', 'Engaging Style']
    },
    {
      id: 7,
      name: 'Internship Application',
      category: 'entry-level',
      description: 'Ideal for students seeking internships',
      popular: false,
      features: ['Academic Focus', 'Eager to Learn', 'Relevant Courses']
    },
    {
      id: 8,
      name: 'Return to Work',
      category: 'career-change',
      description: 'Re-entering the workforce after a break',
      popular: false,
      features: ['Gap Explanation', 'Updated Skills', 'Fresh Start']
    },
  ];

  const filteredTemplates = selectedCategory === 'all' 
    ? templates 
    : templates.filter(t => t.category === selectedCategory);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section 
        className="py-12"
        style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
      >
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Badge className="mb-4 bg-white/20 text-white border-none">
            <Mail className="mr-1 h-3 w-3" />
            {templates.length}+ Templates
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Cover Letter Templates
          </h1>
          <p className="text-lg text-white/80">
            Professional templates to complement your CV and impress employers
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 mb-8 justify-center">
          {categories.map((cat) => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? 'default' : 'outline'}
              onClick={() => setSelectedCategory(cat.id)}
              style={selectedCategory === cat.id ? { backgroundColor: primaryColor } : {}}
            >
              <cat.icon className="h-4 w-4 mr-2" />
              {cat.name}
            </Button>
          ))}
        </div>

        {/* Templates Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div 
                className="h-40 flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${primaryColor}15, ${secondaryColor}15)` }}
              >
                <Mail className="h-16 w-16" style={{ color: primaryColor }} />
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-lg">{template.name}</h3>
                  {template.popular && (
                    <Badge className="bg-amber-100 text-amber-700">
                      <Star className="h-3 w-3 mr-1" /> Popular
                    </Badge>
                  )}
                </div>
                <p className="text-gray-600 text-sm mb-3">{template.description}</p>
                <div className="flex flex-wrap gap-1 mb-4">
                  {template.features.map((feature, i) => (
                    <Badge key={i} variant="outline" className="text-xs">{feature}</Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Link to={`${baseUrl}/cover-letter`} className="flex-1">
                    <Button 
                      className="w-full" 
                      size="sm"
                      style={{ backgroundColor: primaryColor }}
                    >
                      Use Template
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA Section */}
        <div 
          className="mt-12 rounded-xl p-8 text-center"
          style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
        >
          <h2 className="text-2xl font-bold text-white mb-4">Create Your Cover Letter</h2>
          <p className="text-white/80 mb-6">Use our AI-powered tool to generate a personalized cover letter in seconds</p>
          <Link to={`${baseUrl}/cover-letter`}>
            <Button size="lg" className="bg-white text-gray-900 hover:bg-gray-100">
              <Sparkles className="mr-2 h-4 w-4" /> Generate Cover Letter
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PartnerCoverLetterTemplates;
