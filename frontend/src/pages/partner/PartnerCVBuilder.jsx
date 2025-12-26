import React, { useState } from 'react';
import { usePartner } from '../../context/PartnerContext';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { useToast } from '../../hooks/use-toast';
import { Loader2, Download, Plus, Trash2, FileText, Sparkles } from 'lucide-react';
import jsPDF from 'jspdf';

const PartnerCVBuilder = () => {
  const { brandName, primaryColor, secondaryColor } = usePartner();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
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

  const generatePDF = () => {
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
            Free Tool
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            CV Builder
          </h1>
          <p className="text-lg text-white/80">
            Create a professional CV in minutes with our easy-to-use builder
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Build Your CV</CardTitle>
            <CardDescription>Fill in your details below to generate a professional CV</CardDescription>
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
                <h3 className="font-semibold text-lg" style={{ color: primaryColor }}>Skills</h3>
                <Button variant="outline" size="sm" onClick={addSkill}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
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
            </div>

            {/* Generate Button */}
            <Button 
              className="w-full" 
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
