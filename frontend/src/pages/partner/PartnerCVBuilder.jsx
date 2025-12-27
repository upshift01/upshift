import React, { useState, useEffect, useRef } from 'react';
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
import { Loader2, Download, Plus, Trash2, FileText, Sparkles, Wand2, X, Check, Upload } from 'lucide-react';
import PartnerPaywall from '../../components/PartnerPaywall';
import jsPDF from 'jspdf';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const PartnerCVBuilder = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, getAuthHeader, token } = useAuth();
  const { brandName, primaryColor, secondaryColor, baseUrl } = usePartner();
  const { toast } = useToast();
  const fileInputRef = useRef(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingSkills, setIsGeneratingSkills] = useState(false);
  const [isExtractingCV, setIsExtractingCV] = useState(false);
  const [suggestedSkills, setSuggestedSkills] = useState([]);
  const [showSkillsSuggestions, setShowSkillsSuggestions] = useState(false);
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

  // Handle CV file upload and extraction
  const handleCVUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
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

    // Check file size (max 10MB)
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
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataUpload
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        const extracted = data.data;
        
        // Map extracted data to form
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
          description: 'Your CV data has been extracted and populated. Review and edit as needed.',
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
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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
    // Get context from job titles and experience
    const jobTitles = formData.experiences
      .map(exp => exp.title)
      .filter(Boolean)
      .join(', ');
    
    const experienceDescriptions = formData.experiences
      .map(exp => exp.description)
      .filter(Boolean)
      .join('. ');

    if (!jobTitles && !experienceDescriptions && !formData.summary) {
      toast({
        title: "Add some context first",
        description: "Please fill in your job titles, experience, or summary to generate relevant skills.",
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingSkills(true);
    setSuggestedSkills([]);
    setShowSkillsSuggestions(true);

    try {
      const response = await fetch(`${API_URL}/api/ai-content/cv-builder-skills`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({
          job_titles: jobTitles,
          experience: experienceDescriptions,
          summary: formData.summary,
          current_skills: formData.skills.filter(Boolean)
        })
      });

      if (response.ok) {
        const data = await response.json();
        const skills = data.skills || data.suggested_skills || [];
        setSuggestedSkills(skills);
      } else {
        // Fallback to generic skills based on common patterns
        const fallbackSkills = generateFallbackSkills(jobTitles, experienceDescriptions);
        setSuggestedSkills(fallbackSkills);
      }
    } catch (error) {
      console.error('Error generating skills:', error);
      // Fallback skills
      const fallbackSkills = generateFallbackSkills(jobTitles, experienceDescriptions);
      setSuggestedSkills(fallbackSkills);
    } finally {
      setIsGeneratingSkills(false);
    }
  };

  // Fallback skill generation based on keywords
  const generateFallbackSkills = (jobTitles, experience) => {
    const text = `${jobTitles} ${experience}`.toLowerCase();
    const skillSets = {
      developer: ['JavaScript', 'React', 'Node.js', 'Python', 'SQL', 'Git', 'Agile', 'REST APIs', 'Problem Solving'],
      manager: ['Leadership', 'Team Management', 'Project Management', 'Strategic Planning', 'Budgeting', 'Communication', 'Decision Making'],
      marketing: ['Digital Marketing', 'SEO', 'Content Strategy', 'Social Media', 'Analytics', 'Brand Management', 'Campaign Management'],
      sales: ['Negotiation', 'CRM', 'Lead Generation', 'Client Relations', 'Presentation Skills', 'Closing Deals', 'Pipeline Management'],
      design: ['UI/UX Design', 'Figma', 'Adobe Creative Suite', 'Wireframing', 'Prototyping', 'User Research', 'Visual Design'],
      finance: ['Financial Analysis', 'Excel', 'Budgeting', 'Forecasting', 'Accounting', 'Risk Management', 'Financial Reporting'],
      hr: ['Recruitment', 'Employee Relations', 'Performance Management', 'Training', 'HRIS', 'Compliance', 'Onboarding'],
      admin: ['Microsoft Office', 'Scheduling', 'Data Entry', 'Customer Service', 'Organization', 'Time Management', 'Communication']
    };

    let relevantSkills = ['Communication', 'Problem Solving', 'Team Collaboration', 'Time Management'];
    
    for (const [keyword, skills] of Object.entries(skillSets)) {
      if (text.includes(keyword)) {
        relevantSkills = [...skills, ...relevantSkills];
        break;
      }
    }

    // Remove duplicates and existing skills
    const existingSkills = formData.skills.map(s => s.toLowerCase());
    return [...new Set(relevantSkills)]
      .filter(skill => !existingSkills.includes(skill.toLowerCase()))
      .slice(0, 10);
  };

  const addSuggestedSkill = (skill) => {
    if (!formData.skills.includes(skill)) {
      const newSkills = formData.skills[0] === '' 
        ? [skill] 
        : [...formData.skills, skill];
      setFormData({ ...formData, skills: newSkills });
      setSuggestedSkills(suggestedSkills.filter(s => s !== skill));
      toast({ title: `Added "${skill}"` });
    }
  };

  const addAllSuggestedSkills = () => {
    const existingSkills = formData.skills.filter(Boolean);
    const newSkills = [...existingSkills, ...suggestedSkills];
    setFormData({ ...formData, skills: newSkills });
    setSuggestedSkills([]);
    setShowSkillsSuggestions(false);
    toast({ title: `Added ${suggestedSkills.length} skills` });
  };

  const generatePDF = () => {
    if (!hasAccess) {
      toast({
        title: "Upgrade Required",
        description: "Please purchase a plan to download your CV.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const doc = new jsPDF();
      let yPos = 20;
      
      // Header
      doc.setFontSize(24);
      doc.setTextColor(30, 64, 175);
      doc.text(formData.fullName || 'Your Name', 105, yPos, { align: 'center' });
      yPos += 10;
      
      // Contact Info
      doc.setFontSize(10);
      doc.setTextColor(100);
      const contactLine = [formData.email, formData.phone, formData.address].filter(Boolean).join(' | ');
      doc.text(contactLine, 105, yPos, { align: 'center' });
      yPos += 15;
      
      // Summary
      if (formData.summary) {
        doc.setFontSize(12);
        doc.setTextColor(30, 64, 175);
        doc.text('Professional Summary', 20, yPos);
        yPos += 7;
        doc.setFontSize(10);
        doc.setTextColor(60);
        const summaryLines = doc.splitTextToSize(formData.summary, 170);
        doc.text(summaryLines, 20, yPos);
        yPos += summaryLines.length * 5 + 10;
      }
      
      // Experience
      const validExperiences = formData.experiences.filter(exp => exp.title || exp.company);
      if (validExperiences.length > 0) {
        doc.setFontSize(12);
        doc.setTextColor(30, 64, 175);
        doc.text('Work Experience', 20, yPos);
        yPos += 7;
        
        validExperiences.forEach(exp => {
          doc.setFontSize(11);
          doc.setTextColor(40);
          doc.text(`${exp.title} at ${exp.company}`, 20, yPos);
          yPos += 5;
          doc.setFontSize(9);
          doc.setTextColor(100);
          doc.text(exp.duration, 20, yPos);
          yPos += 5;
          if (exp.description) {
            doc.setTextColor(60);
            const descLines = doc.splitTextToSize(exp.description, 170);
            doc.text(descLines, 20, yPos);
            yPos += descLines.length * 4 + 5;
          }
          yPos += 3;
        });
        yPos += 5;
      }
      
      // Education
      const validEducation = formData.education.filter(edu => edu.degree || edu.institution);
      if (validEducation.length > 0) {
        doc.setFontSize(12);
        doc.setTextColor(30, 64, 175);
        doc.text('Education', 20, yPos);
        yPos += 7;
        
        validEducation.forEach(edu => {
          doc.setFontSize(11);
          doc.setTextColor(40);
          doc.text(`${edu.degree} - ${edu.institution}`, 20, yPos);
          yPos += 5;
          doc.setFontSize(9);
          doc.setTextColor(100);
          doc.text(edu.year, 20, yPos);
          yPos += 8;
        });
        yPos += 5;
      }
      
      // Skills
      const validSkills = formData.skills.filter(Boolean);
      if (validSkills.length > 0) {
        doc.setFontSize(12);
        doc.setTextColor(30, 64, 175);
        doc.text('Skills', 20, yPos);
        yPos += 7;
        doc.setFontSize(10);
        doc.setTextColor(60);
        doc.text(validSkills.join(' • '), 20, yPos);
      }
      
      doc.save(`${formData.fullName || 'cv'}_resume.pdf`);
      toast({ title: 'Success', description: 'Your CV has been downloaded!' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to generate PDF', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
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
            <FileText className="mr-1 h-3 w-3" />
            Professional Tool
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            CV Builder
          </h1>
          <p className="text-lg text-white/80">
            Create a professional CV in minutes with our easy-to-use builder
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-8 relative">
        {/* Paywall overlay if no access */}
        {!hasAccess && (
          <PartnerPaywall
            title="Unlock CV Builder"
            icon={FileText}
            features={[
              "Professional CV templates",
              "Download as high-quality PDF",
              "ATS-optimised formatting",
              "Unlimited revisions",
              "Multiple export formats"
            ]}
          />
        )}

        <Card className={!hasAccess ? 'opacity-50 pointer-events-none' : ''}>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>Build Your CV</CardTitle>
                <CardDescription>Fill in your details below or import from an existing CV</CardDescription>
              </div>
              
              {/* Upload CV Button */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleCVUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isExtractingCV}
                  className="gap-2"
                >
                  {isExtractingCV ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Extracting...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Import Existing CV
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg" style={{ color: primaryColor }}>Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Full Name</Label>
                  <Input name="fullName" value={formData.fullName} onChange={handleChange} placeholder="John Smith" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="john@example.com" />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input name="phone" value={formData.phone} onChange={handleChange} placeholder="+27 12 345 6789" />
                </div>
                <div>
                  <Label>Address</Label>
                  <Input name="address" value={formData.address} onChange={handleChange} placeholder="Johannesburg, South Africa" />
                </div>
              </div>
              <div>
                <Label>Professional Summary</Label>
                <Textarea name="summary" value={formData.summary} onChange={handleChange} placeholder="A brief summary of your professional background..." rows={3} />
              </div>
            </div>

            {/* Work Experience */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-lg" style={{ color: primaryColor }}>Work Experience</h3>
                <Button variant="outline" size="sm" onClick={addExperience}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
              {formData.experiences.map((exp, index) => (
                <Card key={index} className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input placeholder="Job Title" value={exp.title} onChange={(e) => handleExperienceChange(index, 'title', e.target.value)} />
                    <Input placeholder="Company" value={exp.company} onChange={(e) => handleExperienceChange(index, 'company', e.target.value)} />
                    <Input placeholder="Duration (e.g., 2020 - Present)" value={exp.duration} onChange={(e) => handleExperienceChange(index, 'duration', e.target.value)} />
                    <div className="flex items-center">
                      {formData.experiences.length > 1 && (
                        <Button variant="ghost" size="sm" onClick={() => removeExperience(index)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <Textarea className="mt-3" placeholder="Job description and achievements..." value={exp.description} onChange={(e) => handleExperienceChange(index, 'description', e.target.value)} rows={2} />
                </Card>
              ))}
            </div>

            {/* Education */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-lg" style={{ color: primaryColor }}>Education</h3>
                <Button variant="outline" size="sm" onClick={addEducation}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
              {formData.education.map((edu, index) => (
                <Card key={index} className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Input placeholder="Degree" value={edu.degree} onChange={(e) => handleEducationChange(index, 'degree', e.target.value)} />
                    <Input placeholder="Institution" value={edu.institution} onChange={(e) => handleEducationChange(index, 'institution', e.target.value)} />
                    <div className="flex gap-2">
                      <Input placeholder="Year" value={edu.year} onChange={(e) => handleEducationChange(index, 'year', e.target.value)} />
                      {formData.education.length > 1 && (
                        <Button variant="ghost" size="sm" onClick={() => removeEducation(index)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Skills */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg" style={{ color: primaryColor }}>Skills</h3>
                  <Badge variant="outline" className="text-xs">
                    {formData.skills.filter(Boolean).length} added
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={generateAISkills}
                    disabled={isGeneratingSkills}
                    className="border-purple-200 text-purple-700 hover:bg-purple-50"
                  >
                    {isGeneratingSkills ? (
                      <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Generating...</>
                    ) : (
                      <><Wand2 className="h-4 w-4 mr-1" /> AI Suggest</>
                    )}
                  </Button>
                  <Button variant="outline" size="sm" onClick={addSkill}>
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
              </div>

              {/* AI Suggested Skills */}
              {showSkillsSuggestions && (
                <Card className="border-purple-200 bg-purple-50/50">
                  <CardContent className="p-4">
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
                    
                    {isGeneratingSkills ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                        <span className="ml-2 text-sm text-purple-700">Analyzing your experience...</span>
                      </div>
                    ) : suggestedSkills.length > 0 ? (
                      <>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {suggestedSkills.map((skill, idx) => (
                            <button
                              key={idx}
                              onClick={() => addSuggestedSkill(skill)}
                              className="px-3 py-1.5 text-sm bg-white border border-purple-200 rounded-full hover:bg-purple-100 hover:border-purple-300 transition-colors flex items-center gap-1 group"
                            >
                              <Plus className="h-3 w-3 text-purple-500 group-hover:text-purple-700" />
                              {skill}
                            </button>
                          ))}
                        </div>
                        <Button 
                          size="sm" 
                          onClick={addAllSuggestedSkills}
                          className="w-full text-white"
                          style={{ backgroundColor: primaryColor }}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Add All ({suggestedSkills.length} skills)
                        </Button>
                      </>
                    ) : (
                      <p className="text-sm text-purple-700 text-center py-2">
                        No additional skills to suggest. Try adding more experience details.
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Current Skills */}
              <div className="flex flex-wrap gap-2">
                {formData.skills.map((skill, index) => (
                  <div key={index} className="flex items-center gap-1">
                    <Input className="w-40" placeholder="Skill" value={skill} onChange={(e) => handleSkillChange(index, e.target.value)} />
                    {formData.skills.length > 1 && (
                      <Button variant="ghost" size="sm" onClick={() => removeSkill(index)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {/* Helper text */}
              <p className="text-xs text-gray-500">
                💡 Tip: Click "AI Suggest" to get skill recommendations based on your job experience
              </p>
            </div>

            {/* Generate Button */}
            <Button 
              className="w-full text-white" 
              size="lg"
              onClick={generatePDF}
              disabled={isGenerating || !formData.fullName}
              style={{ backgroundColor: primaryColor }}
            >
              {isGenerating ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
              ) : (
                <><Download className="mr-2 h-4 w-4" /> Download CV as PDF</>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PartnerCVBuilder;
