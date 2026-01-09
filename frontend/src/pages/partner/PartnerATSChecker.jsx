import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { usePartner } from '../../context/PartnerContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  ArrowRight,
  Target,
  Zap,
  Award,
  RefreshCw,
  Info
} from 'lucide-react';
import FreeAccountGate from '../../components/FreeAccountGate';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const PartnerATSChecker = () => {
  const { 
    brandName, 
    primaryColor, 
    secondaryColor, 
    baseUrl
  } = usePartner();
  const { isAuthenticated } = useAuth();

  const [file, setFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [showAuthGate, setShowAuthGate] = useState(false);

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

  const handleFile = (selectedFile) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      setError('Please upload a PDF, Word document, or text file.');
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB.');
      return;
    }

    setFile(selectedFile);
    setError('');
    setResult(null);
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const analyzeResume = async () => {
    if (!file) return;

    // Check if user is authenticated - if not, show the gate
    if (!isAuthenticated) {
      setShowAuthGate(true);
      return;
    }

    setAnalyzing(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_URL}/api/ats-check`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        setError(data.detail || data.message || 'Failed to analyze resume. Please try again.');
      }
    } catch (err) {
      setError('Failed to analyze resume. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const resetChecker = () => {
    setFile(null);
    setResult(null);
    setError('');
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Free Account Gate Modal */}
      <FreeAccountGate
        isOpen={showAuthGate}
        onClose={() => setShowAuthGate(false)}
        toolName="the ATS Checker"
        redirectPath={`${baseUrl}/ats-checker`}
        isPartner={true}
        baseUrl={baseUrl}
        primaryColor={primaryColor}
      />

      {/* Hero Section */}
      <section 
        className="py-16"
        style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
      >
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Badge className="mb-4 bg-white/20 text-white border-none">
            <Target className="mr-1 h-3 w-3" />
            Free Tool
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            ATS Resume Checker
          </h1>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            See how your CV scores against Applicant Tracking Systems used by employers. Get instant feedback and improvement suggestions.
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-12 -mt-8">
        {/* Upload Card */}
        {!result && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" style={{ color: primaryColor }} />
                Upload Your Resume
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {file ? (
                  <div>
                    <FileText className="h-12 w-12 mx-auto mb-4" style={{ color: primaryColor }} />
                    <p className="font-medium text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => setFile(null)}
                    >
                      Choose Different File
                    </Button>
                  </div>
                ) : (
                  <div>
                    <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600 mb-2">
                      Drag and drop your resume here, or
                    </p>
                    <label>
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.doc,.docx,.txt"
                        onChange={handleFileInput}
                      />
                      <Button 
                        variant="outline" 
                        className="cursor-pointer"
                        asChild
                      >
                        <span>Browse Files</span>
                      </Button>
                    </label>
                    <p className="text-sm text-gray-500 mt-4">
                      Supported formats: PDF, Word, TXT (Max 5MB)
                    </p>
                  </div>
                )}
              </div>

              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-red-700">{error}</p>
                </div>
              )}

              {file && (
                <Button 
                  className="w-full mt-6"
                  style={{ backgroundColor: primaryColor }}
                  onClick={analyzeResume}
                  disabled={analyzing}
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing Resume...
                    </>
                  ) : (
                    <>
                      <Target className="h-4 w-4 mr-2" />
                      Check ATS Score
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Results Card */}
        {result && (
          <div className="space-y-6">
            {/* Notices */}
            {result.used_cache && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-blue-700">Results loaded from cache for faster response.</p>
              </div>
            )}
            {result.is_fallback && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-amber-700 font-medium">Basic Analysis Mode</p>
                  <p className="text-amber-600 text-sm">{result.fallback_notice}</p>
                </div>
              </div>
            )}

            {/* Score Card */}
            <Card className="shadow-lg">
              <CardContent className="p-8">
                <div className="text-center mb-8">
                  <div className="relative w-40 h-40 mx-auto mb-4">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="80"
                        cy="80"
                        r="70"
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="12"
                      />
                      <circle
                        cx="80"
                        cy="80"
                        r="70"
                        fill="none"
                        stroke={getScoreColor(result.score)}
                        strokeWidth="12"
                        strokeLinecap="round"
                        strokeDasharray={`${(result.score / 100) * 440} 440`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div>
                        <span 
                          className="text-5xl font-bold"
                          style={{ color: getScoreColor(result.score) }}
                        >
                          {result.score}
                        </span>
                        <span className="text-2xl text-gray-400">/100</span>
                      </div>
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Your ATS Score</h2>
                  <p className="text-gray-600">{result.summary}</p>
                </div>

                {/* Category Scores */}
                {result.categories && (
                  <div className="grid md:grid-cols-2 gap-4 mb-6">
                    {result.categories.map((category, idx) => (
                      <div key={idx} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium text-gray-900">{category.name}</span>
                          <span 
                            className="font-bold"
                            style={{ color: getScoreColor(category.score) }}
                          >
                            {category.score}%
                          </span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all"
                            style={{ 
                              width: `${category.score}%`,
                              backgroundColor: getScoreColor(category.score)
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Strengths */}
                {result.strengths && result.strengths.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      Strengths
                    </h3>
                    <ul className="space-y-2">
                      {result.strengths.map((strength, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-gray-600">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                          {strength}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommendations */}
                {result.recommendations && result.recommendations.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Zap className="h-5 w-5" style={{ color: primaryColor }} />
                      Recommendations
                    </h3>
                    <ul className="space-y-2">
                      {result.recommendations.map((rec, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-gray-600">
                          <ArrowRight className="h-4 w-4 mt-1 flex-shrink-0" style={{ color: primaryColor }} />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-4 mt-8">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={resetChecker}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Check Another Resume
                  </Button>
                  <Link to={`${baseUrl}/pricing`} className="flex-1">
                    <Button 
                      className="w-full"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <Award className="h-4 w-4 mr-2" />
                      Get Professional Help
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Info Section */}
        {!result && (
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6 text-center">
                <div 
                  className="w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: `${primaryColor}15` }}
                >
                  <Target className="h-6 w-6" style={{ color: primaryColor }} />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">ATS Compatibility</h3>
                <p className="text-sm text-gray-600">
                  Check if your CV can be read by Applicant Tracking Systems.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div 
                  className="w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: `${primaryColor}15` }}
                >
                  <Zap className="h-6 w-6" style={{ color: primaryColor }} />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Instant Feedback</h3>
                <p className="text-sm text-gray-600">
                  Get actionable recommendations to improve your CV.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div 
                  className="w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: `${primaryColor}15` }}
                >
                  <Award className="h-6 w-6" style={{ color: primaryColor }} />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">100% Free</h3>
                <p className="text-sm text-gray-600">
                  No sign-up required. Check unlimited resumes for free.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default PartnerATSChecker;
