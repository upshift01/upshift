import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Palette, Save, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

const ResellerBranding = () => {
  const { token } = useAuth();
  const { theme, fetchWhiteLabelConfig } = useTheme();
  const [branding, setBranding] = useState({
    logo_url: '',
    primary_color: '#1e40af',
    secondary_color: '#7c3aed',
    favicon_url: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchBranding();
  }, []);

  const fetchBranding = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/reseller/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.branding) {
          setBranding(data.branding);
        }
      }
    } catch (error) {
      console.error('Error fetching branding:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/reseller/branding`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(branding)
      });
      if (response.ok) {
        setMessage('Branding updated successfully!');
        // Refresh theme
        fetchWhiteLabelConfig();
      } else {
        setMessage('Failed to update branding');
      }
    } catch (error) {
      setMessage('Error updating branding');
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
        <h1 className="text-2xl font-bold text-gray-900">Branding Settings</h1>
        <p className="text-gray-600">Customize your white-label appearance</p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.includes('success') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Color Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Brand Colors
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Primary Color</label>
              <div className="flex gap-3">
                <input
                  type="color"
                  value={branding.primary_color}
                  onChange={(e) => setBranding({ ...branding, primary_color: e.target.value })}
                  className="h-10 w-20 cursor-pointer rounded border"
                />
                <Input
                  value={branding.primary_color}
                  onChange={(e) => setBranding({ ...branding, primary_color: e.target.value })}
                  className="flex-1"
                  placeholder="#1e40af"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Used for navigation, buttons, and accents</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Secondary Color</label>
              <div className="flex gap-3">
                <input
                  type="color"
                  value={branding.secondary_color}
                  onChange={(e) => setBranding({ ...branding, secondary_color: e.target.value })}
                  className="h-10 w-20 cursor-pointer rounded border"
                />
                <Input
                  value={branding.secondary_color}
                  onChange={(e) => setBranding({ ...branding, secondary_color: e.target.value })}
                  className="flex-1"
                  placeholder="#7c3aed"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Used for highlights and secondary elements</p>
            </div>
          </CardContent>
        </Card>

        {/* Logo Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Logo & Favicon
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Logo URL</label>
              <Input
                value={branding.logo_url || ''}
                onChange={(e) => setBranding({ ...branding, logo_url: e.target.value })}
                placeholder="https://example.com/logo.png"
              />
              <p className="text-xs text-gray-500 mt-1">Recommended size: 200x50px, PNG or SVG</p>
              {branding.logo_url && (
                <div className="mt-3 p-4 bg-gray-100 rounded-lg">
                  <p className="text-xs text-gray-500 mb-2">Preview:</p>
                  <img 
                    src={branding.logo_url} 
                    alt="Logo preview" 
                    className="max-h-12 w-auto"
                    onError={(e) => e.target.style.display = 'none'}
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Favicon URL</label>
              <Input
                value={branding.favicon_url || ''}
                onChange={(e) => setBranding({ ...branding, favicon_url: e.target.value })}
                placeholder="https://example.com/favicon.ico"
              />
              <p className="text-xs text-gray-500 mt-1">Recommended size: 32x32px, ICO or PNG</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Live Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div 
            className="rounded-lg p-6 text-white"
            style={{ backgroundColor: branding.primary_color }}
          >
            <div className="flex items-center gap-3 mb-4">
              {branding.logo_url ? (
                <img src={branding.logo_url} alt="Logo" className="h-8 w-auto" />
              ) : (
                <div className="h-8 w-8 bg-white/20 rounded" />
              )}
              <span className="font-bold text-lg">Your Brand Name</span>
            </div>
            <p className="text-white/80 text-sm mb-4">This is how your navigation will look</p>
            <button 
              className="px-4 py-2 rounded-lg font-medium text-sm transition-colors"
              style={{ backgroundColor: branding.secondary_color }}
            >
              Sample Button
            </button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end mt-6">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Branding'}
        </Button>
      </div>
    </div>
  );
};

export default ResellerBranding;
