import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useToast } from '../hooks/use-toast';
import { Badge } from '../components/ui/badge';
import { Sparkles, Eye, FileText, X, ZoomIn, ZoomOut, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';

// Fallback data in case API fails
import { coverLetterTemplates as fallbackTemplates } from '../mockData';

const CoverLetterTemplateCard = ({ template, onSelect }) => {
  const [showPreview, setShowPreview] = useState(false);
  const [zoom, setZoom] = useState(1);

  const handlePreview = (e) => {
    e.stopPropagation();
    setShowPreview(true);
    setZoom(1);
  };

  return (
    <>
      <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-gray-200">
        <div className="relative aspect-[3/4] overflow-hidden bg-gray-100 group">
          <img
            src={template.image}
            alt={template.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              e.target.src = 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=400&h=600&fit=crop';
            }}
          />
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center">
            <Button
              onClick={handlePreview}
              className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white text-gray-900 hover:bg-gray-100"
              size="sm"
            >
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Button>
          </div>
        </div>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <CardTitle className="text-base">{template.name}</CardTitle>
            <Badge variant="secondary" className="text-xs">
              {template.industry}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pb-3">
          <CardDescription className="text-sm line-clamp-2">
            {template.description}
          </CardDescription>
          <div className="mt-2">
            <span className="text-xs text-gray-500">Tone: </span>
            <span className="text-xs font-medium text-purple-600">{template.tone}</span>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={() => onSelect(template)}
            variant="outline"
            className="w-full border-purple-600 text-purple-600 hover:bg-purple-50"
            size="sm"
          >
            <FileText className="mr-2 h-4 w-4" />
            Use Template
          </Button>
        </CardFooter>
      </Card>

      {/* Preview Modal */}
      {showPreview && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 p-4"
          onClick={() => setShowPreview(false)}
        >
          <div 
            className="relative max-w-4xl w-full max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between bg-white rounded-t-lg px-4 py-3 border-b">
              <div>
                <h3 className="font-semibold text-lg">{template.name}</h3>
                <p className="text-sm text-gray-500">{template.industry} • {template.tone} tone</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))} disabled={zoom <= 0.5}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm text-gray-600 w-16 text-center">{Math.round(zoom * 100)}%</span>
                <Button variant="outline" size="sm" onClick={() => setZoom(z => Math.min(z + 0.25, 3))} disabled={zoom >= 3}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowPreview(false)} className="ml-2">
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-gray-100 flex items-center justify-center p-4">
              <img
                src={template.image}
                alt={template.name}
                className="max-w-full h-auto shadow-2xl rounded transition-transform duration-200"
                style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
              />
            </div>
            <div className="bg-white rounded-b-lg px-4 py-3 border-t flex items-center justify-between">
              <p className="text-sm text-gray-600 max-w-md line-clamp-1">{template.description}</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowPreview(false)}>Close</Button>
                <Button
                  onClick={() => { setShowPreview(false); onSelect(template); }}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Use This Template
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const CoverLetterTemplates = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Fetch templates from API
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await fetch(
          `${process.env.REACT_APP_BACKEND_URL}/api/content/cover-letter-templates`
        );
        if (response.ok) {
          const data = await response.json();
          if (data.templates && data.templates.length > 0) {
            setTemplates(data.templates);
          } else {
            setTemplates(fallbackTemplates);
          }
        } else {
          setTemplates(fallbackTemplates);
        }
      } catch (error) {
        console.error('Error fetching cover letter templates:', error);
        setTemplates(fallbackTemplates);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  const filteredTemplates =
    selectedCategory === 'all'
      ? templates
      : templates.filter((template) => template.category === selectedCategory);

  const handleSelectTemplate = (template) => {
    // Store the selected template in localStorage
    localStorage.setItem('selectedCoverLetterTemplate', JSON.stringify(template));
    
    // Check if user is logged in
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to start creating your cover letter with this template.",
      });
      navigate('/login', { state: { from: '/cover-letter', template: template.id } });
      return;
    }

    // Check if user has tier 2 or 3 (cover letter requires higher tier)
    if (!user.active_tier || !['tier-2', 'tier-3'].includes(user.active_tier)) {
      toast({
        title: "Template Selected!",
        description: `${template.name} selected. Upgrade to Professional Package to create cover letters.`,
      });
      navigate('/pricing', { state: { template: template.id, type: 'cover-letter' } });
      return;
    }

    // User is logged in and has a plan - go to cover letter generator
    toast({
      title: "Template Selected!",
      description: `Starting cover letter with ${template.name}`,
    });
    navigate('/cover-letter');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 py-12 px-4 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white border-none">
            <Sparkles className="mr-1 h-3 w-3" />
            Cover Letter Templates
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Choose Your Cover Letter Template
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Professional cover letter templates crafted for the South African job market
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
            </TabsList>
          </Tabs>
        </div>

        {/* Template Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredTemplates.map((template) => (
            <CoverLetterTemplateCard
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

        {/* Info Section */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <Sparkles className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">AI-Powered Content</h3>
            <p className="text-gray-600 text-sm">
              Our AI generates personalized content that matches the job description and highlights your strengths.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mb-4">
              <FileText className="h-6 w-6 text-pink-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Industry-Specific Tones</h3>
            <p className="text-gray-600 text-sm">
              Each template is crafted with the appropriate tone for its target industry.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <Eye className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Professional Formatting</h3>
            <p className="text-gray-600 text-sm">
              All templates follow best practices for cover letter formatting and structure.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoverLetterTemplates;
