import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { useToast } from '../hooks/use-toast';
import { Upload, FileText, Sparkles, Download, Loader2, CheckCircle } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';

const ResumeImprover = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [file, setFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [improvements, setImprovements] = useState([]);

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (uploadedFile) {
      if (uploadedFile.type === 'application/pdf' || uploadedFile.type === 'application/msword' || uploadedFile.name.endsWith('.docx')) {
        setFile(uploadedFile);
        toast({
          title: "File Uploaded",
          description: `${uploadedFile.name} is ready for analysis.`,
        });
      } else {
        toast({
          title: "Invalid File Type",
          description: "Please upload a PDF or Word document.",
          variant: "destructive",
        });
      }
    }
  };

  const analyzeResume = async () => {
    if (!file) return;

    setIsAnalyzing(true);
    // Mock analysis - will be replaced with actual API call
    setTimeout(() => {
      setAnalysis({
        overallScore: 75,
        atsScore: 68,
        impactScore: 72,
        clarityScore: 80,
        keywordScore: 65
      });
      setImprovements([
        {
          category: 'Keywords',
          severity: 'high',
          issue: 'Missing industry-specific keywords',
          suggestion: 'Add keywords like "Agile", "Stakeholder Management", and "ROI" to improve ATS compatibility.',
          impact: '+15% ATS Score'
        },
        {
          category: 'Achievements',
          severity: 'medium',
          issue: 'Lack of quantifiable achievements',
          suggestion: 'Replace "Improved efficiency" with "Increased operational efficiency by 30%, saving R200,000 annually"',
          impact: '+10 Impact Score'
        },
        {
          category: 'Formatting',
          severity: 'low',
          issue: 'Inconsistent date formats',
          suggestion: 'Use consistent date format throughout (e.g., "Jan 2020 - Dec 2022")',
          impact: '+5 Clarity Score'
        },
        {
          category: 'Summary',
          severity: 'high',
          issue: 'Weak professional summary',
          suggestion: 'Strengthen your summary by highlighting 3 key achievements and your unique value proposition for SA employers.',
          impact: '+12 Impact Score'
        },
        {
          category: 'Skills',
          severity: 'medium',
          issue: 'Generic skill descriptions',
          suggestion: 'Instead of "Good communication skills", write "Presented quarterly reports to executive team of 15+ stakeholders"',
          impact: '+8 Impact Score'
        }
      ]);
      setIsAnalyzing(false);
      toast({
        title: "Analysis Complete!",
        description: "Your CV has been analyzed. Review the suggestions below.",
      });
    }, 3000);
  };

  const applyImprovements = () => {
    toast({
      title: "Improvements Applied!",
      description: "Your improved CV is ready for download.",
    });
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <Badge className="mb-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white border-none">
            <Sparkles className="mr-1 h-3 w-3" />
            AI Resume Analyzer
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Improve Your Existing CV
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Upload your current CV and get AI-powered suggestions to make it stand out in the South African job market.
          </p>
        </div>

        {!file && (
          <Card className="border-2 border-dashed border-gray-300 hover:border-blue-500 transition-colors">
            <CardContent className="pt-12 pb-12">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Upload className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Upload Your CV</h3>
                <p className="text-gray-600 mb-6">Drag and drop or click to browse</p>
                <input
                  type="file"
                  id="fileUpload"
                  onChange={handleFileUpload}
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                />
                <label htmlFor="fileUpload">
                  <Button asChild className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
                    <span>
                      <FileText className="mr-2 h-4 w-4" />
                      Choose File
                    </span>
                  </Button>
                </label>
                <p className="text-xs text-gray-500 mt-4">Supported formats: PDF, DOC, DOCX (Max 10MB)</p>
              </div>
            </CardContent>
          </Card>
        )}

        {file && !analysis && (
          <Card>
            <CardHeader>
              <CardTitle>Ready to Analyze</CardTitle>
              <CardDescription>Your CV has been uploaded successfully</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                <FileText className="h-8 w-8 text-blue-600" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setFile(null)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  Remove
                </Button>
              </div>
              <Button
                onClick={analyzeResume}
                disabled={isAnalyzing}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                size="lg"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Analyzing with AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    Analyze CV
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

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
                      <span className="text-2xl font-bold text-blue-600">{analysis.overallScore}%</span>
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
                  <div key={index} className="border-l-4 border-blue-600 bg-gray-50 p-4 rounded-r-lg">
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
                    <div className="p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
                      <p className="text-sm text-blue-900">
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
                onClick={applyImprovements}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                size="lg"
              >
                <CheckCircle className="mr-2 h-5 w-5" />
                Apply All Suggestions
              </Button>
              <Button
                onClick={() => setFile(null)}
                variant="outline"
                size="lg"
              >
                <Download className="mr-2 h-5 w-5" />
                Download Improved CV
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResumeImprover;