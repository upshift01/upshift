import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Briefcase, Users, FileText, TrendingUp, Target, Eye,
  ArrowLeft, BarChart3, Clock, CheckCircle, AlertCircle,
  Loader2, ChevronRight, Calendar, DollarSign
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const JobAnalytics = () => {
  const navigate = useNavigate();
  const { token, isAuthenticated, user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [selectedJob, setSelectedJob] = useState('all');
  const [jobDetails, setJobDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (user?.role !== 'employer') {
      toast({
        title: 'Access Denied',
        description: 'This page is for employers only',
        variant: 'destructive'
      });
      navigate('/dashboard');
      return;
    }
    fetchAnalytics();
  }, [isAuthenticated, user, navigate, token]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/employer/analytics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: 'Error',
        description: 'Failed to load analytics',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchJobDetails = async (jobId) => {
    if (jobId === 'all') {
      setJobDetails(null);
      return;
    }
    
    try {
      setLoadingDetails(true);
      const res = await fetch(`${API_URL}/api/employer/analytics/${jobId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setJobDetails(data);
      }
    } catch (error) {
      console.error('Error fetching job details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleJobChange = (value) => {
    setSelectedJob(value);
    fetchJobDetails(value);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    );
  }

  const overall = analytics?.overall || {};
  const jobs = analytics?.jobs || [];
  const trends = analytics?.trends || {};

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950" data-testid="job-analytics-page">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/employer')}
              className="text-slate-400 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-blue-400" />
            Job Analytics
          </h1>
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Total Jobs</p>
                  <p className="text-2xl font-bold text-white">{overall.total_jobs || 0}</p>
                </div>
                <Briefcase className="h-8 w-8 text-blue-400" />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {overall.active_jobs || 0} active, {overall.paused_jobs || 0} paused
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Total Proposals</p>
                  <p className="text-2xl font-bold text-white">{overall.total_proposals || 0}</p>
                </div>
                <Users className="h-8 w-8 text-green-400" />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {overall.pending_proposals || 0} pending review
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Active Contracts</p>
                  <p className="text-2xl font-bold text-white">{overall.active_contracts || 0}</p>
                </div>
                <FileText className="h-8 w-8 text-purple-400" />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {overall.total_contracts || 0} total contracts
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Conversion Rate</p>
                  <p className="text-2xl font-bold text-white">{overall.overall_conversion_rate || 0}%</p>
                </div>
                <Target className="h-8 w-8 text-amber-400" />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Avg {overall.avg_proposals_per_job || 0} proposals/job
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Financial Overview */}
        <Card className="bg-slate-800/50 border-slate-700 mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-400" />
              Financial Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-900/50 rounded-lg p-4">
                <p className="text-slate-400 text-sm">Total Contract Value</p>
                <p className="text-2xl font-bold text-white">
                  ${(overall.total_contract_value || 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-4">
                <p className="text-slate-400 text-sm">Total Paid Out</p>
                <p className="text-2xl font-bold text-green-400">
                  ${(overall.total_paid || 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-4">
                <p className="text-slate-400 text-sm">Pending Payments</p>
                <p className="text-2xl font-bold text-amber-400">
                  ${((overall.total_contract_value || 0) - (overall.total_paid || 0)).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Job Selector and Details */}
        <Card className="bg-slate-800/50 border-slate-700 mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white">Job Performance</CardTitle>
              <Select value={selectedJob} onValueChange={handleJobChange}>
                <SelectTrigger className="w-[280px] bg-slate-900 border-slate-700 text-white">
                  <SelectValue placeholder="Select a job" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  <SelectItem value="all" className="text-white">All Jobs Overview</SelectItem>
                  {jobs.map((job) => (
                    <SelectItem key={job.job_id} value={job.job_id} className="text-white">
                      {job.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loadingDetails ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
              </div>
            ) : selectedJob === 'all' ? (
              // All Jobs Table
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="jobs-analytics-table">
                  <thead>
                    <tr className="text-left border-b border-slate-700">
                      <th className="pb-3 text-slate-400 font-medium">Job Title</th>
                      <th className="pb-3 text-slate-400 font-medium text-center">Status</th>
                      <th className="pb-3 text-slate-400 font-medium text-center">Proposals</th>
                      <th className="pb-3 text-slate-400 font-medium text-center">Contracts</th>
                      <th className="pb-3 text-slate-400 font-medium text-center">Conversion</th>
                      <th className="pb-3 text-slate-400 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">
                          No jobs posted yet. <Link to="/post-job" className="text-blue-400 hover:underline">Post your first job</Link>
                        </td>
                      </tr>
                    ) : (
                      jobs.map((job) => (
                        <tr key={job.job_id} className="border-b border-slate-800 hover:bg-slate-800/50">
                          <td className="py-4">
                            <p className="text-white font-medium">{job.title}</p>
                            <p className="text-slate-500 text-xs">
                              Created {new Date(job.created_at).toLocaleDateString()}
                            </p>
                          </td>
                          <td className="py-4 text-center">
                            <Badge
                              variant={job.status === 'active' ? 'success' : 'secondary'}
                              className={job.status === 'active' ? 'bg-green-500/20 text-green-400' : ''}
                            >
                              {job.status}
                            </Badge>
                          </td>
                          <td className="py-4 text-center">
                            <div className="text-white">{job.proposals?.total || 0}</div>
                            <div className="text-xs text-slate-500">
                              {job.proposals?.pending || 0} pending
                            </div>
                          </td>
                          <td className="py-4 text-center">
                            <div className="text-white">{job.contracts?.total || 0}</div>
                            <div className="text-xs text-green-400">
                              ${job.contracts?.total_value?.toLocaleString() || 0}
                            </div>
                          </td>
                          <td className="py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Progress value={job.metrics?.conversion_rate || 0} className="w-16 h-2" />
                              <span className="text-white text-sm">{job.metrics?.conversion_rate || 0}%</span>
                            </div>
                          </td>
                          <td className="py-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleJobChange(job.job_id)}
                              className="text-blue-400 hover:text-blue-300"
                            >
                              Details <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : jobDetails ? (
              // Single Job Details
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-white">{jobDetails.job?.title}</h3>
                    <p className="text-slate-400 text-sm">
                      Created {new Date(jobDetails.job?.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge
                    variant={jobDetails.job?.status === 'active' ? 'success' : 'secondary'}
                    className={jobDetails.job?.status === 'active' ? 'bg-green-500/20 text-green-400' : ''}
                  >
                    {jobDetails.job?.status}
                  </Badge>
                </div>

                {/* Proposal Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-slate-900/50 rounded-lg p-4">
                    <p className="text-slate-400 text-sm">Total</p>
                    <p className="text-xl font-bold text-white">{jobDetails.proposals?.total || 0}</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-4">
                    <p className="text-slate-400 text-sm">Pending</p>
                    <p className="text-xl font-bold text-amber-400">{jobDetails.proposals?.by_status?.pending || 0}</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-4">
                    <p className="text-slate-400 text-sm">Shortlisted</p>
                    <p className="text-xl font-bold text-blue-400">{jobDetails.proposals?.by_status?.shortlisted || 0}</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-4">
                    <p className="text-slate-400 text-sm">Accepted</p>
                    <p className="text-xl font-bold text-green-400">{jobDetails.proposals?.by_status?.accepted || 0}</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-4">
                    <p className="text-slate-400 text-sm">Avg Rate</p>
                    <p className="text-xl font-bold text-white">${jobDetails.proposals?.avg_proposed_rate || 0}</p>
                  </div>
                </div>

                {/* Contract Stats */}
                <div className="bg-slate-900/50 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-4">Contracts</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-slate-400 text-sm">Total Contracts</p>
                      <p className="text-lg font-bold text-white">{jobDetails.contracts?.total || 0}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-sm">Active</p>
                      <p className="text-lg font-bold text-blue-400">{jobDetails.contracts?.active || 0}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-sm">Total Value</p>
                      <p className="text-lg font-bold text-white">${jobDetails.contracts?.total_value?.toLocaleString() || 0}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-sm">Paid Out</p>
                      <p className="text-lg font-bold text-green-400">${jobDetails.contracts?.total_paid?.toLocaleString() || 0}</p>
                    </div>
                  </div>
                </div>

                {/* Recent Proposals */}
                {jobDetails.recent_proposals?.length > 0 && (
                  <div>
                    <h4 className="text-white font-medium mb-4">Recent Proposals</h4>
                    <div className="space-y-2">
                      {jobDetails.recent_proposals.map((proposal) => (
                        <div key={proposal.id} className="bg-slate-900/50 rounded-lg p-3 flex items-center justify-between">
                          <div>
                            <p className="text-white">{proposal.applicant_name}</p>
                            <p className="text-slate-500 text-xs">
                              ${proposal.proposed_rate} {proposal.rate_type} • {proposal.availability}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="secondary"
                              className={
                                proposal.status === 'accepted' ? 'bg-green-500/20 text-green-400' :
                                proposal.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                                proposal.status === 'shortlisted' ? 'bg-blue-500/20 text-blue-400' :
                                'bg-slate-700 text-slate-400'
                              }
                            >
                              {proposal.status}
                            </Badge>
                            <span className="text-slate-500 text-xs">
                              {new Date(proposal.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* 30-Day Trend */}
        {trends.proposals_last_30_days?.length > 0 && (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-400" />
                Proposal Trends (Last 30 Days)
              </CardTitle>
              <CardDescription className="text-slate-400">
                {trends.total_proposals_last_30_days || 0} proposals received
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-1 h-32">
                {trends.proposals_last_30_days.map((day, i) => {
                  const maxCount = Math.max(...trends.proposals_last_30_days.map(d => d.count));
                  const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
                  return (
                    <div
                      key={i}
                      className="flex-1 bg-blue-500/20 hover:bg-blue-500/40 rounded-t transition-colors relative group"
                      style={{ height: `${Math.max(height, 5)}%` }}
                    >
                      <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-800 px-2 py-1 rounded text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {day.date}: {day.count}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-2 text-xs text-slate-500">
                <span>{trends.proposals_last_30_days[0]?.date}</span>
                <span>{trends.proposals_last_30_days[trends.proposals_last_30_days.length - 1]?.date}</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default JobAnalytics;
