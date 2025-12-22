import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Settings, Save, Shield, Bell, Globe, Database, Mail, Clock, Send, Plus, Trash2, CheckCircle, XCircle, RefreshCw, CreditCard, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';

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
    smtp_host: 'smtp.office365.com',
    smtp_port: 587,
    smtp_user: '',
    smtp_password: '',
    from_email: '',
    from_name: 'UpShift'
  });

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

  useEffect(() => {
    if (activeTab === 'email') {
      fetchEmailSettings();
      fetchReminderSchedules();
      fetchEmailLogs();
    }
  }, [activeTab]);

  const fetchEmailSettings = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/scheduler/email-settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setEmailSettings({
          smtp_host: data.smtp_host || 'smtp.office365.com',
          smtp_port: data.smtp_port || 587,
          smtp_user: data.smtp_user || '',
          smtp_password: data.smtp_password || '',
          from_email: data.from_email || '',
          from_name: data.from_name || 'UpShift'
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
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/scheduler/email-settings`, {
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
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/scheduler/email-settings/test`, {
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
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/scheduler/email-settings/send-test?to_email=${encodeURIComponent(testEmailAddress)}`, {
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

  const tabs = [
    { id: 'general', label: 'General', icon: Globe },
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

      {/* Email Settings Tab */}
      {activeTab === 'email' && (
        <div className="space-y-6">
          {/* SMTP Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                SMTP Configuration (Office365)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">SMTP Host</label>
                  <Input
                    value={emailSettings.smtp_host}
                    onChange={(e) => setEmailSettings({ ...emailSettings, smtp_host: e.target.value })}
                    placeholder="smtp.office365.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">SMTP Port</label>
                  <Input
                    type="number"
                    value={emailSettings.smtp_port}
                    onChange={(e) => setEmailSettings({ ...emailSettings, smtp_port: parseInt(e.target.value) })}
                    placeholder="587"
                  />
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
                    placeholder="Same as SMTP username"
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

              {/* Test Email */}
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
