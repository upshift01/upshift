import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Settings, Save, Globe, Mail, FileText, Send, CheckCircle, XCircle, RefreshCw, Bot, Key, Eye, EyeOff, CreditCard, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';

const ResellerSettings = () => {
  const { token } = useAuth();
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('profile');
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
  const [message, setMessage] = useState({ type: '', text: '' });

  // Email Settings State
  const [emailSettings, setEmailSettings] = useState({
    smtp_host: 'smtp.office365.com',
    smtp_port: 587,
    smtp_user: '',
    smtp_password: '',
    from_email: '',
    from_name: ''
  });
  const [testingEmail, setTestingEmail] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('');

  // ChatGPT Settings State
  const [chatgptSettings, setChatgptSettings] = useState({
    openai_api_key: '',
    model: 'gpt-4o',
    use_custom_key: false
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [testingChatGPT, setTestingChatGPT] = useState(false);

  // Yoco Settings State
  const [yocoSettings, setYocoSettings] = useState({
    yoco_public_key: '',
    yoco_secret_key: '',
    use_custom_keys: false,
    is_live_mode: false
  });
  const [showYocoSecretKey, setShowYocoSecretKey] = useState(false);
  const [testingYoco, setTestingYoco] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (activeTab === 'email') {
      fetchEmailSettings();
    }
    if (activeTab === 'chatgpt') {
      fetchChatGPTSettings();
    }
    if (activeTab === 'yoco') {
      fetchYocoSettings();
    }
  }, [activeTab]);

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
        // Set default from name from profile
        setEmailSettings(prev => ({
          ...prev,
          from_name: data.brand_name || data.company_name || 'UpShift'
        }));
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmailSettings = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/reseller/email-settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.is_configured) {
          setEmailSettings({
            smtp_host: data.smtp_host || 'smtp.office365.com',
            smtp_port: data.smtp_port || 587,
            smtp_user: data.smtp_user || '',
            smtp_password: data.smtp_password || '',
            from_email: data.from_email || '',
            from_name: data.from_name || profile.brand_name || 'UpShift'
          });
        }
      }
    } catch (error) {
      console.error('Error fetching email settings:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });
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
        setMessage({ type: 'success', text: 'Settings saved successfully!' });
      } else {
        setMessage({ type: 'error', text: 'Failed to save settings' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error saving settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEmailSettings = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/reseller/email-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(emailSettings)
      });
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'Email settings saved successfully!' });
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.detail || 'Failed to save email settings' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error saving email settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingEmail(true);
    setMessage({ type: '', text: '' });
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/reseller/email-settings/test`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = await response.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'SMTP connection successful!' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Connection failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error testing connection' });
    } finally {
      setTestingEmail(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmailAddress) {
      setMessage({ type: 'error', text: 'Please enter a test email address' });
      return;
    }
    
    setTestingEmail(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/reseller/email-settings/send-test?to_email=${encodeURIComponent(testEmailAddress)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = await response.json();
      if (data.success) {
        setMessage({ type: 'success', text: `Test email sent to ${testEmailAddress}` });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to send test email' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error sending test email' });
    } finally {
      setTestingEmail(false);
    }
  };

  // ChatGPT Settings Functions
  const fetchChatGPTSettings = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/reseller/chatgpt-settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setChatgptSettings({
          openai_api_key: data.openai_api_key || '',
          model: data.model || 'gpt-4o',
          use_custom_key: data.use_custom_key || false
        });
      }
    } catch (error) {
      console.error('Error fetching ChatGPT settings:', error);
    }
  };

  const handleSaveChatGPTSettings = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/reseller/chatgpt-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(chatgptSettings)
      });
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'ChatGPT settings saved successfully!' });
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.detail || 'Failed to save ChatGPT settings' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error saving ChatGPT settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestChatGPT = async () => {
    setTestingChatGPT(true);
    setMessage({ type: '', text: '' });
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/reseller/chatgpt-settings/test`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = await response.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'ChatGPT API connection successful! ' + (data.message || '') });
      } else {
        setMessage({ type: 'error', text: data.error || 'Connection failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error testing ChatGPT connection' });
    } finally {
      setTestingChatGPT(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: Settings },
    { id: 'email', label: 'Email Settings', icon: Mail },
    { id: 'chatgpt', label: 'ChatGPT', icon: Bot },
    { id: 'legal', label: 'Legal Pages', icon: FileText }
  ];

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

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 -mb-px border-b-2 transition-colors ${
              activeTab === tab.id 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {message.text && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {message.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
          {message.text}
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
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

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>
      )}

      {/* Email Settings Tab */}
      {activeTab === 'email' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                SMTP Email Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Configure your own SMTP settings to send emails to your customers with your brand. 
                This is useful for sending notifications, password resets, and marketing emails.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">SMTP Host</label>
                  <Input
                    value={emailSettings.smtp_host}
                    onChange={(e) => setEmailSettings({ ...emailSettings, smtp_host: e.target.value })}
                    placeholder="smtp.office365.com"
                  />
                  <p className="text-xs text-gray-500 mt-1">For Office365: smtp.office365.com</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">SMTP Port</label>
                  <Input
                    type="number"
                    value={emailSettings.smtp_port}
                    onChange={(e) => setEmailSettings({ ...emailSettings, smtp_port: parseInt(e.target.value) })}
                    placeholder="587"
                  />
                  <p className="text-xs text-gray-500 mt-1">Common ports: 587 (TLS), 465 (SSL)</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">SMTP Username (Email)</label>
                  <Input
                    type="email"
                    value={emailSettings.smtp_user}
                    onChange={(e) => setEmailSettings({ ...emailSettings, smtp_user: e.target.value })}
                    placeholder="noreply@yourdomain.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">SMTP Password</label>
                  <Input
                    type="password"
                    value={emailSettings.smtp_password}
                    onChange={(e) => setEmailSettings({ ...emailSettings, smtp_password: e.target.value })}
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">From Email (optional)</label>
                  <Input
                    type="email"
                    value={emailSettings.from_email}
                    onChange={(e) => setEmailSettings({ ...emailSettings, from_email: e.target.value })}
                    placeholder="Same as SMTP username if empty"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">From Name</label>
                  <Input
                    value={emailSettings.from_name}
                    onChange={(e) => setEmailSettings({ ...emailSettings, from_name: e.target.value })}
                    placeholder={profile.brand_name || 'Your Brand Name'}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-4 border-t">
                <Button onClick={handleSaveEmailSettings} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Email Settings'}
                </Button>
                <Button variant="outline" onClick={handleTestConnection} disabled={testingEmail}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${testingEmail ? 'animate-spin' : ''}`} />
                  Test Connection
                </Button>
              </div>

              <div className="pt-4 border-t">
                <label className="block text-sm font-medium mb-2">Send Test Email</label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    value={testEmailAddress}
                    onChange={(e) => setTestEmailAddress(e.target.value)}
                    placeholder="test@example.com"
                    className="flex-1"
                  />
                  <Button variant="outline" onClick={handleSendTestEmail} disabled={testingEmail}>
                    <Send className="h-4 w-4 mr-2" />
                    Send Test
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Email Use Cases</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Send welcome emails to new customers
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Password reset notifications
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Payment confirmation emails
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Resume and cover letter delivery
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ChatGPT Settings Tab */}
      {activeTab === 'chatgpt' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                ChatGPT / OpenAI Configuration
                {chatgptSettings.use_custom_key && chatgptSettings.openai_api_key && (
                  <Badge className="ml-2 bg-green-100 text-green-700">Custom Key Active</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Configure your own OpenAI API key to use ChatGPT features with your own account. 
                This allows you to control costs and usage limits for your customers.
              </p>

              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-800 mb-2">Why use your own API key?</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Full control over your OpenAI costs and billing</li>
                  <li>• Set your own usage limits and rate limits</li>
                  <li>• Access to your organization's fine-tuned models</li>
                  <li>• Independent from platform-wide usage quotas</li>
                </ul>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <input
                  type="checkbox"
                  id="use_custom_key"
                  checked={chatgptSettings.use_custom_key}
                  onChange={(e) => setChatgptSettings({ ...chatgptSettings, use_custom_key: e.target.checked })}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300"
                />
                <label htmlFor="use_custom_key" className="text-sm font-medium">
                  Use my own OpenAI API key
                </label>
              </div>

              {chatgptSettings.use_custom_key && (
                <div className="space-y-4 pt-4 border-t">
                  <div>
                    <label className="block text-sm font-medium mb-1">OpenAI API Key</label>
                    <div className="relative">
                      <Input
                        type={showApiKey ? 'text' : 'password'}
                        value={chatgptSettings.openai_api_key}
                        onChange={(e) => setChatgptSettings({ ...chatgptSettings, openai_api_key: e.target.value })}
                        placeholder="sk-..."
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">platform.openai.com/api-keys</a>
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Preferred Model</label>
                    <select
                      value={chatgptSettings.model}
                      onChange={(e) => setChatgptSettings({ ...chatgptSettings, model: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="gpt-4o">GPT-4o (Recommended)</option>
                      <option value="gpt-4o-mini">GPT-4o Mini (Cost-effective)</option>
                      <option value="gpt-4-turbo">GPT-4 Turbo</option>
                      <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Budget)</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Select the model to use for AI features. GPT-4o provides the best results.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-3 pt-4 border-t">
                <Button onClick={handleSaveChatGPTSettings} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save ChatGPT Settings'}
                </Button>
                {chatgptSettings.use_custom_key && chatgptSettings.openai_api_key && (
                  <Button variant="outline" onClick={handleTestChatGPT} disabled={testingChatGPT}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${testingChatGPT ? 'animate-spin' : ''}`} />
                    Test Connection
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Features Using ChatGPT</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  AI Resume Building and Optimization
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Cover Letter Generation
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  ATS Resume Checking and Scoring
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  LinkedIn Profile Tools
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Resume Enhancement Suggestions
                </li>
              </ul>
            </CardContent>
          </Card>

          {!chatgptSettings.use_custom_key && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Key className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-800">Using Platform Default</h4>
                    <p className="text-sm text-yellow-700">
                      Your customers are currently using the platform's shared ChatGPT resources. 
                      Enable your own API key for better control and potentially lower costs at scale.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Legal Tab */}
      {activeTab === 'legal' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Legal Pages
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Provide links to your legal documents. These will be displayed to your customers during registration and checkout.
              </p>
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

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResellerSettings;
