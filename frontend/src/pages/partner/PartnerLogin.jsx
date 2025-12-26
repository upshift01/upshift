import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePartner } from '../../context/PartnerContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Zap, Loader2 } from 'lucide-react';

const PartnerLogin = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { brandName, primaryColor, secondaryColor, logoUrl, baseUrl, resellerId } = usePartner();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Login the user (reseller_id is stored in their account from registration)
    const result = await login(formData.email, formData.password);

    if (result.success) {
      const userRole = result.user?.role;
      if (userRole === 'super_admin') {
        navigate('/super-admin', { replace: true });
      } else if (userRole === 'reseller_admin') {
        navigate('/reseller-dashboard', { replace: true });
      } else {
        // Customer - redirect to partner dashboard
        navigate(`${baseUrl}/dashboard`, { replace: true });
      }
    } else {
      setError(result.error);
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex items-center justify-center py-12 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link to={baseUrl} className="flex justify-center mb-4">
            {logoUrl ? (
              <img src={logoUrl} alt={brandName} className="h-12 w-auto" />
            ) : (
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
              >
                <Zap className="h-6 w-6 text-white" />
              </div>
            )}
          </Link>
          <CardTitle className="text-2xl">Welcome Back</CardTitle>
          <CardDescription>
            Sign in to your {brandName} account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your@email.com"
                required
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full text-white"
              style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-gray-600">Don't have an account? </span>
            <Link 
              to={`${baseUrl}/register`} 
              className="font-medium hover:underline"
              style={{ color: primaryColor }}
            >
              Sign up
            </Link>
          </div>

          <div className="mt-4 text-center">
            <Link 
              to={`${baseUrl}/forgot-password`} 
              className="text-sm text-gray-600 hover:underline"
            >
              Forgot your password?
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PartnerLogin;
