import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import {
  Briefcase, Sparkles, Loader2, DollarSign, Clock,
  Globe, Building2, Target, ArrowRight, UserPlus,
  Zap, TrendingUp, MapPin, CheckCircle
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const JobRecommendations = () => {
  const navigate = useNavigate();
  const { token, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);
  const [profileSummary, setProfileSummary] = useState(null);
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchRecommendations();
  }, [isAuthenticated, navigate]);

  const fetchRecommendations = async () => {
    try {
      const response = await fetch(`${API_URL}/api/remote-jobs/recommendations?limit=15`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setHasProfile(data.has_profile);
        setProfileSummary(data.profile_summary);
        setJobs(data.jobs);
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load job recommendations',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatBudget = (job) => {
    if (!job.budget_min && !job.budget_max) return 'Negotiable';
    const symbol = job.currency === 'ZAR' ? 'R' : '$';
    const type = job.budget_type === 'hourly' ? '/hr' : job.budget_type === 'monthly' ? '/mo' : '';
    
    if (job.budget_min && job.budget_max) {
      return `${symbol}${job.budget_min.toLocaleString()} - ${symbol}${job.budget_max.toLocaleString()}${type}`;
    }
    if (job.budget_min) return `From ${symbol}${job.budget_min.toLocaleString()}${type}`;
    return `Up to ${symbol}${job.budget_max?.toLocaleString() || 0}${type}`;
  };

  const getMatchColor = (score) => {
    if (score >= 70) return 'text-green-600 bg-green-100';
    if (score >= 50) return 'text-blue-600 bg-blue-100';
    if (score >= 30) return 'text-yellow-600 bg-yellow-100';
    return 'text-gray-600 bg-gray-100';
  };

  const getJobTypeBadge = (type) => {
    switch (type) {
      case 'full-time':
        return <Badge className="bg-blue-100 text-blue-800">Full-time</Badge>;
      case 'contract':
        return <Badge className="bg-purple-100 text-purple-800">Contract</Badge>;
      case 'gig':
        return <Badge className="bg-orange-100 text-orange-800">Gig</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Finding your perfect matches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-purple-600" />
              Job Recommendations
            </h1>
            <p className="text-gray-600">AI-powered job matches based on your profile</p>
          </div>
          <Link to="/remote-jobs">
            <Button variant="outline">
              <Briefcase className="h-4 w-4 mr-2" />
              Browse All Jobs
            </Button>
          </Link>
        </div>

        {/* Profile Status Card */}
        {!hasProfile ? (
          <Card className="mb-6 border-orange-200 bg-orange-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                  <UserPlus className="h-6 w-6 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Complete Your Profile</h3>
                  <p className="text-sm text-gray-600">
                    Create a Talent Pool profile to get personalized job recommendations based on your skills and experience.
                  </p>
                </div>
                <Button onClick={() => navigate('/dashboard/talent-pool')}>
                  Create Profile
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-6 border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <Target className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Matching Based On:</h3>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {profileSummary?.skills?.slice(0, 3).map((skill, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{skill}</Badge>
                      ))}
                      {profileSummary?.skills?.length > 3 && (
                        <Badge variant="secondary" className="text-xs">+{profileSummary.skills.length - 3} more</Badge>
                      )}
                      <Badge variant="outline" className="text-xs">{profileSummary?.experience}</Badge>
                      {profileSummary?.is_remote_worker && (
                        <Badge className="bg-blue-100 text-blue-800 text-xs">
                          <Globe className="h-3 w-3 mr-1" />
                          Remote
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/talent-pool')}>
                  Update Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Job Recommendations */}
        {jobs.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Briefcase className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Jobs Available Yet</h3>
              <p className="text-gray-500 mb-4">Check back soon for new opportunities</p>
              <Button onClick={() => navigate('/remote-jobs')}>
                Browse All Jobs
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {jobs.map((job, index) => (
              <Card 
                key={job.id} 
                className={`hover:shadow-lg transition-all cursor-pointer ${
                  index === 0 && job.match_score >= 50 ? 'ring-2 ring-green-500 ring-opacity-50' : ''
                }`}
                onClick={() => navigate(`/remote-jobs/${job.id}`)}
                data-testid={`recommendation-card-${job.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Match Score */}
                    {job.match_score && (
                      <div className="flex-shrink-0 w-20 text-center">
                        <div className={`text-2xl font-bold ${getMatchColor(job.match_score).split(' ')[0]}`}>
                          {Math.round(job.match_score)}%
                        </div>
                        <div className="text-xs text-gray-500">Match</div>
                        <Progress 
                          value={job.match_score} 
                          className="h-1 mt-1"
                        />
                      </div>
                    )}
                    
                    {/* Job Info */}
                    <div className="flex-1">
                      <div className="flex items-start gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                          {job.company_name?.charAt(0)?.toUpperCase() || 'C'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 hover:text-blue-600 truncate">
                            {job.title}
                          </h3>
                          <p className="text-sm text-gray-600 flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {job.company_name}
                          </p>
                        </div>
                      </div>
                      
                      {/* Match Reasons */}
                      {job.match_reasons && job.match_reasons.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {job.match_reasons.map((reason, i) => (
                            <Badge key={i} variant="outline" className="text-xs gap-1">
                              <CheckCircle className="h-3 w-3 text-green-500" />
                              {reason}
                            </Badge>
                          ))}
                        </div>
                      )}
                      
                      <div className="flex flex-wrap gap-2">
                        {getJobTypeBadge(job.job_type)}
                        <Badge variant="outline" className="gap-1">
                          <Globe className="h-3 w-3" />
                          {job.remote_type === 'fully-remote' ? 'Fully Remote' : job.remote_type}
                        </Badge>
                      </div>
                    </div>
                    
                    {/* Budget & Actions */}
                    <div className="flex flex-col items-end gap-2 min-w-[140px]">
                      <div className="text-lg font-semibold text-green-600 flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        {formatBudget(job)}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {job.timeline === 'ongoing' ? 'Ongoing' : job.timeline}
                      </div>
                      <Button size="sm" className="mt-2">
                        View Details
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Tips Card */}
        <Card className="mt-6 bg-gradient-to-r from-purple-600 to-indigo-700 text-white">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Improve Your Match Score</h3>
                <ul className="text-sm text-purple-100 space-y-1">
                  <li>• Add more skills to your Talent Pool profile</li>
                  <li>• Use AI to enhance your bio and summary</li>
                  <li>• Upload your CV to stand out to employers</li>
                  <li>• Mark yourself as "Remote Worker" for remote-first roles</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default JobRecommendations;
