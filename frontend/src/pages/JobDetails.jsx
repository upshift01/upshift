import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Briefcase, MapPin, Clock, DollarSign, ArrowLeft,
  Globe, Building2, Calendar, Eye, Users, Languages,
  Bookmark, Send, Loader2, Edit, Trash2, Pause, Play
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const JobDetails = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, token, user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState(null);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    fetchJobDetails();
  }, [jobId]);

  const fetchJobDetails = async () => {
    try {
      const response = await fetch(`${API_URL}/api/remote-jobs/jobs/${jobId}`);
      if (response.ok) {
        const data = await response.json();
        setJob(data.job);
        // Check if current user is the owner
        if (user && data.job.poster_id === user.id) {
          setIsOwner(true);
        }
      } else {
        throw new Error('Job not found');
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

  const handleToggleStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/api/remote-jobs/jobs/${jobId}/toggle-status`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setJob(prev => ({ ...prev, status: data.status }));
        toast({
          title: 'Status Updated',
          description: `Job is now ${data.status}`
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this job posting?')) return;

    try {
      const response = await fetch(`${API_URL}/api/remote-jobs/jobs/${jobId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        toast({
          title: 'Job Deleted',
          description: 'Your job posting has been removed'
        });
        navigate('/remote-jobs/my-jobs');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete job',
        variant: 'destructive'
      });
    }
  };

  const formatBudget = () => {
    if (!job.budget_min && !job.budget_max) return 'Negotiable';
    const symbol = job.currency === 'ZAR' ? 'R' : '$';
    const type = job.budget_type === 'hourly' ? '/hr' : job.budget_type === 'monthly' ? '/mo' : ' (fixed)';
    
    if (job.budget_min && job.budget_max) {
      return `${symbol}${job.budget_min.toLocaleString()} - ${symbol}${job.budget_max.toLocaleString()}${type}`;
    }
    if (job.budget_min) return `From ${symbol}${job.budget_min.toLocaleString()}${type}`;
    if (job.budget_max) return `Up to ${symbol}${job.budget_max.toLocaleString()}${type}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getJobTypeBadge = (type) => {
    switch (type) {
      case 'full-time':
        return <Badge className="bg-blue-100 text-blue-800">Full-time Remote</Badge>;
      case 'contract':
        return <Badge className="bg-purple-100 text-purple-800">Contract</Badge>;
      case 'gig':
        return <Badge className="bg-orange-100 text-orange-800">Gig / Micro-task</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  const getExperienceLabel = (level) => {
    const labels = {
      entry: 'Entry Level (0-2 years)',
      mid: 'Mid Level (3-5 years)',
      senior: 'Senior Level (6-10 years)',
      executive: 'Executive (10+ years)'
    };
    return labels[level] || level;
  };

  const getTimelineLabel = (timeline) => {
    const labels = {
      'ongoing': 'Ongoing / Permanent',
      '1-3-months': '1-3 Months',
      '3-6-months': '3-6 Months',
      '6-12-months': '6-12 Months',
      'one-off': 'One-off Task'
    };
    return labels[timeline] || timeline;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="text-center p-8">
          <Briefcase className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Job Not Found</h2>
          <Button onClick={() => navigate('/remote-jobs')}>Browse Jobs</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/remote-jobs')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Jobs
        </Button>

        {/* Owner Actions */}
        {isOwner && (
          <Card className="mb-4 border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={job.status === 'active' ? 'default' : 'secondary'}>
                    {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                  </Badge>
                  <span className="text-sm text-gray-600">
                    {job.views} views • {job.applications_count} applications
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleToggleStatus}
                  >
                    {job.status === 'active' ? (
                      <>
                        <Pause className="h-4 w-4 mr-1" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-1" />
                        Activate
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/remote-jobs/edit/${jobId}`)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="border-b">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-2xl flex-shrink-0">
                {job.company_name?.charAt(0)?.toUpperCase() || 'C'}
              </div>
              <div className="flex-1">
                <CardTitle className="text-2xl mb-1">{job.title}</CardTitle>
                <div className="flex items-center gap-2 text-gray-600 mb-3">
                  <Building2 className="h-4 w-4" />
                  <span className="font-medium">{job.company_name}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {getJobTypeBadge(job.job_type)}
                  <Badge variant="outline" className="gap-1">
                    <Globe className="h-3 w-3" />
                    {job.remote_type === 'fully-remote' ? 'Fully Remote' : job.remote_type}
                  </Badge>
                  {job.status !== 'active' && (
                    <Badge variant="destructive">{job.status}</Badge>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-6">
            {/* Key Info Grid */}
            <div className="grid md:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Budget</p>
                  <p className="font-semibold text-green-600">{formatBudget()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Timeline</p>
                  <p className="font-semibold">{getTimelineLabel(job.timeline)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Experience</p>
                  <p className="font-semibold">{getExperienceLabel(job.experience_level)}</p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Job Description</h3>
              <div className="prose max-w-none text-gray-700 whitespace-pre-wrap">
                {job.description}
              </div>
            </div>

            {/* Skills */}
            {(job.required_skills?.length > 0 || job.preferred_skills?.length > 0) && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Skills</h3>
                {job.required_skills?.length > 0 && (
                  <div className="mb-3">
                    <p className="text-sm text-gray-500 mb-2">Required Skills</p>
                    <div className="flex flex-wrap gap-2">
                      {job.required_skills.map((skill, i) => (
                        <Badge key={i} className="bg-blue-100 text-blue-800">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {job.preferred_skills?.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Nice to Have</p>
                    <div className="flex flex-wrap gap-2">
                      {job.preferred_skills.map((skill, i) => (
                        <Badge key={i} variant="outline">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Additional Info */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">Location & Timezone</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span>
                      {job.location_preference === 'worldwide' 
                        ? 'Worldwide' 
                        : job.preferred_regions?.join(', ') || 'Specific regions'}
                    </span>
                  </div>
                  {job.timezone_overlap && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="h-4 w-4" />
                      <span>{job.timezone_overlap}</span>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-3">Requirements</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Languages className="h-4 w-4" />
                    <span>{job.language_requirements?.join(', ') || 'English'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Posted Date */}
            <div className="flex items-center gap-2 text-sm text-gray-500 pt-4 border-t">
              <Calendar className="h-4 w-4" />
              <span>Posted on {formatDate(job.created_at)}</span>
              {job.views > 0 && (
                <>
                  <span>•</span>
                  <Eye className="h-4 w-4" />
                  <span>{job.views} views</span>
                </>
              )}
            </div>

            {/* Action Buttons */}
            {!isOwner && isAuthenticated && job.status === 'active' && (
              <div className="flex gap-3 mt-6 pt-6 border-t">
                <Button 
                  className="flex-1 bg-blue-600 hover:bg-blue-700" 
                  size="lg"
                  onClick={() => navigate(`/remote-jobs/${jobId}/apply`)}
                  data-testid="apply-now-btn"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Apply Now
                </Button>
                <Button variant="outline" size="lg">
                  <Bookmark className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </div>
            )}

            {/* Job Filled Notice */}
            {!isOwner && isAuthenticated && job.status === 'filled' && (
              <div className="mt-6 pt-6 border-t">
                <Card className="bg-amber-50 border-amber-200">
                  <CardContent className="p-4 text-center">
                    <Badge className="bg-amber-500 mb-2">Position Filled</Badge>
                    <p className="text-amber-800">This position has been filled and is no longer accepting applications.</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Login CTA for non-authenticated users */}
            {!isAuthenticated && (
              <Card className="mt-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
                <CardContent className="p-6 text-center">
                  <h3 className="text-xl font-bold mb-2">Ready to Apply?</h3>
                  <p className="text-blue-100 mb-4">
                    Create an account to apply for this job and many more
                  </p>
                  <div className="flex justify-center gap-4">
                    <Button 
                      onClick={() => navigate('/register')}
                      className="bg-white text-blue-600 hover:bg-blue-50"
                    >
                      Sign Up Free
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => navigate('/login')}
                      className="border-white text-white hover:bg-white/10"
                    >
                      Login
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default JobDetails;
