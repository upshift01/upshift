import React, { useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { useToast } from '../hooks/use-toast';
import { Loader2, Download, Plus, Trash2 } from 'lucide-react';
import jsPDF from 'jspdf';

const CVBuilder = () => {
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
      if (formData.email) {
        doc.text(formData.email, margin, yPosition);
        yPosition += 5;
      }
      if (formData.phone) {
        doc.text(formData.phone, margin, yPosition);
        yPosition += 5;
      }
      if (formData.address) {
        doc.text(formData.address, margin, yPosition);
        yPosition += 5;
      }
      yPosition += 5;

      // Summary
      if (formData.summary) {
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
        nonEmptySkills.forEach((skill) => {
          doc.text(`• ${skill}`, margin, yPosition);
          yPosition += 5;
        });
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
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Online CV Builder / Creator
          </h1>
          <p className="text-gray-700 max-w-2xl mx-auto">
            Create your professional CV in minutes. Fill out the form below and download your CV as a PDF file. Fast, easy, and completely free!
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Build Your CV</CardTitle>
            <CardDescription>
              Fill in your information below. All fields are optional, but more information will create a more complete CV.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
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
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="City, Country"
                  />
                </div>
              </div>
            </div>

            {/* Professional Summary */}
            <div className="space-y-2">
              <Label htmlFor="summary">Professional Summary</Label>
              <Textarea
                id="summary"
                name="summary"
                value={formData.summary}
                onChange={handleChange}
                placeholder="Write a brief summary of your professional experience and goals..."
                rows={4}
              />
            </div>

            {/* Work Experience */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Work Experience</h3>
                <Button onClick={addExperience} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Experience
                </Button>
              </div>
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
            </div>

            {/* Education */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Education</h3>
                <Button onClick={addEducation} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Education
                </Button>
              </div>
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
            </div>

            {/* Skills */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Skills</h3>
                <Button onClick={addSkill} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Skill
                </Button>
              </div>
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
            </div>

            {/* Generate Button */}
            <div className="pt-6">
              <Button
                onClick={generatePDF}
                disabled={isGenerating || !formData.fullName}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
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
            </div>
          </CardContent>
        </Card>

        {/* Info Section */}
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

export default CVBuilder;