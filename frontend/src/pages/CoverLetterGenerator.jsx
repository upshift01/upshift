import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { useToast } from '../hooks/use-toast';
import { Loader2, Download, Sparkles, FileText, Copy } from 'lucide-react';
import { Badge } from '../components/ui/badge';

const CoverLetterGenerator = () => {
  const navigate = useNavigate();
  const { user, hasTier } = useAuth();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLetter, setGeneratedLetter] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    recipientName: '',
    companyName: '',
    jobTitle: '',
    jobDescription: '',
    keySkills: '',
    whyInterested: '',
  });

  // Load selected template from localStorage on mount
  useEffect(() => {
    const storedTemplate = localStorage.getItem('selectedCoverLetterTemplate');
    if (storedTemplate) {
      try {
        const template = JSON.parse(storedTemplate);
        setSelectedTemplate(template);
      } catch (e) {
        console.error('Error parsing template:', e);
      }
    }
  }, []);

  const clearTemplate = () => {
    setSelectedTemplate(null);
    localStorage.removeItem('selectedCoverLetterTemplate');
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const generateCoverLetter = async () => {
    // Check if user has tier 2 or 3
    if (!user?.active_tier || !['tier-2', 'tier-3'].includes(user.active_tier)) {
      toast({
        title: "Upgrade Required",
        description: "Cover letter generation requires Professional Package or higher.",
        variant: "destructive",
      });
      navigate('/pricing');
      return;
    }

    if (!formData.fullName || !formData.companyName || !formData.jobTitle) {
      toast({
        title: "Missing Information",
        description: "Please fill in your name, company name, and job title.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    // Mock generation - will be replaced with actual API call
    setTimeout(() => {
      const mockLetter = `Dear ${formData.recipientName || 'Hiring Manager'},

I am writing to express my strong interest in the ${formData.jobTitle} position at ${formData.companyName}. With my background in ${formData.keySkills || 'relevant field'}, I am confident in my ability to contribute effectively to your team and help drive success.

${formData.whyInterested ? `I am particularly drawn to ${formData.companyName} because ${formData.whyInterested}` : `I am particularly excited about this opportunity because it aligns perfectly with my career goals and allows me to leverage my expertise in a dynamic South African company.`}

Throughout my career, I have consistently demonstrated:
• Strong analytical and problem-solving abilities
• Excellent communication and interpersonal skills
• A proven track record of delivering results in fast-paced environments
• The ability to work collaboratively with diverse teams

${formData.jobDescription ? `After reviewing the job description, I believe my experience directly aligns with your requirements. I am particularly well-suited to handle the responsibilities outlined, including ${formData.jobDescription.substring(0, 100)}...` : 'My experience and skills make me an ideal candidate for this role.'}

I am excited about the possibility of bringing my unique perspective and dedication to ${formData.companyName}. I would welcome the opportunity to discuss how my background, skills, and enthusiasms align with your team's needs.

Thank you for considering my application. I look forward to the possibility of discussing this exciting opportunity with you.

Warm regards,
${formData.fullName}
${formData.email}
${formData.phone}`;

      setGeneratedLetter(mockLetter);
      setIsGenerating(false);
      toast({
        title: "Cover Letter Generated!",
        description: "Your personalized cover letter is ready.",
      });
    }, 2500);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLetter);
    toast({
      title: "Copied to Clipboard",
      description: "Cover letter copied successfully.",
    });
  };

  const downloadLetter = () => {
    const blob = new Blob([generatedLetter], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Cover_Letter_${formData.companyName}_${formData.jobTitle}.txt`;
    a.click();
    toast({
      title: "Download Started",
      description: "Your cover letter is being downloaded.",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Upgrade Notice */}
        {(!user?.active_tier || !['tier-2', 'tier-3'].includes(user.active_tier)) && (
          <div className="mb-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg p-6 text-center">
            <h3 className="text-xl font-bold mb-2">🔒 Premium Feature</h3>
            <p className="mb-4">
              AI cover letter generation requires Professional Package or Executive Elite plan.
            </p>
            <Button
              onClick={() => navigate('/pricing')}
              className="bg-white text-purple-600 hover:bg-gray-100"
            >
              Upgrade Now
            </Button>
          </div>
        )}

        <div className="text-center mb-8">
          <Badge className="mb-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white border-none">
            <Sparkles className="mr-1 h-3 w-3" />
            AI Cover Letter Generator
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Generate Professional Cover Letters
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Create compelling, personalized cover letters that match job descriptions perfectly. Tailored for the South African job market.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Form */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Your Information</CardTitle>
                <CardDescription>Tell us about yourself</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="john.doe@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+27 82 123 4567"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Job Details</CardTitle>
                <CardDescription>Information about the position</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="recipientName">Recipient Name (Optional)</Label>
                  <Input
                    id="recipientName"
                    name="recipientName"
                    value={formData.recipientName}
                    onChange={handleChange}
                    placeholder="Mr. Smith / Hiring Manager"
                  />
                </div>
                <div>
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    placeholder="ABC Corporation (Pty) Ltd"
                  />
                </div>
                <div>
                  <Label htmlFor="jobTitle">Job Title *</Label>
                  <Input
                    id="jobTitle"
                    name="jobTitle"
                    value={formData.jobTitle}
                    onChange={handleChange}
                    placeholder="Software Developer"
                  />
                </div>
                <div>
                  <Label htmlFor="jobDescription">Job Description (Paste here)</Label>
                  <Textarea
                    id="jobDescription"
                    name="jobDescription"
                    value={formData.jobDescription}
                    onChange={handleChange}
                    placeholder="Paste the job description to get a more tailored cover letter..."
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Additional Details</CardTitle>
                <CardDescription>Help AI personalize your letter</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="keySkills">Key Skills/Experience</Label>
                  <Textarea
                    id="keySkills"
                    name="keySkills"
                    value={formData.keySkills}
                    onChange={handleChange}
                    placeholder="E.g., 5 years in software development, team leadership, project management"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="whyInterested">Why This Company?</Label>
                  <Textarea
                    id="whyInterested"
                    name="whyInterested"
                    value={formData.whyInterested}
                    onChange={handleChange}
                    placeholder="Why are you interested in this company and role?"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            <Button
              onClick={generateCoverLetter}
              disabled={isGenerating || !formData.fullName || !formData.companyName || !formData.jobTitle}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating with AI...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Generate Cover Letter
                </>
              )}
            </Button>
          </div>

          {/* Generated Letter Preview */}
          <div className="space-y-4">
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="mr-2 h-5 w-5" />
                  Generated Cover Letter
                </CardTitle>
                {generatedLetter && (
                  <CardDescription>
                    AI-generated and ready to use
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {!generatedLetter ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileText className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500">Your cover letter will appear here</p>
                    <p className="text-sm text-gray-400 mt-2">Fill in the form and click generate</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-white border border-gray-200 rounded-lg p-6 max-h-[600px] overflow-y-auto">
                      <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans leading-relaxed">
                        {generatedLetter}
                      </pre>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={copyToClipboard}
                        variant="outline"
                        className="flex-1"
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Copy Text
                      </Button>
                      <Button
                        onClick={downloadLetter}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </Button>
                    </div>
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

export default CoverLetterGenerator;