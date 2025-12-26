import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePartner } from '../../context/PartnerContext';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { useToast } from '../../hooks/use-toast';
import { Loader2, Copy, Check, FileText, Sparkles, Download, Mail } from 'lucide-react';
import PartnerPaywall from '../../components/PartnerPaywall';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const PartnerCoverLetterCreator = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { brandName, primaryColor, secondaryColor, baseUrl } = usePartner();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generatedLetter, setGeneratedLetter] = useState('');
  
  const [formData, setFormData] = useState({
    your_name: '',
    job_title: '',
    company_name: '',
    hiring_manager: '',
    your_experience: '',
    key_skills: '',
    why_interested: '',
    job_description: ''
  });

  // Cover letter requires tier 2 or tier 3
  const hasAccess = isAuthenticated && user?.active_tier && ['tier-2', 'tier-3'].includes(user.active_tier);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleGenerate = async () => {
    if (!hasAccess) {
      toast({
        title: 'Upgrade Required',
        description: 'Cover letter generation requires Professional Package or higher.',
        variant: 'destructive'
      });
      navigate(`${baseUrl}/pricing`);
      return;
    }

    if (!formData.job_title || !formData.company_name) {
      toast({
        title: 'Missing Information',
        description: 'Please provide at least the job title and company name.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/ai-content/generate-cover-letter`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (response.ok && data.cover_letter) {
        setGeneratedLetter(data.cover_letter);
        toast({ title: 'Success', description: 'Cover letter generated!' });
      } else {
        throw new Error(data.detail || 'Failed to generate cover letter');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate cover letter',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLetter);
    setCopied(true);
    toast({ title: 'Copied!', description: 'Cover letter copied to clipboard' });
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadAsText = () => {
    const blob = new Blob([generatedLetter], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cover_letter_${formData.company_name || 'document'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
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
            Cover Letter Creator
          </h1>
          <p className="text-lg text-white/80">
            Generate a personalized, professional cover letter in seconds
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-8 relative">
        {/* Paywall overlay if no access */}
        {!hasAccess && (
          <PartnerPaywall
            title="Unlock Cover Letter Creator"
            icon={Mail}
            description={
              !isAuthenticated 
                ? undefined
                : !user?.active_tier
                  ? "Upgrade to a paid plan to create cover letters"
                  : "Cover letter creation requires Professional Package or higher"
            }
            requiredTier="tier-2"
            features={[
              "AI-powered personalized content",
              "Tailored to job descriptions",
              "Professional formatting",
              "Multiple tone options",
              "Download as PDF or Word"
            ]}
          />
        )}

        <div className={`grid md:grid-cols-2 gap-6 ${!hasAccess ? 'opacity-50 pointer-events-none' : ''}`}>
          {/* Input Form */}
          <Card>
            <CardHeader>
              <CardTitle>Your Details</CardTitle>
              <CardDescription>Provide information to personalize your cover letter</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Your Name</Label>
                <Input name="your_name" value={formData.your_name} onChange={handleChange} placeholder="John Smith" />
              </div>
              <div>
                <Label>Job Title *</Label>
                <Input name="job_title" value={formData.job_title} onChange={handleChange} placeholder="Software Developer" />
              </div>
              <div>
                <Label>Company Name *</Label>
                <Input name="company_name" value={formData.company_name} onChange={handleChange} placeholder="Acme Corporation" />
              </div>
              <div>
                <Label>Hiring Manager (if known)</Label>
                <Input name="hiring_manager" value={formData.hiring_manager} onChange={handleChange} placeholder="Jane Doe" />
              </div>
              <div>
                <Label>Your Relevant Experience</Label>
                <Textarea name="your_experience" value={formData.your_experience} onChange={handleChange} placeholder="5 years in software development, led teams of 3-5 developers..." rows={3} />
              </div>
              <div>
                <Label>Key Skills</Label>
                <Input name="key_skills" value={formData.key_skills} onChange={handleChange} placeholder="Python, React, Project Management" />
              </div>
              <div>
                <Label>Why You're Interested</Label>
                <Textarea name="why_interested" value={formData.why_interested} onChange={handleChange} placeholder="Excited about the company's mission to..." rows={2} />
              </div>
              <div>
                <Label>Job Description (paste for better results)</Label>
                <Textarea name="job_description" value={formData.job_description} onChange={handleChange} placeholder="Paste the job description here..." rows={4} />
              </div>
              
              <Button 
                className="w-full text-white" 
                onClick={handleGenerate}
                disabled={loading}
                style={{ backgroundColor: primaryColor }}
              >
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                ) : (
                  <><Sparkles className="mr-2 h-4 w-4" /> Generate Cover Letter</>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Output */}
          <Card>
            <CardHeader>
              <CardTitle>Your Cover Letter</CardTitle>
              <CardDescription>AI-generated personalized cover letter</CardDescription>
            </CardHeader>
            <CardContent>
              {generatedLetter ? (
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg border max-h-[500px] overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm font-sans">{generatedLetter}</pre>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={copyToClipboard} className="flex-1">
                      {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                      {copied ? 'Copied!' : 'Copy'}
                    </Button>
                    <Button variant="outline" onClick={downloadAsText} className="flex-1">
                      <Download className="mr-2 h-4 w-4" /> Download
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Fill in the form and click generate to create your cover letter</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PartnerCoverLetterCreator;
