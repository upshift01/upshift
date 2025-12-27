import React, { useState, useRef } from 'react';
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
import { Loader2, Download, Plus, Trash2, Upload, Sparkles, Wand2, Check, X, FileText, Layout, CheckCircle } from 'lucide-react';
import PartnerPaywall from '../../components/PartnerPaywall';
import jsPDF from 'jspdf';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// CV Templates
const templates = [
  {
    id: 'professional',
    name: 'Professional',
    description: 'Clean and traditional format',
    color: '#1e40af',
    preview: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=200&h=280&fit=crop'
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'Contemporary design with accent colors',
    color: '#7c3aed',
    preview: 'https://images.unsplash.com/photo-1586281380117-5a60ae2050cc?w=200&h=280&fit=crop'
  },
  {
    id: 'creative',
    name: 'Creative',
    description: 'Stand out with unique styling',
    color: '#059669',
    preview: 'https://images.unsplash.com/photo-1586281380614-e5e3c8f3f7e3?w=200&h=280&fit=crop'
  },
  {
    id: 'executive',
    name: 'Executive',
    description: 'Sophisticated for senior roles',
    color: '#dc2626',
    preview: 'https://images.unsplash.com/photo-1586281380923-45e0d5c4a0c8?w=200&h=280&fit=crop'
  }
];

