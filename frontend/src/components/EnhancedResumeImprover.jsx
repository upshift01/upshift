import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useToast } from '../hooks/use-toast';
import { 
  Loader2, Download, Plus, Trash2, Upload, Sparkles, Wand2, 
  Check, X, FileText, Layout, CheckCircle, ChevronRight,
  RefreshCw, AlertCircle, TrendingUp, Target, Zap, BarChart3
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// CV Templates - same as CV Builder
const TEMPLATES = [
  // General Templates
  { id: 'professional', name: 'Professional', description: 'Clean and traditional format', color: '#1e40af', category: 'general' },
  { id: 'modern', name: 'Modern', description: 'Contemporary design', color: '#7c3aed', category: 'general' },
  { id: 'creative', name: 'Creative', description: 'Stand out styling', color: '#059669', category: 'general' },
  { id: 'executive', name: 'Executive', description: 'Senior roles', color: '#991b1b', category: 'general' },
  // ATS Templates
  { id: 'ats-classic', name: 'ATS Classic', description: 'ATS optimised', color: '#000000', category: 'ats' },
  { id: 'ats-modern', name: 'ATS Modern', description: 'ATS-friendly modern', color: '#2563eb', category: 'ats' },
  // Industry-specific
  { id: 'ats-tech', name: 'ATS Tech/IT', description: 'Technology roles', color: '#0891b2', category: 'ats-industry', industry: 'Technology' },
  { id: 'ats-finance', name: 'ATS Finance', description: 'Financial services', color: '#0f766e', category: 'ats-industry', industry: 'Finance' },
  { id: 'ats-healthcare', name: 'ATS Healthcare', description: 'Healthcare professionals', color: '#dc2626', category: 'ats-industry', industry: 'Healthcare' },
  { id: 'ats-engineering', name: 'ATS Engineering', description: 'Engineering roles', color: '#ea580c', category: 'ats-industry', industry: 'Engineering' },
  { id: 'ats-sales', name: 'ATS Sales', description: 'Sales professionals', color: '#c026d3', category: 'ats-industry', industry: 'Sales' },
  { id: 'ats-education', name: 'ATS Education', description: 'Teaching & research', color: '#4f46e5', category: 'ats-industry', industry: 'Education' },
  { id: 'ats-legal', name: 'ATS Legal', description: 'Legal professionals', color: '#1e3a5f', category: 'ats-industry', industry: 'Legal' },
  { id: 'ats-hospitality', name: 'ATS Hospitality', description: 'Service industry', color: '#b45309', category: 'ats-industry', industry: 'Hospitality' },
  { id: 'ats-retail', name: 'ATS Retail', description: 'Retail roles', color: '#be185d', category: 'ats-industry', industry: 'Retail' },
  { id: 'ats-manufacturing', name: 'ATS Manufacturing', description: 'Production roles', color: '#4d7c0f', category: 'ats-industry', industry: 'Manufacturing' }
];

const EnhancedResumeImprover = ({ isPartner = false, baseUrl = '', primaryColor = '#1e40af', secondaryColor = '#7c3aed' }) => {
  const navigate = useNavigate();
  const { user, isAuthenticated, token, loading } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef(null);
  
  // State
  const [activeStep, setActiveStep] = useState('upload');
  const [file, setFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [improvements, setImprovements] = useState([]);
  const [extractedData, setExtractedData] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  
  // Enhanced CV state
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0]);
  const [templateCategory, setTemplateCategory] = useState('all');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhancedData, setEnhancedData] = useState(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  
  // Check access - wait for loading to complete
  const hasAccess = !loading && isAuthenticated && user?.active_tier;
  const isLoading = loading;

  // Handlers
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  // Show loading state while auth is being checked
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const handleFile = (uploadedFile) => {
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.txt'];
    
    const isValidType = allowedTypes.includes(uploadedFile.type) || 
      allowedExtensions.some(ext => uploadedFile.name.toLowerCase().endsWith(ext));
    
    if (!isValidType) {
      toast({ title: 'Invalid File', description: 'Please upload a PDF, Word document, or text file.', variant: 'destructive' });
      return;
    }

    if (uploadedFile.size > 10 * 1024 * 1024) {
      toast({ title: 'File Too Large', description: 'Max 10MB', variant: 'destructive' });
      return;
    }

    setFile(uploadedFile);
    toast({ title: 'File Uploaded', description: `${uploadedFile.name} is ready for analysis.` });
  };

  const analyzeCV = async () => {
    if (!file || !hasAccess) return;

    setIsAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_URL}/api/cv/analyze`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (!response.ok) throw new Error('Analysis failed');

      const data = await response.json();
      setAnalysis({
        overallScore: data.overall_score,
        atsScore: data.ats_score,
        impactScore: data.impact_score,
        clarityScore: data.clarity_score,
        keywordScore: data.keyword_score
      });
      setImprovements(data.improvements || []);

      // Extract CV data for enhancement
      const extractResponse = await fetch(`${API_URL}/api/ai-content/extract-cv-data`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (extractResponse.ok) {
        const extractData = await extractResponse.json();
        const cvData = extractData.cv_data || extractData.data;
        setExtractedData(cvData);
      }

      setActiveStep('analysis');
      toast({ title: 'Analysis Complete!', description: 'Review your CV scores and improvements.' });
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const enhanceCV = async () => {
    if (!extractedData) {
      toast({ title: 'Error', description: 'No CV data to enhance', variant: 'destructive' });
      return;
    }

    setIsEnhancing(true);
    try {
      const response = await fetch(`${API_URL}/api/cv/ai-enhance-all`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          fullName: extractedData.fullName || extractedData.full_name,
          email: extractedData.email,
          phone: extractedData.phone,
          summary: extractedData.summary,
          experiences: extractedData.experiences || [],
          education: extractedData.education || [],
          skills: extractedData.skills || []
        })
      });

      if (response.ok) {
        const data = await response.json();
        setEnhancedData({
          full_name: extractedData.full_name,
          email: extractedData.email,
          phone: extractedData.phone,
          address: extractedData.address,
          summary: data.enhanced_summary || extractedData.summary,
          experiences: data.enhanced_experiences || extractedData.experiences,
          education: extractedData.education,
          skills: data.enhanced_skills || extractedData.skills
        });
        setActiveStep('template');
        toast({ title: 'CV Enhanced!', description: 'Your CV has been improved by AI.' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to enhance CV', variant: 'destructive' });
    } finally {
      setIsEnhancing(false);
    }
  };

  const generatePDF = async () => {
    if (!enhancedData) return;

    setIsGeneratingPDF(true);
    try {
      const response = await fetch(`${API_URL}/api/cv/generate-pdf`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          template_id: selectedTemplate.id,
          cv_data: enhancedData,
          save_to_documents: true,
          document_name: `Improved CV - ${enhancedData.full_name}`
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Download PDF
        const pdfBlob = new Blob(
          [Uint8Array.from(atob(data.pdf_base64), c => c.charCodeAt(0))],
          { type: 'application/pdf' }
        );
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast({ title: 'Success!', description: 'Your improved CV has been downloaded and saved to My Documents.' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to generate PDF', variant: 'destructive' });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  // Access check
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <Card className="p-8">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Improve Your CV</h2>
            <p className="text-gray-600 mb-6">
              Please log in and purchase a plan to access AI CV analysis and improvement.
            </p>
            <Button onClick={() => navigate(isPartner ? `${baseUrl}/pricing` : '/pricing')}>
              View Plans
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  // Filter templates
  const filteredTemplates = templateCategory === 'all' 
    ? TEMPLATES 
    : TEMPLATES.filter(t => t.category === templateCategory || (templateCategory === 'ats-all' && t.category.startsWith('ats')));

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Badge className="mb-4" style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}>
            <Sparkles className="mr-1 h-3 w-3" />
            AI-Powered
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Improve Your CV
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Upload your existing CV, get AI analysis with scores, and generate an enhanced version using professional templates.
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            {['upload', 'analysis', 'template', 'download'].map((step, idx) => (
              <React.Fragment key={step}>
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    activeStep === step 
                      ? 'text-white' 
                      : ['upload', 'analysis', 'template', 'download'].indexOf(activeStep) > idx
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-500'
                  }`}
                  style={activeStep === step ? { backgroundColor: primaryColor } : {}}
                >
                  {['upload', 'analysis', 'template', 'download'].indexOf(activeStep) > idx ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    idx + 1
                  )}
                </div>
                {idx < 3 && <div className={`w-12 h-1 rounded ${['upload', 'analysis', 'template', 'download'].indexOf(activeStep) > idx ? 'bg-green-500' : 'bg-gray-200'}`} />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Step 1: Upload */}
        {activeStep === 'upload' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Your CV
              </CardTitle>
              <CardDescription>Upload your existing CV for AI analysis and improvement</CardDescription>
            </CardHeader>
            <CardContent>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".pdf,.doc,.docx,.txt"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              <div
                className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                  dragActive ? 'border-blue-500 bg-blue-50' : file ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                {file ? (
                  <div className="flex flex-col items-center">
                    <CheckCircle className="h-12 w-12 text-green-500 mb-3" />
                    <p className="text-green-700 font-medium mb-1">{file.name}</p>
                    <p className="text-sm text-green-600">Ready for analysis</p>
                  </div>
                ) : (
                  <>
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-700 font-medium mb-1">Drop your CV here or click to upload</p>
                    <p className="text-sm text-gray-500">Supports PDF, Word documents, and text files (max 10MB)</p>
                  </>
                )}
              </div>

              {file && (
                <div className="mt-6 flex justify-center">
                  <Button
                    onClick={analyzeCV}
                    disabled={isAnalyzing}
                    size="lg"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5 mr-2" />
                        Analyze My CV
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 2: Analysis Results */}
        {activeStep === 'analysis' && analysis && (
          <div className="space-y-6">
            {/* Scores */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  CV Analysis Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                  {[
                    { label: 'Overall', score: analysis.overallScore, icon: Target },
                    { label: 'ATS', score: analysis.atsScore, icon: Zap },
                    { label: 'Impact', score: analysis.impactScore, icon: TrendingUp },
                    { label: 'Clarity', score: analysis.clarityScore, icon: CheckCircle },
                    { label: 'Keywords', score: analysis.keywordScore, icon: FileText }
                  ].map(({ label, score, icon: Icon }) => (
                    <div key={label} className="text-center p-4 bg-gray-50 rounded-lg">
                      <Icon className="h-5 w-5 mx-auto mb-2 text-gray-400" />
                      <div className={`text-2xl font-bold ${getScoreColor(score)}`}>{score}%</div>
                      <div className="text-sm text-gray-500">{label}</div>
                      <Progress value={score} className="mt-2 h-1" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Improvements */}
            {improvements.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Suggested Improvements ({improvements.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {improvements.map((imp, idx) => (
                      <div 
                        key={idx} 
                        className={`p-3 rounded-lg border ${getSeverityColor(imp.severity)}`}
                      >
                        <div className="flex items-start gap-2">
                          <Badge variant="outline" className="text-xs capitalize">{imp.severity}</Badge>
                          <span className="text-sm">{imp.suggestion}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action */}
            <div className="flex justify-center gap-4">
              <Button variant="outline" onClick={() => setActiveStep('upload')}>
                Upload Different CV
              </Button>
              <Button
                onClick={enhanceCV}
                disabled={isEnhancing || !extractedData}
                size="lg"
                style={{ backgroundColor: primaryColor }}
              >
                {isEnhancing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Enhancing...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-5 w-5 mr-2" />
                    AI Enhance & Continue
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Template Selection */}
        {activeStep === 'template' && enhancedData && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layout className="h-5 w-5" />
                  Select Template for Your Improved CV
                </CardTitle>
                <CardDescription>Choose a professional template to generate your enhanced CV</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Category Filter */}
                <div className="flex flex-wrap justify-center gap-2 mb-6">
                  {[
                    { id: 'all', label: 'All Templates' },
                    { id: 'general', label: 'General' },
                    { id: 'ats-all', label: 'ATS-Optimised' },
                    { id: 'ats-industry', label: 'Industry-Specific' }
                  ].map(cat => (
                    <Button
                      key={cat.id}
                      variant={templateCategory === cat.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTemplateCategory(cat.id)}
                      style={templateCategory === cat.id ? { backgroundColor: primaryColor } : {}}
                    >
                      {cat.label}
                    </Button>
                  ))}
                </div>

                {/* Templates Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {filteredTemplates.map((template) => (
                    <Card 
                      key={template.id}
                      className={`cursor-pointer transition-all hover:shadow-lg ${
                        selectedTemplate.id === template.id ? 'ring-2 ring-offset-2' : 'hover:scale-105'
                      }`}
                      style={{ borderColor: selectedTemplate.id === template.id ? template.color : undefined }}
                      onClick={() => setSelectedTemplate(template)}
                    >
                      <CardContent className="p-3">
                        <div 
                          className="h-20 rounded-lg mb-2 flex items-center justify-center"
                          style={{ backgroundColor: `${template.color}15` }}
                        >
                          <div 
                            className="w-10 h-14 rounded shadow-sm bg-white border-t-4"
                            style={{ borderColor: template.color }}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 text-xs truncate">{template.name}</h3>
                            {template.industry && (
                              <Badge variant="outline" className="mt-1 text-xs" style={{ borderColor: template.color, color: template.color }}>
                                {template.industry}
                              </Badge>
                            )}
                          </div>
                          {selectedTemplate.id === template.id && (
                            <CheckCircle className="h-4 w-4 flex-shrink-0" style={{ color: template.color }} />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-center gap-4">
              <Button variant="outline" onClick={() => setActiveStep('analysis')}>
                Back to Analysis
              </Button>
              <Button
                onClick={generatePDF}
                disabled={isGeneratingPDF}
                size="lg"
                style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
              >
                {isGeneratingPDF ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5 mr-2" />
                    AI Create & Download Improved CV (PDF)
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedResumeImprover;
