import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Settings, Save, Globe, Mail, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

const ResellerSettings = () => {
  const { token } = useAuth();
  const { theme } = useTheme();
  const [profile, setProfile] = useState({
    company_name: '',
    brand_name: '',
    custom_domain: '',
    contact_info: {
      email: '',
      phone: '',
      address: ''
    },
    legal: {
      terms_url: '',
      privacy_url: ''
    }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/reseller/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setProfile({
          company_name: data.company_name || '',
          brand_name: data.brand_name || '',
          custom_domain: data.custom_domain || '',
          contact_info: data.contact_info || { email: '', phone: '', address: '' },
          legal: data.legal || { terms_url: '', privacy_url: '' }
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/reseller/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(profile)
      });
      if (response.ok) {
        setMessage('Settings saved successfully!');
      } else {
        setMessage('Failed to save settings');
      }
    } catch (error) {
      setMessage('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your reseller account settings</p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.includes('success') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {message}
        </div>
      )}

      <div className="space-y-6">
        {/* Company Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Company Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Company Name</label>
                <Input
                  value={profile.company_name}
                  onChange={(e) => setProfile({ ...profile, company_name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Brand Name</label>
                <Input
                  value={profile.brand_name}
                  onChange={(e) => setProfile({ ...profile, brand_name: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">Shown to your customers</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Domain Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Domain Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <label className="block text-sm font-medium mb-1">Custom Domain</label>
              <Input
                value={profile.custom_domain}
                onChange={(e) => setProfile({ ...profile, custom_domain: e.target.value })}
                placeholder="cv.yourdomain.com"
              />
              <p className="text-xs text-gray-500 mt-1">
                Point your domain's CNAME record to: reseller.upshift.co.za
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Support Email</label>
                <Input
                  type="email"
                  value={profile.contact_info?.email || ''}
                  onChange={(e) => setProfile({ 
                    ...profile, 
                    contact_info: { ...profile.contact_info, email: e.target.value }
                  })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <Input
                  value={profile.contact_info?.phone || ''}
                  onChange={(e) => setProfile({ 
                    ...profile, 
                    contact_info: { ...profile.contact_info, phone: e.target.value }
                  })}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Address</label>
              <Input
                value={profile.contact_info?.address || ''}
                onChange={(e) => setProfile({ 
                  ...profile, 
                  contact_info: { ...profile.contact_info, address: e.target.value }
                })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Legal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Legal Pages
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Terms & Conditions URL</label>
              <Input
                value={profile.legal?.terms_url || ''}
                onChange={(e) => setProfile({ 
                  ...profile, 
                  legal: { ...profile.legal, terms_url: e.target.value }
                })}
                placeholder="https://yourdomain.com/terms"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Privacy Policy URL</label>
              <Input
                value={profile.legal?.privacy_url || ''}
                onChange={(e) => setProfile({ 
                  ...profile, 
                  legal: { ...profile.legal, privacy_url: e.target.value }
                })}
                placeholder="https://yourdomain.com/privacy"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end mt-6">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
};

export default ResellerSettings;
