import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import {
  Briefcase, Sparkles, Loader2, Plus, X, ArrowLeft,
  DollarSign, Clock, Globe, Building2, Wand2
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const PostJob = () => {
  const navigate = useNavigate();
  const { token, isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [suggestingSkills, setSuggestingSkills] = useState(false);
  const [options, setOptions] = useState(null);
  
  const [formData, setFormData] = useState({
    title: '',
    company_name: '',
    description: '',
    job_type: 'full-time',
    required_skills: [],
    preferred_skills: [],
    experience_level: 'mid',
    budget_min: '',
    budget_max: '',
    currency: 'USD',
    budget_type: 'monthly',
    timeline: 'ongoing',
    location_preference: 'worldwide',
    preferred_regions: [],
    timezone_overlap: '',
    language_requirements: ['English'],
    remote_type: 'fully-remote',
    application_deadline: ''
  });
  
  const [bulletPoints, setBulletPoints] = useState(['']);
  const [newSkill, setNewSkill] = useState('');
  const [newPreferredSkill, setNewPreferredSkill] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchOptions();
  }, [isAuthenticated, navigate]);

  const fetchOptions = async () => {
    try {
      const response = await fetch(`${API_URL}/api/remote-jobs/options`);
      if (response.ok) {
        const data = await response.json();
        setOptions(data);
      }
    } catch (error) {
      console.error('Error fetching options:', error);
    }
  };

  const handleGenerateDescription = async () => {
    if (!formData.title) {
      toast({
        title: 'Missing Title',
        description: 'Please enter a job title first',
        variant: 'destructive'
      });
      return;
    }
    
    setGeneratingDescription(true);
    try {
      const response = await fetch(`${API_URL}/api/remote-jobs/ai/generate-description`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: formData.title,
          bullet_points: bulletPoints.filter(bp => bp.trim()),
          job_type: formData.job_type,
          industry: '',
          required_skills: formData.required_skills
        })
      });

      if (response.ok) {
        const data = await response.json();
        setFormData(prev => ({ ...prev, description: data.description }));
        toast({
          title: 'Description Generated',
          description: 'AI has created a job description for you'
        });
      } else {
        throw new Error('Failed to generate description');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate description',
        variant: 'destructive'
      });
    } finally {
      setGeneratingDescription(false);
    }
  };

  const handleSuggestSkills = async () => {
    if (!formData.title) {
      toast({
        title: 'Missing Title',
        description: 'Please enter a job title first',
        variant: 'destructive'
      });
      return;
    }
    
    setSuggestingSkills(true);
    try {
      const response = await fetch(`${API_URL}/api/remote-jobs/ai/suggest-skills`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          industry: ''
        })
      });

      if (response.ok) {
        const data = await response.json();
        setFormData(prev => ({
          ...prev,
          required_skills: data.required_skills || [],
          preferred_skills: data.preferred_skills || []
        }));
        toast({
          title: 'Skills Suggested',
          description: 'AI has suggested skills for this role'
        });
      } else {
        throw new Error('Failed to suggest skills');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to suggest skills',
        variant: 'destructive'
      });
    } finally {
      setSuggestingSkills(false);
    }
  };

  const addBulletPoint = () => {
    setBulletPoints(prev => [...prev, '']);
  };

  const updateBulletPoint = (index, value) => {
    setBulletPoints(prev => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const removeBulletPoint = (index) => {
    setBulletPoints(prev => prev.filter((_, i) => i !== index));
  };

  const addSkill = (type) => {
    const skill = type === 'required' ? newSkill : newPreferredSkill;
    if (!skill.trim()) return;
    
    setFormData(prev => ({
      ...prev,
      [type === 'required' ? 'required_skills' : 'preferred_skills']: [
        ...prev[type === 'required' ? 'required_skills' : 'preferred_skills'],
        skill.trim()
      ]
    }));
    
    if (type === 'required') setNewSkill('');
    else setNewPreferredSkill('');
  };

  const removeSkill = (type, skillToRemove) => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].filter(s => s !== skillToRemove)
    }));
  };

  const toggleRegion = (region) => {
    setFormData(prev => ({
      ...prev,
      preferred_regions: prev.preferred_regions.includes(region)
        ? prev.preferred_regions.filter(r => r !== region)
        : [...prev.preferred_regions, region]
    }));
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.title || !formData.company_name || !formData.description) {
      toast({
        title: 'Missing Fields',
        description: 'Please fill in title, company name, and description',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const submitData = {
        ...formData,
        budget_min: formData.budget_min ? parseFloat(formData.budget_min) : null,
        budget_max: formData.budget_max ? parseFloat(formData.budget_max) : null
      };

      const response = await fetch(`${API_URL}/api/remote-jobs/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(submitData)
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: 'Job Posted!',
          description: 'Your job listing is now live'
        });
        navigate(`/remote-jobs/${data.job.id}`);
      } else {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to post job');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to post job',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!options) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/remote-jobs')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Jobs
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-6 w-6 text-blue-600" />
              Post a Remote Job
            </CardTitle>
            <CardDescription>
              Use AI to help you create a compelling job posting
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Info */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Job Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Senior React Developer"
                  data-testid="job-title-input"
                />
              </div>
              <div>
                <Label>Company Name *</Label>
                <Input
                  value={formData.company_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                  placeholder="Your company name"
                  data-testid="company-name-input"
                />
              </div>
            </div>

            {/* Job Type & Experience */}
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label>Job Type *</Label>
                <Select
                  value={formData.job_type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, job_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {options.job_types.map((type) => (
                      <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Experience Level *</Label>
                <Select
                  value={formData.experience_level}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, experience_level: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {options.experience_levels.map((level) => (
                      <SelectItem key={level.id} value={level.id}>{level.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Remote Type</Label>
                <Select
                  value={formData.remote_type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, remote_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {options.remote_types.map((type) => (
                      <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* AI-Assisted Description */}
            <div className="border rounded-lg p-4 bg-blue-50/50">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Wand2 className="h-4 w-4 text-purple-600" />
                  AI-Assisted Job Description
                </Label>
              </div>
              
              <p className="text-sm text-gray-600 mb-3">
                Enter key points about the role, and AI will generate a professional description
              </p>
              
              <div className="space-y-2 mb-4">
                {bulletPoints.map((point, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={point}
                      onChange={(e) => updateBulletPoint(index, e.target.value)}
                      placeholder={`Key point ${index + 1} (e.g., "Build scalable APIs")`}
                    />
                    {bulletPoints.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeBulletPoint(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addBulletPoint}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Point
                </Button>
              </div>
              
              <Button
                onClick={handleGenerateDescription}
                disabled={generatingDescription}
                className="bg-purple-600 hover:bg-purple-700"
                data-testid="generate-description-btn"
              >
                {generatingDescription ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Generate Description
              </Button>
            </div>

            {/* Job Description */}
            <div>
              <Label>Job Description *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the role, responsibilities, and requirements..."
                rows={10}
                data-testid="job-description-textarea"
              />
            </div>

            {/* Skills */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-semibold">Skills</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSuggestSkills}
                  disabled={suggestingSkills}
                  className="gap-1 text-purple-600 border-purple-200"
                  data-testid="suggest-skills-btn"
                >
                  {suggestingSkills ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3" />
                  )}
                  AI Suggest Skills
                </Button>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                {/* Required Skills */}
                <div>
                  <Label className="text-sm text-gray-600">Required Skills</Label>
                  <div className="flex gap-2 mt-1 mb-2">
                    <Input
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      placeholder="Add skill"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill('required'))}
                    />
                    <Button type="button" variant="outline" onClick={() => addSkill('required')}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {formData.required_skills.map((skill, i) => (
                      <Badge key={i} variant="secondary" className="gap-1">
                        {skill}
                        <X
                          className="h-3 w-3 cursor-pointer hover:text-red-500"
                          onClick={() => removeSkill('required_skills', skill)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
                
                {/* Preferred Skills */}
                <div>
                  <Label className="text-sm text-gray-600">Preferred Skills (Nice to have)</Label>
                  <div className="flex gap-2 mt-1 mb-2">
                    <Input
                      value={newPreferredSkill}
                      onChange={(e) => setNewPreferredSkill(e.target.value)}
                      placeholder="Add skill"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill('preferred'))}
                    />
                    <Button type="button" variant="outline" onClick={() => addSkill('preferred')}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {formData.preferred_skills.map((skill, i) => (
                      <Badge key={i} variant="outline" className="gap-1">
                        {skill}
                        <X
                          className="h-3 w-3 cursor-pointer hover:text-red-500"
                          onClick={() => removeSkill('preferred_skills', skill)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Budget */}
            <div className="border rounded-lg p-4">
              <Label className="text-base font-semibold flex items-center gap-2 mb-3">
                <DollarSign className="h-4 w-4 text-green-600" />
                Budget / Compensation
              </Label>
              
              <div className="grid md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-sm">Currency</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {options.currencies.map((curr) => (
                        <SelectItem key={curr.id} value={curr.id}>{curr.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm">Budget Type</Label>
                  <Select
                    value={formData.budget_type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, budget_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {options.budget_types.map((type) => (
                        <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm">Min Budget</Label>
                  <Input
                    type="number"
                    value={formData.budget_min}
                    onChange={(e) => setFormData(prev => ({ ...prev, budget_min: e.target.value }))}
                    placeholder="e.g., 3000"
                  />
                </div>
                <div>
                  <Label className="text-sm">Max Budget</Label>
                  <Input
                    type="number"
                    value={formData.budget_max}
                    onChange={(e) => setFormData(prev => ({ ...prev, budget_max: e.target.value }))}
                    placeholder="e.g., 5000"
                  />
                </div>
              </div>
            </div>

            {/* Timeline & Location */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Timeline
                </Label>
                <Select
                  value={formData.timeline}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, timeline: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {options.timelines.map((tl) => (
                      <SelectItem key={tl.id} value={tl.id}>{tl.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Location Preference
                </Label>
                <Select
                  value={formData.location_preference}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, location_preference: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="worldwide">Worldwide</SelectItem>
                    <SelectItem value="specific">Specific Regions</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Preferred Regions */}
            {formData.location_preference === 'specific' && (
              <div>
                <Label>Preferred Regions</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {options.regions.filter(r => r !== 'Worldwide').map((region) => (
                    <Badge
                      key={region}
                      variant={formData.preferred_regions.includes(region) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleRegion(region)}
                    >
                      {region}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Language */}
            <div>
              <Label>Language Requirements</Label>
              <Select
                value={formData.language_requirements[0]}
                onValueChange={(value) => setFormData(prev => ({ ...prev, language_requirements: [value] }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {options.languages.map((lang) => (
                    <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => navigate('/remote-jobs')}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700"
                data-testid="submit-job-btn"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Briefcase className="h-4 w-4 mr-2" />
                )}
                Post Job
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PostJob;
