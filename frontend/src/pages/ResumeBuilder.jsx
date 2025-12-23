import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { useToast } from '../hooks/use-toast';
import { Loader2, Download, Plus, Trash2, Sparkles, Upload, FileText, Wand2 } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { industries } from '../mockData';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

const ResumeBuilder = () => {
  const navigate = useNavigate();
  const { user, hasTier } = useAuth();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    idNumber: '',
    address: '',
    city: '',
    province: '',
    postalCode: '',
    industry: '',
    summary: '',
    experiences: [{ title: '', company: '', duration: '', description: '', achievements: '' }],
    education: [{ degree: '', institution: '', year: '', location: '' }],
    skills: [''],
    languages: [{ language: '', proficiency: '' }],
  });

  // Handle CV file upload and AI enhancement
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];
    if (!validTypes.includes(file.type) && !file.name.endsWith('.docx') && !file.name.endsWith('.pdf')) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a PDF or Word document (.pdf, .docx)",
        variant: "destructive",
      });
      return;
    }

    setUploadedFile(file);
    setIsUploading(true);

    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/cv/extract-and-enhance`, {
        method: 'POST',
        body: formDataUpload,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to process CV');
      }

      const data = await response.json();
      const enhanced = data.enhanced_data;

      // Populate form with enhanced data
      setFormData({
        fullName: enhanced.fullName || '',
        email: enhanced.email || '',
        phone: enhanced.phone || '',
        idNumber: '',
        address: enhanced.address || '',
        city: enhanced.city || '',
        province: enhanced.province || '',
        postalCode: '',
        industry: enhanced.industry || '',
        summary: enhanced.summary || '',
        experiences: enhanced.experiences?.length > 0 
          ? enhanced.experiences 
          : [{ title: '', company: '', duration: '', description: '', achievements: '' }],
        education: enhanced.education?.length > 0 
          ? enhanced.education 
          : [{ degree: '', institution: '', year: '', location: '' }],
        skills: enhanced.skills?.length > 0 ? enhanced.skills : [''],
        languages: enhanced.languages?.length > 0 
          ? enhanced.languages 
          : [{ language: '', proficiency: '' }],
      });

      setAiSuggestions(data.suggestions || []);

      toast({
        title: "CV Uploaded & Enhanced! ✨",
        description: "Your CV content has been extracted and enhanced by AI. Review and edit as needed.",
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Could not process your CV. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Load selected template from localStorage on mount
  React.useEffect(() => {
    const storedTemplate = localStorage.getItem('selectedTemplate');
    if (storedTemplate) {
      try {
        const template = JSON.parse(storedTemplate);
        setSelectedTemplate(template);
        // Pre-fill industry if template has one
        if (template.industry) {
          setFormData(prev => ({ ...prev, industry: template.industry }));
        }
      } catch (e) {
        console.error('Error parsing template:', e);
      }
    }
  }, []);

  const clearTemplate = () => {
    setSelectedTemplate(null);
    localStorage.removeItem('selectedTemplate');
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleExperienceChange = (index, field, value) => {
    const newExperiences = [...formData.experiences];
    newExperiences[index][field] = value;
    setFormData({ ...formData, experiences: newExperiences });
  };

  const handleEducationChange = (index, field, value) => {
    const newEducation = [...formData.education];
    newEducation[index][field] = value;
    setFormData({ ...formData, education: newEducation });
  };

  const handleSkillChange = (index, value) => {
    const newSkills = [...formData.skills];
    newSkills[index] = value;
    setFormData({ ...formData, skills: newSkills });
  };

  const handleLanguageChange = (index, field, value) => {
    const newLanguages = [...formData.languages];
    newLanguages[index][field] = value;
    setFormData({ ...formData, languages: newLanguages });
  };

  const addExperience = () => {
    setFormData({
      ...formData,
      experiences: [...formData.experiences, { title: '', company: '', duration: '', description: '', achievements: '' }],
    });
  };

  const removeExperience = (index) => {
    const newExperiences = formData.experiences.filter((_, i) => i !== index);
    setFormData({ ...formData, experiences: newExperiences });
  };

  const addEducation = () => {
    setFormData({
      ...formData,
      education: [...formData.education, { degree: '', institution: '', year: '', location: '' }],
    });
  };

  const removeEducation = (index) => {
    const newEducation = formData.education.filter((_, i) => i !== index);
    setFormData({ ...formData, education: newEducation });
  };

  const addSkill = () => {
    setFormData({ ...formData, skills: [...formData.skills, ''] });
  };

  const removeSkill = (index) => {
    const newSkills = formData.skills.filter((_, i) => i !== index);
    setFormData({ ...formData, skills: newSkills });
  };

  const addLanguage = () => {
    setFormData({ ...formData, languages: [...formData.languages, { language: '', proficiency: '' }] });
  };

  const removeLanguage = (index) => {
    const newLanguages = formData.languages.filter((_, i) => i !== index);
    setFormData({ ...formData, languages: newLanguages });
  };

  const getAiSuggestion = async (field) => {
    setAiSuggestion('Getting AI suggestion...');
    // Mock AI suggestion - will be replaced with actual API call
    setTimeout(() => {
      setAiSuggestion('AI suggests: Add specific metrics and quantify your achievements for better impact.');
    }, 1500);
  };

  const generateCV = async () => {
    // Check if user has paid tier
    if (!user?.active_tier) {
      toast({
        title: "Upgrade Required",
        description: "Please purchase a plan to generate your CV.",
        variant: "destructive",
      });
      navigate('/pricing');
      return;
    }

    if (!formData.fullName) {
      toast({
        title: "Name Required",
        description: "Please enter your full name to generate CV.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    // Mock generation - will be replaced with actual API call
    setTimeout(() => {
      setIsGenerating(false);
      toast({
        title: "CV Generated Successfully!",
        description: "Your professional CV has been created and is ready for download.",
      });
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Upgrade Notice for users without tier */}
        {!user?.active_tier && (
          <div className="mb-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-6 text-center">
            <h3 className="text-xl font-bold mb-2">🔒 Premium Feature</h3>
            <p className="mb-4">
              CV generation with AI assistance requires a paid plan. Choose your package to get started!
            </p>
            <Button
              onClick={() => navigate('/pricing')}
              className="bg-white text-blue-600 hover:bg-gray-100"
            >
              View Pricing Plans
            </Button>
          </div>
        )}

        <div className="text-center mb-8">
          <Badge className="mb-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white border-none">
            <Sparkles className="mr-1 h-3 w-3" />
            AI-Powered Resume Builder
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Build Your Professional CV
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Create a standout CV with AI assistance tailored for the South African job market. Get real-time suggestions as you type.
          </p>
        </div>

        {/* Selected Template Display */}
        {selectedTemplate && (
          <Card className="mb-8 border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-20 rounded overflow-hidden border border-blue-200 flex-shrink-0">
                  <img 
                    src={selectedTemplate.image} 
                    alt={selectedTemplate.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=100&h=140&fit=crop';
                    }}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                      Selected Template
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900">{selectedTemplate.name}</h3>
                  <p className="text-sm text-gray-600">{selectedTemplate.category} • {selectedTemplate.industry}</p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate('/templates')}
                    className="text-blue-600 border-blue-300"
                  >
                    Change Template
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={clearTemplate}
                    className="text-gray-500"
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Template Selected - Prompt to choose */}
        {!selectedTemplate && (
          <Card className="mb-8 border-dashed border-2 border-gray-300 bg-gray-50">
            <CardContent className="p-6 text-center">
              <p className="text-gray-600 mb-3">No template selected. Choose a template to get started with a professional design.</p>
              <Button 
                variant="outline"
                onClick={() => navigate('/templates')}
                className="border-blue-600 text-blue-600 hover:bg-blue-50"
              >
                Browse Templates
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Upload Existing CV Section */}
        <Card className="mb-8 border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Wand2 className="h-5 w-5 text-purple-600" />
              </div>
              Upload & Enhance Your Existing CV
            </CardTitle>
            <CardDescription>
              Have an existing CV? Upload it and let AI extract, enhance, and improve your content automatically.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <label className="flex-1 w-full">
                <div className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  isUploading ? 'border-purple-400 bg-purple-50' : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50'
                }`}>
                  {isUploading ? (
                    <div className="flex flex-col items-center">
                      <Loader2 className="h-8 w-8 text-purple-600 animate-spin mb-2" />
                      <p className="text-sm text-purple-600 font-medium">AI is analyzing and enhancing your CV...</p>
                      <p className="text-xs text-gray-500 mt-1">This may take a few seconds</p>
                    </div>
                  ) : uploadedFile ? (
                    <div className="flex flex-col items-center">
                      <FileText className="h-8 w-8 text-green-600 mb-2" />
                      <p className="text-sm text-green-600 font-medium">{uploadedFile.name}</p>
                      <p className="text-xs text-gray-500 mt-1">Click to upload a different file</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <Upload className="h-8 w-8 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600 font-medium">Drop your CV here or click to upload</p>
                      <p className="text-xs text-gray-500 mt-1">Supports PDF and DOCX files</p>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept=".pdf,.docx,.doc"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isUploading}
                />
              </label>
            </div>

            {/* AI Suggestions from Upload */}
            {aiSuggestions.length > 0 && (
              <div className="mt-4 p-4 bg-white rounded-lg border border-purple-200">
                <h4 className="text-sm font-semibold text-purple-800 mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  AI Suggestions for Improvement
                </h4>
                <ul className="space-y-1">
                  {aiSuggestions.map((suggestion, index) => (
                    <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="text-purple-500 mt-1">•</span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
                Browse Templates
              </Button>
            </CardContent>
          </Card>
        )}

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Tell us about yourself - all fields are important for SA employers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <Label htmlFor="email">Email *</Label>
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
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+27 82 123 4567"
                />
              </div>
              <div>
                <Label htmlFor="idNumber">South African ID Number</Label>
                <Input
                  id="idNumber"
                  name="idNumber"
                  value={formData.idNumber}
                  onChange={handleChange}
                  placeholder="9001015009087"
                />
              </div>
              <div>
                <Label htmlFor="address">Street Address</Label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="123 Main Street"
                />
              </div>
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Johannesburg"
                />
              </div>
              <div>
                <Label htmlFor="province">Province</Label>
                <Input
                  id="province"
                  name="province"
                  value={formData.province}
                  onChange={handleChange}
                  placeholder="Gauteng"
                />
              </div>
              <div>
                <Label htmlFor="postalCode">Postal Code</Label>
                <Input
                  id="postalCode"
                  name="postalCode"
                  value={formData.postalCode}
                  onChange={handleChange}
                  placeholder="2000"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="industry">Target Industry</Label>
              <Select value={formData.industry} onValueChange={(value) => setFormData({ ...formData, industry: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your industry" />
                </SelectTrigger>
                <SelectContent>
                  {industries.map((industry) => (
                    <SelectItem key={industry} value={industry}>
                      {industry}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Professional Summary</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => getAiSuggestion('summary')}
                className="text-blue-600 border-blue-600 hover:bg-blue-50"
              >
                <Sparkles className="mr-1 h-4 w-4" />
                AI Assist
              </Button>
            </CardTitle>
            <CardDescription>Write a compelling summary that highlights your expertise</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              name="summary"
              value={formData.summary}
              onChange={handleChange}
              placeholder="E.g., Results-driven Software Developer with 5+ years of experience in building scalable web applications..."
              rows={5}
            />
            {aiSuggestion && (
              <div className="p-4 bg-blue-50 border-l-4 border-blue-600 rounded">
                <p className="text-sm text-blue-900">{aiSuggestion}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Work Experience</CardTitle>
                <CardDescription>List your most recent positions first</CardDescription>
              </div>
              <Button onClick={addExperience} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Experience
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {formData.experiences.map((exp, index) => (
              <Card key={index} className="bg-gray-50 border-gray-200">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium text-gray-900">Position {index + 1}</h4>
                    {formData.experiences.length > 1 && (
                      <Button
                        onClick={() => removeExperience(index)}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Job Title</Label>
                      <Input
                        value={exp.title}
                        onChange={(e) => handleExperienceChange(index, 'title', e.target.value)}
                        placeholder="Software Developer"
                      />
                    </div>
                    <div>
                      <Label>Company</Label>
                      <Input
                        value={exp.company}
                        onChange={(e) => handleExperienceChange(index, 'company', e.target.value)}
                        placeholder="Tech Corp (Pty) Ltd"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Duration</Label>
                    <Input
                      value={exp.duration}
                      onChange={(e) => handleExperienceChange(index, 'duration', e.target.value)}
                      placeholder="Jan 2020 - Present"
                    />
                  </div>
                  <div>
                    <Label>Description & Responsibilities</Label>
                    <Textarea
                      value={exp.description}
                      onChange={(e) => handleExperienceChange(index, 'description', e.target.value)}
                      placeholder="Describe your role and key responsibilities..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label>Key Achievements (Use numbers and metrics)</Label>
                    <Textarea
                      value={exp.achievements}
                      onChange={(e) => handleExperienceChange(index, 'achievements', e.target.value)}
                      placeholder="- Increased sales by 30% through strategic initiatives\n- Led team of 5 developers\n- Reduced costs by R50,000 annually"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Education</CardTitle>
                <CardDescription>Include your academic qualifications</CardDescription>
              </div>
              <Button onClick={addEducation} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Education
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {formData.education.map((edu, index) => (
              <Card key={index} className="bg-gray-50 border-gray-200">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium text-gray-900">Qualification {index + 1}</h4>
                    {formData.education.length > 1 && (
                      <Button
                        onClick={() => removeEducation(index)}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Degree/Certificate</Label>
                      <Input
                        value={edu.degree}
                        onChange={(e) => handleEducationChange(index, 'degree', e.target.value)}
                        placeholder="Bachelor of Science in Computer Science"
                      />
                    </div>
                    <div>
                      <Label>Institution</Label>
                      <Input
                        value={edu.institution}
                        onChange={(e) => handleEducationChange(index, 'institution', e.target.value)}
                        placeholder="University of Johannesburg"
                      />
                    </div>
                    <div>
                      <Label>Year</Label>
                      <Input
                        value={edu.year}
                        onChange={(e) => handleEducationChange(index, 'year', e.target.value)}
                        placeholder="2016 - 2020"
                      />
                    </div>
                    <div>
                      <Label>Location</Label>
                      <Input
                        value={edu.location}
                        onChange={(e) => handleEducationChange(index, 'location', e.target.value)}
                        placeholder="Johannesburg, South Africa"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Skills</CardTitle>
                <Button onClick={addSkill} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {formData.skills.map((skill, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={skill}
                    onChange={(e) => handleSkillChange(index, e.target.value)}
                    placeholder="e.g., Project Management, Python, Excel"
                  />
                  {formData.skills.length > 1 && (
                    <Button
                      onClick={() => removeSkill(index)}
                      variant="ghost"
                      size="icon"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Languages</CardTitle>
                <Button onClick={addLanguage} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {formData.languages.map((lang, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={lang.language}
                    onChange={(e) => handleLanguageChange(index, 'language', e.target.value)}
                    placeholder="e.g., English"
                    className="flex-1"
                  />
                  <Input
                    value={lang.proficiency}
                    onChange={(e) => handleLanguageChange(index, 'proficiency', e.target.value)}
                    placeholder="Fluent"
                    className="flex-1"
                  />
                  {formData.languages.length > 1 && (
                    <Button
                      onClick={() => removeLanguage(index)}
                      variant="ghost"
                      size="icon"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-4">
          <Button
            onClick={generateCV}
            disabled={isGenerating || !formData.fullName}
            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Generating with AI...
              </>
            ) : (
              <>
                <Download className="mr-2 h-5 w-5" />
                Generate & Download CV (PDF)
              </>
            )}
          </Button>
        </div>

        {!formData.fullName && (
          <p className="text-sm text-red-600 mt-3 text-center">
            Please enter your full name to generate CV
          </p>
        )}
      </div>
    </div>
  );
};

export default ResumeBuilder;