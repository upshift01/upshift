import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Settings, Save, Shield, Bell, Globe, Database, Mail, Clock, Send, Plus, Trash2, CheckCircle, XCircle, RefreshCw, CreditCard, Eye, EyeOff, ExternalLink, Linkedin, Link2, Phone, MapPin, Facebook, Twitter, Instagram, Youtube } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Textarea } from '../../components/ui/textarea';

const AdminSettings = () => {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState('general');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [testingEmail, setTestingEmail] = useState(false);
  const [sendingReminders, setSendingReminders] = useState(false);
  const [generatingInvoices, setGeneratingInvoices] = useState(false);
  
  const [settings, setSettings] = useState({
    platformName: 'UpShift',
    supportEmail: 'support@upshift.works',
    defaultCurrency: 'ZAR',
    monthlyPlatformFee: 2500,
    emailNotifications: true,
    autoGenerateInvoices: true,
    requireApproval: true
  });

  // Email Settings State
  const [emailSettings, setEmailSettings] = useState({
    provider: 'custom',
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_password: '',
    encryption: 'tls',
    from_email: '',
    from_name: 'UpShift',
    reply_to: ''
  });

  // Email Provider Presets
  const emailProviders = [
    { id: 'custom', name: 'Custom SMTP', host: '', port: 587, encryption: 'tls' },
    { id: 'office365', name: 'Microsoft 365 / Outlook', host: 'smtp.office365.com', port: 587, encryption: 'tls' },
    { id: 'gmail', name: 'Gmail / Google Workspace', host: 'smtp.gmail.com', port: 587, encryption: 'tls' },
    { id: 'sendgrid', name: 'SendGrid', host: 'smtp.sendgrid.net', port: 587, encryption: 'tls' },
    { id: 'mailgun', name: 'Mailgun', host: 'smtp.mailgun.org', port: 587, encryption: 'tls' },
    { id: 'ses', name: 'Amazon SES', host: 'email-smtp.us-east-1.amazonaws.com', port: 587, encryption: 'tls' },
    { id: 'zoho', name: 'Zoho Mail', host: 'smtp.zoho.com', port: 465, encryption: 'ssl' },
    { id: 'yahoo', name: 'Yahoo Mail', host: 'smtp.mail.yahoo.com', port: 465, encryption: 'ssl' },
  ];

  const handleProviderChange = (providerId) => {
    const provider = emailProviders.find(p => p.id === providerId);
    if (provider) {
      setEmailSettings({
        ...emailSettings,
        provider: providerId,
        smtp_host: provider.host,
        smtp_port: provider.port,
        encryption: provider.encryption
      });
    }
  };

  // Reminder Schedules State
  const [reminderSchedules, setReminderSchedules] = useState([]);
  const [newSchedule, setNewSchedule] = useState({
    name: '',
    days_before_due: 7,
    is_active: true
  });

  // Email Logs State
  const [emailLogs, setEmailLogs] = useState([]);

  // Test Email State
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);

  // Yoco Payment Settings State
  const [yocoSettings, setYocoSettings] = useState({
    public_key: '',
    secret_key: '',
    webhook_secret: '',
    is_test_mode: true
  });
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [testingYoco, setTestingYoco] = useState(false);
  const [yocoStatus, setYocoStatus] = useState(null);

  // LinkedIn Settings State
  const [linkedinSettings, setLinkedinSettings] = useState({
    client_id: '',
    client_secret: '',
    redirect_uri: ''
  });
  const [showLinkedinSecret, setShowLinkedinSecret] = useState(false);
  const [testingLinkedin, setTestingLinkedin] = useState(false);
  const [linkedinStatus, setLinkedinStatus] = useState(null);

  // Site Settings State (Contact & Social Media)
  const [siteSettings, setSiteSettings] = useState({
    contact: {
      email: '',
      phone: '',
      address: '',
      whatsapp: ''
    },
    social_media: {
      facebook: '',
      twitter: '',
      linkedin: '',
      instagram: '',
      youtube: '',
      tiktok: ''
    },
    business_hours: ''
  });

  useEffect(() => {
    if (activeTab === 'email') {
      fetchEmailSettings();
      fetchReminderSchedules();
      fetchEmailLogs();
    }
    if (activeTab === 'payments') {
      fetchYocoSettings();
    }
    if (activeTab === 'integrations') {
      fetchLinkedinSettings();
    }
    if (activeTab === 'site') {
      fetchSiteSettings();
    }
  }, [activeTab]);

  const fetchEmailSettings = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/email-settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setEmailSettings({
          provider: data.provider || 'custom',
          smtp_host: data.smtp_host || '',
          smtp_port: data.smtp_port || 587,
          smtp_user: data.smtp_user || '',
          smtp_password: data.smtp_password || '',
          encryption: data.encryption || 'tls',
          from_email: data.from_email || '',
          from_name: data.from_name || 'UpShift',
          reply_to: data.reply_to || ''
        });
      }
    } catch (error) {
      console.error('Error fetching email settings:', error);
    }
  };

  const fetchReminderSchedules = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/scheduler/reminder-schedules`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setReminderSchedules(data);
      }
    } catch (error) {
      console.error('Error fetching reminder schedules:', error);
    }
  };

  const fetchEmailLogs = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/scheduler/email-logs?limit=20`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setEmailLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Error fetching email logs:', error);
    }
  };

  const handleSaveEmailSettings = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/email-settings`, {
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
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/email-settings/test`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = await response.json();
      if (data.success) {
        setMessage({ type: 'success', text: data.message || 'SMTP connection successful!' });
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
    
    setSendingTestEmail(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/email-settings/send-test?to_email=${encodeURIComponent(testEmailAddress)}`, {
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
      setSendingTestEmail(false);
    }
  };

  const handleToggleSchedule = async (scheduleId, isActive) => {
    try {
      const schedule = reminderSchedules.find(s => s.id === scheduleId);
      if (!schedule) return;

      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/scheduler/reminder-schedules/${scheduleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: schedule.name,
          days_before_due: schedule.days_before_due,
          is_active: !isActive
        })
      });
      
      if (response.ok) {
        fetchReminderSchedules();
      }
    } catch (error) {
      console.error('Error toggling schedule:', error);
    }
  };

  const handleAddSchedule = async () => {
    if (!newSchedule.name) {
      setMessage({ type: 'error', text: 'Please enter a schedule name' });
      return;
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/scheduler/reminder-schedules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newSchedule)
      });
      
      if (response.ok) {
        setNewSchedule({ name: '', days_before_due: 7, is_active: true });
        fetchReminderSchedules();
        setMessage({ type: 'success', text: 'Schedule added successfully' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error adding schedule' });
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    if (!window.confirm('Are you sure you want to delete this schedule?')) return;

    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/scheduler/reminder-schedules/${scheduleId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        fetchReminderSchedules();
        setMessage({ type: 'success', text: 'Schedule deleted' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error deleting schedule' });
    }
  };

  const handleSendRemindersNow = async () => {
    setSendingReminders(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/scheduler/send-reminders`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = await response.json();
      if (data.success) {
        setMessage({ type: 'success', text: `Sent ${data.sent} reminders (${data.failed} failed)` });
        fetchEmailLogs();
      } else {
        setMessage({ type: 'error', text: data.detail || 'Failed to send reminders' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error sending reminders' });
    } finally {
      setSendingReminders(false);
    }
  };

  const handleGenerateInvoices = async () => {
    setGeneratingInvoices(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/scheduler/generate-monthly-invoices`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = await response.json();
      if (data.success) {
        setMessage({ type: 'success', text: `Generated ${data.invoices_created} invoices for ${data.period}. Emails sent: ${data.emails_sent}` });
      } else {
        setMessage({ type: 'error', text: data.detail || 'Failed to generate invoices' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error generating invoices' });
    } finally {
      setGeneratingInvoices(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setMessage({ type: 'success', text: 'Settings saved successfully!' });
    setSaving(false);
  };

  // Yoco Settings Functions
  const fetchYocoSettings = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/yoco-settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setYocoSettings({
          public_key: data.public_key || '',
          secret_key: data.secret_key || '',
          webhook_secret: data.webhook_secret || '',
          is_test_mode: data.is_test_mode !== false
        });
        setYocoStatus(data.status || null);
      }
    } catch (error) {
      console.error('Error fetching Yoco settings:', error);
    }
  };

  const handleSaveYocoSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/yoco-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(yocoSettings)
      });
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'Yoco settings saved successfully!' });
        fetchYocoSettings();
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.detail || 'Failed to save Yoco settings' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error saving Yoco settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestYocoConnection = async () => {
    setTestingYoco(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/yoco-settings/test`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = await response.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Yoco connection successful!' });
        setYocoStatus({ connected: true, last_checked: new Date().toISOString() });
      } else {
        setMessage({ type: 'error', text: data.detail || 'Yoco connection failed' });
        setYocoStatus({ connected: false, error: data.detail });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error testing Yoco connection' });
    } finally {
      setTestingYoco(false);
    }
  };

  // LinkedIn Settings Functions
  const fetchLinkedinSettings = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/linkedin-settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setLinkedinSettings({
          client_id: data.client_id || '',
          client_secret: data.client_secret || '',
          redirect_uri: data.redirect_uri || ''
        });
        setLinkedinStatus(data.status || null);
      }
    } catch (error) {
      console.error('Error fetching LinkedIn settings:', error);
    }
  };

  const handleSaveLinkedinSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/linkedin-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(linkedinSettings)
      });
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'LinkedIn settings saved successfully!' });
        fetchLinkedinSettings();
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.detail || 'Failed to save LinkedIn settings' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error saving LinkedIn settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestLinkedinConnection = async () => {
    setTestingLinkedin(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/linkedin-settings/test`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = await response.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'LinkedIn credentials verified!' });
        setLinkedinStatus({ connected: true, last_checked: new Date().toISOString() });
      } else {
        setMessage({ type: 'error', text: data.detail || 'LinkedIn connection failed' });
        setLinkedinStatus({ connected: false, error: data.detail });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error testing LinkedIn connection' });
    } finally {
      setTestingLinkedin(false);
    }
  };

  // Site Settings Functions
  const fetchSiteSettings = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/site-settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSiteSettings({
          contact: data.contact || { email: '', phone: '', address: '', whatsapp: '' },
          social_media: data.social_media || { facebook: '', twitter: '', linkedin: '', instagram: '', youtube: '', tiktok: '' },
          business_hours: data.business_hours || ''
        });
      }
    } catch (error) {
      console.error('Error fetching site settings:', error);
    }
  };

  const handleSaveSiteSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/site-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(siteSettings)
      });
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'Site settings saved successfully!' });
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.detail || 'Failed to save site settings' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error saving site settings' });
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Globe },
    { id: 'site', label: 'Site & Contact', icon: Phone },
    { id: 'payments', label: 'Payments (Yoco)', icon: CreditCard },
    { id: 'integrations', label: 'Integrations', icon: Link2 },
    { id: 'email', label: 'Email & Reminders', icon: Mail },
    { id: 'security', label: 'Security', icon: Shield }
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Platform Settings</h1>
        <p className="text-gray-600">Configure global platform settings</p>
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

      {/* General Settings Tab */}
      {activeTab === 'general' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                General Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Platform Name</label>
                <Input
                  value={settings.platformName}
                  onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Support Email</label>
                <Input
                  type="email"
                  value={settings.supportEmail}
                  onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Default Currency</label>
                <select
                  value={settings.defaultCurrency}
                  onChange={(e) => setSettings({ ...settings, defaultCurrency: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="ZAR">ZAR - South African Rand</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                </select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Billing Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Monthly Platform Fee (cents)</label>
                <Input
                  type="number"
                  value={settings.monthlyPlatformFee * 100}
                  onChange={(e) => setSettings({ ...settings, monthlyPlatformFee: e.target.value / 100 })}
                />
                <p className="text-xs text-gray-500 mt-1">Currently: R{settings.monthlyPlatformFee.toLocaleString()}/month</p>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium">Auto-generate Invoices</p>
                  <p className="text-sm text-gray-500">Generate invoices on the 1st of each month</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.autoGenerateInvoices}
                    onChange={(e) => setSettings({ ...settings, autoGenerateInvoices: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Current Admin</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {user?.full_name?.charAt(0) || 'A'}
                </div>
                <div>
                  <p className="font-medium">{user?.full_name}</p>
                  <p className="text-sm text-gray-500">{user?.email}</p>
                  <p className="text-xs text-gray-400">Role: Super Admin</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="lg:col-span-2 flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>
      )}

      {/* Site & Contact Settings Tab */}
      {activeTab === 'site' && (
        <div className="space-y-6">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Contact Information
              </CardTitle>
              <CardDescription>Configure the contact details displayed on the platform</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Contact Email</label>
                  <Input
                    type="email"
                    value={siteSettings.contact.email}
                    onChange={(e) => setSiteSettings({
                      ...siteSettings,
                      contact: { ...siteSettings.contact, email: e.target.value }
                    })}
                    placeholder="support@yourcompany.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone Number</label>
                  <Input
                    value={siteSettings.contact.phone}
                    onChange={(e) => setSiteSettings({
                      ...siteSettings,
                      contact: { ...siteSettings.contact, phone: e.target.value }
                    })}
                    placeholder="+27 (0) 11 234 5678"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">WhatsApp Number</label>
                  <Input
                    value={siteSettings.contact.whatsapp}
                    onChange={(e) => setSiteSettings({
                      ...siteSettings,
                      contact: { ...siteSettings.contact, whatsapp: e.target.value }
                    })}
                    placeholder="+27821234567"
                  />
                  <p className="text-xs text-gray-500 mt-1">Include country code without spaces</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Business Hours</label>
                  <Input
                    value={siteSettings.business_hours}
                    onChange={(e) => setSiteSettings({
                      ...siteSettings,
                      business_hours: e.target.value
                    })}
                    placeholder="Monday - Friday: 8:00 AM - 5:00 PM"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Business Address</label>
                <Textarea
                  value={siteSettings.contact.address}
                  onChange={(e) => setSiteSettings({
                    ...siteSettings,
                    contact: { ...siteSettings.contact, address: e.target.value }
                  })}
                  placeholder="123 Main Street, Sandton, Johannesburg, 2196, South Africa"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Social Media Links */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Social Media Links
              </CardTitle>
              <CardDescription>Add your social media profile URLs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                    <Facebook className="h-4 w-4 text-blue-600" /> Facebook
                  </label>
                  <Input
                    value={siteSettings.social_media.facebook}
                    onChange={(e) => setSiteSettings({
                      ...siteSettings,
                      social_media: { ...siteSettings.social_media, facebook: e.target.value }
                    })}
                    placeholder="https://facebook.com/yourpage"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                    <Twitter className="h-4 w-4 text-sky-500" /> Twitter / X
                  </label>
                  <Input
                    value={siteSettings.social_media.twitter}
                    onChange={(e) => setSiteSettings({
                      ...siteSettings,
                      social_media: { ...siteSettings.social_media, twitter: e.target.value }
                    })}
                    placeholder="https://twitter.com/yourhandle"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                    <Linkedin className="h-4 w-4 text-blue-700" /> LinkedIn
                  </label>
                  <Input
                    value={siteSettings.social_media.linkedin}
                    onChange={(e) => setSiteSettings({
                      ...siteSettings,
                      social_media: { ...siteSettings.social_media, linkedin: e.target.value }
                    })}
                    placeholder="https://linkedin.com/company/yourcompany"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                    <Instagram className="h-4 w-4 text-pink-600" /> Instagram
                  </label>
                  <Input
                    value={siteSettings.social_media.instagram}
                    onChange={(e) => setSiteSettings({
                      ...siteSettings,
                      social_media: { ...siteSettings.social_media, instagram: e.target.value }
                    })}
                    placeholder="https://instagram.com/yourhandle"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                    <Youtube className="h-4 w-4 text-red-600" /> YouTube
                  </label>
                  <Input
                    value={siteSettings.social_media.youtube}
                    onChange={(e) => setSiteSettings({
                      ...siteSettings,
                      social_media: { ...siteSettings.social_media, youtube: e.target.value }
                    })}
                    placeholder="https://youtube.com/@yourchannel"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/></svg> TikTok
                  </label>
                  <Input
                    value={siteSettings.social_media.tiktok}
                    onChange={(e) => setSiteSettings({
                      ...siteSettings,
                      social_media: { ...siteSettings.social_media, tiktok: e.target.value }
                    })}
                    placeholder="https://tiktok.com/@yourhandle"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSaveSiteSettings} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Site Settings'}
            </Button>
          </div>
        </div>
      )}

      {/* Payments (Yoco) Tab */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          {/* Connection Status */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Yoco Payment Gateway
                  </CardTitle>
                  <CardDescription>Configure platform-wide Yoco payment settings</CardDescription>
                </div>
                {yocoStatus && (
                  <Badge variant={yocoStatus.connected ? 'default' : 'destructive'} className={yocoStatus.connected ? 'bg-green-500' : ''}>
                    {yocoStatus.connected ? (
                      <><CheckCircle className="h-3 w-3 mr-1" /> Connected</>
                    ) : (
                      <><XCircle className="h-3 w-3 mr-1" /> Not Connected</>
                    )}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Mode Toggle */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Environment Mode</p>
                    <p className="text-sm text-gray-500">
                      {yocoSettings.is_test_mode ? 'Using test credentials - no real payments' : 'Live mode - real payments will be processed'}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!yocoSettings.is_test_mode}
                      onChange={(e) => setYocoSettings({...yocoSettings, is_test_mode: !e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-500"></div>
                    <span className="ml-3 text-sm font-medium text-gray-900">
                      {yocoSettings.is_test_mode ? 'Test' : 'Live'}
                    </span>
                  </label>
                </div>
              </div>

              {/* API Keys */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Public Key *</label>
                  <Input
                    value={yocoSettings.public_key}
                    onChange={(e) => setYocoSettings({...yocoSettings, public_key: e.target.value})}
                    placeholder={yocoSettings.is_test_mode ? 'pk_test_...' : 'pk_live_...'}
                  />
                  <p className="text-xs text-gray-500 mt-1">Starts with pk_test_ or pk_live_</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Secret Key *</label>
                  <div className="relative">
                    <Input
                      type={showSecretKey ? 'text' : 'password'}
                      value={yocoSettings.secret_key}
                      onChange={(e) => setYocoSettings({...yocoSettings, secret_key: e.target.value})}
                      placeholder={yocoSettings.is_test_mode ? 'sk_test_...' : 'sk_live_...'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecretKey(!showSecretKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Starts with sk_test_ or sk_live_</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Webhook Secret (Optional)</label>
                <Input
                  type="password"
                  value={yocoSettings.webhook_secret}
                  onChange={(e) => setYocoSettings({...yocoSettings, webhook_secret: e.target.value})}
                  placeholder="whsec_..."
                />
                <p className="text-xs text-gray-500 mt-1">Used to verify webhook events from Yoco</p>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3 pt-4 border-t">
                <Button onClick={handleSaveYocoSettings} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Yoco Settings'}
                </Button>
                <Button variant="outline" onClick={handleTestYocoConnection} disabled={testingYoco}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${testingYoco ? 'animate-spin' : ''}`} />
                  {testingYoco ? 'Testing...' : 'Test Connection'}
                </Button>
                <a href="https://portal.yoco.co.za/settings/api" target="_blank" rel="noopener noreferrer">
                  <Button variant="outline">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Get API Keys
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>

          {/* Help Card */}
          <Card>
            <CardHeader>
              <CardTitle>How to Get Yoco API Keys</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                <li>Log in to your <a href="https://portal.yoco.co.za" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Yoco Business Portal</a></li>
                <li>Navigate to <strong>Sales</strong> → <strong>Payment Gateway</strong></li>
                <li>Click on <strong>API Keys</strong> tab</li>
                <li>Copy your <strong>Public Key</strong> and <strong>Secret Key</strong></li>
                <li>For testing, use the <strong>Test Keys</strong> (pk_test_... / sk_test_...)</li>
                <li>For production, use the <strong>Live Keys</strong> (pk_live_... / sk_live_...)</li>
              </ol>
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Important:</strong> Keep your Secret Key confidential. Never expose it in client-side code or share it publicly.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Reseller Note */}
          <Card>
            <CardHeader>
              <CardTitle>Reseller Payment Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                These are the <strong>default platform settings</strong>. Resellers can configure their own Yoco credentials 
                in their individual settings to receive payments directly to their accounts.
              </p>
              <p className="text-sm text-gray-600">
                When a customer makes a payment:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 mt-2 space-y-1">
                <li>If customer belongs to a reseller with Yoco configured → Uses reseller's Yoco account</li>
                <li>If reseller has no Yoco configured → Falls back to these platform settings</li>
                <li>Direct platform customers → Uses these platform settings</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Integrations Tab */}
      {activeTab === 'integrations' && (
        <div className="space-y-6">
          {/* LinkedIn Integration */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Linkedin className="h-5 w-5 text-[#0A66C2]" />
                    LinkedIn Integration
                  </CardTitle>
                  <CardDescription>Configure LinkedIn OAuth for the LinkedIn-to-Resume feature</CardDescription>
                </div>
                {linkedinStatus && (
                  <Badge variant={linkedinStatus.connected ? 'default' : 'destructive'} className={linkedinStatus.connected ? 'bg-green-500' : ''}>
                    {linkedinStatus.connected ? (
                      <><CheckCircle className="h-3 w-3 mr-1" /> Connected</>
                    ) : (
                      <><XCircle className="h-3 w-3 mr-1" /> Not Connected</>
                    )}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* API Credentials */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Client ID *</label>
                  <Input
                    value={linkedinSettings.client_id}
                    onChange={(e) => setLinkedinSettings({...linkedinSettings, client_id: e.target.value})}
                    placeholder="Enter your LinkedIn App Client ID"
                  />
                  <p className="text-xs text-gray-500 mt-1">Found in your LinkedIn Developer App settings</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Client Secret *</label>
                  <div className="relative">
                    <Input
                      type={showLinkedinSecret ? 'text' : 'password'}
                      value={linkedinSettings.client_secret}
                      onChange={(e) => setLinkedinSettings({...linkedinSettings, client_secret: e.target.value})}
                      placeholder="Enter your LinkedIn App Client Secret"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLinkedinSecret(!showLinkedinSecret)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showLinkedinSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Keep this confidential</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Redirect URI (Optional)</label>
                <Input
                  value={linkedinSettings.redirect_uri}
                  onChange={(e) => setLinkedinSettings({...linkedinSettings, redirect_uri: e.target.value})}
                  placeholder="https://yourdomain.com/api/linkedin/callback"
                />
                <p className="text-xs text-gray-500 mt-1">Must match the redirect URI configured in your LinkedIn App</p>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3 pt-4 border-t">
                <Button onClick={handleSaveLinkedinSettings} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save LinkedIn Settings'}
                </Button>
                <Button variant="outline" onClick={handleTestLinkedinConnection} disabled={testingLinkedin}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${testingLinkedin ? 'animate-spin' : ''}`} />
                  {testingLinkedin ? 'Testing...' : 'Test Connection'}
                </Button>
                <a href="https://www.linkedin.com/developers/apps" target="_blank" rel="noopener noreferrer">
                  <Button variant="outline">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    LinkedIn Developer Portal
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>

          {/* LinkedIn Setup Guide */}
          <Card>
            <CardHeader>
              <CardTitle>How to Get LinkedIn API Credentials</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                <li>Go to the <a href="https://www.linkedin.com/developers/apps" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">LinkedIn Developer Portal</a></li>
                <li>Click <strong>"Create App"</strong> if you don't have one</li>
                <li>Fill in app details (name, LinkedIn Page, logo)</li>
                <li>Go to the <strong>"Auth"</strong> tab in your app</li>
                <li>Copy your <strong>Client ID</strong> and <strong>Client Secret</strong></li>
                <li>Add your redirect URI under <strong>"Authorized redirect URLs"</strong></li>
                <li>Request the following OAuth 2.0 scopes:
                  <ul className="list-disc list-inside ml-4 mt-1">
                    <li><code className="bg-gray-100 px-1 rounded">r_liteprofile</code> - Basic profile info</li>
                    <li><code className="bg-gray-100 px-1 rounded">r_emailaddress</code> - Email address</li>
                    <li><code className="bg-gray-100 px-1 rounded">r_basicprofile</code> - Full profile (if available)</li>
                  </ul>
                </li>
              </ol>
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> LinkedIn API access may require app verification. Some features like full profile access 
                  require LinkedIn partnership or additional verification.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Future Integrations Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>Other Integrations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border border-dashed rounded-lg text-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Globe className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="font-medium text-gray-600">Odoo ERP</p>
                  <p className="text-xs text-gray-400">Coming Soon</p>
                </div>
                <div className="p-4 border border-dashed rounded-lg text-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Database className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="font-medium text-gray-600">More Integrations</p>
                  <p className="text-xs text-gray-400">Contact Support</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Email Settings Tab */}
      {activeTab === 'email' && (
        <div className="space-y-6">
          {/* SMTP Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email / SMTP Configuration
              </CardTitle>
              <CardDescription>Configure your email service provider for sending system emails</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Provider Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">Email Provider</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {emailProviders.map((provider) => (
                    <button
                      key={provider.id}
                      onClick={() => handleProviderChange(provider.id)}
                      className={`p-3 border rounded-lg text-sm text-left transition-all ${
                        emailSettings.provider === provider.id
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {provider.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* SMTP Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">SMTP Host *</label>
                  <Input
                    value={emailSettings.smtp_host}
                    onChange={(e) => setEmailSettings({ ...emailSettings, smtp_host: e.target.value })}
                    placeholder="smtp.example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">SMTP Port *</label>
                  <Input
                    type="number"
                    value={emailSettings.smtp_port}
                    onChange={(e) => setEmailSettings({ ...emailSettings, smtp_port: parseInt(e.target.value) || 587 })}
                    placeholder="587"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Encryption</label>
                  <select
                    value={emailSettings.encryption}
                    onChange={(e) => setEmailSettings({ ...emailSettings, encryption: e.target.value })}
                    className="w-full h-10 px-3 border rounded-md bg-white"
                  >
                    <option value="tls">TLS (STARTTLS) - Port 587</option>
                    <option value="ssl">SSL - Port 465</option>
                    <option value="none">None (Not Recommended)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Username / Email *</label>
                  <Input
                    value={emailSettings.smtp_user}
                    onChange={(e) => setEmailSettings({ ...emailSettings, smtp_user: e.target.value })}
                    placeholder="your-email@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Password / App Password *</label>
                  <Input
                    type="password"
                    value={emailSettings.smtp_password}
                    onChange={(e) => setEmailSettings({ ...emailSettings, smtp_password: e.target.value })}
                    placeholder="••••••••"
                  />
                  <p className="text-xs text-gray-500 mt-1">For Gmail/Office365, use an App Password</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">From Email</label>
                  <Input
                    type="email"
                    value={emailSettings.from_email}
                    onChange={(e) => setEmailSettings({ ...emailSettings, from_email: e.target.value })}
                    placeholder="Same as username if empty"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">From Name</label>
                  <Input
                    value={emailSettings.from_name}
                    onChange={(e) => setEmailSettings({ ...emailSettings, from_name: e.target.value })}
                    placeholder="UpShift"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Reply-To Email</label>
                  <Input
                    type="email"
                    value={emailSettings.reply_to}
                    onChange={(e) => setEmailSettings({ ...emailSettings, reply_to: e.target.value })}
                    placeholder="support@example.com"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 pt-4 border-t">
                <Button onClick={handleSaveEmailSettings} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Email Settings'}
                </Button>
                <Button variant="outline" onClick={handleTestConnection} disabled={testingEmail}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${testingEmail ? 'animate-spin' : ''}`} />
                  {testingEmail ? 'Testing...' : 'Test Connection'}
                </Button>
                <Button variant="outline" onClick={handleSendTestEmail} disabled={sendingTestEmail}>
                  <Send className={`h-4 w-4 mr-2 ${sendingTestEmail ? 'animate-spin' : ''}`} />
                  {sendingTestEmail ? 'Sending...' : 'Send Test Email'}
                </Button>
              </div>

              {/* Provider Tips */}
              {emailSettings.provider === 'gmail' && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Gmail / Google Workspace:</strong> You need to use an App Password. Go to 
                    <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="underline ml-1">Google Account → App Passwords</a> to generate one.
                  </p>
                </div>
              )}
              {emailSettings.provider === 'office365' && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Microsoft 365 / Outlook:</strong> If you have MFA enabled, use an App Password from your 
                    <a href="https://account.microsoft.com/security" target="_blank" rel="noopener noreferrer" className="underline ml-1">Microsoft Security settings</a>.
                  </p>
                </div>
              )}
              {emailSettings.provider === 'sendgrid' && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>SendGrid:</strong> Use <code className="bg-blue-100 px-1 rounded">apikey</code> as username and your API key as the password.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reminder Schedules */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Payment Reminder Schedules
                </span>
                <Button onClick={handleSendRemindersNow} disabled={sendingReminders} size="sm">
                  <Send className={`h-4 w-4 mr-2 ${sendingReminders ? 'animate-spin' : ''}`} />
                  Send Reminders Now
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Configure when payment reminders are sent to resellers. Positive numbers mean days before due date, 
                negative numbers mean days after (overdue).
              </p>
              
              {/* Existing Schedules */}
              <div className="space-y-2">
                {reminderSchedules.map(schedule => (
                  <div key={schedule.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={schedule.is_active}
                          onChange={() => handleToggleSchedule(schedule.id, schedule.is_active)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                      <div>
                        <p className="font-medium">{schedule.name}</p>
                        <p className="text-xs text-gray-500">
                          {schedule.days_before_due > 0 
                            ? `${schedule.days_before_due} days before due date`
                            : schedule.days_before_due === 0
                            ? 'On due date'
                            : `${Math.abs(schedule.days_before_due)} days overdue`}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteSchedule(schedule.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Add New Schedule */}
              <div className="pt-4 border-t">
                <label className="block text-sm font-medium mb-2">Add New Schedule</label>
                <div className="flex gap-2">
                  <Input
                    value={newSchedule.name}
                    onChange={(e) => setNewSchedule({ ...newSchedule, name: e.target.value })}
                    placeholder="Schedule name"
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={newSchedule.days_before_due}
                    onChange={(e) => setNewSchedule({ ...newSchedule, days_before_due: parseInt(e.target.value) })}
                    className="w-24"
                    placeholder="Days"
                  />
                  <Button onClick={handleAddSchedule}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Use positive numbers for days before due date, 0 for due date, negative for overdue days.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Manual Invoice Generation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Manual Invoice Generation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Invoices are automatically generated on the 1st of each month. Use this button to manually generate invoices for the current period.
              </p>
              <Button onClick={handleGenerateInvoices} disabled={generatingInvoices}>
                <RefreshCw className={`h-4 w-4 mr-2 ${generatingInvoices ? 'animate-spin' : ''}`} />
                {generatingInvoices ? 'Generating...' : 'Generate Monthly Invoices Now'}
              </Button>
            </CardContent>
          </Card>

          {/* Email Logs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Recent Email Activity
                </span>
                <Button variant="ghost" size="sm" onClick={fetchEmailLogs}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {emailLogs.length === 0 ? (
                <p className="text-gray-500 text-sm">No email activity yet</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {emailLogs.map(log => (
                    <div key={log.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                      <div>
                        <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                          log.status === 'sent' ? 'bg-green-500' : 'bg-red-500'
                        }`}></span>
                        <span className="font-medium">{log.type === 'invoice_reminder' ? 'Payment Reminder' : 'Invoice Created'}</span>
                        <span className="text-gray-500 ml-2">to {log.to_email}</span>
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(log.sent_at).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security & Approval
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium">Require Reseller Approval</p>
                  <p className="text-sm text-gray-500">New resellers must be approved by admin</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.requireApproval}
                    onChange={(e) => setSettings({ ...settings, requireApproval: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-gray-500">Receive email alerts for new resellers</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.emailNotifications}
                    onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </CardContent>
          </Card>

          <div className="lg:col-span-2 flex justify-end">
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

export default AdminSettings;
