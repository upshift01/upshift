import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Linkedin, 
  FileText, 
  Sparkles, 
  Plus, 
  ArrowRight, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Copy,
  Download,
  Briefcase,
  GraduationCap,
  Target,
  Zap,
  User,
  Mail,
  MapPin,
  Award,
  X,
  Lock,
  Import,
  ExternalLink,
  Crown
} from 'lucide-react';
import axios from 'axios';
import { useToast } from '../hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const LinkedInTools = () => {
  const { user, getAuthHeader, hasTier } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('convert');
  const [loading, setLoading] = useState(false);
  const [oauthConfigured, setOauthConfigured] = useState(false);
  const [result, setResult] = useState(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);

  // Check if user has premium tier access
  const isPremiumUser = user?.active_tier === 'tier-2' || user?.active_tier === 'tier-3' || 
                        user?.role === 'super_admin' || user?.role === 'reseller_admin';

  useEffect(() => {
    checkOAuthStatus();
    checkLinkedInAccess();
  }, []);

  const checkOAuthStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/linkedin/oauth/status`);
      setOauthConfigured(response.data.configured);
    } catch (error) {
      console.error('Error checking OAuth status:', error);
    }
  };

  const checkLinkedInAccess = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/api/linkedin/check-access`,
        { headers: getAuthHeader() }
      );
      setHasAccess(response.data.has_access);
    } catch (error) {
      console.error('Error checking LinkedIn access:', error);
      setHasAccess(false);
    } finally {
      setAccessChecked(true);
    }
  };

  const handleConnectLinkedIn = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/api/linkedin/oauth/authorize`,
        { headers: getAuthHeader() }
      );
      window.location.href = response.data.auth_url;
    } catch (error) {
      toast({
        title: "Connection Error",
        description: error.response?.data?.detail || "Failed to connect to LinkedIn",
        variant: "destructive"
      });
    }
  };

  // Premium feature gate component
  const PremiumGate = ({ children }) => {
    if (!accessChecked) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      );
    }

    if (!isPremiumUser) {
      return (
        <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-amber-100 rounded-full flex items-center justify-center">
              <Crown className="h-8 w-8 text-amber-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Premium Feature</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              LinkedIn import and optimization tools are available for <strong>Professional</strong> and <strong>Executive Elite</strong> plan subscribers.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                onClick={() => navigate('/pricing')}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              >
                <Crown className="mr-2 h-4 w-4" />
                Upgrade Plan
              </Button>
              <Button variant="outline" onClick={() => navigate('/dashboard')}>
                Back to Dashboard
              </Button>
            </div>
            <p className="text-sm text-gray-500 mt-4">
              Current plan: <Badge variant="secondary">{user?.active_tier || 'Free'}</Badge>
            </p>
          </CardContent>
        </Card>
      );
    }

    return children;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <Badge className="mb-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-none">
            <Linkedin className="mr-1 h-3 w-3" />
            LinkedIn Tools
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            AI-Powered LinkedIn Tools
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Convert your LinkedIn profile to a resume, create a new profile from scratch, or enhance your existing profile with AI
          </p>
        </div>

        {/* LinkedIn OAuth Connect Button (Optional) */}
        {oauthConfigured && (
          <Card className="mb-8 border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
                    <Linkedin className="h-7 w-7 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Connect Your LinkedIn</h3>
                    <p className="text-gray-600 text-sm">
                      Automatically import your profile data with one click
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={handleConnectLinkedIn}
                  className="bg-[#0A66C2] hover:bg-[#004182] text-white"
                >
                  <Linkedin className="mr-2 h-4 w-4" />
                  Connect LinkedIn
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Tabs */}
        <PremiumGate>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-8">
              <TabsTrigger value="import" className="flex items-center gap-2">
                <Import className="h-4 w-4" />
                <span className="hidden sm:inline">Import Profile</span>
                <span className="sm:hidden">Import</span>
              </TabsTrigger>
              <TabsTrigger value="convert" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">To Resume</span>
                <span className="sm:hidden">Resume</span>
              </TabsTrigger>
              <TabsTrigger value="create" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Create Profile</span>
                <span className="sm:hidden">Create</span>
              </TabsTrigger>
              <TabsTrigger value="enhance" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline">Enhance</span>
                <span className="sm:hidden">Enhance</span>
              </TabsTrigger>
            </TabsList>

            {/* Import from LinkedIn URL Tab */}
            <TabsContent value="import">
              <ImportFromLinkedIn 
                getAuthHeader={getAuthHeader} 
                toast={toast}
                loading={loading}
                setLoading={setLoading}
                result={result}
                setResult={setResult}
              />
            </TabsContent>

            {/* Convert to Resume Tab */}
            <TabsContent value="convert">
              <ConvertToResume 
                getAuthHeader={getAuthHeader} 
                toast={toast}
                loading={loading}
                setLoading={setLoading}
                result={result}
                setResult={setResult}
              />
            </TabsContent>

            {/* Create Profile Tab */}
            <TabsContent value="create">
              <CreateProfile 
                getAuthHeader={getAuthHeader} 
                toast={toast}
                loading={loading}
                setLoading={setLoading}
                result={result}
                setResult={setResult}
              />
            </TabsContent>

            {/* Enhance Profile Tab */}
            <TabsContent value="enhance">
              <EnhanceProfile 
                getAuthHeader={getAuthHeader} 
                toast={toast}
                loading={loading}
                setLoading={setLoading}
                result={result}
                setResult={setResult}
              />
            </TabsContent>
          </Tabs>
        </PremiumGate>
      </div>
    </div>
  );
};


// Import from LinkedIn URL Component
const ImportFromLinkedIn = ({ getAuthHeader, toast, loading, setLoading, result, setResult }) => {
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [importedProfile, setImportedProfile] = useState(null);
  const [generateContentLoading, setGenerateContentLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState(null);

  const handleImport = async () => {
    if (!linkedinUrl.trim()) {
      toast({
        title: "URL Required",
        description: "Please enter a LinkedIn profile URL",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setImportedProfile(null);
    setResult(null);

    try {
      const response = await axios.post(
        `${API_URL}/api/linkedin/import-from-url`,
        { linkedin_url: linkedinUrl },
        { headers: getAuthHeader() }
      );

      if (response.data.success) {
        setImportedProfile(response.data.profile);
        toast({
          title: "Profile Imported",
          description: "LinkedIn profile data has been imported successfully",
        });
      }
    } catch (error) {
      const errorDetail = error.response?.data?.detail;
      toast({
        title: "Import Failed",
        description: typeof errorDetail === 'object' ? errorDetail.message : errorDetail || "Failed to import LinkedIn profile",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateContent = async () => {
    if (!importedProfile) return;

    setGenerateContentLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/linkedin/generate-linkedin-content`,
        {
          full_name: importedProfile.full_name,
          current_title: importedProfile.headline,
          summary: importedProfile.summary,
          experiences: importedProfile.experiences,
          education: importedProfile.education,
          skills: importedProfile.skills
        },
        { headers: getAuthHeader() }
      );

      if (response.data.success) {
        setGeneratedContent(response.data.linkedin_content);
        toast({
          title: "Content Generated",
          description: "LinkedIn-optimized content is ready to copy",
        });
      }
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: error.response?.data?.detail || "Failed to generate content",
        variant: "destructive"
      });
    } finally {
      setGenerateContentLoading(false);
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Import Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Import className="h-5 w-5 text-blue-600" />
            Import from LinkedIn
          </CardTitle>
          <CardDescription>
            Enter a public LinkedIn profile URL to import profile data. The profile must be publicly visible.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="https://linkedin.com/in/username"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleImport} disabled={loading}>
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importing...</>
              ) : (
                <><Import className="mr-2 h-4 w-4" /> Import</>
              )}
            </Button>
          </div>
          <p className="text-sm text-gray-500">
            <AlertCircle className="inline h-4 w-4 mr-1" />
            Only publicly visible information will be imported. Private profiles cannot be accessed.
          </p>
        </CardContent>
      </Card>

      {/* Imported Profile Display */}
      {importedProfile && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-5 w-5" />
              Imported Profile Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Full Name</label>
                <p className="text-lg font-semibold">{importedProfile.full_name || 'Not found'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Headline</label>
                <p>{importedProfile.headline || 'Not found'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Location</label>
                <p>{importedProfile.location || 'Not found'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">LinkedIn URL</label>
                <a href={importedProfile.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                  View Profile <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            {importedProfile.summary && (
              <div>
                <label className="text-sm font-medium text-gray-500">Summary</label>
                <p className="mt-1 text-gray-700">{importedProfile.summary}</p>
              </div>
            )}

            {importedProfile.experiences?.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-500">Experience ({importedProfile.experiences.length})</label>
                <ul className="mt-2 space-y-2">
                  {importedProfile.experiences.map((exp, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Briefcase className="h-4 w-4 mt-1 text-gray-400" />
                      <span>{exp.title} {exp.company && `at ${exp.company}`}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {importedProfile.education?.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-500">Education ({importedProfile.education.length})</label>
                <ul className="mt-2 space-y-2">
                  {importedProfile.education.map((edu, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <GraduationCap className="h-4 w-4 mt-1 text-gray-400" />
                      <span>{edu.institution} {edu.degree && `- ${edu.degree}`}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {importedProfile.skills?.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-500">Skills ({importedProfile.skills.length})</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {importedProfile.skills.map((skill, i) => (
                    <Badge key={i} variant="secondary">{skill}</Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 border-t flex gap-3">
              <Button onClick={handleGenerateContent} disabled={generateContentLoading}>
                {generateContentLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                ) : (
                  <><Sparkles className="mr-2 h-4 w-4" /> Generate Optimized Content</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generated LinkedIn Content */}
      {generatedContent && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <Sparkles className="h-5 w-5" />
              LinkedIn-Optimized Content (Copy & Paste)
            </CardTitle>
            <CardDescription>
              Copy this content to update your LinkedIn profile. Click on any section to copy.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Headline */}
            <div className="bg-white rounded-lg p-4 border">
              <div className="flex justify-between items-start mb-2">
                <label className="text-sm font-bold text-gray-700">Recommended Headline</label>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => copyToClipboard(generatedContent.headline?.recommended, 'Headline')}
                >
                  <Copy className="h-4 w-4 mr-1" /> Copy
                </Button>
              </div>
              <p className="text-lg">{generatedContent.headline?.recommended}</p>
              <p className="text-xs text-gray-500 mt-2">{generatedContent.headline?.tip}</p>
            </div>

            {/* About Section */}
            <div className="bg-white rounded-lg p-4 border">
              <div className="flex justify-between items-start mb-2">
                <label className="text-sm font-bold text-gray-700">About Section</label>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => copyToClipboard(generatedContent.about_section?.content, 'About section')}
                >
                  <Copy className="h-4 w-4 mr-1" /> Copy
                </Button>
              </div>
              <p className="whitespace-pre-wrap">{generatedContent.about_section?.content}</p>
              <p className="text-xs text-gray-500 mt-2">{generatedContent.about_section?.tip}</p>
            </div>

            {/* Keywords */}
            {generatedContent.keywords_to_include?.length > 0 && (
              <div className="bg-white rounded-lg p-4 border">
                <label className="text-sm font-bold text-gray-700">Keywords to Include</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {generatedContent.keywords_to_include.map((keyword, i) => (
                    <Badge key={i} variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Profile Tips */}
            {generatedContent.profile_tips?.length > 0 && (
              <div className="bg-white rounded-lg p-4 border">
                <label className="text-sm font-bold text-gray-700">Profile Optimization Tips</label>
                <ul className="mt-2 space-y-2">
                  {generatedContent.profile_tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};


// Convert LinkedIn to Resume Component
const ConvertToResume = ({ getAuthHeader, toast, loading, setLoading, result, setResult }) => {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    headline: '',
    summary: '',
    location: '',
    work_experience: [{ title: '', company: '', start_date: '', end_date: '', description: '' }],
    education: [{ degree: '', institution: '', graduation_date: '' }],
    skills: '',
    certifications: ''
  });

  const addWorkExperience = () => {
    setFormData({
      ...formData,
      work_experience: [...formData.work_experience, { title: '', company: '', start_date: '', end_date: '', description: '' }]
    });
  };

  const addEducation = () => {
    setFormData({
      ...formData,
      education: [...formData.education, { degree: '', institution: '', graduation_date: '' }]
    });
  };

  const updateWorkExperience = (index, field, value) => {
    const updated = [...formData.work_experience];
    updated[index][field] = value;
    setFormData({ ...formData, work_experience: updated });
  };

  const updateEducation = (index, field, value) => {
    const updated = [...formData.education];
    updated[index][field] = value;
    setFormData({ ...formData, education: updated });
  };

  const removeWorkExperience = (index) => {
    const updated = formData.work_experience.filter((_, i) => i !== index);
    setFormData({ ...formData, work_experience: updated });
  };

  const removeEducation = (index) => {
    const updated = formData.education.filter((_, i) => i !== index);
    setFormData({ ...formData, education: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.full_name) {
      toast({ title: "Error", description: "Please enter your full name", variant: "destructive" });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const payload = {
        ...formData,
        skills: formData.skills.split(',').map(s => s.trim()).filter(s => s),
        certifications: formData.certifications.split(',').map(s => s.trim()).filter(s => s)
      };

      const response = await axios.post(
        `${API_URL}/api/linkedin/convert-to-resume`,
        payload,
        { headers: getAuthHeader() }
      );

      setResult(response.data.resume);
      toast({
        title: "Success!",
        description: "Your LinkedIn profile has been converted to a resume",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to convert profile",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: "Content copied to clipboard" });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Input Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Linkedin className="h-5 w-5 text-blue-600" />
            LinkedIn Profile Data
          </CardTitle>
          <CardDescription>
            Enter your LinkedIn profile information to convert it to a professional resume
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name *</label>
                <Input
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="John Doe"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">LinkedIn Headline</label>
              <Input
                value={formData.headline}
                onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                placeholder="Senior Software Engineer at Tech Company"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Location</label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Johannesburg, South Africa"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">About / Summary</label>
              <textarea
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                placeholder="Your LinkedIn summary..."
                className="w-full px-3 py-2 border rounded-lg text-sm min-h-[100px]"
              />
            </div>

            {/* Work Experience */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium">Work Experience</label>
                <Button type="button" variant="outline" size="sm" onClick={addWorkExperience}>
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
              {formData.work_experience.map((exp, index) => (
                <div key={index} className="border rounded-lg p-3 mb-2 bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs text-gray-500">Experience {index + 1}</span>
                    {formData.work_experience.length > 1 && (
                      <button type="button" onClick={() => removeWorkExperience(index)} className="text-red-500 hover:text-red-700">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <Input
                      placeholder="Job Title"
                      value={exp.title}
                      onChange={(e) => updateWorkExperience(index, 'title', e.target.value)}
                    />
                    <Input
                      placeholder="Company"
                      value={exp.company}
                      onChange={(e) => updateWorkExperience(index, 'company', e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <Input
                      placeholder="Start Date"
                      value={exp.start_date}
                      onChange={(e) => updateWorkExperience(index, 'start_date', e.target.value)}
                    />
                    <Input
                      placeholder="End Date (or Present)"
                      value={exp.end_date}
                      onChange={(e) => updateWorkExperience(index, 'end_date', e.target.value)}
                    />
                  </div>
                  <textarea
                    placeholder="Description / Achievements"
                    value={exp.description}
                    onChange={(e) => updateWorkExperience(index, 'description', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm min-h-[60px]"
                  />
                </div>
              ))}
            </div>

            {/* Education */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium">Education</label>
                <Button type="button" variant="outline" size="sm" onClick={addEducation}>
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
              {formData.education.map((edu, index) => (
                <div key={index} className="border rounded-lg p-3 mb-2 bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs text-gray-500">Education {index + 1}</span>
                    {formData.education.length > 1 && (
                      <button type="button" onClick={() => removeEducation(index)} className="text-red-500 hover:text-red-700">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <Input
                      placeholder="Degree"
                      value={edu.degree}
                      onChange={(e) => updateEducation(index, 'degree', e.target.value)}
                    />
                    <Input
                      placeholder="Institution"
                      value={edu.institution}
                      onChange={(e) => updateEducation(index, 'institution', e.target.value)}
                    />
                  </div>
                  <Input
                    placeholder="Graduation Date"
                    value={edu.graduation_date}
                    onChange={(e) => updateEducation(index, 'graduation_date', e.target.value)}
                  />
                </div>
              ))}
            </div>

            {/* Skills & Certifications */}
            <div>
              <label className="block text-sm font-medium mb-1">Skills (comma separated)</label>
              <Input
                value={formData.skills}
                onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                placeholder="Python, JavaScript, Project Management, Leadership"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Certifications (comma separated)</label>
              <Input
                value={formData.certifications}
                onChange={(e) => setFormData({ ...formData, certifications: e.target.value })}
                placeholder="PMP, AWS Solutions Architect, CISSP"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Converting...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Convert to Resume
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-green-600" />
            Generated Resume
          </CardTitle>
          <CardDescription>
            Your AI-generated professional resume
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
              <p className="text-gray-600">Converting your LinkedIn profile to a resume...</p>
              <p className="text-sm text-gray-500">This may take 30-60 seconds</p>
            </div>
          ) : result ? (
            <div className="space-y-4">
              {/* Professional Summary */}
              <div className="border rounded-lg p-4 bg-blue-50">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-blue-800">Professional Summary</h4>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(result.professional_summary)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-gray-700">{result.professional_summary}</p>
              </div>

              {/* Work Experience */}
              {result.work_experience && result.work_experience.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center">
                    <Briefcase className="h-4 w-4 mr-2" /> Work Experience
                  </h4>
                  {result.work_experience.map((job, idx) => (
                    <div key={idx} className="border rounded-lg p-3 mb-2">
                      <div className="font-medium">{job.job_title}</div>
                      <div className="text-sm text-gray-600">{job.company} | {job.start_date} - {job.end_date}</div>
                      <ul className="mt-2 text-sm list-disc list-inside">
                        {job.achievements?.slice(0, 3).map((ach, i) => (
                          <li key={i} className="text-gray-700">{ach}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              {/* Skills */}
              {result.skills && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center">
                    <Zap className="h-4 w-4 mr-2" /> Skills
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {result.skills.technical?.map((skill, idx) => (
                      <Badge key={idx} variant="secondary">{skill}</Badge>
                    ))}
                    {result.skills.soft_skills?.map((skill, idx) => (
                      <Badge key={idx} variant="outline">{skill}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Full Resume Text */}
              {result.resume_text && (
                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">Full Resume</h4>
                    <Button variant="outline" size="sm" onClick={() => copyToClipboard(result.resume_text)}>
                      <Copy className="h-4 w-4 mr-1" /> Copy All
                    </Button>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg max-h-[300px] overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">{result.resume_text}</pre>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <FileText className="h-12 w-12 mb-4 text-gray-300" />
              <p>Fill in your LinkedIn data and click "Convert to Resume"</p>
              <p className="text-sm">Your AI-generated resume will appear here</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Create LinkedIn Profile Component
const CreateProfile = ({ getAuthHeader, toast, loading, setLoading, result, setResult }) => {
  const [formData, setFormData] = useState({
    full_name: '',
    current_title: '',
    target_role: '',
    industry: '',
    years_experience: 0,
    key_skills: '',
    achievements: '',
    career_goals: '',
    work_history: [{ title: '', company: '', duration: '', key_responsibilities: '' }],
    education: [{ degree: '', institution: '' }]
  });

  const addWorkHistory = () => {
    setFormData({
      ...formData,
      work_history: [...formData.work_history, { title: '', company: '', duration: '', key_responsibilities: '' }]
    });
  };

  const updateWorkHistory = (index, field, value) => {
    const updated = [...formData.work_history];
    updated[index][field] = value;
    setFormData({ ...formData, work_history: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.full_name || !formData.current_title) {
      toast({ title: "Error", description: "Please fill in required fields", variant: "destructive" });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const payload = {
        ...formData,
        key_skills: formData.key_skills.split(',').map(s => s.trim()).filter(s => s),
        achievements: formData.achievements.split(',').map(s => s.trim()).filter(s => s)
      };

      const response = await axios.post(
        `${API_URL}/api/linkedin/create-profile`,
        payload,
        { headers: getAuthHeader() }
      );

      setResult(response.data.profile);
      toast({
        title: "Profile Created!",
        description: "Your LinkedIn profile content has been generated",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to create profile",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: "Content copied to clipboard" });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Input Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-green-600" />
            Create Your Profile
          </CardTitle>
          <CardDescription>
            Don't have a LinkedIn profile yet? We'll create one for you
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name *</label>
                <Input
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Your full name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Current Title *</label>
                <Input
                  value={formData.current_title}
                  onChange={(e) => setFormData({ ...formData, current_title: e.target.value })}
                  placeholder="Software Engineer"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Target Role</label>
                <Input
                  value={formData.target_role}
                  onChange={(e) => setFormData({ ...formData, target_role: e.target.value })}
                  placeholder="Senior Developer"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Industry *</label>
                <Input
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  placeholder="Technology"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Years of Experience</label>
              <Input
                type="number"
                value={formData.years_experience}
                onChange={(e) => setFormData({ ...formData, years_experience: parseInt(e.target.value) || 0 })}
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Key Skills (comma separated)</label>
              <Input
                value={formData.key_skills}
                onChange={(e) => setFormData({ ...formData, key_skills: e.target.value })}
                placeholder="Python, Leadership, Project Management"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Key Achievements (comma separated)</label>
              <textarea
                value={formData.achievements}
                onChange={(e) => setFormData({ ...formData, achievements: e.target.value })}
                placeholder="Led team of 10, Increased sales by 50%, Launched new product"
                className="w-full px-3 py-2 border rounded-lg text-sm min-h-[80px]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Career Goals</label>
              <textarea
                value={formData.career_goals}
                onChange={(e) => setFormData({ ...formData, career_goals: e.target.value })}
                placeholder="What are your career aspirations?"
                className="w-full px-3 py-2 border rounded-lg text-sm min-h-[60px]"
              />
            </div>

            <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Profile...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate LinkedIn Profile
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Linkedin className="h-5 w-5 text-blue-600" />
            Your LinkedIn Profile
          </CardTitle>
          <CardDescription>
            AI-generated profile content ready to use
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-green-600 mb-4" />
              <p className="text-gray-600">Creating your LinkedIn profile...</p>
              <p className="text-sm text-gray-500">This may take 30-60 seconds</p>
            </div>
          ) : result ? (
            <div className="space-y-4">
              {/* Headline */}
              <div className="border rounded-lg p-4 bg-blue-50">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-blue-800">Headline</h4>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(result.headline)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm font-medium">{result.headline}</p>
                {result.headline_alternatives && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 mb-1">Alternatives:</p>
                    {result.headline_alternatives.map((alt, idx) => (
                      <p key={idx} className="text-xs text-gray-600 mb-1">• {alt}</p>
                    ))}
                  </div>
                )}
              </div>

              {/* About Section */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">About Section</h4>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(result.about_summary)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-line">{result.about_summary}</p>
              </div>

              {/* Skills to Add */}
              {result.skills_to_add && (
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Recommended Skills</h4>
                  <div className="mb-2">
                    <p className="text-xs text-gray-500 mb-1">Must-Have Skills:</p>
                    <div className="flex flex-wrap gap-1">
                      {result.skills_to_add.priority_1?.map((skill, idx) => (
                        <Badge key={idx} className="bg-green-100 text-green-700">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Additional Skills:</p>
                    <div className="flex flex-wrap gap-1">
                      {result.skills_to_add.priority_2?.slice(0, 5).map((skill, idx) => (
                        <Badge key={idx} variant="outline">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Optimization Tips */}
              {result.profile_optimisation_tips && (
                <div className="border rounded-lg p-4 bg-yellow-50">
                  <h4 className="font-semibold mb-2 text-yellow-800">Profile Tips</h4>
                  <ul className="text-sm space-y-1">
                    {result.profile_optimisation_tips.map((tip, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Linkedin className="h-12 w-12 mb-4 text-gray-300" />
              <p>Fill in your information and click "Generate LinkedIn Profile"</p>
              <p className="text-sm">Your AI-generated profile will appear here</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Enhance LinkedIn Profile Component
const EnhanceProfile = ({ getAuthHeader, toast, loading, setLoading, result, setResult }) => {
  const [formData, setFormData] = useState({
    headline: '',
    about: '',
    experience: [{ title: '', company: '', description: '' }],
    skills: '',
    target_role: ''
  });

  const addExperience = () => {
    setFormData({
      ...formData,
      experience: [...formData.experience, { title: '', company: '', description: '' }]
    });
  };

  const updateExperience = (index, field, value) => {
    const updated = [...formData.experience];
    updated[index][field] = value;
    setFormData({ ...formData, experience: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.headline && !formData.about && !formData.skills) {
      toast({ title: "Error", description: "Please enter at least one section to enhance", variant: "destructive" });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const payload = {
        ...formData,
        skills: formData.skills.split(',').map(s => s.trim()).filter(s => s)
      };

      const response = await axios.post(
        `${API_URL}/api/linkedin/enhance-profile`,
        payload,
        { headers: getAuthHeader() }
      );

      setResult(response.data.analysis);
      toast({
        title: "Analysis Complete!",
        description: "Your profile enhancement suggestions are ready",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to analyse profile",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: "Content copied to clipboard" });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Input Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Current Profile
          </CardTitle>
          <CardDescription>
            Paste your current LinkedIn content to get AI-powered improvement suggestions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Current Headline</label>
              <Input
                value={formData.headline}
                onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                placeholder="Your current LinkedIn headline"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Target Role (optional)</label>
              <Input
                value={formData.target_role}
                onChange={(e) => setFormData({ ...formData, target_role: e.target.value })}
                placeholder="What role are you targeting?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Current About Section</label>
              <textarea
                value={formData.about}
                onChange={(e) => setFormData({ ...formData, about: e.target.value })}
                placeholder="Paste your current LinkedIn About section..."
                className="w-full px-3 py-2 border rounded-lg text-sm min-h-[120px]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Current Skills (comma separated)</label>
              <Input
                value={formData.skills}
                onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                placeholder="Python, JavaScript, Project Management"
              />
            </div>

            {/* Experience */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium">Experience Sections to Enhance</label>
                <Button type="button" variant="outline" size="sm" onClick={addExperience}>
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
              {formData.experience.map((exp, index) => (
                <div key={index} className="border rounded-lg p-3 mb-2 bg-gray-50">
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <Input
                      placeholder="Job Title"
                      value={exp.title}
                      onChange={(e) => updateExperience(index, 'title', e.target.value)}
                    />
                    <Input
                      placeholder="Company"
                      value={exp.company}
                      onChange={(e) => updateExperience(index, 'company', e.target.value)}
                    />
                  </div>
                  <textarea
                    placeholder="Current description"
                    value={exp.description}
                    onChange={(e) => updateExperience(index, 'description', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm min-h-[60px]"
                  />
                </div>
              ))}
            </div>

            <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Enhance My Profile
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-600" />
            Enhancement Suggestions
          </CardTitle>
          <CardDescription>
            AI-powered improvements for your LinkedIn profile
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-purple-600 mb-4" />
              <p className="text-gray-600">Analyzing your profile...</p>
              <p className="text-sm text-gray-500">This may take 30-60 seconds</p>
            </div>
          ) : result ? (
            <div className="space-y-4">
              {/* Overall Score */}
              <div className="grid grid-cols-3 gap-3">
                <div className="border rounded-lg p-3 text-center">
                  <div className={`text-2xl font-bold ${result.overall_score >= 70 ? 'text-green-600' : result.overall_score >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {result.overall_score}/100
                  </div>
                  <div className="text-xs text-gray-500">Overall Score</div>
                </div>
                <div className="border rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-blue-600">{result.recruiter_appeal_score || 'N/A'}</div>
                  <div className="text-xs text-gray-500">Recruiter Appeal</div>
                </div>
                <div className="border rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-purple-600">{result.ats_compatibility_score || 'N/A'}</div>
                  <div className="text-xs text-gray-500">ATS Score</div>
                </div>
              </div>

              {/* Section Analysis */}
              {result.section_analysis && (
                <>
                  {/* Headline Enhancement */}
                  {result.section_analysis.headline && (
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">Enhanced Headline</h4>
                        <div className="flex items-center gap-2">
                          <Badge variant={result.section_analysis.headline.current_score >= 70 ? "default" : "secondary"}>
                            {result.section_analysis.headline.current_score}/100
                          </Badge>
                          <Button variant="ghost" size="sm" onClick={() => copyToClipboard(result.section_analysis.headline.enhanced_version)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm font-medium text-green-700 bg-green-50 p-2 rounded">
                        {result.section_analysis.headline.enhanced_version}
                      </p>
                      {result.section_analysis.headline.issues?.length > 0 && (
                        <div className="mt-2 text-xs text-red-600">
                          Issues: {result.section_analysis.headline.issues.join(', ')}
                        </div>
                      )}
                    </div>
                  )}

                  {/* About Enhancement */}
                  {result.section_analysis.about && (
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">Enhanced About</h4>
                        <div className="flex items-center gap-2">
                          <Badge variant={result.section_analysis.about.current_score >= 70 ? "default" : "secondary"}>
                            {result.section_analysis.about.current_score}/100
                          </Badge>
                          <Button variant="ghost" size="sm" onClick={() => copyToClipboard(result.section_analysis.about.enhanced_version)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-sm bg-green-50 p-3 rounded max-h-[200px] overflow-y-auto">
                        <p className="whitespace-pre-line">{result.section_analysis.about.enhanced_version}</p>
                      </div>
                    </div>
                  )}

                  {/* Skills Analysis */}
                  {result.section_analysis.skills && (
                    <div className="border rounded-lg p-4">
                      <h4 className="font-semibold mb-2">Skills Optimization</h4>
                      {result.section_analysis.skills.missing_critical_skills?.length > 0 && (
                        <div className="mb-2">
                          <p className="text-xs text-gray-500 mb-1">Add These Skills:</p>
                          <div className="flex flex-wrap gap-1">
                            {result.section_analysis.skills.missing_critical_skills.map((skill, idx) => (
                              <Badge key={idx} className="bg-green-100 text-green-700">{skill}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Action Items */}
              {result.action_items && result.action_items.length > 0 && (
                <div className="border rounded-lg p-4 bg-yellow-50">
                  <h4 className="font-semibold mb-2 text-yellow-800">Priority Actions</h4>
                  <div className="space-y-2">
                    {result.action_items.slice(0, 5).map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-sm">
                        <Badge variant={item.priority === 'high' ? 'destructive' : item.priority === 'medium' ? 'default' : 'secondary'} className="text-xs">
                          {item.priority}
                        </Badge>
                        <div>
                          <p className="font-medium">{item.action}</p>
                          <p className="text-xs text-gray-600">{item.impact}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Sparkles className="h-12 w-12 mb-4 text-gray-300" />
              <p>Paste your current LinkedIn content</p>
              <p className="text-sm">Get AI-powered suggestions to enhance your profile</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LinkedInTools;
