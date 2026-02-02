import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import { Checkbox } from '../components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Users, Eye, EyeOff, Loader2, Check, X, Save, Trash2,
  Mail, Clock, CheckCircle, XCircle, MessageSquare, Briefcase,
  Plus, AlertCircle, Camera, Upload, User, Sparkles, Globe, PenTool
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import SignatureCanvas from '../components/SignatureCanvas';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const MyTalentPoolProfile = () => {
  const { token, user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [savingSignature, setSavingSignature] = useState(false);
  const [optedIn, setOptedIn] = useState(false);
  const [profile, setProfile] = useState(null);
  const [signature, setSignature] = useState(null);
  const [contactRequests, setContactRequests] = useState([]);
  const [industries, setIndustries] = useState([]);
  const [experienceLevels, setExperienceLevels] = useState([]);
  const [userCVs, setUserCVs] = useState([]);
  const [profilePicturePreview, setProfilePicturePreview] = useState(null);
  const [improvingSkills, setImprovingSkills] = useState(false);
  const [improvingBio, setImprovingBio] = useState(false);
  const [improvingSummary, setImprovingSummary] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: '',
    job_title: '',
    industry: '',
    experience_level: '',
    location: '',
    skills: [],
    bio: '',
    summary: '',
    is_remote_worker: false,
    cv_document_id: '',
    profile_picture_url: '',
    is_visible: true
  });
  
  const [newSkill, setNewSkill] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch industries
      const industriesRes = await fetch(`${API_URL}/api/talent-pool/industries`);
      if (industriesRes.ok) {
        const data = await industriesRes.json();
        setIndustries(data.industries || []);
      }

      // Fetch experience levels
      const levelsRes = await fetch(`${API_URL}/api/talent-pool/experience-levels`);
      if (levelsRes.ok) {
        const data = await levelsRes.json();
        setExperienceLevels(data.levels || []);
      }

      // Fetch my profile
      const profileRes = await fetch(`${API_URL}/api/talent-pool/my-profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (profileRes.ok) {
        const data = await profileRes.json();
        setOptedIn(data.opted_in);
        if (data.profile) {
          setProfile(data.profile);
          setFormData({
            full_name: data.profile.full_name || user?.full_name || '',
            job_title: data.profile.job_title || '',
            industry: data.profile.industry || '',
            experience_level: data.profile.experience_level || '',
            location: data.profile.location || '',
            skills: data.profile.skills || [],
            bio: data.profile.bio || '',
            summary: data.profile.summary || '',
            is_remote_worker: data.profile.is_remote_worker || false,
            cv_document_id: data.profile.cv_document_id || '',
            profile_picture_url: data.profile.profile_picture_url || '',
            is_visible: data.profile.is_visible ?? true
          });
          // Set profile picture preview if exists
          if (data.profile.profile_picture_url) {
            setProfilePicturePreview(`${API_URL}${data.profile.profile_picture_url}`);
          }
        } else {
          // Pre-fill with user data
          setFormData(prev => ({
            ...prev,
            full_name: user?.full_name || ''
          }));
        }
      }

      // Fetch contact requests
      const requestsRes = await fetch(`${API_URL}/api/talent-pool/contact-requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (requestsRes.ok) {
        const data = await requestsRes.json();
        setContactRequests(data.requests || []);
      }

      // Fetch signature
      const signatureRes = await fetch(`${API_URL}/api/talent-pool/my-signature`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (signatureRes.ok) {
        const data = await signatureRes.json();
        if (data.signature_url) {
          setSignature(data.signature_url);
        }
      }

      // Fetch user's CVs for selection
      const cvsRes = await fetch(`${API_URL}/api/cv/documents`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (cvsRes.ok) {
        const data = await cvsRes.json();
        setUserCVs(data.documents || []);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOptIn = async () => {
    if (!formData.full_name || !formData.job_title || !formData.industry || 
        !formData.experience_level || !formData.location || !formData.summary) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      // Map frontend field names to backend expected names
      const payload = {
        ...formData,
        profile_picture: formData.profile_picture_url  // Backend expects 'profile_picture'
      };
      delete payload.profile_picture_url;
      delete payload.is_visible;  // Not needed for opt-in
      
      const response = await fetch(`${API_URL}/api/talent-pool/opt-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        setOptedIn(true);
        setProfile(data.profile);
        toast({
          title: 'Success!',
          description: 'You are now visible in the Talent Pool'
        });
      } else {
        toast({
          title: 'Error',
          description: data.detail || 'Failed to opt in',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to opt in to talent pool',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateProfile = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/talent-pool/my-profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        setProfile(data.profile);
        toast({
          title: 'Profile Updated',
          description: 'Your talent pool profile has been updated'
        });
      } else {
        toast({
          title: 'Error',
          description: data.detail || 'Failed to update profile',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update profile',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleOptOut = async () => {
    if (!confirm('Are you sure you want to remove yourself from the Talent Pool? This will delete all pending contact requests.')) {
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/talent-pool/opt-out`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        setOptedIn(false);
        setProfile(null);
        setContactRequests([]);
        toast({
          title: 'Removed',
          description: 'You have been removed from the Talent Pool'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to opt out',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSignature = async (signatureData, mode) => {
    setSavingSignature(true);
    try {
      let response;
      
      if (mode === 'draw') {
        // Save drawn signature (base64 data URL)
        response = await fetch(`${API_URL}/api/talent-pool/signature/draw`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ signature_data: signatureData })
        });
      } else {
        // Upload signature file
        const formData = new FormData();
        formData.append('file', signatureData);
        response = await fetch(`${API_URL}/api/talent-pool/signature`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: formData
        });
      }

      if (response.ok) {
        const data = await response.json();
        setSignature(data.signature_url);
        toast({
          title: 'Signature Saved',
          description: 'Your signature has been saved and will be used when signing contracts'
        });
      } else {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to save signature');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save signature',
        variant: 'destructive'
      });
    } finally {
      setSavingSignature(false);
    }
  };

  const handleDeleteSignature = async () => {
    try {
      const response = await fetch(`${API_URL}/api/talent-pool/signature`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        setSignature(null);
        toast({
          title: 'Signature Deleted',
          description: 'Your signature has been removed'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete signature',
        variant: 'destructive'
      });
    }
  };

  const handleRespondToRequest = async (requestId, approved) => {
    try {
      const response = await fetch(`${API_URL}/api/talent-pool/contact-requests/${requestId}/respond`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ approved, message: '' })
      });

      if (response.ok) {
        toast({
          title: approved ? 'Request Approved' : 'Request Declined',
          description: approved 
            ? 'The recruiter can now see your contact details'
            : 'The contact request has been declined'
        });
        // Refresh requests
        fetchData();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to respond to request',
        variant: 'destructive'
      });
    }
  };

  const addSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()]
      }));
      setNewSkill('');
    }
  };

  const removeSkill = (skillToRemove) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skillToRemove)
    }));
  };

  const handleProfilePictureChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid File Type',
        description: 'Please upload a JPEG, PNG, WebP, or GIF image.',
        variant: 'destructive'
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Please upload an image smaller than 5MB.',
        variant: 'destructive'
      });
      return;
    }

    // Show preview immediately
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfilePicturePreview(reader.result);
    };
    reader.readAsDataURL(file);

    // Upload the file
    setUploadingPicture(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      const response = await fetch(`${API_URL}/api/talent-pool/upload-profile-picture`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formDataUpload
      });

      if (response.ok) {
        const data = await response.json();
        setFormData(prev => ({
          ...prev,
          profile_picture_url: data.profile_picture_url
        }));
        toast({
          title: 'Profile Picture Uploaded',
          description: 'Your profile picture has been updated successfully.'
        });
      } else {
        const error = await response.json();
        toast({
          title: 'Upload Failed',
          description: error.detail || 'Failed to upload profile picture.',
          variant: 'destructive'
        });
        setProfilePicturePreview(null);
      }
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      toast({
        title: 'Upload Error',
        description: 'Failed to upload profile picture. Please try again.',
        variant: 'destructive'
      });
      setProfilePicturePreview(null);
    } finally {
      setUploadingPicture(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleAIImproveSkills = async () => {
    setImprovingSkills(true);
    try {
      const response = await fetch(`${API_URL}/api/talent-pool/ai/improve-skills`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          current_skills: formData.skills,
          job_title: formData.job_title,
          industry: formData.industry
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.skills && data.skills.length > 0) {
          setFormData(prev => ({ ...prev, skills: data.skills }));
          toast({
            title: 'Skills Improved',
            description: `Generated ${data.skills.length} optimized skills for your profile.`
          });
        }
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.detail || 'Failed to improve skills',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error improving skills:', error);
      toast({
        title: 'Error',
        description: 'Failed to connect to AI service',
        variant: 'destructive'
      });
    } finally {
      setImprovingSkills(false);
    }
  };

  const handleAIImproveBio = async () => {
    setImprovingBio(true);
    try {
      const response = await fetch(`${API_URL}/api/talent-pool/ai/improve-bio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          current_bio: formData.bio,
          job_title: formData.job_title,
          industry: formData.industry,
          experience_level: formData.experience_level,
          skills: formData.skills
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.bio) {
          setFormData(prev => ({ ...prev, bio: data.bio }));
          toast({
            title: 'Bio Improved',
            description: 'Your bio has been enhanced with AI.'
          });
        }
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.detail || 'Failed to improve bio',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error improving bio:', error);
      toast({
        title: 'Error',
        description: 'Failed to connect to AI service',
        variant: 'destructive'
      });
    } finally {
      setImprovingBio(false);
    }
  };

  const handleAIImproveSummary = async () => {
    setImprovingSummary(true);
    try {
      const response = await fetch(`${API_URL}/api/talent-pool/ai/improve-summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          current_summary: formData.summary,
          job_title: formData.job_title,
          industry: formData.industry,
          experience_level: formData.experience_level,
          skills: formData.skills,
          bio: formData.bio
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.summary) {
          setFormData(prev => ({ ...prev, summary: data.summary }));
          toast({
            title: 'Summary Improved',
            description: 'Your professional summary has been enhanced with AI.'
          });
        }
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.detail || 'Failed to improve summary',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error improving summary:', error);
      toast({
        title: 'Error',
        description: 'Failed to connect to AI service',
        variant: 'destructive'
      });
    } finally {
      setImprovingSummary(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const pendingRequests = contactRequests.filter(r => r.status === 'pending');
  const processedRequests = contactRequests.filter(r => r.status !== 'pending');

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Talent Pool</h1>
          <p className="text-gray-600">
            List your profile for recruiters to find you
          </p>
        </div>

        {!optedIn ? (
          // Opt-in Form
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Join the Talent Pool
              </CardTitle>
              <CardDescription>
                Make your profile visible to recruiters looking for talent like you. 
                Your contact details will only be shared when you approve a request.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleProfilePictureChange}
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                data-testid="profile-picture-input"
              />
              
              {/* Profile Picture Upload */}
              <div className="flex flex-col items-center gap-4 pb-4 border-b">
                <Label className="text-center">Profile Picture (Optional)</Label>
                <div className="relative">
                  <div 
                    className="w-32 h-32 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden cursor-pointer hover:border-blue-500 transition-colors"
                    onClick={triggerFileInput}
                    data-testid="profile-picture-upload-area"
                  >
                    {uploadingPicture ? (
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    ) : profilePicturePreview ? (
                      <img 
                        src={profilePicturePreview} 
                        alt="Profile preview" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-4">
                        <User className="h-12 w-12 text-gray-400 mx-auto mb-1" />
                        <span className="text-xs text-gray-500">Click to upload</span>
                      </div>
                    )}
                  </div>
                  {profilePicturePreview && !uploadingPicture && (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full"
                      onClick={triggerFileInput}
                      data-testid="change-picture-btn"
                    >
                      <Camera className="h-3 w-3 mr-1" />
                      Change
                    </Button>
                  )}
                </div>
                <p className="text-xs text-gray-500 text-center">
                  JPEG, PNG, WebP, or GIF. Max 5MB.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Full Name *</Label>
                  <Input
                    value={formData.full_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <Label>Job Title *</Label>
                  <Input
                    value={formData.job_title}
                    onChange={(e) => setFormData(prev => ({ ...prev, job_title: e.target.value }))}
                    placeholder="Software Developer"
                  />
                </div>
                <div>
                  <Label>Industry *</Label>
                  <Select
                    value={formData.industry}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, industry: value }))}
                  >
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
                  <Label>Experience Level *</Label>
                  <Select
                    value={formData.experience_level}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, experience_level: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      {experienceLevels.map((level) => (
                        <SelectItem key={level.id} value={level.id}>{level.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Location *</Label>
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Johannesburg, South Africa"
                  />
                </div>
                <div className="flex items-center space-x-3 py-2">
                  <Checkbox
                    id="is_remote_worker"
                    checked={formData.is_remote_worker}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_remote_worker: checked }))}
                    data-testid="remote-worker-checkbox"
                  />
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-blue-600" />
                    <Label htmlFor="is_remote_worker" className="text-sm font-medium cursor-pointer">
                      Remote Worker
                    </Label>
                  </div>
                  <span className="text-xs text-gray-500">I am available for remote work opportunities</span>
                </div>
                <div>
                  <Label>Attach CV (Optional)</Label>
                  <Select
                    value={formData.cv_document_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, cv_document_id: value === 'none' ? '' : value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a CV" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No CV attached</SelectItem>
                      {userCVs.map((cv) => (
                        <SelectItem key={cv.id} value={cv.id}>{cv.name || cv.title || 'Untitled CV'}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Skills *</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAIImproveSkills}
                    disabled={improvingSkills}
                    className="gap-1 text-purple-600 border-purple-200 hover:bg-purple-50"
                    data-testid="ai-improve-skills-btn"
                  >
                    {improvingSkills ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    AI Improve
                  </Button>
                </div>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    placeholder="Add a skill"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                  />
                  <Button type="button" variant="outline" onClick={addSkill}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.skills.map((skill, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      {skill}
                      <X 
                        className="h-3 w-3 cursor-pointer hover:text-red-500" 
                        onClick={() => removeSkill(skill)}
                      />
                    </Badge>
                  ))}
                </div>
                {formData.skills.length === 0 && (
                  <p className="text-xs text-gray-500 mt-2">
                    Tip: Fill in your job title and industry first, then click "AI Improve" to generate relevant skills
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Bio (Optional)</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAIImproveBio}
                    disabled={improvingBio}
                    className="gap-1 text-purple-600 border-purple-200 hover:bg-purple-50"
                    data-testid="ai-improve-bio-btn"
                  >
                    {improvingBio ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    {formData.bio ? 'AI Improve' : 'AI Generate'}
                  </Button>
                </div>
                <Textarea
                  value={formData.bio}
                  onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="A short bio about yourself that recruiters will see first..."
                  rows={3}
                  data-testid="bio-textarea"
                />
                <p className="text-xs text-gray-500 mt-1">
                  A compelling bio helps you stand out. Use AI to generate or improve it.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Professional Summary *</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAIImproveSummary}
                    disabled={improvingSummary}
                    className="gap-1 text-purple-600 border-purple-200 hover:bg-purple-50"
                    data-testid="ai-improve-summary-btn"
                  >
                    {improvingSummary ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    {formData.summary ? 'AI Improve' : 'AI Generate'}
                  </Button>
                </div>
                <Textarea
                  value={formData.summary}
                  onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
                  placeholder="Tell recruiters about your experience, achievements, and what you're looking for..."
                  rows={5}
                />
                <p className="text-xs text-gray-500 mt-1">
                  A detailed summary highlighting your experience and goals attracts recruiters.
                </p>
              </div>

              <Button onClick={handleOptIn} disabled={saving} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Users className="h-4 w-4 mr-2" />}
                Join Talent Pool
              </Button>
            </CardContent>
          </Card>
        ) : (
          // Opted-in View with Tabs
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="profile" className="gap-2">
                <Eye className="h-4 w-4" />
                My Profile
              </TabsTrigger>
              <TabsTrigger value="signature" className="gap-2">
                <PenTool className="h-4 w-4" />
                Signature
              </TabsTrigger>
              <TabsTrigger value="requests" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Requests
                {pendingRequests.length > 0 && (
                  <Badge variant="destructive" className="ml-1">{pendingRequests.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>Your Talent Pool Profile</CardTitle>
                      <CardDescription>Update your profile information</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="visibility" className="text-sm">Visible</Label>
                      <Switch
                        id="visibility"
                        checked={formData.is_visible}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_visible: checked }))}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Profile Picture Upload */}
                  <div className="flex flex-col items-center gap-4 pb-4 border-b">
                    <Label className="text-center">Profile Picture</Label>
                    <div className="relative">
                      <div 
                        className="w-32 h-32 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden cursor-pointer hover:border-blue-500 transition-colors"
                        onClick={triggerFileInput}
                        data-testid="edit-profile-picture-area"
                      >
                        {uploadingPicture ? (
                          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                        ) : profilePicturePreview ? (
                          <img 
                            src={profilePicturePreview} 
                            alt="Profile preview" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-center p-4">
                            <User className="h-12 w-12 text-gray-400 mx-auto mb-1" />
                            <span className="text-xs text-gray-500">Click to upload</span>
                          </div>
                        )}
                      </div>
                      {profilePicturePreview && !uploadingPicture && (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full"
                          onClick={triggerFileInput}
                        >
                          <Camera className="h-3 w-3 mr-1" />
                          Change
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 text-center">
                      JPEG, PNG, WebP, or GIF. Max 5MB.
                    </p>
                  </div>

                  {/* Same form fields as opt-in */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Full Name</Label>
                      <Input
                        value={formData.full_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Job Title</Label>
                      <Input
                        value={formData.job_title}
                        onChange={(e) => setFormData(prev => ({ ...prev, job_title: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Industry</Label>
                      <Select
                        value={formData.industry}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, industry: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {industries.map((ind) => (
                            <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Experience Level</Label>
                      <Select
                        value={formData.experience_level}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, experience_level: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {experienceLevels.map((level) => (
                            <SelectItem key={level.id} value={level.id}>{level.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Location</Label>
                      <Input
                        value={formData.location}
                        onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                      />
                    </div>
                    <div className="flex items-center space-x-3 py-2">
                      <Checkbox
                        id="edit_is_remote_worker"
                        checked={formData.is_remote_worker}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_remote_worker: checked }))}
                      />
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-blue-600" />
                        <Label htmlFor="edit_is_remote_worker" className="text-sm font-medium cursor-pointer">
                          Remote Worker
                        </Label>
                      </div>
                      <span className="text-xs text-gray-500">I am available for remote work opportunities</span>
                    </div>
                    <div>
                      <Label>Attached CV</Label>
                      <Select
                        value={formData.cv_document_id || 'none'}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, cv_document_id: value === 'none' ? '' : value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No CV attached</SelectItem>
                          {userCVs.map((cv) => (
                            <SelectItem key={cv.id} value={cv.id}>{cv.name || cv.title || 'Untitled CV'}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Skills</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAIImproveSkills}
                        disabled={improvingSkills}
                        className="gap-1 text-purple-600 border-purple-200 hover:bg-purple-50"
                      >
                        {improvingSkills ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Sparkles className="h-3 w-3" />
                        )}
                        AI Improve
                      </Button>
                    </div>
                    <div className="flex gap-2 mb-2">
                      <Input
                        value={newSkill}
                        onChange={(e) => setNewSkill(e.target.value)}
                        placeholder="Add a skill"
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                      />
                      <Button type="button" variant="outline" onClick={addSkill}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.skills.map((skill, i) => (
                        <Badge key={i} variant="secondary" className="gap-1">
                          {skill}
                          <X 
                            className="h-3 w-3 cursor-pointer hover:text-red-500" 
                            onClick={() => removeSkill(skill)}
                          />
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Bio</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAIImproveBio}
                        disabled={improvingBio}
                        className="gap-1 text-purple-600 border-purple-200 hover:bg-purple-50"
                      >
                        {improvingBio ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Sparkles className="h-3 w-3" />
                        )}
                        {formData.bio ? 'AI Improve' : 'AI Generate'}
                      </Button>
                    </div>
                    <Textarea
                      value={formData.bio}
                      onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                      placeholder="A short bio about yourself..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Professional Summary</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAIImproveSummary}
                        disabled={improvingSummary}
                        className="gap-1 text-purple-600 border-purple-200 hover:bg-purple-50"
                      >
                        {improvingSummary ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Sparkles className="h-3 w-3" />
                        )}
                        {formData.summary ? 'AI Improve' : 'AI Generate'}
                      </Button>
                    </div>
                    <Textarea
                      value={formData.summary}
                      onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
                      placeholder="Tell recruiters about your experience, achievements, and what you're looking for..."
                      rows={5}
                    />
                  </div>

                  <div className="flex justify-between">
                    <Button variant="destructive" onClick={handleOptOut} disabled={saving}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Leave Talent Pool
                    </Button>
                    <Button onClick={handleUpdateProfile} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                      Save Changes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="requests">
              <Card>
                <CardHeader>
                  <CardTitle>Contact Requests</CardTitle>
                  <CardDescription>
                    Recruiters who want to connect with you. Approve to share your contact details.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {contactRequests.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-600">No contact requests yet</p>
                      <p className="text-sm text-gray-500">When recruiters want to connect, their requests will appear here</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Pending Requests */}
                      {pendingRequests.length > 0 && (
                        <div>
                          <h3 className="font-semibold text-sm text-gray-700 mb-3 flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Pending ({pendingRequests.length})
                          </h3>
                          <div className="space-y-3">
                            {pendingRequests.map((request) => (
                              <div key={request.id} className="p-4 border rounded-lg bg-yellow-50 border-yellow-200">
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                    <p className="font-medium">{request.recruiter_name}</p>
                                    <p className="text-sm text-gray-600">{request.recruiter_email}</p>
                                  </div>
                                  <p className="text-xs text-gray-500">
                                    {new Date(request.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                                <p className="text-sm text-gray-700 mb-3 bg-white p-2 rounded">
                                  {request.message}
                                </p>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleRespondToRequest(request.id, true)}
                                  >
                                    <Check className="h-4 w-4 mr-1" />
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleRespondToRequest(request.id, false)}
                                  >
                                    <X className="h-4 w-4 mr-1" />
                                    Decline
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Processed Requests */}
                      {processedRequests.length > 0 && (
                        <div>
                          <h3 className="font-semibold text-sm text-gray-700 mb-3">History</h3>
                          <div className="space-y-2">
                            {processedRequests.map((request) => (
                              <div key={request.id} className="p-3 border rounded-lg flex justify-between items-center">
                                <div>
                                  <p className="font-medium text-sm">{request.recruiter_name}</p>
                                  <p className="text-xs text-gray-500">
                                    {new Date(request.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                                <Badge variant={request.status === 'approved' ? 'default' : 'secondary'}>
                                  {request.status === 'approved' ? (
                                    <><CheckCircle className="h-3 w-3 mr-1" /> Approved</>
                                  ) : (
                                    <><XCircle className="h-3 w-3 mr-1" /> Declined</>
                                  )}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default MyTalentPoolProfile;
