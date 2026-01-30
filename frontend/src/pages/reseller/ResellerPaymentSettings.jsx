import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  CreditCard, Loader2, Save, CheckCircle,
  XCircle, Eye, EyeOff, TestTube, Info
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const ResellerPaymentSettings = () => {
  const navigate = useNavigate();
  const { token, isAuthenticated, user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const [paymentSettings, setPaymentSettings] = useState({
    stripe_public_key: '',
    stripe_secret_key: '',
    stripe_configured: false,
    yoco_public_key: '',
    yoco_secret_key: '',
    yoco_configured: false,
    default_provider: 'yoco'
  });

  const [showStripeSecret, setShowStripeSecret] = useState(false);
  const [showYocoSecret, setShowYocoSecret] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (user?.role !== 'reseller_admin') {
      toast({
        title: 'Access Denied',
        description: 'You need reseller access to view this page',
        variant: 'destructive'
      });
      navigate('/dashboard');
      return;
    }
    fetchSettings();
  }, [isAuthenticated, user]);

  const fetchSettings = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/settings/reseller/payments`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setPaymentSettings(data.settings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/settings/reseller/payments`, {
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
      const response = await fetch(`${API_URL}/api/admin/settings/reseller/payments/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ provider })
      });

      const result = await response.json();

      toast({
        title: result.success ? 'Connection Successful' : 'Connection Failed',
        description: result.message,
        variant: result.success ? 'default' : 'destructive'
      });
    } catch (error) {
      toast({
        title: 'Test Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <CreditCard className="h-7 w-7 text-blue-600" />
          Payment Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Configure your payment gateway credentials for processing customer payments
        </p>
      </div>

      {/* Info Banner */}
      <Card className="mb-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-blue-800 dark:text-blue-200 font-medium">Payment Gateway Information</p>
              <ul className="text-sm text-blue-700 dark:text-blue-300 mt-1 space-y-1">
                <li>• <strong>Yoco</strong> - Recommended for South African Rand (ZAR) payments</li>
                <li>• <strong>Stripe</strong> - For international USD payments only</li>
                <li>• Get your Yoco keys from <a href="https://portal.yoco.co.za" target="_blank" rel="noopener noreferrer" className="underline">portal.yoco.co.za</a></li>
                <li>• Get your Stripe keys from <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="underline">dashboard.stripe.com</a></li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Yoco Settings - Primary for ZAR */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#00A3FF] flex items-center justify-center text-white text-xs font-bold">
                YOCO
              </div>
              <div>
                <CardTitle className="text-lg">Yoco</CardTitle>
                <CardDescription>South African payments (ZAR only)</CardDescription>
              </div>
            </div>
            <Badge variant={paymentSettings.yoco_configured ? "default" : "secondary"} className={paymentSettings.yoco_configured ? "bg-green-100 text-green-800" : ""}>
              {paymentSettings.yoco_configured ? (
                <><CheckCircle className="h-3 w-3 mr-1" /> Configured</>
              ) : (
                <><XCircle className="h-3 w-3 mr-1" /> Not Configured</>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Public Key</Label>
              <Input
                value={paymentSettings.yoco_public_key}
                onChange={(e) => setPaymentSettings({...paymentSettings, yoco_public_key: e.target.value})}
                placeholder="pk_test_..."
              />
            </div>
            <div className="space-y-2">
              <Label>Secret Key</Label>
              <div className="relative">
                <Input
                  type={showYocoSecret ? "text" : "password"}
                  value={paymentSettings.yoco_secret_key}
                  onChange={(e) => setPaymentSettings({...paymentSettings, yoco_secret_key: e.target.value})}
                  placeholder="sk_test_..."
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
          </div>
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleTestConnection('yoco')}
              disabled={testing || !paymentSettings.yoco_secret_key}
            >
              {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <TestTube className="h-4 w-4 mr-2" />}
              Test Connection
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stripe Settings - For USD */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Stripe</CardTitle>
                <CardDescription>International payments (USD only)</CardDescription>
              </div>
            </div>
            <Badge variant={paymentSettings.stripe_configured ? "default" : "secondary"} className={paymentSettings.stripe_configured ? "bg-green-100 text-green-800" : ""}>
              {paymentSettings.stripe_configured ? (
                <><CheckCircle className="h-3 w-3 mr-1" /> Configured</>
              ) : (
                <><XCircle className="h-3 w-3 mr-1" /> Not Configured</>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Publishable Key</Label>
              <Input
                value={paymentSettings.stripe_public_key}
                onChange={(e) => setPaymentSettings({...paymentSettings, stripe_public_key: e.target.value})}
                placeholder="pk_test_..."
              />
            </div>
            <div className="space-y-2">
              <Label>Secret Key</Label>
              <div className="relative">
                <Input
                  type={showStripeSecret ? "text" : "password"}
                  value={paymentSettings.stripe_secret_key}
                  onChange={(e) => setPaymentSettings({...paymentSettings, stripe_secret_key: e.target.value})}
                  placeholder="sk_test_..."
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
          </div>
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleTestConnection('stripe')}
              disabled={testing || !paymentSettings.stripe_secret_key}
            >
              {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <TestTube className="h-4 w-4 mr-2" />}
              Test Connection
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Default Provider */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Default Payment Provider</CardTitle>
          <CardDescription>Select which payment provider to use by default</CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={paymentSettings.default_provider}
            onValueChange={(value) => setPaymentSettings({...paymentSettings, default_provider: value})}
          >
            <SelectTrigger className="w-full md:w-[300px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="yoco">Yoco (ZAR - Recommended)</SelectItem>
              <SelectItem value="stripe">Stripe (USD)</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="min-w-[120px]">
          {saving ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
          ) : (
            <><Save className="h-4 w-4 mr-2" /> Save Settings</>
          )}
        </Button>
      </div>
    </div>
  );
};

export default ResellerPaymentSettings;
