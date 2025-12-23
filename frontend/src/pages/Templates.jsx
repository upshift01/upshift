import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cvTemplates } from '../mockData';
import TemplateCard from '../components/TemplateCard';
import { Button } from '../components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useToast } from '../hooks/use-toast';
import { Badge } from '../components/ui/badge';
import { Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Templates = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  const filteredTemplates =
    selectedCategory === 'all'
      ? cvTemplates
      : cvTemplates.filter((template) => template.category === selectedCategory);

  const handleSelectTemplate = (template) => {
    // Store the selected template in localStorage
    localStorage.setItem('selectedTemplate', JSON.stringify(template));
    
    // Check if user is logged in
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to start building your CV with this template.",
      });
      navigate('/login', { state: { from: '/builder', template: template.id } });
      return;
    }

    // Check if user has an active tier
    if (!user.active_tier) {
      toast({
        title: "Template Selected!",
        description: `${template.name} selected. Choose a plan to start building your CV.`,
      });
      navigate('/pricing', { state: { template: template.id } });
      return;
    }

    // User is logged in and has a plan - go to builder
    toast({
      title: "Template Selected!",
      description: `Starting CV builder with ${template.name}`,
    });
    navigate('/builder');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white border-none">
            <Sparkles className="mr-1 h-3 w-3" />
            Professional Templates
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Choose Your Perfect CV Template
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Professionally designed templates optimised for South African employers and ATS systems
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="mb-8 flex justify-center">
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="bg-gray-100">
              <TabsTrigger value="all">All Templates</TabsTrigger>
              <TabsTrigger value="professional">Professional</TabsTrigger>
              <TabsTrigger value="modern">Modern</TabsTrigger>
              <TabsTrigger value="creative">Creative</TabsTrigger>
              <TabsTrigger value="ats">ATS-Optimised</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Template Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onSelect={handleSelectTemplate}
            />
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No templates found in this category.</p>
          </div>
        )}

        {/* Template Info Section */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <Sparkles className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">ATS-Friendly</h3>
            <p className="text-gray-600 text-sm">
              All templates are optimised to pass Applicant Tracking Systems used by major South African companies.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <Sparkles className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Easy to Customise</h3>
            <p className="text-gray-600 text-sm">
              Simply select a template and fill in your information. Our AI will help you write compelling content.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <Sparkles className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Industry Specific</h3>
            <p className="text-gray-600 text-sm">
              Templates tailored for South Africa's key industries including mining, tech, finance, and more.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Templates;