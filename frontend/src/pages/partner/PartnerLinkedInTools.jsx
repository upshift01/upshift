import React, { useState } from 'react';
import { usePartner } from '../../context/PartnerContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { useToast } from '../../hooks/use-toast';
import { Loader2, Linkedin, Copy, Check, Sparkles, User, Briefcase, FileText, Lock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const PartnerLinkedInTools = () => {
  const { user, isAuthenticated } = useAuth();
  const { brandName, primaryColor, secondaryColor, baseUrl } = usePartner();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('headline');
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');

  const hasAccess = isAuthenticated && user?.active_tier;

  const tools = [
    { id: 'headline', name: 'Headline Generator', icon: User, description: 'Create an attention-grabbing LinkedIn headline' },
    { id: 'summary', name: 'Summary Writer', icon: FileText, description: 'Write a compelling About section' },
    { id: 'experience', name: 'Experience Optimizer', icon: Briefcase, description: 'Enhance your work experience descriptions' },
  ];

  const PaywallOverlay = () => (
    <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-10 flex items-center justify-center">
      <Card className="max-w-md mx-4 shadow-xl border-2" style={{ borderColor: primaryColor }}>
        <CardHeader className="text-center">
          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: `${primaryColor}15` }}
          >
            <Lock className="h-8 w-8" style={{ color: primaryColor }} />
          </div>
          <CardTitle className="text-xl">Unlock LinkedIn Tools</CardTitle>
          <CardDescription>
            {!isAuthenticated 
              ? "Please login to access LinkedIn Tools"
              : "Upgrade to a paid plan to optimize your LinkedIn profile"
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" style={{ color: primaryColor }} />
              AI-powered headline generator
            </li>
            <li className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" style={{ color: primaryColor }} />
              Professional summary writer
            </li>
            <li className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" style={{ color: primaryColor }} />
              Experience optimization
            </li>
          </ul>
          
          {!isAuthenticated ? (
            <div className="flex gap-2">
              <Link to={`${baseUrl}/login`} className="flex-1">
                <Button className="w-full" style={{ backgroundColor: primaryColor }}>Login</Button>
              </Link>
              <Link to={`${baseUrl}/register`} className="flex-1">
                <Button variant="outline" className="w-full">Sign Up</Button>
              </Link>
            </div>
          ) : (
            <Link to={`${baseUrl}/pricing`}>
              <Button className="w-full text-white" style={{ backgroundColor: primaryColor }}>
                View Pricing Plans
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const handleGenerate = async () => {
    if (!input.trim()) {
      toast({ title: 'Please enter some information', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/ai-content/linkedin-${activeTab}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ input })
      });

      const data = await response.json();
      if (response.ok) {
        setResult(data.result || data.content || '');
        toast({ title: 'Generated successfully!' });
      } else {
        throw new Error(data.detail || 'Failed to generate');
      }
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    toast({ title: 'Copied to clipboard!' });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <section 
        className="py-12"
        style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
      >
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Badge className="mb-4 bg-white/20 text-white border-none">
            <Linkedin className="mr-1 h-3 w-3" />
            LinkedIn Optimization
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            LinkedIn Profile Tools
          </h1>
          <p className="text-lg text-white/80">
            Optimize your LinkedIn profile with AI-powered tools
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-8 relative">
        {!hasAccess && <PaywallOverlay />}

        <div className={!hasAccess ? 'opacity-50 pointer-events-none' : ''}>
          {/* Tool Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto">
            {tools.map((tool) => (
              <Button
                key={tool.id}
                variant={activeTab === tool.id ? 'default' : 'outline'}
                onClick={() => { setActiveTab(tool.id); setResult(''); }}
                style={activeTab === tool.id ? { backgroundColor: primaryColor } : {}}
              >
                <tool.icon className="h-4 w-4 mr-2" />
                {tool.name}
              </Button>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{tools.find(t => t.id === activeTab)?.name}</CardTitle>
                <CardDescription>{tools.find(t => t.id === activeTab)?.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={activeTab === 'headline' 
                    ? 'Enter your job title, skills, and what makes you unique...'
                    : activeTab === 'summary'
                    ? 'Describe your career journey, achievements, and goals...'
                    : 'Paste your current job description to optimize...'}
                  rows={8}
                />
                <Button 
                  className="w-full text-white" 
                  onClick={handleGenerate}
                  disabled={loading}
                  style={{ backgroundColor: primaryColor }}
                >
                  {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</> : <><Sparkles className="mr-2 h-4 w-4" /> Generate</>}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Result</CardTitle>
                <CardDescription>Your optimized LinkedIn content</CardDescription>
              </CardHeader>
              <CardContent>
                {result ? (
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg border min-h-[200px]">
                      <pre className="whitespace-pre-wrap text-sm font-sans">{result}</pre>
                    </div>
                    <Button variant="outline" onClick={copyToClipboard} className="w-full">
                      {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                      {copied ? 'Copied!' : 'Copy to Clipboard'}
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-16 text-gray-500">
                    <Linkedin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Enter your information and click generate</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartnerLinkedInTools;
