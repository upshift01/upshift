import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Settings, Save, Shield, Bell, Globe, Database } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

const AdminSettings = () => {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  
  const [settings, setSettings] = useState({
    platformName: 'UpShift',
    supportEmail: 'support@upshift.co.za',
    defaultCurrency: 'ZAR',
    monthlyPlatformFee: 2500,
    emailNotifications: true,
    autoGenerateInvoices: true,
    requireApproval: true
  });

  const handleSave = async () => {
    setSaving(true);
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 1000));
    setMessage('Settings saved successfully!');
    setSaving(false);
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Platform Settings</h1>
        <p className="text-gray-600">Configure global platform settings</p>
      </div>

      {message && (
        <div className="mb-6 p-4 rounded-lg bg-green-50 text-green-800">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Settings */}
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

        {/* Billing Settings */}
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

        {/* Security Settings */}
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

        {/* Notification Settings */}
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
      </div>

      {/* Admin Info */}
      <Card className="mt-6">
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

      <div className="flex justify-end mt-6">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
};

export default AdminSettings;
