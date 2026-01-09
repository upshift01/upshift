import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { 
  Upload, FileText, CheckCircle, XCircle, AlertTriangle, 
  Target, Award, TrendingUp, Download, RefreshCw, ChevronDown, ChevronUp,
  Briefcase, GraduationCap, User, Layout, FileSearch, Zap, Star, Crown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { pricingTiers as defaultPricingTiers } from '../pricingData';
import { useAuth } from '../context/AuthContext';
import FreeAccountGate from '../components/FreeAccountGate';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const ATSChecker = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [file, setFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});
  const [pricingTiers, setPricingTiers] = useState(defaultPricingTiers);
  const [showAuthGate, setShowAuthGate] = useState(false);

  // Fetch pricing from API
  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const response = await fetch(`${API_URL}/api/pricing`);
        if (response.ok) {
          const data = await response.json();
          if (data.tiers && data.tiers.length > 0) {
            // Merge API pricing with default tier data
            const updatedTiers = defaultPricingTiers.map(defaultTier => {
              const apiTier = data.tiers.find(t => t.id === defaultTier.id);
              if (apiTier) {
                return {
                  ...defaultTier,
                  price: apiTier.price,
                  name: apiTier.name || defaultTier.name,
                  description: apiTier.description || defaultTier.description
                };
              }
              return defaultTier;
            });
            setPricingTiers(updatedTiers);
          }
        }
      } catch (error) {
        console.error('Error fetching pricing:', error);
        // Keep default pricing on error
      }
    };
    fetchPricing();
  }, []);

  const getTierIcon = (tierId) => {
    switch (tierId) {
      case 'tier-1': return Zap;
      case 'tier-2': return Star;
      case 'tier-3': return Crown;
      default: return Zap;
    }
  };

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setResult(null);
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxFiles: 1
  });

  const [notice, setNotice] = useState(null);
  const [usedFallback, setUsedFallback] = useState(false);

  const analyzeResume = async () => {
    if (!file) return;
    
    // Check if user is authenticated - if not, show the gate
    if (!isAuthenticated) {
      setShowAuthGate(true);
      return;
    }
    
    setIsAnalyzing(true);
    setError(null);
    setNotice(null);
    setUsedFallback(false);
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      // Include auth token if user is logged in, so results get saved to history
      const headers = {};
      const token = localStorage.getItem('token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/ats-check`, {
        method: 'POST',
        headers,
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        // Provide user-friendly error messages
        let errorMessage = errorData.detail || 'Failed to analyse resume';
        if (response.status === 503) {
          errorMessage = "Our AI service is temporarily busy. Please try again in a few minutes.";
        } else if (response.status === 504) {
          errorMessage = "The analysis timed out. Please try with a smaller document.";
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      setResult(data.analysis);
      
      // Check if fallback was used
      if (data.used_fallback) {
        setUsedFallback(true);
        setNotice(data.notice || "Showing basic analysis. Full AI analysis temporarily unavailable.");
      } else if (data.used_cache) {
        setNotice("Results loaded from cache for faster response.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreGradient = (score) => {
    if (score >= 80) return 'from-green-500 to-green-600';
    if (score >= 60) return 'from-yellow-500 to-yellow-600';
    return 'from-red-500 to-red-600';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'fail':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'format_compatibility':
        return <Layout className="h-5 w-5" />;
      case 'contact_information':
        return <User className="h-5 w-5" />;
      case 'keywords_skills':
        return <Target className="h-5 w-5" />;
      case 'work_experience':
        return <Briefcase className="h-5 w-5" />;
      case 'education':
        return <GraduationCap className="h-5 w-5" />;
      case 'overall_structure':
        return <FileSearch className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const formatCategoryName = (name) => {
    return name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  // Circular Progress Component
  const CircularProgress = ({ score, size = 200 }) => {
    const radius = (size - 20) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (score / 100) * circumference;
    
    return (
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="12"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="url(#gradient)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
          />
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : '#ef4444'} />
              <stop offset="100%" stopColor={score >= 80 ? '#16a34a' : score >= 60 ? '#ca8a04' : '#dc2626'} />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-5xl font-bold ${getScoreColor(score)}`}>{score}</span>
          <span className="text-gray-500 text-sm">out of 100</span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Free Account Gate Modal */}
      <FreeAccountGate
        isOpen={showAuthGate}
        onClose={() => setShowAuthGate(false)}
        toolName="the ATS Checker"
        redirectPath="/ats-checker"
        primaryColor="#2563eb"
      />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-purple-600 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 mb-6">
            <Zap className="h-4 w-4" />
            <span className="text-sm font-medium">Free AI-Powered Tool</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            ATS Resume Checker
          </h1>
          <p className="text-lg md:text-xl text-blue-100 max-w-3xl mx-auto">
            Check if your CV is optimised for Applicant Tracking Systems and increase your chances of landing interviews.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Introduction Section */}
        <Card className="mb-8">
          <CardContent className="p-6 md:p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Why Use an ATS CV Checker?</h2>
            <div className="prose prose-blue max-w-none text-gray-600">
              <p className="mb-4">
                Each job position receives an average of around <strong>250 applications</strong>. Standing out among these hundreds of applications is not an easy task for the job seeker and also tough for the HR department to screen them. So, many employers use Applicant Tracking Systems (ATS) to manage and streamline the influx of job applications.
              </p>
              <p className="mb-4">
                These ATS systems automatically filter out CVs that don't meet the job description criteria. So, if your CV is not properly optimised, <strong>it won't even reach human eyes</strong> despite you having all the qualifications. This can be frustrating, especially when you spend hours crafting a perfect CV only to have it rejected due to poor formatting and lack of ATS-friendly keywords.
              </p>
              <p className="mb-0">
                To solve this problem, we developed our <strong>ATS CV Checker tool</strong>, a free AI tool that scans your CV, focusing on the key elements that recruiters and ATS systems prioritise. It gives you a detailed score, as well as a comprehensive analysis of your CV along with a checklist of issues to fix. This tool ensures your CV is appealing to both ATS systems and recruiting managers. Whether you are a new graduate or an experienced professional looking to switch jobs, this tool helps you create CVs that stand out.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Upload Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-blue-600" />
              Upload Your Resume
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
                isDragActive 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
              }`}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                  file ? 'bg-green-100' : 'bg-blue-100'
                }`}>
                  {file ? (
                    <FileText className="h-8 w-8 text-green-600" />
                  ) : (
                    <Upload className="h-8 w-8 text-blue-600" />
                  )}
                </div>
                {file ? (
                  <>
                    <p className="text-lg font-medium text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {(file.size / 1024).toFixed(1)} KB • Click or drag to replace
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-medium text-gray-900">
                      {isDragActive ? 'Drop your resume here' : 'Drag & drop your resume here'}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      or click to browse • Supports PDF, DOC, DOCX, TXT
                    </p>
                  </>
                )}
              </div>
            </div>

            {file && (
              <div className="mt-6 flex justify-center">
                <Button 
                  onClick={analyzeResume} 
                  disabled={isAnalyzing}
                  size="lg"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                      Analyzing Resume...
                    </>
                  ) : (
                    <>
                      <Target className="h-5 w-5 mr-2" />
                      Check ATS Score
                    </>
                  )}
                </Button>
              </div>
            )}

            {error && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <p className="text-red-700">{error}</p>
              </div>
            )}

            {notice && !error && (
              <div className={`mt-6 p-4 rounded-lg flex items-start gap-3 ${
                usedFallback 
                  ? 'bg-amber-50 border border-amber-200' 
                  : 'bg-blue-50 border border-blue-200'
              }`}>
                <AlertTriangle className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                  usedFallback ? 'text-amber-500' : 'text-blue-500'
                }`} />
                <div>
                  <p className={usedFallback ? 'text-amber-700' : 'text-blue-700'}>{notice}</p>
                  {usedFallback && (
                    <p className="text-sm text-amber-600 mt-1">
                      This is a basic rule-based analysis. For detailed AI-powered insights, please try again later.
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Section */}
        {result && (
          <div className="space-y-6">
            {/* Fallback Notice Banner */}
            {result.is_fallback && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-amber-800">Basic Analysis Mode</h4>
                  <p className="text-amber-700 text-sm mt-1">
                    {result.fallback_notice || "Our AI service is temporarily unavailable. This is a basic rule-based analysis that checks for common ATS requirements."}
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={analyzeResume}
                    className="mt-3 text-amber-700 border-amber-300 hover:bg-amber-100"
                    disabled={isAnalyzing}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isAnalyzing ? 'animate-spin' : ''}`} />
                    Try Full AI Analysis
                  </Button>
                </div>
              </div>
            )}

            {/* Score Overview */}
            <Card>
              <CardContent className="p-8">
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <CircularProgress score={result.overall_score} />
                  <div className="flex-1 text-center md:text-left">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      Your ATS Score
                    </h3>
                    <p className="text-gray-600 mb-4">{result.summary}</p>
                    <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                      {result.overall_score >= 80 && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                          <Award className="h-4 w-4" /> Excellent
                        </span>
                      )}
                      {result.overall_score >= 60 && result.overall_score < 80 && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
                          <TrendingUp className="h-4 w-4" /> Good Progress
                        </span>
                      )}
                      {result.overall_score < 60 && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                          <AlertTriangle className="h-4 w-4" /> Needs Improvement
                        </span>
                      )}
                      {result.is_fallback && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
                          Basic Analysis
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Category Scores */}
            <Card>
              <CardHeader>
                <CardTitle>Detailed Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {result.categories && Object.entries(result.categories).map(([key, category]) => (
                    <div key={key} className="border rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleSection(key)}
                        className="w-full p-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            category.status === 'pass' ? 'bg-green-100 text-green-600' :
                            category.status === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                            'bg-red-100 text-red-600'
                          }`}>
                            {getCategoryIcon(key)}
                          </div>
                          <div className="text-left">
                            <p className="font-medium text-gray-900">{formatCategoryName(key)}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {getStatusIcon(category.status)}
                              <span className={`text-sm ${getScoreColor(category.score)}`}>
                                {category.score}/100
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full bg-gradient-to-r ${getScoreGradient(category.score)} transition-all duration-500`}
                              style={{ width: `${category.score}%` }}
                            />
                          </div>
                          {expandedSections[key] ? (
                            <ChevronUp className="h-5 w-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                      </button>
                      {expandedSections[key] && (
                        <div className="p-4 border-t bg-white">
                          <ul className="space-y-2">
                            {category.findings.map((finding, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                                <span className="text-blue-500 mt-0.5">•</span>
                                {finding}
                              </li>
                            ))}
                          </ul>
                          {category.detected_skills && category.detected_skills.length > 0 && (
                            <div className="mt-4 pt-4 border-t">
                              <p className="text-sm font-medium text-gray-700 mb-2">Detected Skills:</p>
                              <div className="flex flex-wrap gap-2">
                                {category.detected_skills.map((skill, idx) => (
                                  <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Checklist */}
            {result.checklist && result.checklist.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Issues Checklist</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {result.checklist.map((item, idx) => (
                      <div 
                        key={idx} 
                        className={`p-4 rounded-lg border ${
                          item.status === 'pass' ? 'bg-green-50 border-green-200' :
                          item.status === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                          'bg-red-50 border-red-200'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {getStatusIcon(item.status)}
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-medium text-gray-900">{item.item}</p>
                              <span className={`text-xs px-2 py-1 rounded ${
                                item.priority === 'high' ? 'bg-red-100 text-red-700' :
                                item.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {item.priority} priority
                              </span>
                            </div>
                            {item.status !== 'pass' && (
                              <>
                                <p className="text-sm text-gray-600 mb-1">{item.recommendation}</p>
                                <p className="text-xs text-blue-600 font-medium">{item.impact}</p>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Strengths & Recommendations */}
            <div className="grid md:grid-cols-2 gap-6">
              {result.strengths && result.strengths.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="h-5 w-5" />
                      Strengths
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {result.strengths.map((strength, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          {strength}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {result.recommendations && result.recommendations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-700">
                      <TrendingUp className="h-5 w-5" />
                      Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {result.recommendations.map((rec, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                          <span className="text-blue-500 mt-0.5">→</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Critical Issues */}
            {result.critical_issues && result.critical_issues.length > 0 && (
              <Card className="border-red-200 bg-red-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-700">
                    <AlertTriangle className="h-5 w-5" />
                    Critical Issues
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {result.critical_issues.map((issue, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-red-700">
                        <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                        {issue}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* CTA */}
            <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              <CardContent className="p-8 text-center">
                <h3 className="text-2xl font-bold mb-4">Ready to Optimise Your CV?</h3>
                <p className="text-blue-100 mb-6">
                  Use our AI-powered CV Builder to create an ATS-optimised CV in minutes.
                </p>
                <Button 
                  variant="secondary" 
                  size="lg"
                  onClick={() => window.location.href = '/builder'}
                  className="bg-white text-blue-600 hover:bg-blue-50"
                >
                  Build Your Resume Now
                </Button>
              </CardContent>
            </Card>

            {/* Step 5: Payment Options */}
            <Card className="border-2 border-blue-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold">
                    5
                  </div>
                  <CardTitle className="text-xl">Upgrade to Fix All Issues Automatically</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-gray-600 mb-6">
                  Get access to our premium features and let our AI automatically fix all the issues identified in your resume. 
                  Choose a plan that suits your needs:
                </p>
                
                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  {pricingTiers.map((tier) => {
                    const IconComponent = getTierIcon(tier.id);
                    return (
                      <div 
                        key={tier.id}
                        className={`border rounded-xl p-5 hover:shadow-md transition-all relative ${
                          tier.popular 
                            ? 'border-2 border-blue-500 shadow-lg bg-blue-50/30' 
                            : tier.id === 'tier-3'
                            ? 'bg-gradient-to-br from-purple-50 to-blue-50 hover:border-purple-300'
                            : 'hover:border-blue-300'
                        }`}
                      >
                        {tier.badge && (
                          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                            <span className="bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                              {tier.badge.toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className={`flex items-center gap-2 mb-2 ${tier.badge ? 'mt-2' : ''}`}>
                          <IconComponent className={`h-5 w-5 ${
                            tier.id === 'tier-1' ? 'text-blue-500' :
                            tier.id === 'tier-2' ? 'text-purple-500' :
                            'text-orange-500'
                          }`} />
                          <h4 className="font-semibold text-gray-900">{tier.name}</h4>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 mb-1">
                          R{(tier.price / 100).toLocaleString()} 
                          <span className="text-sm font-normal text-gray-500">/once-off</span>
                        </p>
                        <p className="text-xs text-gray-500 mb-3">{tier.description}</p>
                        <ul className="text-sm text-gray-600 space-y-1 mb-4">
                          {tier.features.slice(0, 4).map((feature, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                              <span className="truncate">{feature}</span>
                            </li>
                          ))}
                          {tier.features.length > 4 && (
                            <li className="text-xs text-blue-600">
                              +{tier.features.length - 4} more features
                            </li>
                          )}
                        </ul>
                        <Button 
                          className={`w-full ${
                            tier.popular
                              ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                              : tier.id === 'tier-3'
                              ? 'border-purple-300 text-purple-700 hover:bg-purple-50'
                              : ''
                          }`}
                          variant={tier.popular ? 'default' : 'outline'}
                          onClick={() => navigate('/pricing')}
                        >
                          Select Plan
                        </Button>
                      </div>
                    );
                  })}
                </div>

                <div className="text-center">
                  <Button 
                    variant="link" 
                    className="text-blue-600"
                    onClick={() => navigate('/pricing')}
                  >
                    View all plan details →
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* How It Works Section */}
        {!result && (
          <>
            <Card className="mb-8">
              <CardContent className="p-6 md:p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">What is an Applicant Tracking System (ATS)?</h2>
                <div className="prose prose-blue max-w-none text-gray-600">
                  <p className="mb-4">
                    An Application Tracking System is a software application that helps recruiters shortlist resumes and streamline their hiring process. These systems are designed to reduce the time and efforts required by the HR and hiring managers to go through large volumes of resumes by filtering, organizing, and tracking job applications efficiently.
                  </p>
                  <p className="mb-4">
                    ATS software scans resumes for specific keywords, skills, and qualifications provided in the job description by the employer, ensuring that only the most relevant candidates are considered among hundreds or even thousands of applications. This means, that if your resume is <strong>not ATS optimised, it will be straightaway rejected</strong> through an automated system itself.
                  </p>
                  <p className="mb-0">
                    Understanding how ATS systems work and making sure your resume is ATS-friendly is crucial for candidates to increase their chances of getting an interview. By using tools like our Resume Checker, you can easily scan your resume against ATS guidelines and pass the screening stage.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 md:p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">How Does Our AI Resume Checker Work?</h2>
                <p className="text-gray-600 mb-8">
                  Our ATS Resume Checker tool is designed to be user-friendly and efficient in providing suggestions and tips to make your resume stand out. Here's how it works:
                </p>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[
                    {
                      step: 1,
                      title: "Upload Your Resume",
                      description: "Begin by uploading your resume PDF document. Our system supports different formats of resumes.",
                      icon: Upload
                    },
                    {
                      step: 2,
                      title: "AI-Powered Scanning",
                      description: "Once uploaded, our advanced AI model extracts the key elements like formatting, keyword usage, and structure from your existing CV to check whether it is ATS optimised.",
                      icon: FileSearch
                    },
                    {
                      step: 3,
                      title: "Score and Summary",
                      description: "After the scanning, the tool provides you with a detailed summary of your CV along with your ATS score out of 100.",
                      icon: Target
                    },
                    {
                      step: 4,
                      title: "Comprehensive Checklist",
                      description: "Along with the score, you will also receive a checklist of issues and improvements tailored to pass the ATS systems.",
                      icon: CheckCircle
                    },
                    {
                      step: 5,
                      title: "Edit and Download",
                      description: "You can implement the suggestions by editing the CV within the CV builder. Once done, you can download the edited optimised version of the CV.",
                      icon: Download
                    }
                  ].map((item) => (
                    <div key={item.step} className="relative">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold">
                          {item.step}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                          <p className="text-sm text-gray-600">{item.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default ATSChecker;
