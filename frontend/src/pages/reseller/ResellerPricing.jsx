import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { DollarSign, Save, Calendar, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';

const ResellerPricing = () => {
  const { token } = useAuth();
  const { theme } = useTheme();
  const [pricing, setPricing] = useState({
    tier_1_price: 89900,
    tier_2_price: 150000,
    tier_3_price: 300000,
    currency: 'ZAR'
  });
  const [strategyCallPricing, setStrategyCallPricing] = useState({
    price: 69900,
    duration_minutes: 30,
    included_in_tier_3: true,
    enabled: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchPricing();
  }, []);

  const fetchPricing = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/reseller/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.pricing) {
          setPricing(data.pricing);
        }
        if (data.strategy_call_pricing) {
          setStrategyCallPricing(data.strategy_call_pricing);
        }
      }
    } catch (error) {
      console.error('Error fetching pricing:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/reseller/pricing`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...pricing,
          strategy_call_pricing: strategyCallPricing
        })
      });
      if (response.ok) {
        setMessage('Pricing updated successfully!');
      } else {
        setMessage('Failed to update pricing');
      }
    } catch (error) {
      setMessage('Error updating pricing');
    } finally {
      setSaving(false);
    }
  };

  const formatCents = (cents) => (cents / 100).toFixed(2);
  const parseCents = (value) => Math.round(parseFloat(value || 0) * 100);

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
        <h1 className="text-2xl font-bold text-gray-900">Pricing Configuration</h1>
        <p className="text-gray-600">Set your own prices for each tier</p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.includes('success') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Tier 1 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
              ATS Optimize
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">Entry-level package for ATS-optimized resumes</p>
            <div>
              <label className="block text-sm font-medium mb-1">Price (ZAR)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formatCents(pricing.tier_1_price)}
                  onChange={(e) => setPricing({ ...pricing, tier_1_price: parseCents(e.target.value) })}
                  className="pl-8"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tier 2 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-purple-600" />
              </div>
              Professional Package
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">Complete resume and cover letter solution</p>
            <div>
              <label className="block text-sm font-medium mb-1">Price (ZAR)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formatCents(pricing.tier_2_price)}
                  onChange={(e) => setPricing({ ...pricing, tier_2_price: parseCents(e.target.value) })}
                  className="pl-8"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tier 3 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 bg-amber-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-amber-600" />
              </div>
              Executive Elite
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">Premium career transformation package</p>
            <div>
              <label className="block text-sm font-medium mb-1">Price (ZAR)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formatCents(pricing.tier_3_price)}
                  onChange={(e) => setPricing({ ...pricing, tier_3_price: parseCents(e.target.value) })}
                  className="pl-8"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Strategy Call Pricing */}
      <Card className="mb-8">
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
              <p className="text-xs text-gray-500 mt-1">Price for customers who book a strategy call</p>
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
              <p className="text-xs text-gray-500 mt-1">Duration of each call session</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label className="text-base">Include Free with Executive Elite</Label>
                <p className="text-sm text-gray-500">Executive Elite customers get one free strategy call</p>
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
                <p className="text-sm text-gray-500">Allow customers to book strategy calls on your site</p>
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
              <Info className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-800">Strategy Call Summary</p>
                <p className="text-sm text-green-700 mt-1">
                  {strategyCallPricing.enabled 
                    ? `R${formatCents(strategyCallPricing.price)} per ${strategyCallPricing.duration_minutes}-minute session${strategyCallPricing.included_in_tier_3 ? ' (free for Executive Elite)' : ''}`
                    : 'Strategy call bookings are currently disabled'
                  }
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Pricing'}
        </Button>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Pricing Guidelines</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>• You keep 100% of customer payments</li>
            <li>• Platform fee: R2,500/month (invoiced monthly)</li>
            <li>• Suggested pricing is based on market research</li>
            <li>• Consider your target market when setting prices</li>
            <li>• Prices are shown to customers on your branded site</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResellerPricing;
