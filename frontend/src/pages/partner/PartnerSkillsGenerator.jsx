import React, { useState, useEffect } from 'react';
import { usePartner } from '../../context/PartnerContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Checkbox } from '../../components/ui/checkbox';
import { Badge } from '../../components/ui/badge';
import { Sparkles, Loader2, Target, Copy, Check, Zap, Gift } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import FreeAccountGate from '../../components/FreeAccountGate';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const PartnerSkillsGenerator = () => {
  const { brandName, primaryColor, secondaryColor, baseUrl } = usePartner();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [industries, setIndustries] = useState([]);
  const [generatedSkills, setGeneratedSkills] = useState('');
  const [showAuthGate, setShowAuthGate] = useState(false);
  
  const [formData, setFormData] = useState({
    industry: '',
    job_title: '',
    experience_level: '',
    soft_skills: true,
    hard_skills: true,
    transferable_skills: false,
    job_description: ''
  });

  useEffect(() => {
    const fetchIndustries = async () => {
      try {
        const response = await fetch(`${API_URL}/api/content/industries`);
        if (response.ok) {
          const data = await response.json();
          setIndustries(data.industries || []);
        }
      } catch (error) {
        setIndustries([
          'Technology', 'Healthcare', 'Finance', 'Education', 'Marketing',
          'Sales', 'Engineering', 'Human Resources', 'Legal', 'Retail',
          'Manufacturing', 'Hospitality', 'Construction', 'Media', 'Nonprofit'
        ]);
      }
    };
    fetchIndustries();
  }, []);

  const experienceLevels = [
    { value: 'student', label: 'Student / Fresh Graduate' },
    { value: 'entry_level', label: 'Entry Level (0-2 years)' },
    { value: 'team_lead', label: 'Team Lead (3-5 years)' },
    { value: 'manager', label: 'Manager (5-10 years)' },
    { value: 'executive', label: 'Executive (10+ years)' },
    { value: 'freelancer', label: 'Freelancer / Contractor' }
  ];

  const handleGenerateSkills = async () => {
    // Check if user is authenticated - if not, show the gate
    if (!isAuthenticated) {
      setShowAuthGate(true);
      return;
    }

    if (!formData.industry || !formData.job_title || !formData.experience_level) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in Industry, Job Title, and Experience Level.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/ai/generate-skills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (response.ok && data.skills) {
        setGeneratedSkills(data.skills);
        toast({ title: 'Success', description: 'Skills generated!' });
      } else {
        throw new Error(data.detail || 'Failed to generate skills');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate skills',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedSkills);
    setCopied(true);
    toast({ title: 'Copied!', description: 'Skills copied to clipboard' });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Free Account Gate Modal */}
      <FreeAccountGate
        isOpen={showAuthGate}
        onClose={() => setShowAuthGate(false)}
        toolName="the Skills Generator"
        redirectPath={`${baseUrl}/skills-generator`}
        isPartner={true}
        baseUrl={baseUrl}
        primaryColor={primaryColor}
      />

      {/* Hero Section */}
      <section 
        className="py-12"
        style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
      >
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Badge className="mb-4 bg-white/20 text-white border-none">
            <Gift className="mr-1 h-3 w-3" />
            Free Tool
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Skills Generator
          </h1>
          <p className="text-lg text-white/80">
            Generate relevant skills for your CV based on your industry and role
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Input Form */}
          <Card>
            <CardHeader>
              <CardTitle>Your Profile</CardTitle>
              <CardDescription>Tell us about your role to generate relevant skills</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Industry *</Label>
                <Select value={formData.industry} onValueChange={(v) => setFormData({...formData, industry: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {industries.map((ind) => (
                      <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Job Title *</Label>
                <Input 
                  value={formData.job_title} 
                  onChange={(e) => setFormData({...formData, job_title: e.target.value})}
                  placeholder="e.g., Software Developer, Marketing Manager"
                />
              </div>
              
              <div>
                <Label>Experience Level *</Label>
                <Select value={formData.experience_level} onValueChange={(v) => setFormData({...formData, experience_level: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select experience level" />
                  </SelectTrigger>
                  <SelectContent>
                    {experienceLevels.map((level) => (
                      <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-3">
                <Label>Skill Types to Include</Label>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      checked={formData.hard_skills} 
                      onCheckedChange={(c) => setFormData({...formData, hard_skills: c})}
                    />
                    <span className="text-sm">Hard Skills</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      checked={formData.soft_skills} 
                      onCheckedChange={(c) => setFormData({...formData, soft_skills: c})}
                    />
                    <span className="text-sm">Soft Skills</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      checked={formData.transferable_skills} 
                      onCheckedChange={(c) => setFormData({...formData, transferable_skills: c})}
                    />
                    <span className="text-sm">Transferable</span>
                  </div>
                </div>
              </div>
              
              <div>
                <Label>Job Description (optional)</Label>
                <Textarea 
                  value={formData.job_description} 
                  onChange={(e) => setFormData({...formData, job_description: e.target.value})}
                  placeholder="Paste the job description to get more targeted skills..."
                  rows={4}
                />
              </div>
              
              <Button 
                className="w-full" 
                onClick={handleGenerateSkills}
                disabled={loading}
                style={{ backgroundColor: primaryColor }}
              >
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                ) : (
                  <><Sparkles className="mr-2 h-4 w-4" /> Generate Skills</>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Output */}
          <Card>
            <CardHeader>
              <CardTitle>Generated Skills</CardTitle>
              <CardDescription>Copy and paste these into your CV</CardDescription>
            </CardHeader>
            <CardContent>
              {generatedSkills ? (
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg border min-h-[300px]">
                    <pre className="whitespace-pre-wrap text-sm font-sans">{generatedSkills}</pre>
                  </div>
                  <Button variant="outline" onClick={copyToClipboard} className="w-full">
                    {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                    {copied ? 'Copied!' : 'Copy Skills'}
                  </Button>
                </div>
              ) : (
                <div className="text-center py-16 text-gray-500">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Fill in your profile and generate skills tailored to your role</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PartnerSkillsGenerator;
