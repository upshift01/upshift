import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Zap, Loader2, Briefcase, User, Building2 } from 'lucide-react';

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phone: '',
    accountType: 'customer', // 'customer' or 'recruiter'
    companyName: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    // Pass reseller_id from white-label config if available
    const result = await register(
      formData.email,
      formData.password,
      formData.fullName,
      formData.phone,
      theme.resellerId || null,
      formData.accountType,
      formData.companyName
    );

    if (result.success) {
      // Check if there's a post-auth redirect stored (from free tools)
      const postAuthRedirect = sessionStorage.getItem('postAuthRedirect');
      sessionStorage.removeItem('postAuthRedirect');
      
      if (postAuthRedirect) {
        navigate(postAuthRedirect, { replace: true });
      } else if (formData.accountType === 'recruiter') {
        // Recruiters go to talent pool to subscribe
        navigate('/talent-pool');
      } else {
        // Job seekers go to their dashboard
        navigate('/dashboard');
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
          <Link to="/" className="flex justify-center mb-4">
            {theme.logoUrl ? (
              <img src={theme.logoUrl} alt={theme.brandName} className="h-12" />
            ) : (
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ background: `linear-gradient(to bottom right, ${theme.primaryColor}, ${theme.secondaryColor})` }}
              >
                <Zap className="h-6 w-6 text-white" />
              </div>
            )}
          </Link>
          <CardTitle className="text-2xl">Create Your Account</CardTitle>
          <CardDescription>
            Join {theme.brandName} and transform your career
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Account Type Selection */}
            <div className="space-y-2">
              <Label>I am a...</Label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, accountType: 'customer', companyName: '' })}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    formData.accountType === 'customer'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  data-testid="account-type-customer"
                >
                  <User className={`h-5 w-5 mb-2 ${formData.accountType === 'customer' ? 'text-blue-600' : 'text-gray-400'}`} />
                  <div className={`font-medium text-sm ${formData.accountType === 'customer' ? 'text-blue-900' : 'text-gray-700'}`}>
                    Job Seeker
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Find work
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, accountType: 'employer' })}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    formData.accountType === 'employer'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  data-testid="account-type-employer"
                >
                  <Briefcase className={`h-5 w-5 mb-2 ${formData.accountType === 'employer' ? 'text-green-600' : 'text-gray-400'}`} />
                  <div className={`font-medium text-sm ${formData.accountType === 'employer' ? 'text-green-900' : 'text-gray-700'}`}>
                    Employer
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Post jobs
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, accountType: 'recruiter' })}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    formData.accountType === 'recruiter'
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  data-testid="account-type-recruiter"
                >
                  <Building2 className={`h-5 w-5 mb-2 ${formData.accountType === 'recruiter' ? 'text-purple-600' : 'text-gray-400'}`} />
                  <div className={`font-medium text-sm ${formData.accountType === 'recruiter' ? 'text-purple-900' : 'text-gray-700'}`}>
                    Recruiter
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Talent pool
                  </div>
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="John Doe"
                required
              />
            </div>

            {/* Company Name - only for recruiters */}
            {formData.accountType === 'recruiter' && (
              <div>
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  placeholder="Acme Corporation"
                  required
                  data-testid="company-name-input"
                />
              </div>
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
              <Label htmlFor="phone">Phone Number (Optional)</Label>
              <Input
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+27 XX XXX XXXX"
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
                minLength={6}
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-gray-600">Already have an account? </span>
            <Link to="/login" className="text-blue-600 hover:underline font-medium">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;