const PartnerCVBuilder = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, token } = useAuth();
  const { brandName, primaryColor, secondaryColor, baseUrl } = usePartner();
  const { toast } = useToast();
  const fileInputRef = useRef(null);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExtractingCV, setIsExtractingCV] = useState(false);
  const [isGeneratingSkills, setIsGeneratingSkills] = useState(false);
  const [suggestedSkills, setSuggestedSkills] = useState([]);
  const [showSkillsSuggestions, setShowSkillsSuggestions] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    summary: '',
    experiences: [{ title: '', company: '', duration: '', description: '' }],
    education: [{ degree: '', institution: '', year: '' }],
    skills: [''],
  });

  // Check if user has access (needs to be logged in with an active tier)
  const hasAccess = isAuthenticated && user?.active_tier;

  // Handle drag events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleCVFile(e.dataTransfer.files[0]);
    }
  };

  // Handle CV file upload and extraction
  const handleCVUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleCVFile(file);
    }
  };

  const handleCVFile = async (file) => {
    const allowedExtensions = ['.pdf', '.txt', '.doc', '.docx'];
    const isValidType = allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    
    if (!isValidType) {
      toast({
        title: 'Invalid File Type',
        description: 'Please upload a PDF, DOC, DOCX, or TXT file.',
        variant: 'destructive'
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Please upload a file smaller than 10MB.',
        variant: 'destructive'
      });
      return;
    }

    setIsExtractingCV(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      const response = await fetch(`${API_URL}/api/ai-content/extract-cv-data`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formDataUpload
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        const extracted = data.data;
        setFormData({
          fullName: extracted.fullName || '',
          email: extracted.email || '',
          phone: extracted.phone || '',
          address: extracted.address || '',
          summary: extracted.summary || '',
          experiences: extracted.experiences?.length > 0 
            ? extracted.experiences.map(exp => ({
                title: exp.title || '',
                company: exp.company || '',
                duration: exp.duration || '',
                description: exp.description || ''
              }))
            : [{ title: '', company: '', duration: '', description: '' }],
          education: extracted.education?.length > 0
            ? extracted.education.map(edu => ({
                degree: edu.degree || '',
                institution: edu.institution || '',
                year: edu.year || ''
              }))
            : [{ degree: '', institution: '', year: '' }],
          skills: extracted.skills?.length > 0 ? extracted.skills : ['']
        });
        toast({
          title: 'CV Data Imported',
          description: 'Your CV data has been extracted and populated.',
        });
      } else {
        throw new Error(data.detail || 'Failed to extract CV data');
      }
    } catch (error) {
      toast({
        title: 'Extraction Failed',
        description: error.message || 'Could not extract data from the file.',
        variant: 'destructive'
      });
    } finally {
      setIsExtractingCV(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
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

  const addExperience = () => {
    setFormData({
      ...formData,
      experiences: [...formData.experiences, { title: '', company: '', duration: '', description: '' }],
    });
  };

  const removeExperience = (index) => {
    const newExperiences = formData.experiences.filter((_, i) => i !== index);
    setFormData({ ...formData, experiences: newExperiences });
  };

  const addEducation = () => {
    setFormData({
      ...formData,
      education: [...formData.education, { degree: '', institution: '', year: '' }],
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

  // AI Skills Generation
  const generateAISkills = async () => {
    const jobTitles = formData.experiences.map(exp => exp.title).filter(Boolean).join(', ');
    const experienceDescriptions = formData.experiences.map(exp => exp.description).filter(Boolean).join(' ');
    
    if (!jobTitles && !experienceDescriptions) {
      toast({
        title: 'Add Experience First',
        description: 'Please add at least one job title or experience description to generate relevant skills.',
        variant: 'destructive'
      });
      return;
    }

    setIsGeneratingSkills(true);
    try {
      const response = await fetch(`${API_URL}/api/ai-content/generate-cv-skills`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          job_titles: jobTitles,
          experience_descriptions: experienceDescriptions
        })
      });

      const data = await response.json();
      
      if (response.ok && data.skills) {
        setSuggestedSkills(data.skills);
        setShowSkillsSuggestions(true);
        toast({ title: 'Skills Generated', description: 'AI has suggested relevant skills for your profile.' });
      } else {
        throw new Error(data.detail || 'Failed to generate skills');
      }
    } catch (error) {
      toast({
        title: 'Generation Failed',
        description: error.message || 'Could not generate skills. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsGeneratingSkills(false);
    }
  };

  const addSuggestedSkill = (skill) => {
    if (!formData.skills.includes(skill)) {
      const emptyIndex = formData.skills.findIndex(s => !s.trim());
      if (emptyIndex >= 0) {
        const newSkills = [...formData.skills];
        newSkills[emptyIndex] = skill;
        setFormData({ ...formData, skills: newSkills });
      } else {
        setFormData({ ...formData, skills: [...formData.skills, skill] });
      }
    }
    setSuggestedSkills(suggestedSkills.filter(s => s !== skill));
  };

  const generatePDF = () => {
    setIsGenerating(true);

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      let yPosition = 20;

      // Header - Name
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text(formData.fullName || 'Your Name', margin, yPosition);
      yPosition += 10;

      // Contact Information
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const contactInfo = [formData.email, formData.phone, formData.address].filter(Boolean).join(' | ');
      if (contactInfo) {
        doc.text(contactInfo, margin, yPosition);
        yPosition += 8;
      }

      // Summary
      if (formData.summary) {
        yPosition += 5;
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('PROFESSIONAL SUMMARY', margin, yPosition);
        yPosition += 7;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const summaryLines = doc.splitTextToSize(formData.summary, pageWidth - 2 * margin);
        doc.text(summaryLines, margin, yPosition);
        yPosition += summaryLines.length * 5 + 5;
      }

      // Experience
      if (formData.experiences.some(exp => exp.title || exp.company)) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('WORK EXPERIENCE', margin, yPosition);
        yPosition += 7;

        formData.experiences.forEach((exp) => {
          if (exp.title || exp.company) {
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text(exp.title || 'Position', margin, yPosition);
            yPosition += 5;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`${exp.company || 'Company'} | ${exp.duration || 'Duration'}`, margin, yPosition);
            yPosition += 5;
            if (exp.description) {
              const descLines = doc.splitTextToSize(exp.description, pageWidth - 2 * margin);
              doc.text(descLines, margin, yPosition);
              yPosition += descLines.length * 5;
            }
            yPosition += 3;
          }
        });
        yPosition += 2;
      }

      // Education
      if (formData.education.some(edu => edu.degree || edu.institution)) {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('EDUCATION', margin, yPosition);
        yPosition += 7;

        formData.education.forEach((edu) => {
          if (edu.degree || edu.institution) {
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text(edu.degree || 'Degree', margin, yPosition);
            yPosition += 5;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`${edu.institution || 'Institution'} | ${edu.year || 'Year'}`, margin, yPosition);
            yPosition += 6;
          }
        });
        yPosition += 2;
      }

      // Skills
      const nonEmptySkills = formData.skills.filter(skill => skill.trim());
      if (nonEmptySkills.length > 0) {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('SKILLS', margin, yPosition);
        yPosition += 7;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const skillsText = nonEmptySkills.join(' • ');
        const skillsLines = doc.splitTextToSize(skillsText, pageWidth - 2 * margin);
        doc.text(skillsLines, margin, yPosition);
      }

      // Save PDF
      doc.save(`${formData.fullName || 'CV'}_Resume.pdf`);

      toast({
        title: "CV Generated Successfully!",
        description: "Your professional CV has been downloaded as a PDF file.",
      });
    } catch (error) {
      toast({
        title: "Error Generating PDF",
        description: "There was an error creating your CV. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 py-12 px-4 relative">
      {/* Paywall overlay if no access */}
      {!hasAccess && (
        <PartnerPaywall
          title="Unlock CV Builder"
          icon={Download}
          features={[
            "Professional CV templates",
            "Download as high-quality PDF",
            "ATS-optimised formatting",
            "AI-powered skills suggestions",
            "Import existing CV data"
          ]}
        />
      )}

      <div className={`max-w-4xl mx-auto ${!hasAccess ? 'opacity-50 pointer-events-none' : ''}`}>
        {/* Header */}
        <div className="text-center mb-8">
          <Badge 
            className="mb-4 text-white border-none"
            style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
          >
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

        {/* Upload & Enhance Section */}
        <Card className="mb-6" style={{ backgroundColor: `${primaryColor}08` }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" style={{ color: primaryColor }} />
              Upload & Enhance Your Existing CV
            </CardTitle>
            <CardDescription>
              Have an existing CV? Upload it and let AI extract, enhance, and improve your content automatically.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                dragActive 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400 bg-white'
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
                onChange={handleCVUpload}
                className="hidden"
              />
              
              {isExtractingCV ? (
                <div className="py-4">
                  <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin" style={{ color: primaryColor }} />
                  <p className="text-sm text-gray-600">Extracting and analysing your CV...</p>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm font-medium text-gray-700">
                    Drop your CV here or click to upload
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Supports PDF and DOCX files
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card className="mb-6">
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
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+27 (0) 12 345 6789"
                />
              </div>
              <div>
                <Label htmlFor="address">Location</Label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Johannesburg, South Africa"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Professional Summary */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Professional Summary</CardTitle>
            <CardDescription>Write a compelling summary that highlights your key strengths</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              id="summary"
              name="summary"
              value={formData.summary}
              onChange={handleChange}
              placeholder="Write a brief summary of your professional experience, key achievements, and career goals..."
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Work Experience */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Work Experience</CardTitle>
                <CardDescription>Add your relevant work history</CardDescription>
              </div>
              <Button onClick={addExperience} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Experience
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.experiences.map((exp, index) => (
              <Card key={index} className="bg-gray-50">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium text-gray-900">Experience {index + 1}</h4>
                    {formData.experiences.length > 1 && (
                      <Button
                        onClick={() => removeExperience(index)}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
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
                        placeholder="Tech Corp"
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
                    <Label>Description</Label>
                    <Textarea
                      value={exp.description}
                      onChange={(e) => handleExperienceChange(index, 'description', e.target.value)}
                      placeholder="Describe your responsibilities and achievements..."
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>

        {/* Education */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Education</CardTitle>
                <CardDescription>Add your educational background</CardDescription>
              </div>
              <Button onClick={addEducation} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Education
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.education.map((edu, index) => (
              <Card key={index} className="bg-gray-50">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium text-gray-900">Education {index + 1}</h4>
                    {formData.education.length > 1 && (
                      <Button
                        onClick={() => removeEducation(index)}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Degree</Label>
                      <Input
                        value={edu.degree}
                        onChange={(e) => handleEducationChange(index, 'degree', e.target.value)}
                        placeholder="Bachelor of Science"
                      />
                    </div>
                    <div>
                      <Label>Institution</Label>
                      <Input
                        value={edu.institution}
                        onChange={(e) => handleEducationChange(index, 'institution', e.target.value)}
                        placeholder="University Name"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Year</Label>
                    <Input
                      value={edu.year}
                      onChange={(e) => handleEducationChange(index, 'year', e.target.value)}
                      placeholder="2016 - 2020"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>

        {/* Skills */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Skills</CardTitle>
                <CardDescription>List your key skills and competencies</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={generateAISkills} 
                  variant="outline" 
                  size="sm"
                  disabled={isGeneratingSkills}
                  className="text-purple-600 border-purple-200 hover:bg-purple-50"
                >
                  {isGeneratingSkills ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Wand2 className="h-4 w-4 mr-1" />
                  )}
                  AI Suggest
                </Button>
                <Button onClick={addSkill} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Skill
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* AI Suggested Skills */}
            {showSkillsSuggestions && suggestedSkills.length > 0 && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-900">AI Suggested Skills</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowSkillsSuggestions(false)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {suggestedSkills.map((skill, idx) => (
                    <button
                      key={idx}
                      onClick={() => addSuggestedSkill(skill)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-purple-200 rounded-full text-sm text-purple-700 hover:bg-purple-100 transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                      {skill}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              {formData.skills.map((skill, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={skill}
                    onChange={(e) => handleSkillChange(index, e.target.value)}
                    placeholder="e.g., JavaScript, Project Management, etc."
                  />
                  {formData.skills.length > 1 && (
                    <Button
                      onClick={() => removeSkill(index)}
                      variant="ghost"
                      size="icon"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Generate Button */}
        <Card>
          <CardContent className="pt-6">
            <Button
              onClick={generatePDF}
              disabled={isGenerating || !formData.fullName}
              className="w-full text-white"
              style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-5 w-5" />
                  Generate & Download CV (PDF)
                </>
              )}
            </Button>
            {!formData.fullName && (
              <p className="text-sm text-red-600 mt-2 text-center">
                Please enter your full name to generate CV
              </p>
            )}
          </CardContent>
        </Card>

        {/* Privacy Info */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">Privacy & Security</h3>
          <p className="text-sm text-blue-800">
            Your data is processed locally in your browser. We do not store or save any of your personal information on our servers. Your CV is generated directly on your device and downloaded as a PDF file.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PartnerCVBuilder;
