import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  DollarSign, Save, Users, Calendar, Settings, TrendingUp,
  Info, Percent, Package
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';

const AdminPricing = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState('whitelabel');

  // White-label pricing (what resellers pay)
  const [whitelabelPricing, setWhitelabelPricing] = useState({
    monthly_subscription: 250000, // R2,500 in cents
    setup_fee: 0,
    per_transaction_fee: 0, // percentage
    minimum_commitment_months: 1
  });

  // Default tier pricing (suggested prices for resellers)
  const [defaultTierPricing, setDefaultTierPricing] = useState({
    tier_1_price: 89900,
    tier_2_price: 150000,
    tier_3_price: 300000,
    currency: 'ZAR'
  });

  // Strategy Call pricing
  const [strategyCallPricing, setStrategyCallPricing] = useState({
    price: 69900, // R699 in cents
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

  const formatCents = (cents) => (cents / 100).toFixed(2);
  const parseCents = (value) => Math.round(parseFloat(value || 0) * 100);

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
        <p className="text-gray-600">Manage white-label fees, default pricing, and strategy call rates</p>
      </div>

      {message.text && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="whitelabel" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            White-Label Fees
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

        {/* White-Label Pricing Tab */}
        <TabsContent value="whitelabel">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                White-Label Partner Pricing
              </CardTitle>
              <CardDescription>
                Set the fees that resellers/white-label partners pay to use the platform
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
                      step="0.01"
                      min="0"
                      value={formatCents(whitelabelPricing.monthly_subscription)}
                      onChange={(e) => setWhitelabelPricing({ 
                        ...whitelabelPricing, 
                        monthly_subscription: parseCents(e.target.value) 
                      })}
                      className="pl-8"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Monthly fee charged to each reseller</p>
                </div>

                <div>
                  <Label htmlFor="setup_fee">One-Time Setup Fee (ZAR)</Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R</span>
                    <Input
                      id="setup_fee"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formatCents(whitelabelPricing.setup_fee)}
                      onChange={(e) => setWhitelabelPricing({ 
                        ...whitelabelPricing, 
                        setup_fee: parseCents(e.target.value) 
                      })}
                      className="pl-8"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">One-time fee for new reseller onboarding</p>
                </div>

                <div>
                  <Label htmlFor="transaction_fee">Per-Transaction Fee (%)</Label>
                  <div className="relative mt-1">
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
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Optional percentage of each customer transaction</p>
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
                  <p className="text-xs text-gray-500 mt-1">Minimum contract period for resellers</p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">Revenue Model Summary</p>
                    <p className="text-sm text-blue-700 mt-1">
                      Each reseller pays R{formatCents(whitelabelPricing.monthly_subscription)}/month
                      {whitelabelPricing.setup_fee > 0 && ` + R${formatCents(whitelabelPricing.setup_fee)} setup fee`}
                      {whitelabelPricing.per_transaction_fee > 0 && ` + ${whitelabelPricing.per_transaction_fee}% per transaction`}
                    </p>
                  </div>
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
                Default Tier Pricing
              </CardTitle>
              <CardDescription>
                Set default/suggested prices for service tiers. Resellers can customize their own pricing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Tier 1 */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <DollarSign className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">ATS Optimize</h3>
                      <p className="text-xs text-gray-500">Entry-level tier</p>
                    </div>
                  </div>
                  <Label>Default Price (ZAR)</Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formatCents(defaultTierPricing.tier_1_price)}
                      onChange={(e) => setDefaultTierPricing({ 
                        ...defaultTierPricing, 
                        tier_1_price: parseCents(e.target.value) 
                      })}
                      className="pl-8"
                    />
                  </div>
                </div>

                {/* Tier 2 */}
                <div className="border rounded-lg p-4 border-purple-200 bg-purple-50">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <DollarSign className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Professional Package</h3>
                      <p className="text-xs text-gray-500">Most popular tier</p>
                    </div>
                  </div>
                  <Label>Default Price (ZAR)</Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formatCents(defaultTierPricing.tier_2_price)}
                      onChange={(e) => setDefaultTierPricing({ 
                        ...defaultTierPricing, 
                        tier_2_price: parseCents(e.target.value) 
                      })}
                      className="pl-8"
                    />
                  </div>
                </div>

                {/* Tier 3 */}
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
                      step="0.01"
                      min="0"
                      value={formatCents(defaultTierPricing.tier_3_price)}
                      onChange={(e) => setDefaultTierPricing({ 
                        ...defaultTierPricing, 
                        tier_3_price: parseCents(e.target.value) 
                      })}
                      className="pl-8"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 bg-gray-50 border rounded-lg p-4">
                <p className="text-sm text-gray-600">
                  <strong>Note:</strong> These are suggested default prices. Each reseller can set their own pricing
                  in their portal. New resellers will start with these defaults.
                </p>
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
                Configure pricing for the career strategy call service
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="call_price">Strategy Call Price (ZAR)</Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R</span>
                    <Input
                      id="call_price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formatCents(strategyCallPricing.price)}
                      onChange={(e) => setStrategyCallPricing({ 
                        ...strategyCallPricing, 
                        price: parseCents(e.target.value) 
                      })}
                      className="pl-8"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Price for standalone strategy call bookings</p>
                </div>

                <div>
                  <Label htmlFor="call_duration">Call Duration (Minutes)</Label>
                  <Input
                    id="call_duration"
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
                  <p className="text-xs text-gray-500 mt-1">Duration of each strategy call</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label className="text-base">Include Free with Executive Elite (Tier 3)</Label>
                    <p className="text-sm text-gray-500">Elite customers get one free strategy call</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={strategyCallPricing.included_in_tier_3}
                      onChange={(e) => setStrategyCallPricing({ 
                        ...strategyCallPricing, 
                        included_in_tier_3: e.target.checked 
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label className="text-base">Enable Strategy Call Bookings</Label>
                    <p className="text-sm text-gray-500">Allow customers to book strategy calls</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={strategyCallPricing.enabled}
                      onChange={(e) => setStrategyCallPricing({ 
                        ...strategyCallPricing, 
                        enabled: e.target.checked 
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-800">Strategy Call Revenue</p>
                    <p className="text-sm text-green-700 mt-1">
                      {strategyCallPricing.enabled 
                        ? `Each strategy call generates R${formatCents(strategyCallPricing.price)} (${strategyCallPricing.duration_minutes} min session)`
                        : 'Strategy call bookings are currently disabled'
                      }
                    </p>
                  </div>
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
