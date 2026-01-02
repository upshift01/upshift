import React, { useState, useEffect } from 'react';
import { 
  ExternalLink, 
  Copy, 
  CheckCircle2, 
  User, 
  Lock, 
  AlertCircle,
  Loader2,
  X 
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';

const DemoCredentialsModal = ({ isOpen, onClose }) => {
  const [demoData, setDemoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedField, setCopiedField] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchDemoCredentials();
    }
  }, [isOpen]);

  const fetchDemoCredentials = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/white-label/demo/credentials`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setDemoData(data.demo);
        } else {
          setError('Failed to load demo credentials');
        }
      } else {
        setError('Demo service temporarily unavailable');
      }
    } catch (err) {
      console.error('Error fetching demo credentials:', err);
      setError('Unable to connect to demo service');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleLaunchDemo = () => {
    if (demoData?.login_url) {
      window.open(demoData.login_url, '_blank');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-teal-600 to-orange-500 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">TH</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">TalentHub Demo</h2>
                <p className="text-white/80 text-sm">White-Label Reseller Dashboard</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-teal-600 mb-3" />
              <p className="text-gray-500">Loading demo credentials...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8">
              <AlertCircle className="h-12 w-12 text-red-500 mb-3" />
              <p className="text-gray-700 font-medium mb-2">Oops!</p>
              <p className="text-gray-500 text-center">{error}</p>
              <Button onClick={fetchDemoCredentials} variant="outline" className="mt-4">
                Try Again
              </Button>
            </div>
          ) : demoData ? (
            <>
              <p className="text-gray-600 mb-6">
                {demoData.description}
              </p>
              
              {/* Credentials Card */}
              <Card className="border-2 border-teal-100 bg-teal-50/50 mb-6">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Lock className="h-4 w-4 text-teal-600" />
                    Login Credentials
                  </h3>
                  
                  {/* Email field */}
                  <div className="mb-3">
                    <label className="text-xs text-gray-500 uppercase tracking-wide">Email</label>
                    <div className="flex items-center justify-between bg-white rounded-lg border px-3 py-2 mt-1">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="font-mono text-sm">{demoData.email}</span>
                      </div>
                      <button 
                        onClick={() => copyToClipboard(demoData.email, 'email')}
                        className="text-gray-400 hover:text-teal-600 transition-colors"
                      >
                        {copiedField === 'email' ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  
                  {/* Password field */}
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wide">Password</label>
                    <div className="flex items-center justify-between bg-white rounded-lg border px-3 py-2 mt-1">
                      <div className="flex items-center gap-2">
                        <Lock className="h-4 w-4 text-gray-400" />
                        <span className="font-mono text-sm">{demoData.password}</span>
                      </div>
                      <button 
                        onClick={() => copyToClipboard(demoData.password, 'password')}
                        className="text-gray-400 hover:text-teal-600 transition-colors"
                      >
                        {copiedField === 'password' ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Notice */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
                <p className="text-amber-800 text-sm flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{demoData.note}</span>
                </p>
              </div>
              
              {/* Launch button */}
              <Button 
                onClick={handleLaunchDemo}
                className="w-full bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 py-6 text-lg"
              >
                Launch Demo Dashboard
                <ExternalLink className="ml-2 h-5 w-5" />
              </Button>
              
              <p className="text-center text-xs text-gray-400 mt-4">
                Opens in a new tab • Use credentials above to log in
              </p>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default DemoCredentialsModal;
