import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { useToast } from '../../hooks/use-toast';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';
import { Sparkles, Loader2, Eye, Download, X, ZoomIn, ZoomOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePartner } from '../../context/PartnerContext';

// Fallback data in case API fails
import { cvTemplates as fallbackTemplates } from '../../mockData';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// Template Card Component with partner branding
const PartnerTemplateCard = ({ template, onSelect, primaryColor }) => {
  const [showPreview, setShowPreview] = useState(false);
  const [zoom, setZoom] = useState(1);

  const handlePreview = (e) => {
    e.stopPropagation();
    setShowPreview(true);
    setZoom(1);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleClosePreview = () => {
    setShowPreview(false);
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
        </CardContent>
        <CardFooter>
          <Button
            onClick={() => onSelect(template)}
            variant="outline"
            className="w-full"
            size="sm"
            style={{ borderColor: primaryColor, color: primaryColor }}
          >
            <Download className="mr-2 h-4 w-4" />
            Use Template
          </Button>
        </CardFooter>
      </Card>

      {/* Preview Modal */}
      {showPreview && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 p-4"
          onClick={handleClosePreview}
        >
          <div 
            className="relative max-w-4xl w-full max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between bg-white rounded-t-lg px-4 py-3 border-b">
              <div>
                <h3 className="font-semibold text-lg">{template.name}</h3>
                <p className="text-sm text-gray-500">{template.industry} • {template.category}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleZoomOut} disabled={zoom <= 0.5}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm text-gray-600 w-16 text-center">{Math.round(zoom * 100)}%</span>
                <Button variant="outline" size="sm" onClick={handleZoomIn} disabled={zoom >= 3}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={handleClosePreview} className="ml-2">
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Image Container */}
            <div className="flex-1 overflow-auto bg-gray-100 flex items-center justify-center p-4">
              <img
                src={template.image}
                alt={template.name}
                className="max-w-full h-auto shadow-2xl rounded transition-transform duration-200"
                style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
                onError={(e) => {
                  e.target.src = 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800&h=1200&fit=crop';
                }}
              />
            </div>

            {/* Footer */}
            <div className="bg-white rounded-b-lg px-4 py-3 border-t flex items-center justify-between">
              <p className="text-sm text-gray-600 max-w-md line-clamp-1">
                {template.description}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClosePreview}>
                  Close
                </Button>
                <Button
                  onClick={() => {
                    handleClosePreview();
                    onSelect(template);
                  }}
                  style={{ backgroundColor: primaryColor }}
                  className="text-white"
                >
                  <Download className="mr-2 h-4 w-4" />
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

const PartnerCVTemplates = () => {
  const { brandName, primaryColor, secondaryColor, baseUrl } = usePartner();
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
        const response = await fetch(`${API_URL}/api/content/cv-templates`);
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
        console.error('Error fetching templates:', error);
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
    localStorage.setItem('selectedTemplate', JSON.stringify(template));
    
    // Check if user is logged in
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to start building your CV with this template.",
      });
      navigate(`${baseUrl}/login`, { state: { from: `${baseUrl}/builder`, template: template.id } });
      return;
    }

    // Check if user has an active tier
    if (!user.active_tier) {
      toast({
        title: "Template Selected!",
        description: `${template.name} selected. Choose a plan to start building your CV.`,
      });
      navigate(`${baseUrl}/pricing`, { state: { template: template.id } });
      return;
    }

    // User is logged in and has a plan - go to builder
    toast({
      title: "Template Selected!",
      description: `Starting CV builder with ${template.name}`,
    });
    navigate(`${baseUrl}/builder`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 py-12 px-4 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" style={{ color: primaryColor }} />
          <p className="text-gray-600">Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <Badge 
            className="mb-4 text-white border-none"
            style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
          >
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
            <PartnerTemplateCard
              key={template.id}
              template={template}
              onSelect={handleSelectTemplate}
              primaryColor={primaryColor}
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
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
              style={{ backgroundColor: `${primaryColor}15` }}
            >
              <Sparkles className="h-6 w-6" style={{ color: primaryColor }} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">ATS-Friendly</h3>
            <p className="text-gray-600 text-sm">
              All templates are optimised to pass Applicant Tracking Systems used by major South African companies.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
              style={{ backgroundColor: `${secondaryColor}15` }}
            >
              <Sparkles className="h-6 w-6" style={{ color: secondaryColor }} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Easy to Customise</h3>
            <p className="text-gray-600 text-sm">
              Simply select a template and fill in your information. Our AI will help you write compelling content.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
              style={{ backgroundColor: `${primaryColor}15` }}
            >
              <Sparkles className="h-6 w-6" style={{ color: primaryColor }} />
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

export default PartnerCVTemplates;
