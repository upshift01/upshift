import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  Briefcase, MapPin, Clock, DollarSign, Search, Plus,
  Filter, Globe, Users, Loader2, ChevronLeft, ChevronRight,
  Building2, Calendar, Zap
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const RemoteJobs = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, token } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [options, setOptions] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [jobType, setJobType] = useState('all');
  const [experienceLevel, setExperienceLevel] = useState('all');
  const [currency, setCurrency] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // Check if user is employer - they should only see their own jobs
  const isEmployer = user?.role === 'employer';

  useEffect(() => {
    fetchOptions();
    fetchJobs();
  }, []);

  const fetchOptions = async () => {
    try {
      const response = await fetch(`${API_URL}/api/remote-jobs/options`);
      if (response.ok) {
        const data = await response.json();
        setOptions(data);
      }
    } catch (error) {
      console.error('Error fetching options:', error);
    }
  };

  const fetchJobs = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '12' });
      if (searchQuery) params.append('search', searchQuery);
      if (jobType) params.append('job_type', jobType);
      if (experienceLevel) params.append('experience_level', experienceLevel);
      if (currency) params.append('currency', currency);
      
      // If employer, fetch only their own jobs
      let endpoint = `${API_URL}/api/remote-jobs/jobs?${params}`;
      let headers = {};
      
      if (isEmployer && token) {
        endpoint = `${API_URL}/api/remote-jobs/my-jobs?${params}`;
        headers = { Authorization: `Bearer ${token}` };
      }
      
      const response = await fetch(endpoint, { headers });
      if (response.ok) {
        const data = await response.json();
        setJobs(data.jobs);
        setPagination(data.pagination || { page: 1, totalPages: 1, total: data.jobs?.length || 0 });
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load jobs',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchJobs(1);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setJobType('all');
    setExperienceLevel('all');
    setCurrency('all');
    fetchJobs(1);
  };

  const formatBudget = (job) => {
    if (!job.budget_min && !job.budget_max) return 'Negotiable';
    const symbol = job.currency === 'ZAR' ? 'R' : '$';
    const type = job.budget_type === 'hourly' ? '/hr' : job.budget_type === 'monthly' ? '/mo' : '';
    
    if (job.budget_min && job.budget_max) {
      return `${symbol}${job.budget_min.toLocaleString()} - ${symbol}${job.budget_max.toLocaleString()}${type}`;
    }
    if (job.budget_min) return `From ${symbol}${job.budget_min.toLocaleString()}${type}`;
    if (job.budget_max) return `Up to ${symbol}${job.budget_max.toLocaleString()}${type}`;
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

  const getExperienceBadge = (level) => {
    const colors = {
      entry: 'bg-green-100 text-green-800',
      mid: 'bg-yellow-100 text-yellow-800',
      senior: 'bg-red-100 text-red-800',
      executive: 'bg-purple-100 text-purple-800'
    };
    const names = {
      entry: 'Entry',
      mid: 'Mid',
      senior: 'Senior',
      executive: 'Executive'
    };
    return <Badge className={colors[level] || 'bg-gray-100'}>{names[level] || level}</Badge>;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {isEmployer ? 'My Job Postings' : 'Remote Work Space'}
            </h1>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              {isEmployer 
                ? 'Manage your job postings and track applications'
                : 'Find your perfect remote opportunity or hire top talent from around the world'}
            </p>
            
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="Search jobs, skills, or companies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="pl-10 h-12 text-gray-900"
                  data-testid="job-search-input"
                />
              </div>
              <Button 
                onClick={handleSearch}
                className="h-12 px-6 bg-white text-blue-600 hover:bg-blue-50"
                data-testid="search-jobs-btn"
              >
                Search
              </Button>
            </div>
            
            {/* Quick Actions */}
            <div className="mt-6 flex flex-wrap justify-center gap-4">
              {isAuthenticated && (
                <Button
                  onClick={() => navigate('/remote-jobs/post')}
                  className="bg-green-500 hover:bg-green-600"
                  data-testid="post-job-btn"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Post a Job
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="bg-white/10 border-white/30 text-white hover:bg-white/20"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white border-b shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Select value={jobType} onValueChange={setJobType}>
                <SelectTrigger>
                  <SelectValue placeholder="Job Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  {options?.job_types?.map((type) => (
                    <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={experienceLevel} onValueChange={setExperienceLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="Experience Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Levels</SelectItem>
                  {options?.experience_levels?.map((level) => (
                    <SelectItem key={level.id} value={level.id}>{level.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue placeholder="Currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Currencies</SelectItem>
                  {options?.currencies?.map((curr) => (
                    <SelectItem key={curr.id} value={curr.id}>{curr.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Results Count */}
        <div className="flex justify-between items-center mb-6">
          <p className="text-gray-600">
            {isEmployer 
              ? `You have ${pagination.total} job ${pagination.total === 1 ? 'posting' : 'postings'}`
              : `${pagination.total} remote ${pagination.total === 1 ? 'job' : 'jobs'} found`}
          </p>
          {isAuthenticated && !isEmployer && (
            <Link to="/remote-jobs/my-proposals">
              <Button variant="outline" size="sm">
                <Briefcase className="h-4 w-4 mr-2" />
                My Proposals
              </Button>
            </Link>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : jobs.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Briefcase className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                {isEmployer ? 'No job postings yet' : 'No jobs found'}
              </h3>
              <p className="text-gray-500 mb-4">
                {isEmployer 
                  ? 'Create your first job posting to start receiving applications'
                  : 'Try adjusting your search or filters'}
              </p>
              {isEmployer && (
                <Button onClick={() => navigate('/remote-jobs/post')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Post Your First Job
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4">
              {jobs.map((job) => (
                <Card 
                  key={job.id} 
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => navigate(`/remote-jobs/${job.id}`)}
                  data-testid={`job-card-${job.id}`}
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                            {job.company_name?.charAt(0)?.toUpperCase() || 'C'}
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold text-gray-900 hover:text-blue-600">
                              {job.title}
                            </h3>
                            <p className="text-gray-600 flex items-center gap-1">
                              <Building2 className="h-4 w-4" />
                              {job.company_name}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mb-3">
                          {getJobTypeBadge(job.job_type)}
                          {getExperienceBadge(job.experience_level)}
                          <Badge variant="outline" className="gap-1">
                            <Globe className="h-3 w-3" />
                            {job.remote_type === 'fully-remote' ? 'Fully Remote' : job.remote_type}
                          </Badge>
                        </div>
                        
                        <p className="text-gray-600 line-clamp-2 mb-3">
                          {job.description?.substring(0, 200)}...
                        </p>
                        
                        <div className="flex flex-wrap gap-1">
                          {job.required_skills?.slice(0, 5).map((skill, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {job.required_skills?.length > 5 && (
                            <Badge variant="secondary" className="text-xs">
                              +{job.required_skills.length - 5} more
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2 text-right min-w-[150px]">
                        <div className="text-lg font-semibold text-green-600 flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          {formatBudget(job)}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {job.timeline === 'ongoing' ? 'Ongoing' : job.timeline}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(job.created_at)}
                        </div>
                        {job.preferred_regions?.length > 0 && job.location_preference !== 'worldwide' && (
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {job.preferred_regions[0]}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-8">
                <Button
                  variant="outline"
                  onClick={() => fetchJobs(pagination.page - 1)}
                  disabled={pagination.page === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <span className="text-gray-600">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => fetchJobs(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </>
        )}

        {/* CTA for non-authenticated users */}
        {!isAuthenticated && (
          <Card className="mt-8 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
            <CardContent className="p-8 text-center">
              <h3 className="text-2xl font-bold mb-2">Ready to Post Your Job?</h3>
              <p className="text-blue-100 mb-4">
                Create an account to post jobs and connect with top remote talent
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
      </div>
    </div>
  );
};

export default RemoteJobs;
