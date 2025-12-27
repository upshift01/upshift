import React, { useState, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePartner } from '../../context/PartnerContext';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { useToast } from '../../hooks/use-toast';
import { Loader2, Upload, FileText, Sparkles, Copy, Check, Zap, ArrowRight, X } from 'lucide-react';
import PartnerPaywall from '../../components/PartnerPaywall';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const PartnerResumeImprover = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, token } = useAuth();
  const { brandName, primaryColor, secondaryColor, baseUrl } = usePartner();
  const { toast } = useToast();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [resumeText, setResumeText] = useState('');
  const [improvedResume, setImprovedResume] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);

  // Resume improver requires any paid tier
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

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file) => {
    // Check file type
    const allowedTypes = ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const allowedExtensions = ['.pdf', '.txt', '.doc', '.docx'];
    
    const isValidType = allowedTypes.includes(file.type) || allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    
    if (!isValidType) {
      toast({
        title: 'Invalid File Type',
        description: 'Please upload a PDF, DOC, DOCX, or TXT file.',
        variant: 'destructive'
      });
      return;
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Please upload a file smaller than 10MB.',
        variant: 'destructive'
      });
      return;
    }

    setUploadedFile(file);

    // For text files, read directly
    if (file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt')) {
      const text = await file.text();
      setResumeText(text);
      toast({
        title: 'File Loaded',
        description: 'Your resume content has been loaded.',
      });
      return;
    }

    // For PDF/DOC files, send to backend for extraction
    if (!hasAccess) {
      toast({
        title: 'Upgrade Required',
        description: 'Please purchase a plan to upload PDF/DOC files.',
        variant: 'destructive'
      });
      return;
    }

    setExtracting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_URL}/api/ai-content/extract-cv-data`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        // Use raw_text for the resume improver
        setResumeText(data.raw_text || '');
        toast({
          title: 'File Processed',
          description: 'Your resume content has been extracted.',
        });
      } else {
        throw new Error(data.detail || 'Failed to extract file content');
      }
    } catch (error) {
      toast({
        title: 'Extraction Failed',
        description: error.message || 'Could not extract text from the file.',
        variant: 'destructive'
      });
      setUploadedFile(null);
    } finally {
      setExtracting(false);
    }
  };

  const clearFile = () => {
    setUploadedFile(null);
    setResumeText('');
    setImprovedResume('');
    setSuggestions([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImprove = async () => {
    if (!hasAccess) {
      toast({
        title: 'Upgrade Required',
        description: 'Please purchase a plan to use AI analysis.',
        variant: 'destructive'
      });
      navigate(`${baseUrl}/pricing`);
      return;
    }

    if (!resumeText.trim()) {
      toast({
        title: 'No Content',
        description: 'Please paste your resume content or upload a file first.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/ai-content/improve-resume`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ resume_text: resumeText })
      });

      const data = await response.json();
      if (response.ok) {
        setImprovedResume(data.improved_resume || data.improved_text || '');
        setSuggestions(data.suggestions || []);
        toast({ title: 'Success', description: 'Resume improved!' });
      } else {
        throw new Error(data.detail || 'Failed to improve resume');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to improve resume',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(improvedResume);
    setCopied(true);
    toast({ title: 'Copied!', description: 'Improved resume copied to clipboard' });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section 
        className="py-12"
        style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
      >
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Badge className="mb-4 bg-white/20 text-white border-none">
            <Sparkles className="mr-1 h-3 w-3" />
            AI-Powered
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Resume Improver
          </h1>
          <p className="text-lg text-white/80">
            Upload your CV and get AI-powered suggestions to enhance it
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-8 relative">
        {/* Paywall overlay if no access */}
        {!hasAccess && (
          <PartnerPaywall
            title="Unlock Resume Improver"
            icon={Sparkles}
            features={[
              "Upload PDF, DOC, DOCX files",
              "AI-powered content enhancement",
              "Actionable improvement suggestions",
              "ATS keyword optimization",
              "Professional language upgrade"
            ]}
          />
        )}

        <div className={`grid md:grid-cols-2 gap-6 ${!hasAccess ? 'opacity-50 pointer-events-none' : ''}`}>
          {/* Input */}
          <Card>
            <CardHeader>
              <CardTitle>Your Current Resume</CardTitle>
              <CardDescription>Upload your CV file or paste content below</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* File Upload Area */}
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                  dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                {extracting ? (
                  <div className="py-4">
                    <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin" style={{ color: primaryColor }} />
                    <p className="text-sm text-gray-600">Extracting content...</p>
                  </div>
                ) : uploadedFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileText className="h-8 w-8" style={{ color: primaryColor }} />
                    <div className="text-left">
                      <p className="font-medium text-gray-900">{uploadedFile.name}</p>
                      <p className="text-xs text-gray-500">{(uploadedFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={(e) => { e.stopPropagation(); clearFile(); }}
                      className="ml-2"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm font-medium text-gray-700">
                      Drop your CV here or click to browse
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Supports PDF, DOC, DOCX, TXT (Max 10MB)
                    </p>
                  </>
                )}
              </div>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-2 text-gray-500">or paste your resume</span>
                </div>
              </div>

              <Textarea
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                placeholder="Paste your resume content here..."
                rows={12}
                className="font-mono text-sm"
              />
              
              <Button 
                className="w-full text-white" 
                onClick={handleImprove}
                disabled={loading || extracting || !resumeText.trim()}
                style={{ backgroundColor: primaryColor }}
              >
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...</>
                ) : (
                  <><Zap className="mr-2 h-4 w-4" /> Improve My Resume</>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Output */}
          <Card>
            <CardHeader>
              <CardTitle>Improved Resume</CardTitle>
              <CardDescription>AI-enhanced version with suggestions</CardDescription>
            </CardHeader>
            <CardContent>
              {improvedResume ? (
                <div className="space-y-4">
                  {suggestions.length > 0 && (
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <h4 className="font-medium text-blue-900 mb-2">Key Improvements</h4>
                      <ul className="space-y-1">
                        {suggestions.map((s, i) => (
                          <li key={i} className="text-sm text-blue-800 flex items-start gap-2">
                            <ArrowRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <div className="bg-gray-50 p-4 rounded-lg border max-h-[400px] overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm font-sans">{improvedResume}</pre>
                  </div>
                  
                  <Button variant="outline" onClick={copyToClipboard} className="w-full">
                    {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                    {copied ? 'Copied!' : 'Copy Improved Resume'}
                  </Button>
                </div>
              ) : (
                <div className="text-center py-16 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Upload your CV or paste content and click improve to get AI suggestions</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PartnerResumeImprover;
