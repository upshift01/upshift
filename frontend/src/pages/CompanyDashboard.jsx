import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Building2, Briefcase, Users, Target, Plus, Eye,
  Loader2, TrendingUp, MapPin, Clock, DollarSign,
  ArrowRight, Sparkles, BarChart3, Globe, Star
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const CompanyDashboard = () => {
  const navigate = useNavigate();
  const { token, isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [topMatches, setTopMatches] = useState([]);
  const [stats, setStats] = useState({
    totalJobs: 0,
    activeJobs: 0,
    totalViews: 0,
    totalApplications: 0,
    totalMatches: 0
  });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchDashboardData();
  }, [isAuthenticated, navigate]);

  const fetchDashboardData = async () => {
    try {
      // Fetch user's jobs
      const jobsRes = await fetch(`${API_URL}/api/remote-jobs/my-jobs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (jobsRes.ok) {
        const jobsData = await jobsRes.json();
        setJobs(jobsData.jobs || []);
        
        // Calculate stats
        const jobsList = jobsData.jobs || [];
        const totalViews = jobsList.reduce((sum, j) => sum + (j.views || 0), 0);
        const totalApps = jobsList.reduce((sum, j) => sum + (j.applications_count || 0), 0);
        const activeJobs = jobsList.filter(j => j.status === 'active').length;
        
        setStats({
          totalJobs: jobsList.length,
          activeJobs,
          totalViews,
          totalApplications: totalApps,
          totalMatches: 0
        });
        
        // Fetch top matches for each active job
        const allMatches = [];
        for (const job of jobsList.filter(j => j.status === 'active').slice(0, 3)) {
          try {
            const matchRes = await fetch(
              `${API_URL}/api/remote-jobs/jobs/${job.id}/matches?limit=5`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (matchRes.ok) {
              const matchData = await matchRes.json();
              const matchesWithJob = (matchData.candidates || []).map(c => ({
                ...c,
                job_id: job.id,
                job_title: job.title
              }));
              allMatches.push(...matchesWithJob);
            }
          } catch (e) {
            console.error('Error fetching matches for job:', job.id);
          }
        }
        
        // Sort by match score and take top 10
        allMatches.sort((a, b) => (b.match_score || 0) - (a.match_score || 0));
        setTopMatches(allMatches.slice(0, 10));
        
        setStats(prev => ({ ...prev, totalMatches: allMatches.length }));
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getMatchColor = (score) => {
    if (score >= 70) return 'text-green-600 bg-green-100';
    if (score >= 50) return 'text-blue-600 bg-blue-100';
    if (score >= 30) return 'text-yellow-600 bg-yellow-100';
    return 'text-gray-600 bg-gray-100';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Building2 className="h-8 w-8 text-indigo-600" />
              Company Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Manage your job postings and find matching talent
            </p>
          </div>
          <Button onClick={() => navigate('/remote-jobs/post')} size="lg" data-testid="post-job-btn">
            <Plus className="h-5 w-5 mr-2" />
            Post New Job
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Briefcase className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalJobs}</p>
                  <p className="text-xs text-gray-500">Total Jobs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.activeJobs}</p>
                  <p className="text-xs text-gray-500">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <Eye className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalViews}</p>
                  <p className="text-xs text-gray-500">Views</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalApplications}</p>
                  <p className="text-xs text-gray-500">Applications</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Target className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalMatches}</p>
                  <p className="text-xs text-white/80">Talent Matches</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Jobs Column */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Your Job Postings</CardTitle>
                  <CardDescription>Manage and view matches for your jobs</CardDescription>
                </div>
                <Link to="/remote-jobs/my-jobs">
                  <Button variant="ghost" size="sm">
                    View All
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {jobs.length === 0 ? (
                  <div className="text-center py-8">
                    <Briefcase className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 mb-4">No jobs posted yet</p>
                    <Button onClick={() => navigate('/remote-jobs/post')}>
                      <Plus className="h-4 w-4 mr-2" />
                      Post Your First Job
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {jobs.slice(0, 5).map((job) => (
                      <div 
                        key={job.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 truncate">{job.title}</h4>
                          <div className="flex items-center gap-3 text-sm text-gray-500">
                            <span>{job.company_name}</span>
                            <span>•</span>
                            <span>{job.views || 0} views</span>
                            <Badge 
                              variant={job.status === 'active' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {job.status}
                            </Badge>
                          </div>
                        </div>
                        <Button 
                          size="sm"
                          onClick={() => navigate(`/remote-jobs/${job.id}/matches`)}
                          className="ml-3"
                          data-testid={`find-matches-${job.id}`}
                        >
                          <Target className="h-4 w-4 mr-1" />
                          Find Matches
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top Matches Column */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  Top Talent Matches
                </CardTitle>
                <CardDescription>Best candidates across your jobs</CardDescription>
              </CardHeader>
              <CardContent>
                {topMatches.length === 0 ? (
                  <div className="text-center py-6">
                    <Users className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">
                      {jobs.length === 0 
                        ? 'Post a job to see matching candidates'
                        : 'No matching candidates found yet'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {topMatches.slice(0, 6).map((candidate, index) => (
                      <div 
                        key={`${candidate.id}-${index}`}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                        onClick={() => navigate(`/talent-pool/${candidate.id}`)}
                      >
                        {/* Avatar */}
                        {candidate.profile_picture_url ? (
                          <img 
                            src={`${API_URL}${candidate.profile_picture_url}`}
                            alt={candidate.full_name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                            {candidate.full_name?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                        )}
                        
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900 truncate">
                            {candidate.full_name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {candidate.job_title} • {candidate.job_title}
                          </p>
                        </div>
                        
                        {/* Match Score */}
                        <div className={`text-sm font-bold ${getMatchColor(candidate.match_score).split(' ')[0]}`}>
                          {Math.round(candidate.match_score)}%
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Tips */}
            <Card className="mt-4 bg-gradient-to-br from-indigo-600 to-purple-700 text-white">
              <CardContent className="p-4">
                <h4 className="font-semibold flex items-center gap-2 mb-2">
                  <Star className="h-4 w-4" />
                  Hiring Tips
                </h4>
                <ul className="text-sm text-indigo-100 space-y-1">
                  <li>• Add more required skills for better matches</li>
                  <li>• Filter by region for cost-effective talent</li>
                  <li>• Check "Remote Worker" candidates first</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Browse Talent Pool CTA */}
        <Card className="mt-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center">
                  <Globe className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Browse the Full Talent Pool</h3>
                  <p className="text-gray-600">
                    Access our complete database of remote-ready professionals
                  </p>
                </div>
              </div>
              <Button onClick={() => navigate('/talent-pool')} variant="outline" size="lg">
                Browse Talent Pool
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CompanyDashboard;
