import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Briefcase, ArrowLeft, Sparkles, Loader2, Send, DollarSign,
  Clock, Building2, Wand2, RefreshCcw, CheckCircle, Globe
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const SubmitProposal = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { token, isAuthenticated, user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [improvingAI, setImprovingAI] = useState(false);
  const [job, setJob] = useState(null);
  const [profile, setProfile] = useState(null);

  const [formData, setFormData] = useState({
    cover_letter: '',
    proposed_rate: '',
    rate_type: 'monthly',
    currency: 'USD',
    availability: 'immediate',
    estimated_duration: '',
    portfolio_links: '',
    additional_notes: ''
  });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchData();
  }, [isAuthenticated, jobId]);

  const fetchData = async () => {
    try {
      // Fetch job details
      const jobRes = await fetch(`${API_URL}/api/remote-jobs/jobs/${jobId}`);
      if (!jobRes.ok) throw new Error('Job not found');
      const jobData = await jobRes.json();
      setJob(jobData.job);

      // Fetch user's talent pool profile
      const profileRes = await fetch(`${API_URL}/api/talent-pool/my-profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setProfile(profileData.profile);
      }

      // Set default currency from job
      if (jobData.job?.currency) {
        setFormData(prev => ({ ...prev, currency: jobData.job.currency }));
      }

    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load job details',
        variant: 'destructive'
      });
      navigate('/remote-jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateProposal = async () => {
    if (!job) return;

    setGeneratingAI(true);
    try {
      const response = await fetch(`${API_URL}/api/proposals/ai/generate-proposal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          job_title: job.title,
          job_description: job.description,
          required_skills: job.required_skills || [],
          user_skills: profile?.skills || [],
          user_experience: profile?.experience_level || '',
          user_bio: profile?.bio || profile?.professional_summary || '',
          tone: 'professional'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setFormData(prev => ({ ...prev, cover_letter: data.proposal }));
        toast({
          title: 'Proposal Generated',
          description: 'AI has created a proposal for you. Feel free to personalize it!'
        });
      } else {
        throw new Error('Failed to generate');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate proposal. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleImproveProposal = async () => {
    if (!formData.cover_letter.trim()) {
      toast({
        title: 'Write Something First',
        description: 'Please write or generate a proposal before improving it.',
        variant: 'destructive'
      });
      return;
    }

    setImprovingAI(true);
    try {
      const response = await fetch(`${API_URL}/api/proposals/ai/improve-proposal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          current_proposal: formData.cover_letter,
          job_title: job?.title || '',
          focus: 'persuasive'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setFormData(prev => ({ ...prev, cover_letter: data.improved_proposal }));
        toast({
          title: 'Proposal Improved',
          description: 'Your proposal has been enhanced!'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to improve proposal.',
        variant: 'destructive'
      });
    } finally {
      setImprovingAI(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.cover_letter.trim()) {
      toast({
        title: 'Missing Proposal',
        description: 'Please write a cover letter/proposal.',
        variant: 'destructive'
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        job_id: jobId,
        cover_letter: formData.cover_letter,
        proposed_rate: formData.proposed_rate ? parseFloat(formData.proposed_rate) : null,
        rate_type: formData.rate_type,
        currency: formData.currency,
        availability: formData.availability,
        estimated_duration: formData.estimated_duration || null,
        portfolio_links: formData.portfolio_links
          ? formData.portfolio_links.split('\n').filter(l => l.trim())
          : [],
        additional_notes: formData.additional_notes || null
      };

      const response = await fetch(`${API_URL}/api/proposals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Proposal Submitted!',
          description: 'Your proposal has been sent to the employer.'
        });
        navigate('/remote-jobs/my-proposals');
      } else {
        throw new Error(data.detail || 'Failed to submit proposal');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatBudget = () => {
    if (!job?.budget_min && !job?.budget_max) return 'Negotiable';
    const symbol = job.currency === 'ZAR' ? 'R' : '$';
    const type = job.budget_type === 'hourly' ? '/hr' : job.budget_type === 'monthly' ? '/mo' : ' (fixed)';

    if (job.budget_min && job.budget_max) {
      return `${symbol}${job.budget_min.toLocaleString()} - ${symbol}${job.budget_max.toLocaleString()}${type}`;
    }
    if (job.budget_min) return `From ${symbol}${job.budget_min.toLocaleString()}${type}`;
    return `Up to ${symbol}${job.budget_max?.toLocaleString() || 0}${type}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <Button
          variant="ghost"
          onClick={() => navigate(`/remote-jobs/${jobId}`)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Job
        </Button>

        {/* Job Summary Card */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                {job?.company_name?.charAt(0)?.toUpperCase() || 'C'}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900">{job?.title}</h2>
                <div className="flex items-center gap-2 text-gray-600">
                  <Building2 className="h-4 w-4" />
                  <span>{job?.company_name}</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge className="bg-green-100 text-green-800 gap-1">
                    <DollarSign className="h-3 w-3" />
                    {formatBudget()}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <Globe className="h-3 w-3" />
                    {job?.remote_type === 'fully-remote' ? 'Fully Remote' : job?.remote_type}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <Clock className="h-3 w-3" />
                    {job?.timeline}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Proposal Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-blue-600" />
              Submit Your Proposal
            </CardTitle>
            <CardDescription>
              Stand out from other applicants with a personalized proposal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Cover Letter */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="cover_letter" className="text-base font-semibold">
                    Cover Letter / Proposal *
                  </Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateProposal}
                      disabled={generatingAI || !profile}
                      data-testid="generate-proposal-btn"
                    >
                      {generatingAI ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <Wand2 className="h-4 w-4 mr-1" />
                      )}
                      Generate with AI
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleImproveProposal}
                      disabled={improvingAI || !formData.cover_letter}
                      data-testid="improve-proposal-btn"
                    >
                      {improvingAI ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <RefreshCcw className="h-4 w-4 mr-1" />
                      )}
                      Improve
                    </Button>
                  </div>
                </div>
                {!profile && (
                  <p className="text-sm text-orange-600">
                    Complete your Talent Pool profile for AI-generated proposals
                  </p>
                )}
                <Textarea
                  id="cover_letter"
                  placeholder="Introduce yourself, explain why you're a great fit for this role, and highlight your relevant experience..."
                  value={formData.cover_letter}
                  onChange={(e) => setFormData({ ...formData, cover_letter: e.target.value })}
                  rows={10}
                  className="resize-none"
                  data-testid="cover-letter-input"
                />
                <p className="text-xs text-gray-500">
                  {formData.cover_letter.length} characters
                </p>
              </div>

              {/* Rate & Availability Row */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="proposed_rate">Proposed Rate (Optional)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="proposed_rate"
                      type="number"
                      placeholder="0"
                      value={formData.proposed_rate}
                      onChange={(e) => setFormData({ ...formData, proposed_rate: e.target.value })}
                      data-testid="proposed-rate-input"
                    />
                    <Select
                      value={formData.currency}
                      onValueChange={(v) => setFormData({ ...formData, currency: v })}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="ZAR">ZAR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Rate Type</Label>
                  <Select
                    value={formData.rate_type}
                    onValueChange={(v) => setFormData({ ...formData, rate_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Per Hour</SelectItem>
                      <SelectItem value="monthly">Per Month</SelectItem>
                      <SelectItem value="fixed">Fixed Price</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Availability</Label>
                  <Select
                    value={formData.availability}
                    onValueChange={(v) => setFormData({ ...formData, availability: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Immediate</SelectItem>
                      <SelectItem value="1-week">Within 1 Week</SelectItem>
                      <SelectItem value="2-weeks">Within 2 Weeks</SelectItem>
                      <SelectItem value="1-month">Within 1 Month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Portfolio Links */}
              <div className="space-y-2">
                <Label htmlFor="portfolio_links">Portfolio / Work Samples (Optional)</Label>
                <Textarea
                  id="portfolio_links"
                  placeholder="Enter links to your portfolio, GitHub, or work samples (one per line)..."
                  value={formData.portfolio_links}
                  onChange={(e) => setFormData({ ...formData, portfolio_links: e.target.value })}
                  rows={3}
                  data-testid="portfolio-links-input"
                />
              </div>

              {/* Additional Notes */}
              <div className="space-y-2">
                <Label htmlFor="additional_notes">Additional Notes (Optional)</Label>
                <Textarea
                  id="additional_notes"
                  placeholder="Any other information you'd like the employer to know..."
                  value={formData.additional_notes}
                  onChange={(e) => setFormData({ ...formData, additional_notes: e.target.value })}
                  rows={3}
                  data-testid="additional-notes-input"
                />
              </div>

              {/* Profile Summary */}
              {profile && (
                <Card className="bg-gray-50 border-dashed">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-sm">Your Profile Will Be Attached</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {profile.skills?.slice(0, 5).map((skill, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{skill}</Badge>
                      ))}
                      {profile.skills?.length > 5 && (
                        <Badge variant="secondary" className="text-xs">
                          +{profile.skills.length - 5} more
                        </Badge>
                      )}
                    </div>
                    {profile.cv_url && (
                      <p className="text-xs text-green-600 mt-2">CV attached</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Submit Button */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/remote-jobs/${jobId}`)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting || !formData.cover_letter.trim()}
                  className="bg-blue-600 hover:bg-blue-700"
                  data-testid="submit-proposal-btn"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Submit Proposal
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SubmitProposal;
