import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  DollarSign, Save, Users, Calendar, Settings, TrendingUp,
  Info, Percent, Package, Building2, Crown, Rocket, Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Switch } from '../../components/ui/switch';

const AdminPricing = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState('plans');

  // White-Label Plans (Starter, Professional, Custom)
  const [whitelabelPlans, setWhitelabelPlans] = useState({
    starter: {
      name: 'Starter',
      price: 2499, // R2,499 (normal amount)
      monthly_cv_limit: 1000,
      custom_subdomain: true,
      custom_domain: false,
      api_access: false,
      priority_support: false,
      analytics: 'basic',
      templates: 'standard',
      enabled: true
    },
    professional: {
      name: 'Professional',
      price: 4999, // R4,999 (normal amount)
      monthly_cv_limit: 3500,
      custom_subdomain: true,
      custom_domain: true,
      api_access: true,
      priority_support: true,
      analytics: 'advanced',
      templates: 'premium',
      enabled: true
    },
    custom: {
      name: 'Enterprise',
      price: 0, // Custom pricing
      monthly_cv_limit: -1, // Unlimited
      custom_subdomain: true,
      custom_domain: true,
      api_access: true,
      priority_support: true,
      analytics: 'enterprise',
      templates: 'all',
      enabled: true,
      contact_sales: true
    }
  });

  // Legacy white-label pricing (kept for backwards compatibility)
  const [whitelabelPricing, setWhitelabelPricing] = useState({
    monthly_subscription: 2500,
    setup_fee: 0,
    per_transaction_fee: 0,
    minimum_commitment_months: 1
  });

  // Default tier pricing (suggested prices for resellers)
  const [defaultTierPricing, setDefaultTierPricing] = useState({
    tier_1_price: 899,
    tier_2_price: 1500,
    tier_3_price: 3000,
    currency: 'ZAR'
  });

  // Strategy Call pricing
  const [strategyCallPricing, setStrategyCallPricing] = useState({
    price: 699,
    duration_minutes: 30,
    included_in_tier_3: true,
    enabled: true
  });

  useEffect(() => {
    fetchPricing();
  }, []);

  const fetchPricing = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/platform-pricing`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.whitelabel_plans) setWhitelabelPlans(data.whitelabel_plans);
        if (data.whitelabel_pricing) setWhitelabelPricing(data.whitelabel_pricing);
        if (data.default_tier_pricing) setDefaultTierPricing(data.default_tier_pricing);
        if (data.strategy_call_pricing) setStrategyCallPricing(data.strategy_call_pricing);
      }
    } catch (error) {
      console.error('Error fetching pricing:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/platform-pricing`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          whitelabel_plans: whitelabelPlans,
          whitelabel_pricing: whitelabelPricing,
          default_tier_pricing: defaultTierPricing,
          strategy_call_pricing: strategyCallPricing
        })
      });
      if (response.ok) {
        setMessage({ type: 'success', text: 'Pricing updated successfully!' });
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.detail || 'Failed to update pricing' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error updating pricing' });
    } finally {
      setSaving(false);
    }
  };

  const updatePlan = (planKey, field, value) => {
    setWhitelabelPlans(prev => ({
      ...prev,
      [planKey]: {
        ...prev[planKey],
        [field]: value
      }
    }));
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Platform Pricing Configuration</h1>
        <p className="text-gray-600">Manage white-label plans, fees, and strategy call rates</p>
      </div>

      {message.text && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="plans" className="flex items-center gap-2">
            <Crown className="h-4 w-4" />
            White-Label Plans
          </TabsTrigger>
          <TabsTrigger value="whitelabel" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Legacy Fees
          </TabsTrigger>
          <TabsTrigger value="tiers" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Default Tiers
          </TabsTrigger>
          <TabsTrigger value="strategy" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Strategy Calls
          </TabsTrigger>
        </TabsList>

        {/* White-Label Plans Tab */}
        <TabsContent value="plans">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Starter Plan */}
            <Card className="border-2 border-gray-200">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Rocket className="h-5 w-5 text-blue-600" />
                    </div>
                    <CardTitle>Starter Plan</CardTitle>
                  </div>
                  <Switch
                    checked={whitelabelPlans.starter.enabled}
                    onCheckedChange={(checked) => updatePlan('starter', 'enabled', checked)}
                  />
                </div>
                <CardDescription>For small agencies starting out</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Monthly Price (ZAR)</Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R</span>
                    <Input
                      type="number"
                      min="0"
                      value={whitelabelPlans.starter.price}
                      onChange={(e) => updatePlan('starter', 'price', parseInt(e.target.value) || 0)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <div>
                  <Label>Monthly CV Limit</Label>
                  <Input
                    type="number"
                    min="100"
                    value={whitelabelPlans.starter.monthly_cv_limit}
                    onChange={(e) => updatePlan('starter', 'monthly_cv_limit', parseInt(e.target.value) || 100)}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Maximum CVs per month</p>
                </div>
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Custom Subdomain</Label>
                    <Switch
                      checked={whitelabelPlans.starter.custom_subdomain}
                      onCheckedChange={(checked) => updatePlan('starter', 'custom_subdomain', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Custom Domain</Label>
                    <Switch
                      checked={whitelabelPlans.starter.custom_domain}
                      onCheckedChange={(checked) => updatePlan('starter', 'custom_domain', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">API Access</Label>
                    <Switch
                      checked={whitelabelPlans.starter.api_access}
                      onCheckedChange={(checked) => updatePlan('starter', 'api_access', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Priority Support</Label>
                    <Switch
                      checked={whitelabelPlans.starter.priority_support}
                      onCheckedChange={(checked) => updatePlan('starter', 'priority_support', checked)}
                    />
                  </div>
                </div>
                <div>
                  <Label>Analytics Level</Label>
                  <select
                    value={whitelabelPlans.starter.analytics}
                    onChange={(e) => updatePlan('starter', 'analytics', e.target.value)}
                    className="w-full mt-1 border rounded-md p-2"
                  >
                    <option value="basic">Basic</option>
                    <option value="advanced">Advanced</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Professional Plan */}
            <Card className="border-2 border-purple-400 relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                  MOST POPULAR
                </span>
              </div>
              <CardHeader className="pb-4 pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Zap className="h-5 w-5 text-purple-600" />
                    </div>
                    <CardTitle>Professional Plan</CardTitle>
                  </div>
                  <Switch
                    checked={whitelabelPlans.professional.enabled}
                    onCheckedChange={(checked) => updatePlan('professional', 'enabled', checked)}
                  />
                </div>
                <CardDescription>For growing businesses</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Monthly Price (ZAR)</Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R</span>
                    <Input
                      type="number"
                      min="0"
                      value={whitelabelPlans.professional.price}
                      onChange={(e) => updatePlan('professional', 'price', parseInt(e.target.value) || 0)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <div>
                  <Label>Monthly CV Limit</Label>
                  <Input
                    type="number"
                    min="100"
                    value={whitelabelPlans.professional.monthly_cv_limit}
                    onChange={(e) => updatePlan('professional', 'monthly_cv_limit', parseInt(e.target.value) || 100)}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Maximum CVs per month</p>
                </div>
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Custom Subdomain</Label>
                    <Switch
                      checked={whitelabelPlans.professional.custom_subdomain}
                      onCheckedChange={(checked) => updatePlan('professional', 'custom_subdomain', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Custom Domain</Label>
                    <Switch
                      checked={whitelabelPlans.professional.custom_domain}
                      onCheckedChange={(checked) => updatePlan('professional', 'custom_domain', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">API Access</Label>
                    <Switch
                      checked={whitelabelPlans.professional.api_access}
                      onCheckedChange={(checked) => updatePlan('professional', 'api_access', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Priority Support</Label>
                    <Switch
                      checked={whitelabelPlans.professional.priority_support}
                      onCheckedChange={(checked) => updatePlan('professional', 'priority_support', checked)}
                    />
                  </div>
                </div>
                <div>
                  <Label>Analytics Level</Label>
                  <select
                    value={whitelabelPlans.professional.analytics}
                    onChange={(e) => updatePlan('professional', 'analytics', e.target.value)}
                    className="w-full mt-1 border rounded-md p-2"
                  >
                    <option value="basic">Basic</option>
                    <option value="advanced">Advanced</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Enterprise/Custom Plan */}
            <Card className="border-2 border-amber-400">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <Crown className="h-5 w-5 text-amber-600" />
                    </div>
                    <CardTitle>Enterprise Plan</CardTitle>
                  </div>
                  <Switch
                    checked={whitelabelPlans.custom.enabled}
                    onCheckedChange={(checked) => updatePlan('custom', 'enabled', checked)}
                  />
                </div>
                <CardDescription>Custom pricing for large orgs</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Pricing Type</Label>
                  <div className="mt-1 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800 font-medium">Contact Sales</p>
                    <p className="text-xs text-amber-600">Custom pricing negotiated per client</p>
                  </div>
                </div>
                <div>
                  <Label>Monthly CV Limit</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      type="number"
                      min="-1"
                      value={whitelabelPlans.custom.monthly_cv_limit}
                      onChange={(e) => updatePlan('custom', 'monthly_cv_limit', parseInt(e.target.value))}
                      disabled={whitelabelPlans.custom.monthly_cv_limit === -1}
                    />
                    <label className="flex items-center gap-2 text-sm whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={whitelabelPlans.custom.monthly_cv_limit === -1}
                        onChange={(e) => updatePlan('custom', 'monthly_cv_limit', e.target.checked ? -1 : 10000)}
                        className="rounded"
                      />
                      Unlimited
                    </label>
                  </div>
                </div>
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Custom Subdomain</Label>
                    <Switch
                      checked={whitelabelPlans.custom.custom_subdomain}
                      onCheckedChange={(checked) => updatePlan('custom', 'custom_subdomain', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Custom Domain</Label>
                    <Switch
                      checked={whitelabelPlans.custom.custom_domain}
                      onCheckedChange={(checked) => updatePlan('custom', 'custom_domain', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">API Access</Label>
                    <Switch
                      checked={whitelabelPlans.custom.api_access}
                      onCheckedChange={(checked) => updatePlan('custom', 'api_access', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Priority Support</Label>
                    <Switch
                      checked={whitelabelPlans.custom.priority_support}
                      onCheckedChange={(checked) => updatePlan('custom', 'priority_support', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Dedicated Account Manager</Label>
                    <Switch checked={true} disabled />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800">Plan Configuration</p>
                <p className="text-sm text-blue-700 mt-1">
                  These plans are displayed on the White-Label page. Each plan's features determine what resellers get access to.
                  Monthly CV Limit controls how many CVs a reseller can generate per month on their platform.
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Legacy White-Label Pricing Tab */}
        <TabsContent value="whitelabel">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                Legacy White-Label Partner Pricing
              </CardTitle>
              <CardDescription>
                Legacy pricing structure (for existing resellers not on new plans)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="monthly_sub">Monthly Subscription Fee (ZAR)</Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R</span>
                    <Input
                      id="monthly_sub"
                      type="number"
                      min="0"
                      value={whitelabelPricing.monthly_subscription}
                      onChange={(e) => setWhitelabelPricing({ 
                        ...whitelabelPricing, 
                        monthly_subscription: parseInt(e.target.value) || 0 
                      })}
                      className="pl-8"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="setup_fee">One-Time Setup Fee (ZAR)</Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R</span>
                    <Input
                      id="setup_fee"
                      type="number"
                      min="0"
                      value={whitelabelPricing.setup_fee}
                      onChange={(e) => setWhitelabelPricing({ 
                        ...whitelabelPricing, 
                        setup_fee: parseInt(e.target.value) || 0 
                      })}
                      className="pl-8"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="transaction_fee">Per-Transaction Fee (%)</Label>
                  <Input
                    id="transaction_fee"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={whitelabelPricing.per_transaction_fee}
                    onChange={(e) => setWhitelabelPricing({ 
                      ...whitelabelPricing, 
                      per_transaction_fee: parseFloat(e.target.value) || 0 
                    })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="min_commitment">Minimum Commitment (Months)</Label>
                  <Input
                    id="min_commitment"
                    type="number"
                    min="1"
                    max="24"
                    value={whitelabelPricing.minimum_commitment_months}
                    onChange={(e) => setWhitelabelPricing({ 
                      ...whitelabelPricing, 
                      minimum_commitment_months: parseInt(e.target.value) || 1 
                    })}
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Default Tier Pricing Tab */}
        <TabsContent value="tiers">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Package className="h-5 w-5 text-purple-600" />
                </div>
                Default Customer Tier Pricing
              </CardTitle>
              <CardDescription>
                Default prices for customer tiers. Resellers can customise their own pricing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <DollarSign className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">ATS Optimise</h3>
                      <p className="text-xs text-gray-500">Entry-level tier</p>
                    </div>
                  </div>
                  <Label>Default Price (ZAR)</Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R</span>
                    <Input
                      type="number"
                      min="0"
                      value={defaultTierPricing.tier_1_price}
                      onChange={(e) => setDefaultTierPricing({ 
                        ...defaultTierPricing, 
                        tier_1_price: parseInt(e.target.value) || 0 
                      })}
                      className="pl-8"
                    />
                  </div>
                </div>

                <div className="border rounded-lg p-4 border-purple-200 bg-purple-50">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <DollarSign className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Professional</h3>
                      <p className="text-xs text-gray-500">Most popular</p>
                    </div>
                  </div>
                  <Label>Default Price (ZAR)</Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R</span>
                    <Input
                      type="number"
                      min="0"
                      value={defaultTierPricing.tier_2_price}
                      onChange={(e) => setDefaultTierPricing({ 
                        ...defaultTierPricing, 
                        tier_2_price: parseInt(e.target.value) || 0 
                      })}
                      className="pl-8"
                    />
                  </div>
                </div>

                <div className="border rounded-lg p-4 border-amber-200 bg-amber-50">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <DollarSign className="h-4 w-4 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Executive Elite</h3>
                      <p className="text-xs text-gray-500">Premium tier</p>
                    </div>
                  </div>
                  <Label>Default Price (ZAR)</Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R</span>
                    <Input
                      type="number"
                      min="0"
                      value={defaultTierPricing.tier_3_price}
                      onChange={(e) => setDefaultTierPricing({ 
                        ...defaultTierPricing, 
                        tier_3_price: parseInt(e.target.value) || 0 
                      })}
                      className="pl-8"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Strategy Call Pricing Tab */}
        <TabsContent value="strategy">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Calendar className="h-5 w-5 text-green-600" />
                </div>
                Strategy Call Pricing
              </CardTitle>
              <CardDescription>
                Configure pricing for career strategy call bookings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>Strategy Call Price (ZAR)</Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R</span>
                    <Input
                      type="number"
                      min="0"
                      value={strategyCallPricing.price}
                      onChange={(e) => setStrategyCallPricing({ 
                        ...strategyCallPricing, 
                        price: parseInt(e.target.value) || 0 
                      })}
                      className="pl-8"
                    />
                  </div>
                </div>

                <div>
                  <Label>Call Duration (Minutes)</Label>
                  <Input
                    type="number"
                    min="15"
                    max="120"
                    step="15"
                    value={strategyCallPricing.duration_minutes}
                    onChange={(e) => setStrategyCallPricing({ 
                      ...strategyCallPricing, 
                      duration_minutes: parseInt(e.target.value) || 30 
                    })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label className="text-base">Include Free with Executive Elite</Label>
                    <p className="text-sm text-gray-500">Elite customers get one free strategy call</p>
                  </div>
                  <Switch
                    checked={strategyCallPricing.included_in_tier_3}
                    onCheckedChange={(checked) => setStrategyCallPricing({ 
                      ...strategyCallPricing, 
                      included_in_tier_3: checked 
                    })}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label className="text-base">Enable Strategy Call Bookings</Label>
                    <p className="text-sm text-gray-500">Allow customers to book strategy calls</p>
                  </div>
                  <Switch
                    checked={strategyCallPricing.enabled}
                    onCheckedChange={(checked) => setStrategyCallPricing({ 
                      ...strategyCallPricing, 
                      enabled: checked 
                    })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end mt-6">
        <Button onClick={handleSave} disabled={saving} size="lg">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save All Pricing'}
        </Button>
      </div>
    </div>
  );
};

export default AdminPricing;
