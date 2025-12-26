import React, { useState, useCallback } from 'react';
import { usePartner } from '../../context/PartnerContext';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { useToast } from '../../hooks/use-toast';
import { Loader2, Upload, FileText, Sparkles, Copy, Check, ArrowRight, Zap } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const PartnerResumeImprover = () => {
  const { brandName, primaryColor, secondaryColor, baseUrl } = usePartner();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [resumeText, setResumeText] = useState('');
  const [improvedResume, setImprovedResume] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [dragActive, setDragActive] = useState(false);

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

  const handleFile = async (file) => {
    if (file.type === 'text/plain') {
      const text = await file.text();
      setResumeText(text);
    } else {
      // For PDF/DOCX, we'd need backend processing
      toast({
        title: 'File Type',
        description: 'For best results, paste your resume text directly or upload a .txt file.',
        variant: 'default'
      });
    }
  };

  const handleImprove = async () => {
    if (!resumeText.trim()) {
      toast({
        title: 'No Content',
        description: 'Please paste your resume content first.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/ai/improve-resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
            Get AI-powered suggestions to enhance your resume and stand out
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Input */}
          <Card>
            <CardHeader>
              <CardTitle>Your Current Resume</CardTitle>
              <CardDescription>Paste your resume content or upload a file</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600">Drag and drop a .txt file here</p>
                <p className="text-xs text-gray-400 mt-1">or paste your resume below</p>
              </div>
              
              <Textarea
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                placeholder="Paste your resume content here...

Example:
John Smith
Software Developer

Experience:
- Senior Developer at ABC Corp (2020-Present)
- Junior Developer at XYZ Inc (2018-2020)

Skills: Python, JavaScript, React..."
                rows={16}
                className="font-mono text-sm"
              />
              
              <Button 
                className="w-full" 
                onClick={handleImprove}
                disabled={loading || !resumeText.trim()}
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
                  <p>Paste your resume and click improve to get AI suggestions</p>
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
