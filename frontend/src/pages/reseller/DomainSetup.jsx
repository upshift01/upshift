import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Globe, CheckCircle, Circle, Copy, ExternalLink, RefreshCw, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';

const DomainSetup = () => {
  const { token } = useAuth();
  const { theme } = useTheme();
  const { darkMode } = useOutletContext() || {};
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [customDomain, setCustomDomain] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [domainStatus, setDomainStatus] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/reseller/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setCustomDomain(data.custom_domain || '');
        if (data.custom_domain) {
          checkDomainStatus(data.custom_domain);
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkDomainStatus = async (domain) => {
    setVerifying(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/reseller/verify-domain?domain=${encodeURIComponent(domain)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setDomainStatus(data);
      }
    } catch (error) {
      console.error('Error checking domain:', error);
    } finally {
      setVerifying(false);
    }
  };

  const handleSaveDomain = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/reseller/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ custom_domain: customDomain })
      });
      if (response.ok) {
        alert('Domain saved successfully!');
        if (customDomain) {
          checkDomainStatus(customDomain);
        }
      } else {
        alert('Failed to save domain');
      }
    } catch (error) {
      console.error('Error saving domain:', error);
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const cardBg = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white';
  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-gray-400' : 'text-gray-600';

  const steps = [
    {
      number: 1,
      title: 'Choose Your Domain',
      description: 'Enter the custom domain you want to use (e.g., careers.yourcompany.com)',
      done: !!customDomain
    },
    {
      number: 2,
      title: 'Configure DNS Records',
      description: 'Add a CNAME record pointing to reseller.upshift.works',
      done: domainStatus?.dns_configured
    },
    {
      number: 3,
      title: 'Verify Domain',
      description: 'We\'ll verify your DNS configuration automatically',
      done: domainStatus?.verified
    },
    {
      number: 4,
      title: 'SSL Certificate',
      description: 'SSL will be provisioned automatically after verification',
      done: domainStatus?.ssl_active
    }
  ];

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className={`text-2xl font-bold ${textPrimary}`}>Domain Setup</h1>
        <p className={textSecondary}>Configure your custom domain to brand your reseller portal</p>
      </div>

      {/* Current Domains */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className={cardBg}>
          <CardHeader>
            <CardTitle className={`text-lg ${textPrimary}`}>Default Subdomain</CardTitle>
            <CardDescription className={textSecondary}>Your free UpShift subdomain</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`flex items-center justify-between p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-green-500" />
                <span className={`font-mono ${textPrimary}`}>{profile?.subdomain}.upshift.works</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-green-500">Active</Badge>
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(`${profile?.subdomain}.upshift.works`)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cardBg}>
          <CardHeader>
            <CardTitle className={`text-lg ${textPrimary}`}>Custom Domain</CardTitle>
            <CardDescription className={textSecondary}>Your branded domain</CardDescription>
          </CardHeader>
          <CardContent>
            {customDomain && domainStatus?.verified ? (
              <div className={`flex items-center justify-between p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-green-500" />
                  <span className={`font-mono ${textPrimary}`}>{customDomain}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-500">Verified</Badge>
                  <a href={`https://${customDomain}`} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="sm"><ExternalLink className="h-4 w-4" /></Button>
                  </a>
                </div>
              </div>
            ) : (
              <p className={textSecondary}>No custom domain configured yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Setup Wizard */}
      <Card className={cardBg}>
        <CardHeader>
          <CardTitle className={textPrimary}>Domain Setup Wizard</CardTitle>
          <CardDescription className={textSecondary}>Follow these steps to configure your custom domain</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Progress Steps */}
          <div className="flex items-center justify-between mb-8 overflow-x-auto pb-2">
            {steps.map((step, index) => (
              <React.Fragment key={step.number}>
                <div className="flex flex-col items-center min-w-[100px]">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                    step.done 
                      ? 'bg-green-500 text-white' 
                      : index === steps.findIndex(s => !s.done)
                        ? `text-white`
                        : darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500'
                  }`} style={index === steps.findIndex(s => !s.done) ? { backgroundColor: theme.primaryColor } : {}}>
                    {step.done ? <CheckCircle className="h-5 w-5" /> : step.number}
                  </div>
                  <span className={`text-xs text-center ${step.done ? 'text-green-500' : textSecondary}`}>{step.title}</span>
                </div>
                {index < steps.length - 1 && (
                  <ArrowRight className={`h-5 w-5 mx-2 flex-shrink-0 ${step.done ? 'text-green-500' : textSecondary}`} />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Step 1: Enter Domain */}
          <div className={`p-4 rounded-xl mb-4 ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
            <h3 className={`font-semibold mb-2 ${textPrimary}`}>Step 1: Enter Your Custom Domain</h3>
            <div className="flex flex-col md:flex-row gap-3">
              <Input
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                placeholder="careers.yourcompany.com"
                className={`flex-1 ${darkMode ? 'bg-gray-700 border-gray-600' : ''}`}
              />
              <Button onClick={handleSaveDomain} disabled={saving} style={{ backgroundColor: theme.primaryColor }} className="text-white">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Domain'}
              </Button>
            </div>
            <p className={`text-xs ${textSecondary} mt-2`}>Use a subdomain like careers.yourcompany.com or cv.yourcompany.com</p>
          </div>

          {/* Step 2: DNS Configuration */}
          {customDomain && (
            <div className={`p-4 rounded-xl mb-4 ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
              <h3 className={`font-semibold mb-2 ${textPrimary}`}>Step 2: Configure DNS Records</h3>
              <p className={`text-sm ${textSecondary} mb-3`}>Add the following CNAME record in your domain's DNS settings:</p>
              
              <div className={`p-3 rounded-lg font-mono text-sm ${darkMode ? 'bg-gray-800' : 'bg-white border'}`}>
                <div className="grid grid-cols-3 gap-4 mb-2 text-xs font-bold">
                  <span className={textSecondary}>Type</span>
                  <span className={textSecondary}>Name/Host</span>
                  <span className={textSecondary}>Value/Points to</span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <span className={textPrimary}>CNAME</span>
                  <span className={textPrimary}>{customDomain.split('.')[0]}</span>
                  <div className="flex items-center gap-2">
                    <span className={textPrimary}>reseller.upshift.works</span>
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard('reseller.upshift.works')}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">DNS changes can take 24-48 hours to propagate globally.</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Verify */}
          {customDomain && (
            <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
              <h3 className={`font-semibold mb-2 ${textPrimary}`}>Step 3: Verify Domain Configuration</h3>
              <div className="flex items-center gap-3">
                <Button onClick={() => checkDomainStatus(customDomain)} disabled={verifying} variant="outline">
                  {verifying ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Verifying...</> : <><RefreshCw className="h-4 w-4 mr-2" />Check DNS</>}
                </Button>
                {domainStatus && (
                  <div className="flex items-center gap-2">
                    {domainStatus.dns_configured ? (
                      <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />DNS Configured</Badge>
                    ) : (
                      <Badge variant="secondary"><Circle className="h-3 w-3 mr-1" />Pending</Badge>
                    )}
                    {domainStatus.ssl_active && (
                      <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />SSL Active</Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DomainSetup;
