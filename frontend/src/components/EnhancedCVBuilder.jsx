import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useToast } from '../hooks/use-toast';
import { 
  Loader2, Download, Plus, Trash2, Upload, Sparkles, Wand2, 
  Check, X, FileText, Layout, CheckCircle, ChevronRight,
  RefreshCw, Save, Eye
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// CV Templates
const TEMPLATES = [
  // General Templates
  {
    id: 'professional',
    name: 'Professional',
    description: 'Clean and traditional format, perfect for corporate roles',
    color: '#1e40af',
    category: 'general'
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'Contemporary design with accent colors',
    color: '#7c3aed',
    category: 'general'
  },
  {
    id: 'creative',
    name: 'Creative',
    description: 'Stand out with unique styling',
    color: '#059669',
    category: 'general'
  },
  {
    id: 'executive',
    name: 'Executive',
    description: 'Sophisticated for senior roles',
    color: '#991b1b',
    category: 'general'
  },
  // ATS Templates
  {
    id: 'ats-classic',
    name: 'ATS Classic',
    description: 'Optimised to pass Applicant Tracking Systems',
    color: '#000000',
    category: 'ats'
  },
  {
    id: 'ats-modern',
    name: 'ATS Modern',
    description: 'ATS-friendly with a modern touch',
    color: '#2563eb',
    category: 'ats'
  },
  // Industry-specific ATS Templates
  {
    id: 'ats-tech',
    name: 'ATS Tech/IT',
    description: 'Optimised for technology and software roles',
    color: '#0891b2',
    category: 'ats-industry',
    industry: 'Technology'
  },
  {
    id: 'ats-finance',
    name: 'ATS Finance/Banking',
    description: 'Professional format for financial services',
    color: '#0f766e',
    category: 'ats-industry',
    industry: 'Finance'
  },
  {
    id: 'ats-healthcare',
    name: 'ATS Healthcare/Medical',
    description: 'Clean format for healthcare professionals',
    color: '#dc2626',
    category: 'ats-industry',
    industry: 'Healthcare'
  },
  {
    id: 'ats-engineering',
    name: 'ATS Engineering',
    description: 'Structured format for engineering roles',
    color: '#ea580c',
    category: 'ats-industry',
    industry: 'Engineering'
  },
  {
    id: 'ats-sales',
    name: 'ATS Sales/Marketing',
    description: 'Results-focused format for sales professionals',
    color: '#c026d3',
    category: 'ats-industry',
    industry: 'Sales & Marketing'
  },
  {
    id: 'ats-education',
    name: 'ATS Education/Academic',
    description: 'Academic format for teaching and research',
    color: '#4f46e5',
    category: 'ats-industry',
    industry: 'Education'
  },
  {
    id: 'ats-legal',
    name: 'ATS Legal/Law',
    description: 'Formal format for legal professionals',
    color: '#1e3a5f',
    category: 'ats-industry',
    industry: 'Legal'
  },
  {
    id: 'ats-hospitality',
    name: 'ATS Hospitality/Tourism',
    description: 'Friendly format for service industry roles',
    color: '#b45309',
    category: 'ats-industry',
    industry: 'Hospitality'
  },
  {
    id: 'ats-retail',
    name: 'ATS Retail/Customer Service',
    description: 'Customer-focused format for retail roles',
    color: '#be185d',
    category: 'ats-industry',
    industry: 'Retail'
  },
  {
    id: 'ats-manufacturing',
    name: 'ATS Manufacturing/Operations',
    description: 'Practical format for production roles',
    color: '#4d7c0f',
    category: 'ats-industry',
    industry: 'Manufacturing'
  }
];

const EnhancedCVBuilder = ({ isPartner = false, baseUrl = '', primaryColor = '#1e40af', secondaryColor = '#7c3aed' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, token, loading } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef(null);
  
  // State
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0]);
  const [activeTab, setActiveTab] = useState('template');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExtractingCV, setIsExtractingCV] = useState(false);
  const [isEnhancingAll, setIsEnhancingAll] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [editingDocId, setEditingDocId] = useState(null);
  const [templateCategory, setTemplateCategory] = useState('all');
  
  // AI enhancement states
  const [isEnhancingSummary, setIsEnhancingSummary] = useState(false);
  const [isEnhancingDescription, setIsEnhancingDescription] = useState({});
  const [isEnhancingAchievements, setIsEnhancingAchievements] = useState({});
  const [isEnhancingSkills, setIsEnhancingSkills] = useState(false);
  
  // Suggested content
  const [suggestedSummary, setSuggestedSummary] = useState('');
  const [suggestedSkills, setSuggestedSkills] = useState([]);
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    idNumber: '',
    languages: [''],
    photo: null,
    photoPreview: '',
    summary: '',
    experiences: [{ title: '', company: '', duration: '', description: '', achievements: '' }],
    education: [{ degree: '', institution: '', year: '' }],
    skills: [''],
  });

  // Check access - wait for loading to complete
  const hasAccess = !loading && isAuthenticated && user?.active_tier;
  const isLoading = loading;

  // Load document if editing
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const docId = params.get('edit');
    if (docId && token && !loading) {
      loadDocument(docId);
    }
  }, [location.search, token, loading]);

  const loadDocument = async (docId) => {
    try {
      const response = await fetch(`${API_URL}/api/cv/documents/${docId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const doc = await response.json();
        setFormData(doc.cv_data);
        setSelectedTemplate(TEMPLATES.find(t => t.id === doc.template_id) || TEMPLATES[0]);
        setEditingDocId(docId);
        setActiveTab('personal');
        toast({ title: 'Document Loaded', description: 'You can now edit your CV' });
      }
    } catch (error) {
      console.error('Error loading document:', error);
    }
  };

  // Show loading state while auth is being checked
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // Handlers
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
      experiences: [...formData.experiences, { title: '', company: '', duration: '', description: '', achievements: '' }],
    });
  };

  const removeExperience = (index) => {
    if (formData.experiences.length > 1) {
      setFormData({ ...formData, experiences: formData.experiences.filter((_, i) => i !== index) });
    }
  };

  const addEducation = () => {
    setFormData({
      ...formData,
      education: [...formData.education, { degree: '', institution: '', year: '' }],
    });
  };

  const removeEducation = (index) => {
    if (formData.education.length > 1) {
      setFormData({ ...formData, education: formData.education.filter((_, i) => i !== index) });
    }
  };

  const addSkill = () => {
    setFormData({ ...formData, skills: [...formData.skills, ''] });
  };

  const removeSkill = (index) => {
    if (formData.skills.length > 1) {
      setFormData({ ...formData, skills: formData.skills.filter((_, i) => i !== index) });
    }
  };

  // CV Upload handlers
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
      handleCVUpload(e.dataTransfer.files[0]);
    }
  };

  const handleCVUpload = async (file) => {
    if (!file) return;
    
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|doc|docx|txt)$/i)) {
      toast({ title: 'Invalid File', description: 'Please upload a PDF, Word document, or text file', variant: 'destructive' });
      return;
    }

    setIsExtractingCV(true);
    try {
      const formDataObj = new FormData();
      formDataObj.append('file', file);

      const response = await fetch(`${API_URL}/api/ai-content/extract-cv-data`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formDataObj
      });

      if (response.ok) {
        const data = await response.json();
        const cvData = data.cv_data || data.data;
        if (cvData) {
          // Merge extracted data with form
          setFormData(prev => ({
            ...prev,
            fullName: cvData.fullName || cvData.full_name || prev.fullName,
            email: cvData.email || prev.email,
            phone: cvData.phone || prev.phone,
            address: cvData.address || prev.address,
            summary: cvData.summary || prev.summary,
            experiences: cvData.experiences?.length > 0 ? cvData.experiences : prev.experiences,
            education: cvData.education?.length > 0 ? cvData.education : prev.education,
            skills: cvData.skills?.length > 0 ? cvData.skills : prev.skills,
          }));
          setActiveTab('personal');
          toast({ title: 'CV Imported!', description: 'Your CV data has been extracted. Review and enhance it.' });
        } else {
          throw new Error('No CV data returned');
        }
      } else {
        throw new Error('Failed to extract CV data');
      }
    } catch (error) {
      toast({ title: 'Import Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsExtractingCV(false);
    }
  };

  // AI Enhancement functions
  const enhanceSummary = async () => {
    if (!formData.summary && formData.experiences.every(e => !e.title)) {
      toast({ title: 'Need More Info', description: 'Add some work experience first', variant: 'destructive' });
      return;
    }

    setIsEnhancingSummary(true);
    try {
      const jobTitles = formData.experiences.map(e => e.title).filter(Boolean).join(', ');
      const response = await fetch(`${API_URL}/api/ai-content/generate-cv-summary`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          job_titles: jobTitles,
          experience_descriptions: formData.experiences.map(e => e.description).filter(Boolean).join('\n'),
          skills: formData.skills.filter(Boolean).join(', '),
          current_summary: formData.summary
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSuggestedSummary(data.summary);
        toast({ title: 'Summary Generated!', description: 'Review the AI suggestion below' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to generate summary', variant: 'destructive' });
    } finally {
      setIsEnhancingSummary(false);
    }
  };

  const enhanceDescription = async (index) => {
    const exp = formData.experiences[index];
    if (!exp.title && !exp.description) {
      toast({ title: 'Need More Info', description: 'Add job title or description first', variant: 'destructive' });
      return;
    }

    setIsEnhancingDescription(prev => ({ ...prev, [index]: true }));
    try {
      const response = await fetch(`${API_URL}/api/cv/enhance-section`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          section: 'experience',
          content: exp.description || `${exp.title} at ${exp.company}`,
          context: exp.title
        })
      });

      if (response.ok) {
        const data = await response.json();
        handleExperienceChange(index, 'description', data.enhanced);
        toast({ title: 'Description Enhanced!', description: 'Job description improved with AI' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to enhance description', variant: 'destructive' });
    } finally {
      setIsEnhancingDescription(prev => ({ ...prev, [index]: false }));
    }
  };

  const enhanceAchievements = async (index) => {
    const exp = formData.experiences[index];
    if (!exp.title) {
      toast({ title: 'Need More Info', description: 'Add job title first', variant: 'destructive' });
      return;
    }

    setIsEnhancingAchievements(prev => ({ ...prev, [index]: true }));
    try {
      const response = await fetch(`${API_URL}/api/cv/enhance-section`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          section: 'achievements',
          content: exp.achievements || exp.description || `${exp.title} role`,
          context: `${exp.title} at ${exp.company}`
        })
      });

      if (response.ok) {
        const data = await response.json();
        handleExperienceChange(index, 'achievements', data.enhanced);
        toast({ title: 'Achievements Enhanced!', description: 'Key achievements improved' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to enhance achievements', variant: 'destructive' });
    } finally {
      setIsEnhancingAchievements(prev => ({ ...prev, [index]: false }));
    }
  };

  const enhanceSkills = async () => {
    const jobTitles = formData.experiences.map(e => e.title).filter(Boolean).join(', ');
    if (!jobTitles && formData.skills.filter(Boolean).length === 0) {
      toast({ title: 'Need More Info', description: 'Add work experience or some skills first', variant: 'destructive' });
      return;
    }

    setIsEnhancingSkills(true);
    try {
      const response = await fetch(`${API_URL}/api/ai-content/generate-cv-skills`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          job_titles: jobTitles,
          experience_descriptions: formData.experiences.map(e => e.description).filter(Boolean).join('\n'),
          current_skills: formData.skills.filter(Boolean).join(', ')
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSuggestedSkills(data.skills || []);
        toast({ title: 'Skills Generated!', description: 'Review suggested skills below' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to generate skills', variant: 'destructive' });
    } finally {
      setIsEnhancingSkills(false);
    }
  };

  const enhanceAll = async () => {
    if (!formData.fullName) {
      toast({ title: 'Need More Info', description: 'Please fill in your name and some details first', variant: 'destructive' });
      return;
    }

    setIsEnhancingAll(true);
    try {
      const response = await fetch(`${API_URL}/api/cv/ai-enhance-all`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const data = await response.json();
        setFormData(prev => ({
          ...prev,
          summary: data.enhanced_summary || prev.summary,
          experiences: data.enhanced_experiences?.length > 0 
            ? data.enhanced_experiences.map((exp, i) => ({
                ...prev.experiences[i],
                ...exp
              }))
            : prev.experiences,
          skills: data.enhanced_skills?.length > 0 ? data.enhanced_skills : prev.skills
        }));
        toast({ title: 'CV Enhanced!', description: 'All sections have been improved by AI' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to enhance CV', variant: 'destructive' });
    } finally {
      setIsEnhancingAll(false);
    }
  };

  // Generate PDF
  const generatePDF = async () => {
    if (!formData.fullName) {
      toast({ title: 'Missing Info', description: 'Please enter your full name', variant: 'destructive' });
      return;
    }

    setIsGenerating(true);
    try {
      const endpoint = editingDocId 
        ? `${API_URL}/api/cv/documents/${editingDocId}`
        : `${API_URL}/api/cv/generate-pdf`;
      
      const method = editingDocId ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          template_id: selectedTemplate.id,
          cv_data: {
            full_name: formData.fullName,
            email: formData.email,
            phone: formData.phone,
            address: formData.address,
            summary: formData.summary,
            experiences: formData.experiences,
            education: formData.education,
            skills: formData.skills.filter(Boolean)
          },
          save_to_documents: true,
          document_name: `CV - ${formData.fullName}`
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Download PDF
        const pdfBlob = new Blob(
          [Uint8Array.from(atob(data.pdf_base64), c => c.charCodeAt(0))],
          { type: 'application/pdf' }
        );
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast({ 
          title: 'CV Created!', 
          description: 'Your CV has been downloaded and saved to My Documents'
        });

        // Update editing state
        if (!editingDocId) {
          setEditingDocId(data.document_id);
        }
      } else {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to generate CV');
      }
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  // Apply suggested content
  const applySuggestedSummary = () => {
    setFormData(prev => ({ ...prev, summary: suggestedSummary }));
    setSuggestedSummary('');
  };

  const addSuggestedSkill = (skill) => {
    if (!formData.skills.includes(skill)) {
      const emptyIndex = formData.skills.findIndex(s => !s);
      if (emptyIndex >= 0) {
        const newSkills = [...formData.skills];
        newSkills[emptyIndex] = skill;
        setFormData({ ...formData, skills: newSkills });
      } else {
        setFormData({ ...formData, skills: [...formData.skills, skill] });
      }
    }
    setSuggestedSkills(prev => prev.filter(s => s !== skill));
  };

  // Render template selection
  const renderTemplateSelection = () => {
    const filteredTemplates = templateCategory === 'all' 
      ? TEMPLATES 
      : TEMPLATES.filter(t => t.category === templateCategory || (templateCategory === 'ats-all' && t.category.startsWith('ats')));
    
    return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Template</h2>
        <p className="text-gray-600">Select a professional template for your CV</p>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap justify-center gap-2 mb-6">
        <Button
          variant={templateCategory === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTemplateCategory('all')}
          style={templateCategory === 'all' ? { backgroundColor: primaryColor } : {}}
        >
          All Templates
        </Button>
        <Button
          variant={templateCategory === 'general' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTemplateCategory('general')}
          style={templateCategory === 'general' ? { backgroundColor: primaryColor } : {}}
        >
          General
        </Button>
        <Button
          variant={templateCategory === 'ats-all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTemplateCategory('ats-all')}
          style={templateCategory === 'ats-all' ? { backgroundColor: primaryColor } : {}}
        >
          ATS-Optimised
        </Button>
        <Button
          variant={templateCategory === 'ats-industry' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTemplateCategory('ats-industry')}
          style={templateCategory === 'ats-industry' ? { backgroundColor: primaryColor } : {}}
        >
          Industry-Specific
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredTemplates.map((template) => (
          <Card 
            key={template.id}
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedTemplate.id === template.id 
                ? 'ring-2 ring-offset-2' 
                : 'hover:scale-105'
            }`}
            style={{ 
              borderColor: selectedTemplate.id === template.id ? template.color : undefined,
              ringColor: template.color
            }}
            onClick={() => setSelectedTemplate(template)}
          >
            <CardContent className="p-3">
              <div 
                className="h-24 rounded-lg mb-2 flex items-center justify-center"
                style={{ backgroundColor: `${template.color}15` }}
              >
                <div 
                  className="w-12 h-16 rounded shadow-sm bg-white border-t-4"
                  style={{ borderColor: template.color }}
                >
                  <div className="p-1">
                    <div className="h-1.5 rounded mb-0.5" style={{ backgroundColor: template.color, width: '70%' }}></div>
                    <div className="h-0.5 bg-gray-200 rounded mb-0.5"></div>
                    <div className="h-0.5 bg-gray-200 rounded mb-0.5" style={{ width: '80%' }}></div>
                    <div className="h-0.5 bg-gray-200 rounded" style={{ width: '60%' }}></div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 text-sm truncate">{template.name}</h3>
                  <p className="text-xs text-gray-500 truncate">{template.description}</p>
                  {template.industry && (
                    <Badge variant="outline" className="mt-1 text-xs" style={{ borderColor: template.color, color: template.color }}>
                      {template.industry}
                    </Badge>
                  )}
                </div>
                {selectedTemplate.id === template.id && (
                  <CheckCircle className="h-5 w-5 flex-shrink-0 ml-1" style={{ color: template.color }} />
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* CV Upload Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Existing CV
          </CardTitle>
          <CardDescription>
            Upload your existing CV to extract and enhance your information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".pdf,.doc,.docx"
            onChange={(e) => handleCVUpload(e.target.files?.[0])}
          />
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            {isExtractingCV ? (
              <div className="flex flex-col items-center">
                <Loader2 className="h-10 w-10 text-blue-500 animate-spin mb-3" />
                <p className="text-blue-600 font-medium">Extracting CV data...</p>
              </div>
            ) : (
              <>
                <FileText className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-700 font-medium mb-1">Drop your CV here or click to upload</p>
                <p className="text-sm text-gray-500">Supports PDF, Word documents, and text files</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button 
          onClick={() => setActiveTab('personal')}
          className="gap-2"
          style={{ backgroundColor: primaryColor }}
        >
          Continue <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
  };

  // Main render
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <Card className="p-8">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">CV Builder</h2>
            <p className="text-gray-600 mb-6">
              Please log in and purchase a plan to access the AI-powered CV Builder.
            </p>
            <Button onClick={() => navigate(isPartner ? `${baseUrl}/pricing` : '/pricing')}>
              View Plans
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Badge className="mb-4" style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}>
            <Sparkles className="mr-1 h-3 w-3" />
            AI-Powered
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            AI Resume Builder
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Build your professional CV with AI assistance. Select a template, import your existing CV, and let AI enhance your content.
          </p>
        </div>

        {/* Progress Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-flex">
            <TabsTrigger value="template" className="gap-2">
              <Layout className="h-4 w-4" />
              <span className="hidden sm:inline">Template</span>
            </TabsTrigger>
            <TabsTrigger value="personal" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Personal</span>
            </TabsTrigger>
            <TabsTrigger value="experience" className="gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Experience</span>
            </TabsTrigger>
            <TabsTrigger value="education" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Education</span>
            </TabsTrigger>
            <TabsTrigger value="skills" className="gap-2">
              <CheckCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Skills</span>
            </TabsTrigger>
          </TabsList>

          {/* Template Tab */}
          <TabsContent value="template" className="mt-6">
            {renderTemplateSelection()}
          </TabsContent>

          {/* Personal Info Tab */}
          <TabsContent value="personal" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Enter your contact details</CardDescription>
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
                      placeholder="John Smith"
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
                      placeholder="john.smith@email.com"
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
                  <div>
                    <Label htmlFor="address">Location</Label>
                    <Input
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="Cape Town, South Africa"
                    />
                  </div>
                </div>

                {/* Professional Summary */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="summary">Professional Summary</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={enhanceSummary}
                      disabled={isEnhancingSummary}
                      className="text-purple-600 hover:text-purple-700"
                    >
                      {isEnhancingSummary ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <Wand2 className="h-4 w-4 mr-1" />
                      )}
                      AI Suggest
                    </Button>
                  </div>
                  <Textarea
                    id="summary"
                    name="summary"
                    value={formData.summary}
                    onChange={handleChange}
                    placeholder="Write a brief summary of your professional experience and goals..."
                    rows={4}
                  />
                  
                  {/* AI Suggested Summary */}
                  {suggestedSummary && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mt-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-4 w-4 text-purple-600" />
                        <span className="text-sm font-medium text-purple-900">AI-Generated Summary</span>
                      </div>
                      <p className="text-sm text-purple-800 mb-3">{suggestedSummary}</p>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={applySuggestedSummary} className="bg-purple-600 hover:bg-purple-700">
                          <Check className="h-3 w-3 mr-1" /> Use This
                        </Button>
                        <Button size="sm" variant="outline" onClick={enhanceSummary} disabled={isEnhancingSummary}>
                          <RefreshCw className="h-3 w-3 mr-1" /> Regenerate
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setSuggestedSummary('')}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setActiveTab('template')}>
                    Back
                  </Button>
                  <Button onClick={() => setActiveTab('experience')} style={{ backgroundColor: primaryColor }}>
                    Continue <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Experience Tab */}
          <TabsContent value="experience" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Work Experience</CardTitle>
                    <CardDescription>Add your work history with AI enhancement</CardDescription>
                  </div>
                  <Button onClick={addExperience} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-1" /> Add Experience
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {formData.experiences.map((exp, index) => (
                  <Card key={index} className="bg-gray-50">
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">Experience {index + 1}</h4>
                        {formData.experiences.length > 1 && (
                          <Button
                            onClick={() => removeExperience(index)}
                            variant="ghost"
                            size="sm"
                            className="text-red-600"
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
                        <div className="flex items-center justify-between mb-1">
                          <Label>Description & Responsibilities</Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => enhanceDescription(index)}
                            disabled={isEnhancingDescription[index]}
                            className="text-purple-600"
                          >
                            {isEnhancingDescription[index] ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                              <Wand2 className="h-4 w-4 mr-1" />
                            )}
                            AI Enhance
                          </Button>
                        </div>
                        <Textarea
                          value={exp.description}
                          onChange={(e) => handleExperienceChange(index, 'description', e.target.value)}
                          placeholder="Describe your responsibilities..."
                          rows={3}
                        />
                      </div>
                      
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <Label>Key Achievements</Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => enhanceAchievements(index)}
                            disabled={isEnhancingAchievements[index]}
                            className="text-purple-600"
                          >
                            {isEnhancingAchievements[index] ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                              <Wand2 className="h-4 w-4 mr-1" />
                            )}
                            AI Suggest
                          </Button>
                        </div>
                        <Textarea
                          value={exp.achievements}
                          onChange={(e) => handleExperienceChange(index, 'achievements', e.target.value)}
                          placeholder="• Led a team of 5 developers&#10;• Increased efficiency by 30%&#10;• Implemented new system saving R100,000 annually"
                          rows={3}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setActiveTab('personal')}>
                    Back
                  </Button>
                  <Button onClick={() => setActiveTab('education')} style={{ backgroundColor: primaryColor }}>
                    Continue <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Education Tab */}
          <TabsContent value="education" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Education</CardTitle>
                    <CardDescription>Add your educational background</CardDescription>
                  </div>
                  <Button onClick={addEducation} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-1" /> Add Education
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.education.map((edu, index) => (
                  <Card key={index} className="bg-gray-50">
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">Education {index + 1}</h4>
                        {formData.education.length > 1 && (
                          <Button
                            onClick={() => removeEducation(index)}
                            variant="ghost"
                            size="sm"
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Degree / Qualification</Label>
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
                            placeholder="University of Cape Town"
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

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setActiveTab('experience')}>
                    Back
                  </Button>
                  <Button onClick={() => setActiveTab('skills')} style={{ backgroundColor: primaryColor }}>
                    Continue <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Skills Tab */}
          <TabsContent value="skills" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Skills</CardTitle>
                    <CardDescription>List your professional skills</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={enhanceSkills}
                      variant="outline"
                      size="sm"
                      disabled={isEnhancingSkills}
                      className="text-purple-600 border-purple-200"
                    >
                      {isEnhancingSkills ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <Wand2 className="h-4 w-4 mr-1" />
                      )}
                      AI Suggest
                    </Button>
                    <Button onClick={addSkill} variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-1" /> Add Skill
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {formData.skills.map((skill, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={skill}
                        onChange={(e) => handleSkillChange(index, e.target.value)}
                        placeholder="e.g., JavaScript, Project Management"
                      />
                      {formData.skills.length > 1 && (
                        <Button
                          onClick={() => removeSkill(index)}
                          variant="ghost"
                          size="icon"
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {/* AI Suggested Skills */}
                {suggestedSkills.length > 0 && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium text-purple-900">AI Suggested Skills</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {suggestedSkills.map((skill, index) => (
                        <Button
                          key={index}
                          size="sm"
                          variant="outline"
                          onClick={() => addSuggestedSkill(skill)}
                          className="bg-white hover:bg-purple-100"
                        >
                          <Plus className="h-3 w-3 mr-1" /> {skill}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Generate Section */}
                <div className="border-t pt-6 mt-6">
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to Create Your CV?</h3>
                    <p className="text-gray-600 mb-4">
                      Using template: <strong>{selectedTemplate.name}</strong>
                    </p>
                    
                    <div className="flex flex-wrap gap-3">
                      <Button
                        onClick={enhanceAll}
                        variant="outline"
                        disabled={isEnhancingAll}
                        className="gap-2"
                      >
                        {isEnhancingAll ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                        AI Enhance All Sections
                      </Button>
                      
                      <Button
                        onClick={generatePDF}
                        disabled={isGenerating || !formData.fullName}
                        className="gap-2"
                        style={{ 
                          background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` 
                        }}
                        size="lg"
                      >
                        {isGenerating ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Download className="h-5 w-5" />
                        )}
                        AI Create & Download CV (PDF)
                      </Button>
                    </div>
                    
                    {!formData.fullName && (
                      <p className="text-sm text-red-600 mt-2">Please enter your full name first</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setActiveTab('education')}>
                    Back
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default EnhancedCVBuilder;
