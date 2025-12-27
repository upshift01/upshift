import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Palette, Save, Upload, X, Image, FileImage, Loader2 } from 'lucide-react';
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
  const [uploading, setUploading] = useState({ logo: false, favicon: false });
  
  const logoInputRef = useRef(null);
  const faviconInputRef = useRef(null);

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

  const handleFileUpload = async (file, fileType) => {
    if (!file) return;
    
    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp', 'image/x-icon', 'image/vnd.microsoft.icon'];
    if (!allowedTypes.includes(file.type)) {
      setMessage(`Invalid file type. Allowed: PNG, JPG, SVG, WEBP, ICO`);
      return;
    }
    
    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setMessage('File size must be less than 5MB');
      return;
    }
    
    setUploading(prev => ({ ...prev, [fileType]: true }));
    setMessage('');
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('file_type', fileType);
      
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/reseller/upload-branding-file?file_type=${fileType}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: formData
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        const urlField = fileType === 'logo' ? 'logo_url' : 'favicon_url';
        setBranding(prev => ({ ...prev, [urlField]: data.url }));
        setMessage(`${fileType === 'logo' ? 'Logo' : 'Favicon'} uploaded successfully!`);
        fetchWhiteLabelConfig();
      } else {
        const error = await response.json();
        setMessage(error.detail || `Failed to upload ${fileType}`);
      }
    } catch (error) {
      setMessage(`Error uploading ${fileType}`);
      console.error('Upload error:', error);
    } finally {
      setUploading(prev => ({ ...prev, [fileType]: false }));
    }
  };

  const handleDeleteFile = async (fileType) => {
    setUploading(prev => ({ ...prev, [fileType]: true }));
    setMessage('');
    
    try {
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/reseller/delete-branding-file/${fileType}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      if (response.ok) {
        const urlField = fileType === 'logo' ? 'logo_url' : 'favicon_url';
        setBranding(prev => ({ ...prev, [urlField]: '' }));
        setMessage(`${fileType === 'logo' ? 'Logo' : 'Favicon'} removed successfully!`);
        fetchWhiteLabelConfig();
      } else {
        const error = await response.json();
        setMessage(error.detail || `Failed to delete ${fileType}`);
      }
    } catch (error) {
      setMessage(`Error deleting ${fileType}`);
    } finally {
      setUploading(prev => ({ ...prev, [fileType]: false }));
    }
  };

  const getFullImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    if (url.startsWith('/api/uploads')) {
      return `${process.env.REACT_APP_BACKEND_URL}${url}`;
    }
    return url;
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
        <p className="text-gray-600">Customise your white-label appearance</p>
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
            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium mb-2">Company Logo</label>
              <input
                type="file"
                ref={logoInputRef}
                className="hidden"
                accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                onChange={(e) => handleFileUpload(e.target.files[0], 'logo')}
              />
              
              {branding.logo_url ? (
                <div className="relative border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 bg-white p-2 rounded border">
                      <img 
                        src={getFullImageUrl(branding.logo_url)} 
                        alt="Logo preview" 
                        className="max-h-12 w-auto object-contain"
                        onError={(e) => e.target.style.display = 'none'}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-600 truncate">Logo uploaded</p>
                      <p className="text-xs text-gray-400">Click to change or remove</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={uploading.logo}
                      >
                        {uploading.logo ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteFile('logo')}
                        disabled={uploading.logo}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => logoInputRef.current?.click()}
                  className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
                >
                  {uploading.logo ? (
                    <Loader2 className="h-8 w-8 mx-auto text-blue-500 animate-spin mb-2" />
                  ) : (
                    <Image className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  )}
                  <p className="text-sm font-medium text-gray-700">
                    {uploading.logo ? 'Uploading...' : 'Click to upload logo'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">PNG, JPG, SVG, or WEBP (max 5MB)</p>
                  <p className="text-xs text-gray-400 mt-0.5">Recommended: 200×50px</p>
                </div>
              )}
            </div>

            {/* Favicon Upload */}
            <div>
              <label className="block text-sm font-medium mb-2">Favicon</label>
              <input
                type="file"
                ref={faviconInputRef}
                className="hidden"
                accept="image/png,image/jpeg,image/x-icon,image/vnd.microsoft.icon,image/svg+xml"
                onChange={(e) => handleFileUpload(e.target.files[0], 'favicon')}
              />
              
              {branding.favicon_url ? (
                <div className="relative border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 bg-white p-2 rounded border">
                      <img 
                        src={getFullImageUrl(branding.favicon_url)} 
                        alt="Favicon preview" 
                        className="h-8 w-8 object-contain"
                        onError={(e) => e.target.style.display = 'none'}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-600 truncate">Favicon uploaded</p>
                      <p className="text-xs text-gray-400">Click to change or remove</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => faviconInputRef.current?.click()}
                        disabled={uploading.favicon}
                      >
                        {uploading.favicon ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteFile('favicon')}
                        disabled={uploading.favicon}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => faviconInputRef.current?.click()}
                  className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
                >
                  {uploading.favicon ? (
                    <Loader2 className="h-8 w-8 mx-auto text-blue-500 animate-spin mb-2" />
                  ) : (
                    <FileImage className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  )}
                  <p className="text-sm font-medium text-gray-700">
                    {uploading.favicon ? 'Uploading...' : 'Click to upload favicon'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">PNG, ICO, or SVG (max 5MB)</p>
                  <p className="text-xs text-gray-400 mt-0.5">Recommended: 32×32px</p>
                </div>
              )}
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
                <img src={getFullImageUrl(branding.logo_url)} alt="Logo" className="h-8 w-auto" />
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
