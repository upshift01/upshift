import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePartner } from '../../context/PartnerContext';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { FileText, Download, Eye, Star, Briefcase, GraduationCap, Palette, ArrowRight } from 'lucide-react';

const PartnerCVTemplates = () => {
  const { brandName, primaryColor, secondaryColor, baseUrl } = usePartner();
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', name: 'All Templates', icon: FileText },
    { id: 'professional', name: 'Professional', icon: Briefcase },
    { id: 'creative', name: 'Creative', icon: Palette },
    { id: 'academic', name: 'Academic', icon: GraduationCap },
  ];

  const templates = [
    {
      id: 1,
      name: 'Executive Pro',
      category: 'professional',
      description: 'Clean, modern design perfect for corporate roles',
      popular: true,
      features: ['ATS-Optimized', '2-Column Layout', 'Skills Chart']
    },
    {
      id: 2,
      name: 'Modern Minimal',
      category: 'professional',
      description: 'Simple and elegant with focus on content',
      popular: true,
      features: ['ATS-Friendly', 'Single Column', 'Timeline View']
    },
    {
      id: 3,
      name: 'Creative Portfolio',
      category: 'creative',
      description: 'Stand out with a unique visual design',
      popular: false,
      features: ['Portfolio Section', 'Custom Colors', 'Icon Set']
    },
    {
      id: 4,
      name: 'Tech Developer',
      category: 'professional',
      description: 'Showcase your technical skills effectively',
      popular: true,
      features: ['Skills Badges', 'Project Section', 'GitHub Link']
    },
    {
      id: 5,
      name: 'Academic CV',
      category: 'academic',
      description: 'Ideal for researchers and academics',
      popular: false,
      features: ['Publications', 'Research Focus', 'Multi-Page']
    },
    {
      id: 6,
      name: 'Fresh Graduate',
      category: 'professional',
      description: 'Perfect for entry-level candidates',
      popular: true,
      features: ['Education Focus', 'Skills First', 'Internships']
    },
    {
      id: 7,
      name: 'Designer Studio',
      category: 'creative',
      description: 'Colorful and bold for creative industries',
      popular: false,
      features: ['Visual Heavy', 'Custom Icons', 'Portfolio Grid']
    },
    {
      id: 8,
      name: 'Corporate Classic',
      category: 'professional',
      description: 'Traditional format trusted by HR teams',
      popular: true,
      features: ['Classic Layout', 'ATS-Optimized', 'References']
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
            <FileText className="mr-1 h-3 w-3" />
            {templates.length}+ Templates
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            CV Templates
          </h1>
          <p className="text-lg text-white/80">
            Professional, ATS-friendly templates to help you land your dream job
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
                <FileText className="h-16 w-16" style={{ color: primaryColor }} />
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
                  <Link to={`${baseUrl}/cv-builder`} className="flex-1">
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
          <h2 className="text-2xl font-bold text-white mb-4">Ready to Build Your CV?</h2>
          <p className="text-white/80 mb-6">Choose a template and start creating your professional CV today</p>
          <Link to={`${baseUrl}/cv-builder`}>
            <Button size="lg" className="bg-white text-gray-900 hover:bg-gray-100">
              Start Building <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PartnerCVTemplates;
