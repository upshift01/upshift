import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Settings, CreditCard, Mail, Loader2, Save, CheckCircle,
  XCircle, Eye, EyeOff, TestTube, RefreshCcw
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const AdminSettings = () => {
  const navigate = useNavigate();
  const { token, isAuthenticated, user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [activeTab, setActiveTab] = useState('payments');

  // Payment settings
  const [paymentSettings, setPaymentSettings] = useState({
    stripe_public_key: '',
    stripe_secret_key: '',
    stripe_configured: false,
    yoco_public_key: '',
    yoco_secret_key: '',
    yoco_configured: false,
    default_provider: 'stripe'
  });

  // SMTP settings
  const [smtpSettings, setSmtpSettings] = useState({
    smtp_host: '',
    smtp_port: 587,
    smtp_username: '',
    smtp_password: '',
    from_email: '',
    from_name: '',
    configured: false
  });

  // Show/hide secret keys
  const [showStripeSecret, setShowStripeSecret] = useState(false);
  const [showYocoSecret, setShowYocoSecret] = useState(false);
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (user?.role !== 'super_admin') {
      toast({
        title: 'Access Denied',
        description: 'You need admin access to view this page',
        variant: 'destructive'
      });
      navigate('/dashboard');
      return;
    }
    fetchSettings();
  }, [isAuthenticated, user]);

  const fetchSettings = async () => {
    try {
      const [paymentRes, smtpRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/settings/payments`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_URL}/api/admin/settings/smtp`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (paymentRes.ok) {
        const data = await paymentRes.json();
        setPaymentSettings(data.settings);
      }

      if (smtpRes.ok) {
        const data = await smtpRes.json();
        setSmtpSettings(data.settings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePayments = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/settings/payments`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(paymentSettings)
      });

      if (response.ok) {
        toast({
          title: 'Settings Saved',
          description: 'Payment settings updated successfully'
        });
        fetchSettings(); // Refresh
      } else {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to save settings');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSMTP = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/settings/smtp`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(smtpSettings)
      });

      if (response.ok) {
        toast({
          title: 'Settings Saved',
          description: 'SMTP settings updated successfully'
        });
        fetchSettings();
      } else {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to save settings');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async (provider) => {
    setTesting(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/settings/payments/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ provider })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Connection Successful',
          description: data.message
        });
      } else {
        toast({
          title: 'Connection Failed',
          description: data.message,
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to test connection',
        variant: 'destructive'
      });
    } finally {
      setTesting(false);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="h-6 w-6 text-blue-600" />
            Admin Settings
          </h1>
          <p className="text-gray-600">Configure payment gateways and system settings</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="payments" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Payment Gateways
            </TabsTrigger>
            <TabsTrigger value="smtp" className="gap-2">
              <Mail className="h-4 w-4" />
              Email (SMTP)
            </TabsTrigger>
          </TabsList>

          {/* Payment Settings Tab */}
          <TabsContent value="payments">
            <div className="space-y-6">
              {/* Stripe Settings */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <img 
                          src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" 
                          alt="Stripe" 
                          className="h-6"
                        />
                        Stripe
                      </CardTitle>
                      <CardDescription>
                        International payments (USD, ZAR, and more)
                      </CardDescription>
                    </div>
                    {paymentSettings.stripe_configured ? (
                      <Badge className="bg-green-100 text-green-800 gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Configured
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-gray-500 gap-1">
                        <XCircle className="h-3 w-3" />
                        Not Configured
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Publishable Key</Label>
                    <Input
                      placeholder="pk_live_..."
                      value={paymentSettings.stripe_public_key}
                      onChange={(e) => setPaymentSettings({
                        ...paymentSettings,
                        stripe_public_key: e.target.value
                      })}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Found in Stripe Dashboard → Developers → API Keys
                    </p>
                  </div>
                  <div>
                    <Label>Secret Key</Label>
                    <div className="relative">
                      <Input
                        type={showStripeSecret ? 'text' : 'password'}
                        placeholder="sk_live_..."
                        value={paymentSettings.stripe_secret_key}
                        onChange={(e) => setPaymentSettings({
                          ...paymentSettings,
                          stripe_secret_key: e.target.value
                        })}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 -translate-y-1/2"
                        onClick={() => setShowStripeSecret(!showStripeSecret)}
                      >
                        {showStripeSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestConnection('stripe')}
                    disabled={testing}
                  >
                    {testing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <TestTube className="h-4 w-4 mr-2" />}
                    Test Connection
                  </Button>
                </CardContent>
              </Card>

              {/* Yoco Settings */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <div className="w-12 h-6 bg-[#00A3FF] rounded flex items-center justify-center text-white text-xs font-bold">
                          YOCO
                        </div>
                        Yoco
                      </CardTitle>
                      <CardDescription>
                        South African payments (ZAR only)
                      </CardDescription>
                    </div>
                    {paymentSettings.yoco_configured ? (
                      <Badge className="bg-green-100 text-green-800 gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Configured
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-gray-500 gap-1">
                        <XCircle className="h-3 w-3" />
                        Not Configured
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Public Key</Label>
                    <Input
                      placeholder="pk_live_..."
                      value={paymentSettings.yoco_public_key}
                      onChange={(e) => setPaymentSettings({
                        ...paymentSettings,
                        yoco_public_key: e.target.value
                      })}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Found in Yoco Portal → Selling Online → Payment Gateway
                    </p>
                  </div>
                  <div>
                    <Label>Secret Key</Label>
                    <div className="relative">
                      <Input
                        type={showYocoSecret ? 'text' : 'password'}
                        placeholder="sk_live_..."
                        value={paymentSettings.yoco_secret_key}
                        onChange={(e) => setPaymentSettings({
                          ...paymentSettings,
                          yoco_secret_key: e.target.value
                        })}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 -translate-y-1/2"
                        onClick={() => setShowYocoSecret(!showYocoSecret)}
                      >
                        {showYocoSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestConnection('yoco')}
                    disabled={testing}
                  >
                    {testing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <TestTube className="h-4 w-4 mr-2" />}
                    Test Connection
                  </Button>
                </CardContent>
              </Card>

              {/* Default Provider */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Default Payment Provider</CardTitle>
                  <CardDescription>
                    Choose which provider to use by default for payments
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Select
                    value={paymentSettings.default_provider}
                    onValueChange={(value) => setPaymentSettings({
                      ...paymentSettings,
                      default_provider: value
                    })}
                  >
                    <SelectTrigger className="w-64">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stripe">Stripe (Recommended)</SelectItem>
                      <SelectItem value="yoco">Yoco (South Africa)</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {/* Save Button */}
              <div className="flex justify-end">
                <Button
                  onClick={handleSavePayments}
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Payment Settings
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* SMTP Settings Tab */}
          <TabsContent value="smtp">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      SMTP Email Configuration
                    </CardTitle>
                    <CardDescription>
                      Configure email sending for notifications
                    </CardDescription>
                  </div>
                  {smtpSettings.configured ? (
                    <Badge className="bg-green-100 text-green-800 gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Configured
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-gray-500 gap-1">
                      <XCircle className="h-3 w-3" />
                      Not Configured
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>SMTP Host</Label>
                    <Input
                      placeholder="smtp.example.com"
                      value={smtpSettings.smtp_host}
                      onChange={(e) => setSmtpSettings({
                        ...smtpSettings,
                        smtp_host: e.target.value
                      })}
                    />
                  </div>
                  <div>
                    <Label>SMTP Port</Label>
                    <Input
                      type="number"
                      placeholder="587"
                      value={smtpSettings.smtp_port}
                      onChange={(e) => setSmtpSettings({
                        ...smtpSettings,
                        smtp_port: parseInt(e.target.value) || 587
                      })}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Username</Label>
                    <Input
                      placeholder="your-email@example.com"
                      value={smtpSettings.smtp_username}
                      onChange={(e) => setSmtpSettings({
                        ...smtpSettings,
                        smtp_username: e.target.value
                      })}
                    />
                  </div>
                  <div>
                    <Label>Password</Label>
                    <div className="relative">
                      <Input
                        type={showSmtpPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={smtpSettings.smtp_password}
                        onChange={(e) => setSmtpSettings({
                          ...smtpSettings,
                          smtp_password: e.target.value
                        })}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 -translate-y-1/2"
                        onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                      >
                        {showSmtpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>From Email</Label>
                    <Input
                      placeholder="noreply@example.com"
                      value={smtpSettings.from_email}
                      onChange={(e) => setSmtpSettings({
                        ...smtpSettings,
                        from_email: e.target.value
                      })}
                    />
                  </div>
                  <div>
                    <Label>From Name</Label>
                    <Input
                      placeholder="UpShift"
                      value={smtpSettings.from_name}
                      onChange={(e) => setSmtpSettings({
                        ...smtpSettings,
                        from_name: e.target.value
                      })}
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={handleSaveSMTP}
                    disabled={saving}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save SMTP Settings
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

export default AdminSettings;
