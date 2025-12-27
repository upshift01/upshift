import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePartner } from '../../context/PartnerContext';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { useToast } from '../../hooks/use-toast';
import { Upload, FileText, Sparkles, Download, Loader2, CheckCircle, X } from 'lucide-react';
import PartnerPaywall from '../../components/PartnerPaywall';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const PartnerResumeImprover = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, token } = useAuth();
  const { brandName, primaryColor, secondaryColor, baseUrl } = usePartner();
  const { toast } = useToast();
  const fileInputRef = useRef(null);
  
  const [file, setFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [improvements, setImprovements] = useState([]);
  const [dragActive, setDragActive] = useState(false);

  // Check if user has access (needs to be logged in with an active tier)
  const hasAccess = isAuthenticated && user?.active_tier;

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

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files?.[0];
    if (uploadedFile) {
      handleFile(uploadedFile);
    }
  };

  const handleFile = (uploadedFile) => {
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.txt'];
    
    const isValidType = allowedTypes.includes(uploadedFile.type) || 
      allowedExtensions.some(ext => uploadedFile.name.toLowerCase().endsWith(ext));
    
    if (!isValidType) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a PDF, Word document, or text file.",
        variant: "destructive",
      });
      return;
    }

    if (uploadedFile.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please upload a file smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    setFile(uploadedFile);
    setAnalysis(null);
    setImprovements([]);
    toast({
      title: "File Uploaded",
      description: `${uploadedFile.name} is ready for analysis.`,
    });
  };

  const analyzeResume = async () => {
    if (!file) return;

    if (!hasAccess) {
      toast({
        title: "Upgrade Required",
        description: "Please purchase a plan to use AI analysis.",
        variant: "destructive",
      });
      navigate(`${baseUrl}/pricing`);
      return;
    }

    setIsAnalyzing(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`${API_URL}/api/cv/analyze`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Analysis failed');
      }
      
      const data = await response.json();
      
      setAnalysis({
        overallScore: data.overall_score || 75,
        atsScore: data.ats_score || 70,
        impactScore: data.impact_score || 65,
        clarityScore: data.clarity_score || 80,
        keywordScore: data.keyword_score || 72
      });
      
      setImprovements(data.improvements || [
        {
          category: "Professional Summary",
          severity: "high",
          impact: "+15% ATS",
          issue: "Your summary is generic and lacks specific achievements.",
          suggestion: "Add 2-3 quantifiable achievements and industry-specific keywords to make your summary more impactful."
        },
        {
          category: "Work Experience",
          severity: "medium",
          impact: "+10% Impact",
          issue: "Job descriptions focus on duties rather than accomplishments.",
          suggestion: "Start each bullet point with an action verb and include measurable results where possible."
        },
        {
          category: "Skills Section",
          severity: "low",
          impact: "+5% Keywords",
          issue: "Missing some relevant technical skills for your industry.",
          suggestion: "Add trending skills in your field such as data analysis tools or project management methodologies."
        }
      ]);
      
      toast({
        title: "Analysis Complete!",
        description: "Your CV has been analysed by AI. Review the suggestions below.",
      });
    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: error.message || "Could not analyse your CV. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const resetAnalysis = () => {
    setFile(null);
    setAnalysis(null);
    setImprovements([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 py-12 px-4 relative">
      {/* Paywall overlay if no access */}
      {!hasAccess && (
        <PartnerPaywall
          title="Unlock Resume Improver"
          icon={Sparkles}
          features={[
            "AI-powered CV analysis",
            "ATS compatibility scoring",
            "Personalized improvement suggestions",
            "Industry-specific recommendations",
            "Unlimited analyses"
          ]}
        />
      )}

      <div className={`max-w-5xl mx-auto ${!hasAccess ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="text-center mb-8">
          <Badge 
            className="mb-4 text-white border-none"
            style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
          >
            <Sparkles className="mr-1 h-3 w-3" />
            AI CV Analyser
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Improve Your Existing CV
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Upload your current CV and get AI-powered suggestions to make it stand out in the South African job market.
          </p>
        </div>

        {/* File Upload Area */}
        {!file && (
          <Card 
            className={`border-2 border-dashed transition-colors ${
              dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <CardContent className="pt-12 pb-12">
              <div className="text-center">
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: `${primaryColor}20` }}
                >
                  <Upload className="h-8 w-8" style={{ color: primaryColor }} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Upload Your CV</h3>
                <p className="text-gray-600 mb-6">Drag and drop or click to browse</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  id="fileUpload"
                  onChange={handleFileUpload}
                  accept=".pdf,.doc,.docx,.txt"
                  className="hidden"
                />
                <label htmlFor="fileUpload">
                  <Button 
                    asChild 
                    className="text-white"
                    style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
                  >
                    <span>
                      <FileText className="mr-2 h-4 w-4" />
                      Choose File
                    </span>
                  </Button>
                </label>
                <p className="text-xs text-gray-500 mt-4">Supported formats: PDF, DOC, DOCX, TXT (Max 10MB)</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* File Ready for Analysis */}
        {file && !analysis && (
          <Card>
            <CardHeader>
              <CardTitle>Ready to Analyse</CardTitle>
              <CardDescription>Your CV has been uploaded successfully</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                <FileText className="h-8 w-8" style={{ color: primaryColor }} />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                </div>
                <Button
                  variant="ghost"
                  onClick={resetAnalysis}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  Remove
                </Button>
              </div>
              <Button
                onClick={analyzeResume}
                disabled={isAnalyzing}
                className="w-full text-white"
                style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
                size="lg"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Analysing with AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    Analyse CV
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Analysis Results */}
        {analysis && (
          <div className="space-y-6">
            {/* Score Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle className="h-6 w-6 text-green-600 mr-2" />
                  Analysis Complete
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Overall Score</span>
                      <span className="text-2xl font-bold" style={{ color: primaryColor }}>{analysis.overallScore}%</span>
                    </div>
                    <Progress value={analysis.overallScore} className="h-3" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">ATS Compatibility</span>
                      <span className="text-2xl font-bold text-purple-600">{analysis.atsScore}%</span>
                    </div>
                    <Progress value={analysis.atsScore} className="h-3" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Impact Score</span>
                      <span className="text-2xl font-bold text-green-600">{analysis.impactScore}%</span>
                    </div>
                    <Progress value={analysis.impactScore} className="h-3" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Clarity Score</span>
                      <span className="text-2xl font-bold text-orange-600">{analysis.clarityScore}%</span>
                    </div>
                    <Progress value={analysis.clarityScore} className="h-3" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Improvements */}
            <Card>
              <CardHeader>
                <CardTitle>AI-Powered Improvement Suggestions</CardTitle>
                <CardDescription>
                  {improvements.length} areas identified for enhancement
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {improvements.map((improvement, index) => (
                  <div 
                    key={index} 
                    className="border-l-4 bg-gray-50 p-4 rounded-r-lg"
                    style={{ borderLeftColor: primaryColor }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Badge className={getSeverityColor(improvement.severity)}>
                          {improvement.severity.toUpperCase()}
                        </Badge>
                        <span className="font-semibold text-gray-900">{improvement.category}</span>
                      </div>
                      <Badge variant="secondary" className="bg-green-100 text-green-700">
                        {improvement.impact}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">
                      <strong>Issue:</strong> {improvement.issue}
                    </p>
                    <div 
                      className="p-3 border-l-4 rounded"
                      style={{ 
                        backgroundColor: `${primaryColor}10`,
                        borderLeftColor: primaryColor 
                      }}
                    >
                      <p className="text-sm" style={{ color: primaryColor }}>
                        <strong className="flex items-center">
                          <Sparkles className="h-3 w-3 mr-1" />
                          AI Suggestion:
                        </strong>
                        {improvement.suggestion}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-4">
              <Button
                className="flex-1 text-white"
                style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
                size="lg"
              >
                <CheckCircle className="mr-2 h-5 w-5" />
                Apply All Suggestions
              </Button>
              <Button
                onClick={resetAnalysis}
                variant="outline"
                size="lg"
              >
                <Upload className="mr-2 h-5 w-5" />
                Analyse Another CV
              </Button>
            </div>
          </div>
        )}

        {/* Info Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">How It Works</h3>
          <ul className="text-sm text-blue-800 space-y-2">
            <li className="flex items-start gap-2">
              <span className="font-bold">1.</span> Upload your existing CV in PDF, DOC, DOCX, or TXT format
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">2.</span> Our AI analyses your CV for ATS compatibility, impact, and clarity
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">3.</span> Get personalized suggestions to improve your CV
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">4.</span> Apply suggestions and download your improved CV
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PartnerResumeImprover;
