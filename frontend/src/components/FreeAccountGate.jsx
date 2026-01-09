import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { UserPlus, LogIn, Sparkles, Shield, Zap } from 'lucide-react';

/**
 * FreeAccountGate - A soft gate modal that prompts users to create a free account
 * before using free tools like ATS Checker and Skills Generator
 */
const FreeAccountGate = ({ 
  isOpen, 
  onClose, 
  toolName = 'this tool',
  redirectPath = '/ats-checker',
  isPartner = false,
  baseUrl = '',
  primaryColor = '#2563eb'
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleLogin = () => {
    // Store the redirect path so user returns after login
    sessionStorage.setItem('postAuthRedirect', redirectPath);
    navigate(isPartner ? `${baseUrl}/login` : '/login');
  };

  const handleRegister = () => {
    // Store the redirect path so user returns after registration
    sessionStorage.setItem('postAuthRedirect', redirectPath);
    navigate(isPartner ? `${baseUrl}/register` : '/register');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md animate-in fade-in zoom-in duration-200">
        <CardContent className="p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: `${primaryColor}15` }}
            >
              <UserPlus className="h-8 w-8" style={{ color: primaryColor }} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Create Your Free Account
            </h2>
            <p className="text-gray-600">
              Sign up to use {toolName} - it's completely free!
            </p>
          </div>

          {/* Benefits */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-4 w-4 text-green-600" />
              </div>
              <span>Free to create an account - no credit card required</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Zap className="h-4 w-4 text-blue-600" />
              </div>
              <span>Instant access to free AI-powered tools</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <Shield className="h-4 w-4 text-purple-600" />
              </div>
              <span>Your data is secure and private</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button 
              className="w-full"
              style={{ backgroundColor: primaryColor }}
              onClick={handleRegister}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Create Free Account
            </Button>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleLogin}
            >
              <LogIn className="h-4 w-4 mr-2" />
              I Already Have an Account
            </Button>
          </div>

          {/* Close option */}
          <button 
            onClick={onClose}
            className="w-full text-center text-sm text-gray-500 hover:text-gray-700 mt-4"
          >
            Maybe later
          </button>
        </CardContent>
      </Card>
    </div>
  );
};

export default FreeAccountGate;
