import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Users, Loader2, ArrowLeft, Star, CheckCircle, XCircle,
  Timer, Eye, DollarSign, Clock, MessageSquare, ExternalLink,
  ThumbsUp, ThumbsDown, FileText, Briefcase, Globe, FileSignature
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const JobProposals = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { token, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [statusCounts, setStatusCounts] = useState({});
  const [activeTab, setActiveTab] = useState('all');
  const [expandedProposal, setExpandedProposal] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchProposals();
  }, [isAuthenticated, jobId]);

  const fetchProposals = async () => {
    try {
      const response = await fetch(`${API_URL}/api/proposals/job/${jobId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setJob(data.job);
        setProposals(data.proposals || []);
        setStatusCounts(data.status_counts || {});
      } else {
        throw new Error('Failed to load proposals');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load proposals for this job',
        variant: 'destructive'
      });
      navigate('/remote-jobs/my-jobs');
    } finally {
      setLoading(false);
    }
  };

  const updateProposalStatus = async (proposalId, newStatus) => {
    try {
      const response = await fetch(`${API_URL}/api/proposals/${proposalId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        toast({
          title: 'Status Updated',
          description: `Proposal marked as ${newStatus}`
        });
        fetchProposals();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive'
      });
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 gap-1">
            <Timer className="h-3 w-3" />
            Pending
          </Badge>
        );
      case 'shortlisted':
        return (
          <Badge className="bg-blue-100 text-blue-800 gap-1">
            <Star className="h-3 w-3" />
            Shortlisted
          </Badge>
        );
      case 'accepted':
        return (
          <Badge className="bg-green-100 text-green-800 gap-1">
            <CheckCircle className="h-3 w-3" />
            Accepted
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-red-100 text-red-800 gap-1">
            <XCircle className="h-3 w-3" />
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatRate = (proposal) => {
    if (!proposal.proposed_rate) return 'Not specified';
    const symbol = proposal.currency === 'ZAR' ? 'R' : '$';
    const type = proposal.rate_type === 'hourly' ? '/hr' : proposal.rate_type === 'monthly' ? '/mo' : ' (fixed)';
    return `${symbol}${proposal.proposed_rate.toLocaleString()}${type}`;
  };

  const filteredProposals = proposals.filter(p => {
    if (activeTab === 'all') return true;
    return p.status === activeTab;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading proposals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/remote-jobs/my-jobs')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to My Jobs
        </Button>

        {/* Job Header */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl">
                  {job?.company_name?.charAt(0)?.toUpperCase() || 'C'}
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{job?.title}</h1>
                  <p className="text-gray-600">{job?.company_name}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => navigate(`/remote-jobs/${jobId}`)}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Job
                </Button>
                <Button variant="outline" onClick={() => navigate(`/remote-jobs/${jobId}/matches`)}>
                  <Users className="h-4 w-4 mr-2" />
                  AI Matches
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <Card className="cursor-pointer hover:shadow-md" onClick={() => setActiveTab('all')}>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{statusCounts.total || 0}</p>
              <p className="text-xs text-gray-500">Total Proposals</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md" onClick={() => setActiveTab('pending')}>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-yellow-600">{statusCounts.pending || 0}</p>
              <p className="text-xs text-gray-500">Pending</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md" onClick={() => setActiveTab('shortlisted')}>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-blue-600">{statusCounts.shortlisted || 0}</p>
              <p className="text-xs text-gray-500">Shortlisted</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md" onClick={() => setActiveTab('accepted')}>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{statusCounts.accepted || 0}</p>
              <p className="text-xs text-gray-500">Accepted</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md" onClick={() => setActiveTab('rejected')}>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-red-600">{statusCounts.rejected || 0}</p>
              <p className="text-xs text-gray-500">Rejected</p>
            </CardContent>
          </Card>
        </div>

        {/* Proposals List */}
        {filteredProposals.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                {activeTab === 'all' ? 'No Proposals Yet' : `No ${activeTab} Proposals`}
              </h3>
              <p className="text-gray-500">
                {activeTab === 'all'
                  ? 'Job seekers haven\'t submitted proposals yet. Try AI matching to find candidates!'
                  : 'Check other tabs for proposals'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredProposals.map((proposal) => (
              <Card
                key={proposal.id}
                className={`transition-all ${expandedProposal === proposal.id ? 'ring-2 ring-blue-500' : ''}`}
                data-testid={`employer-proposal-${proposal.id}`}
              >
                <CardContent className="p-4">
                  {/* Header Row */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      {proposal.profile_snapshot?.profile_picture_url ? (
                        <img
                          src={`${API_URL}${proposal.profile_snapshot.profile_picture_url}`}
                          alt={proposal.applicant_name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                          {proposal.applicant_name?.charAt(0)?.toUpperCase() || 'A'}
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-gray-900">{proposal.applicant_name}</h3>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <span>Submitted {formatDate(proposal.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    {getStatusBadge(proposal.status)}
                  </div>

                  {/* Profile Snapshot */}
                  {proposal.profile_snapshot && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {proposal.profile_snapshot.skills?.slice(0, 5).map((skill, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{skill}</Badge>
                      ))}
                      {proposal.profile_snapshot.is_remote_worker && (
                        <Badge className="bg-blue-100 text-blue-800 text-xs gap-1">
                          <Globe className="h-3 w-3" />
                          Remote Worker
                        </Badge>
                      )}
                      {proposal.profile_snapshot.cv_url && (
                        <Badge className="bg-green-100 text-green-800 text-xs gap-1">
                          <FileText className="h-3 w-3" />
                          CV Available
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Rate & Availability */}
                  <div className="flex flex-wrap gap-4 mb-3 text-sm">
                    <div className="flex items-center gap-1 text-gray-600">
                      <DollarSign className="h-4 w-4" />
                      <span className="font-medium">Rate:</span> {formatRate(proposal)}
                    </div>
                    <div className="flex items-center gap-1 text-gray-600">
                      <Clock className="h-4 w-4" />
                      <span className="font-medium">Availability:</span>{' '}
                      {proposal.availability === 'immediate' ? 'Immediate' : proposal.availability}
                    </div>
                  </div>

                  {/* Cover Letter */}
                  <div className="bg-gray-50 rounded-lg p-3 mb-3">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {expandedProposal === proposal.id
                        ? proposal.cover_letter
                        : proposal.cover_letter?.substring(0, 300) + (proposal.cover_letter?.length > 300 ? '...' : '')}
                    </p>
                    {proposal.cover_letter?.length > 300 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedProposal(expandedProposal === proposal.id ? null : proposal.id)}
                        className="mt-2"
                      >
                        {expandedProposal === proposal.id ? 'Show Less' : 'Read More'}
                      </Button>
                    )}
                  </div>

                  {/* Portfolio Links */}
                  {proposal.portfolio_links?.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-gray-700 mb-1">Portfolio:</p>
                      <div className="flex flex-wrap gap-2">
                        {proposal.portfolio_links.map((link, i) => (
                          <a
                            key={i}
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            {new URL(link).hostname}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="flex gap-2">
                      {proposal.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => updateProposalStatus(proposal.id, 'shortlisted')}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <Star className="h-4 w-4 mr-1" />
                            Shortlist
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => updateProposalStatus(proposal.id, 'rejected')}
                          >
                            <ThumbsDown className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                      {proposal.status === 'shortlisted' && (
                        <>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => updateProposalStatus(proposal.id, 'accepted')}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600"
                            onClick={() => updateProposalStatus(proposal.id, 'rejected')}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      {proposal.status === 'accepted' && (
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                          onClick={() => navigate(`/contracts/create/${proposal.id}`)}
                        >
                          <FileSignature className="h-4 w-4 mr-1" />
                          Create Contract
                        </Button>
                      )}
                    </div>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate(`/talent-pool/${proposal.applicant_id}`)}
                    >
                      View Full Profile
                      <ExternalLink className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default JobProposals;
