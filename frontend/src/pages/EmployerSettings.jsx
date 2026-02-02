import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  User, Building2, Mail, Phone, Lock, Save, Loader2, 
  ArrowLeft, CheckCircle, AlertTriangle, CreditCard,
  Bell, Shield, Eye, EyeOff, Upload, Trash2, Image, PenTool, AlertCircle
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import SignatureCanvas from '../components/SignatureCanvas';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const EmployerSettings = () => {
  const navigate = useNavigate();
  const { user, token, refreshUser } = useAuth();
  const { toast } = useToast();
  const logoInputRef = useRef(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [savingSignature, setSavingSignature] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [companyLogo, setCompanyLogo] = useState(null);
  const [signature, setSignature] = useState(null);
  
  const [profile, setProfile] = useState({
    full_name: '',
    email: '',
    phone: '',
    company_name: '',
    company_description: '',
    company_website: '',
    company_size: '',
    industry: ''
  });
  
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  useEffect(() => {
    if (user?.role !== 'employer') {
      navigate('/employer-dashboard');
      return;
    }
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setProfile({
          full_name: data.full_name || '',
          email: data.email || '',
          phone: data.phone || '',
          company_name: data.company_name || '',
          company_description: data.company_description || '',
          company_website: data.company_website || '',
          company_size: data.company_size || '',
          industry: data.industry || ''
        });
        setCompanyLogo(data.company_logo || null);
      }

      // Fetch employer signature
      const signatureRes = await fetch(`${API_URL}/api/employer/my-signature`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (signatureRes.ok) {
        const sigData = await signatureRes.json();
        if (sigData.signature_url) {
          setSignature(sigData.signature_url);
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid File',
        description: 'Please upload a JPEG, PNG, GIF, WebP, or SVG image',
        variant: 'destructive'
      });
      return;
    }
    
    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Maximum file size is 5MB',
        variant: 'destructive'
      });
      return;
    }
    
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`${API_URL}/api/employer/upload-logo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setCompanyLogo(data.logo_url);
        toast({ title: 'Success', description: 'Company logo uploaded successfully' });
        if (refreshUser) refreshUser();
      } else {
        toast({
          title: 'Error',
          description: data.detail || 'Failed to upload logo',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to upload logo',
        variant: 'destructive'
      });
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const handleDeleteLogo = async () => {
    setUploadingLogo(true);
    try {
      const response = await fetch(`${API_URL}/api/employer/logo`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        setCompanyLogo(null);
        toast({ title: 'Success', description: 'Company logo deleted' });
        if (refreshUser) refreshUser();
      } else {
        const data = await response.json();
        toast({
          title: 'Error',
          description: data.detail || 'Failed to delete logo',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete logo',
        variant: 'destructive'
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(profile)
      });
      
      if (response.ok) {
        toast({ title: 'Success', description: 'Profile updated successfully' });
        if (refreshUser) refreshUser();
      } else {
        const data = await response.json();
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

  const handleSaveSignature = async (signatureData, mode) => {
    setSavingSignature(true);
    try {
      let response;
      
      if (mode === 'draw') {
        // Save drawn signature (base64 data URL)
        response = await fetch(`${API_URL}/api/employer/signature/draw`, {
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
        response = await fetch(`${API_URL}/api/employer/signature`, {
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
      const response = await fetch(`${API_URL}/api/employer/signature`, {
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

  const handleChangePassword = async () => {
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast({
        title: 'Error',
        description: 'New passwords do not match',
        variant: 'destructive'
      });
      return;
    }
    
    if (passwordForm.new_password.length < 6) {
      toast({
        title: 'Error',
        description: 'Password must be at least 6 characters',
        variant: 'destructive'
      });
      return;
    }
    
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          current_password: passwordForm.current_password,
          new_password: passwordForm.new_password
        })
      });
      
      if (response.ok) {
        toast({ title: 'Success', description: 'Password changed successfully' });
        setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      } else {
        const data = await response.json();
        toast({
          title: 'Error',
          description: data.detail || 'Failed to change password',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to change password',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/employer-dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
          <p className="text-gray-600">Manage your employer account and company information</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="bg-white border">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="company" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Company
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="signature" className="flex items-center gap-2" data-testid="signature-tab">
              <PenTool className="h-4 w-4" />
              Signature
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Update your personal details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      value={profile.full_name}
                      onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                      placeholder="Your full name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      placeholder="your@email.com"
                      disabled
                    />
                    <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end pt-4">
                  <Button onClick={handleSaveProfile} disabled={saving}>
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Company Tab */}
          <TabsContent value="company">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="h-5 w-5" />
                  Company Logo
                </CardTitle>
                <CardDescription>Upload your company logo to display on job postings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  {/* Logo Preview */}
                  <div className="w-32 h-32 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden">
                    {companyLogo ? (
                      <img 
                        src={`${API_URL}${companyLogo}`} 
                        alt="Company Logo" 
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="text-center text-gray-400">
                        <Building2 className="h-10 w-10 mx-auto mb-1" />
                        <span className="text-xs">No Logo</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Upload Controls */}
                  <div className="flex-1">
                    <input
                      type="file"
                      ref={logoInputRef}
                      onChange={handleLogoUpload}
                      accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                      className="hidden"
                    />
                    <div className="flex flex-wrap gap-2 mb-3">
                      <Button
                        variant="outline"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={uploadingLogo}
                      >
                        {uploadingLogo ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Upload className="h-4 w-4 mr-2" />
                        )}
                        {companyLogo ? 'Change Logo' : 'Upload Logo'}
                      </Button>
                      {companyLogo && (
                        <Button
                          variant="outline"
                          onClick={handleDeleteLogo}
                          disabled={uploadingLogo}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove
                        </Button>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      Recommended: Square image, 200x200px or larger. Max 5MB.
                      <br />
                      Supported formats: JPEG, PNG, GIF, WebP, SVG
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Company Information</CardTitle>
                <CardDescription>Update your company details shown on job postings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="company_name">Company Name</Label>
                    <Input
                      id="company_name"
                      value={profile.company_name}
                      onChange={(e) => setProfile({ ...profile, company_name: e.target.value })}
                      placeholder="Your Company Inc."
                    />
                  </div>
                  <div>
                    <Label htmlFor="company_website">Website</Label>
                    <Input
                      id="company_website"
                      value={profile.company_website}
                      onChange={(e) => setProfile({ ...profile, company_website: e.target.value })}
                      placeholder="https://yourcompany.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="industry">Industry</Label>
                    <select
                      id="industry"
                      value={profile.industry}
                      onChange={(e) => setProfile({ ...profile, industry: e.target.value })}
                      className="w-full h-10 px-3 py-2 border rounded-md bg-white"
                    >
                      <option value="">Select industry</option>
                      <option value="Technology">Technology</option>
                      <option value="Finance & Banking">Finance & Banking</option>
                      <option value="Healthcare">Healthcare</option>
                      <option value="Education">Education</option>
                      <option value="Retail & E-commerce">Retail & E-commerce</option>
                      <option value="Manufacturing">Manufacturing</option>
                      <option value="Construction">Construction</option>
                      <option value="Real Estate">Real Estate</option>
                      <option value="Marketing & Advertising">Marketing & Advertising</option>
                      <option value="Media & Entertainment">Media & Entertainment</option>
                      <option value="Hospitality & Tourism">Hospitality & Tourism</option>
                      <option value="Transportation & Logistics">Transportation & Logistics</option>
                      <option value="Energy & Utilities">Energy & Utilities</option>
                      <option value="Agriculture">Agriculture</option>
                      <option value="Mining">Mining</option>
                      <option value="Telecommunications">Telecommunications</option>
                      <option value="Legal Services">Legal Services</option>
                      <option value="Consulting">Consulting</option>
                      <option value="Non-Profit">Non-Profit</option>
                      <option value="Government">Government</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="company_size">Company Size</Label>
                    <select
                      id="company_size"
                      value={profile.company_size}
                      onChange={(e) => setProfile({ ...profile, company_size: e.target.value })}
                      className="w-full h-10 px-3 py-2 border rounded-md bg-white"
                    >
                      <option value="">Select size</option>
                      <option value="1-10">1-10 employees</option>
                      <option value="11-50">11-50 employees</option>
                      <option value="51-200">51-200 employees</option>
                      <option value="201-500">201-500 employees</option>
                      <option value="500+">500+ employees</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="company_description">Company Description</Label>
                  <textarea
                    id="company_description"
                    value={profile.company_description}
                    onChange={(e) => setProfile({ ...profile, company_description: e.target.value })}
                    placeholder="Tell candidates about your company..."
                    className="w-full h-32 px-3 py-2 border rounded-md resize-none"
                  />
                </div>
                
                <div className="flex justify-end pt-4">
                  <Button onClick={handleSaveProfile} disabled={saving}>
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Update your account password</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="current_password">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="current_password"
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={passwordForm.current_password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="new_password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new_password"
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordForm.new_password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="confirm_password">Confirm New Password</Label>
                  <Input
                    id="confirm_password"
                    type="password"
                    value={passwordForm.confirm_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                    placeholder="••••••••"
                  />
                </div>
                
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-800">
                      <p className="font-medium">Password requirements:</p>
                      <ul className="list-disc list-inside mt-1">
                        <li>Minimum 6 characters</li>
                        <li>Include uppercase and lowercase letters</li>
                        <li>Include at least one number</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end pt-4">
                  <Button 
                    onClick={handleChangePassword} 
                    disabled={saving || !passwordForm.current_password || !passwordForm.new_password}
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Lock className="h-4 w-4 mr-2" />
                    )}
                    Change Password
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

export default EmployerSettings;
