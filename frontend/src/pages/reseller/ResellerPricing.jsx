import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { 
  DollarSign, Save, Calendar, Info, Package, Zap, Crown, Rocket,
  CheckCircle, Settings
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Switch } from '../../components/ui/switch';
import { Textarea } from '../../components/ui/textarea';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const ResellerPricing = () => {
  const { token } = useAuth();
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('tiers');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Tier configuration with names, descriptions, prices and features
  const [tierConfig, setTierConfig] = useState({
    tier_1: {
      name: 'ATS Optimise',
      description: 'Entry-level package for ATS-optimised CVs',
      price: 49900, // in cents
      features: [
        'ATS-Optimised CV',
        'Keyword Optimization',
        'Format Compatibility Check',
        'Download as PDF'
      ],
      enabled: true
    },
    tier_2: {
      name: 'Professional Package',
      description: 'Complete resume and cover letter solution',
      price: 89900,
      features: [
        'Everything in ATS Optimise',
        'Professional Cover Letter',
        'LinkedIn Profile Review',
        'Multiple CV Versions',
        '30-Day Support'
      ],
      enabled: true
    },
    tier_3: {
      name: 'Executive Elite',
      description: 'Premium career transformation package',
      price: 299900,
      features: [
        'Everything in Professional',
        '1-on-1 Strategy Call',
        'Executive CV Writing',
        'Interview Preparation',
        'Priority Support',
        '90-Day Career Support'
      ],
      enabled: true
    }
  });

  // Strategy Call pricing
  const [strategyCallPricing, setStrategyCallPricing] = useState({
    price: 69900,
    duration_minutes: 30,
    included_in_tier_3: true,
    enabled: true
  });

  useEffect(() => {
    fetchPricing();
  }, []);

  const fetchPricing = async () => {
    try {
      const response = await fetch(`${API_URL}/api/reseller/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        
        // Load tier configuration
        if (data.tier_config) {
          setTierConfig(prev => ({
            ...prev,
            ...data.tier_config
          }));
        } else if (data.pricing) {
          // Fallback to old pricing structure
          setTierConfig(prev => ({
            tier_1: { ...prev.tier_1, price: data.pricing.tier_1_price || prev.tier_1.price },
            tier_2: { ...prev.tier_2, price: data.pricing.tier_2_price || prev.tier_2.price },
            tier_3: { ...prev.tier_3, price: data.pricing.tier_3_price || prev.tier_3.price }
          }));
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
    setMessage({ type: '', text: '' });
    try {
      const response = await fetch(`${API_URL}/api/reseller/pricing`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          tier_1_price: tierConfig.tier_1.price,
          tier_2_price: tierConfig.tier_2.price,
          tier_3_price: tierConfig.tier_3.price,
          tier_config: tierConfig,
          strategy_call_pricing: strategyCallPricing,
          currency: 'ZAR'
        })
      });
      if (response.ok) {
        setMessage({ type: 'success', text: 'Pricing updated successfully!' });
      } else {
        setMessage({ type: 'error', text: 'Failed to update pricing' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error updating pricing' });
    } finally {
      setSaving(false);
    }
  };

  // Format price from cents to rands for display
  const formatPrice = (cents) => {
    if (cents === null || cents === undefined || isNaN(cents)) return '';
    return (Number(cents) / 100).toFixed(2);
  };
  
  // Parse rands input to cents for storage
  const parsePrice = (value) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return 0;
    return Math.round(numValue * 100);
  };

  const updateTier = (tierKey, field, value) => {
    setTierConfig(prev => ({
      ...prev,
      [tierKey]: {
        ...prev[tierKey],
        [field]: value
      }
    }));
  };

  const updateTierFeature = (tierKey, index, value) => {
    setTierConfig(prev => ({
      ...prev,
      [tierKey]: {
        ...prev[tierKey],
        features: prev[tierKey].features.map((f, i) => i === index ? value : f)
      }
    }));
  };

  const addTierFeature = (tierKey) => {
    setTierConfig(prev => ({
      ...prev,
      [tierKey]: {
        ...prev[tierKey],
        features: [...prev[tierKey].features, '']
      }
    }));
  };

  const removeTierFeature = (tierKey, index) => {
    setTierConfig(prev => ({
      ...prev,
      [tierKey]: {
        ...prev[tierKey],
        features: prev[tierKey].features.filter((_, i) => i !== index)
      }
    }));
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
        <h1 className="text-2xl font-bold text-gray-900">Pricing Configuration</h1>
        <p className="text-gray-600">Configure your product pricing, features and strategy call rates</p>
      </div>

      {message.text && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-grid">
          <TabsTrigger value="tiers" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Product Tiers
          </TabsTrigger>
          <TabsTrigger value="strategy" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Strategy Calls
          </TabsTrigger>
        </TabsList>

        {/* Product Tiers Tab */}
        <TabsContent value="tiers">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tier 1 - ATS Optimise */}
            <Card className="border-2 border-blue-200">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Zap className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Tier 1</CardTitle>
                      <CardDescription>Entry-level package</CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={tierConfig.tier_1.enabled}
                    onCheckedChange={(checked) => updateTier('tier_1', 'enabled', checked)}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Package Name</Label>
                  <Input
                    value={tierConfig.tier_1.name}
                    onChange={(e) => updateTier('tier_1', 'name', e.target.value)}
                    placeholder="ATS Optimise"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={tierConfig.tier_1.description}
                    onChange={(e) => updateTier('tier_1', 'description', e.target.value)}
                    placeholder="Entry-level package for ATS-optimised CVs"
                    rows={2}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Price (Rands)</Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">R</span>
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      placeholder="e.g. 499"
                      value={formatPrice(tierConfig.tier_1.price)}
                      onChange={(e) => updateTier('tier_1', 'price', parsePrice(e.target.value))}
                      className="pl-8"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Enter the price in Rands (e.g., 499 for R499.00)</p>
                </div>
                <div>
                  <Label className="flex items-center justify-between">
                    Features
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => addTierFeature('tier_1')}
                      className="h-6 text-xs"
                    >
                      + Add
                    </Button>
                  </Label>
                  <div className="space-y-2 mt-2">
                    {tierConfig.tier_1.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-blue-500 flex-shrink-0" />
                        <Input
                          value={feature}
                          onChange={(e) => updateTierFeature('tier_1', idx, e.target.value)}
                          placeholder="Feature"
                          className="text-sm h-8"
                        />
                        {tierConfig.tier_1.features.length > 1 && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => removeTierFeature('tier_1', idx)}
                            className="h-6 w-6 p-0 text-red-500"
                          >
                            ×
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tier 2 - Professional */}
            <Card className="border-2 border-purple-200">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Rocket className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Tier 2</CardTitle>
                      <CardDescription>Professional package</CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={tierConfig.tier_2.enabled}
                    onCheckedChange={(checked) => updateTier('tier_2', 'enabled', checked)}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Package Name</Label>
                  <Input
                    value={tierConfig.tier_2.name}
                    onChange={(e) => updateTier('tier_2', 'name', e.target.value)}
                    placeholder="Professional Package"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={tierConfig.tier_2.description}
                    onChange={(e) => updateTier('tier_2', 'description', e.target.value)}
                    placeholder="Complete resume and cover letter solution"
                    rows={2}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Price (ZAR)</Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formatCents(tierConfig.tier_2.price)}
                      onChange={(e) => updateTier('tier_2', 'price', parseCents(e.target.value))}
                      className="pl-8"
                    />
                  </div>
                </div>
                <div>
                  <Label className="flex items-center justify-between">
                    Features
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => addTierFeature('tier_2')}
                      className="h-6 text-xs"
                    >
                      + Add
                    </Button>
                  </Label>
                  <div className="space-y-2 mt-2">
                    {tierConfig.tier_2.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-purple-500 flex-shrink-0" />
                        <Input
                          value={feature}
                          onChange={(e) => updateTierFeature('tier_2', idx, e.target.value)}
                          placeholder="Feature"
                          className="text-sm h-8"
                        />
                        {tierConfig.tier_2.features.length > 1 && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => removeTierFeature('tier_2', idx)}
                            className="h-6 w-6 p-0 text-red-500"
                          >
                            ×
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tier 3 - Executive Elite */}
            <Card className="border-2 border-amber-200">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <Crown className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Tier 3</CardTitle>
                      <CardDescription>Premium package</CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={tierConfig.tier_3.enabled}
                    onCheckedChange={(checked) => updateTier('tier_3', 'enabled', checked)}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Package Name</Label>
                  <Input
                    value={tierConfig.tier_3.name}
                    onChange={(e) => updateTier('tier_3', 'name', e.target.value)}
                    placeholder="Executive Elite"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={tierConfig.tier_3.description}
                    onChange={(e) => updateTier('tier_3', 'description', e.target.value)}
                    placeholder="Premium career transformation package"
                    rows={2}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Price (ZAR)</Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formatCents(tierConfig.tier_3.price)}
                      onChange={(e) => updateTier('tier_3', 'price', parseCents(e.target.value))}
                      className="pl-8"
                    />
                  </div>
                </div>
                <div>
                  <Label className="flex items-center justify-between">
                    Features
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => addTierFeature('tier_3')}
                      className="h-6 text-xs"
                    >
                      + Add
                    </Button>
                  </Label>
                  <div className="space-y-2 mt-2">
                    {tierConfig.tier_3.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                        <Input
                          value={feature}
                          onChange={(e) => updateTierFeature('tier_3', idx, e.target.value)}
                          placeholder="Feature"
                          className="text-sm h-8"
                        />
                        {tierConfig.tier_3.features.length > 1 && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => removeTierFeature('tier_3', idx)}
                            className="h-6 w-6 p-0 text-red-500"
                          >
                            ×
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800">Pricing Preview</p>
                <p className="text-sm text-blue-700 mt-1">
                  Your customers will see: <strong>{tierConfig.tier_1.name}</strong> at R{formatCents(tierConfig.tier_1.price)}, 
                  <strong> {tierConfig.tier_2.name}</strong> at R{formatCents(tierConfig.tier_2.price)}, and 
                  <strong> {tierConfig.tier_3.name}</strong> at R{formatCents(tierConfig.tier_3.price)}
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Strategy Calls Tab */}
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
                    <Label className="text-base">Include Free with {tierConfig.tier_3.name}</Label>
                    <p className="text-sm text-gray-500">{tierConfig.tier_3.name} customers get one free strategy call</p>
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
                    <p className="text-sm text-gray-500">Allow customers to book strategy calls on your site</p>
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

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-800">Strategy Call Summary</p>
                    <p className="text-sm text-green-700 mt-1">
                      {strategyCallPricing.enabled 
                        ? `R${formatCents(strategyCallPricing.price)} per ${strategyCallPricing.duration_minutes}-minute session${strategyCallPricing.included_in_tier_3 ? ` (free for ${tierConfig.tier_3.name})` : ''}`
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
        <Button onClick={handleSave} disabled={saving} style={{ backgroundColor: theme.primaryColor }}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save All Changes'}
        </Button>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Pricing Guidelines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              You keep 100% of customer payments
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              Customise package names and descriptions to match your brand
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              Add or remove features to differentiate your packages
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              Prices are shown to customers on your branded site
            </li>
            <li className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-500 mt-0.5" />
              Consider your target market when setting prices
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResellerPricing;
