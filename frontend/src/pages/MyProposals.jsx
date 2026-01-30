import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Send, Loader2, Building2, DollarSign, Clock, Eye,
  ArrowRight, Briefcase, CheckCircle, XCircle, Timer,
  Star, AlertCircle, Trash2
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const MyProposals = () => {
  const navigate = useNavigate();
  const { token, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [proposals, setProposals] = useState([]);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchProposals();
  }, [isAuthenticated, navigate]);

  const fetchProposals = async () => {
    try {
      const response = await fetch(`${API_URL}/api/proposals/my-proposals`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setProposals(data.proposals || []);
      }
    } catch (error) {
      console.error('Error fetching proposals:', error);
      toast({
        title: 'Error',
        description: 'Failed to load your proposals',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (proposalId) => {
    if (!confirm('Are you sure you want to withdraw this proposal?')) return;

    try {
      const response = await fetch(`${API_URL}/api/proposals/${proposalId}/withdraw`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        toast({
          title: 'Proposal Withdrawn',
          description: 'Your proposal has been withdrawn'
        });
        fetchProposals();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to withdraw proposal',
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
            Pending Review
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
            Not Selected
          </Badge>
        );
      case 'withdrawn':
        return (
          <Badge className="bg-gray-100 text-gray-800 gap-1">
            <AlertCircle className="h-3 w-3" />
            Withdrawn
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
      year: 'numeric'
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

  const counts = {
    all: proposals.length,
    pending: proposals.filter(p => p.status === 'pending').length,
    shortlisted: proposals.filter(p => p.status === 'shortlisted').length,
    accepted: proposals.filter(p => p.status === 'accepted').length,
    rejected: proposals.filter(p => p.status === 'rejected').length
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your proposals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Send className="h-6 w-6 text-blue-600" />
              My Proposals
            </h1>
            <p className="text-gray-600">Track and manage your job applications</p>
          </div>
          <Link to="/remote-jobs">
            <Button variant="outline">
              <Briefcase className="h-4 w-4 mr-2" />
              Browse Jobs
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('all')}>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-gray-900">{counts.all}</p>
              <p className="text-xs text-gray-500">Total</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('pending')}>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-yellow-600">{counts.pending}</p>
              <p className="text-xs text-gray-500">Pending</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('shortlisted')}>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-blue-600">{counts.shortlisted}</p>
              <p className="text-xs text-gray-500">Shortlisted</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('accepted')}>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{counts.accepted}</p>
              <p className="text-xs text-gray-500">Accepted</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('rejected')}>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-red-600">{counts.rejected}</p>
              <p className="text-xs text-gray-500">Not Selected</p>
            </CardContent>
          </Card>
        </div>

        {/* Proposals List */}
        {filteredProposals.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Send className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                {activeTab === 'all' ? 'No Proposals Yet' : `No ${activeTab} Proposals`}
              </h3>
              <p className="text-gray-500 mb-4">
                {activeTab === 'all'
                  ? 'Start applying to jobs to see your proposals here'
                  : 'Check other tabs for your proposals'}
              </p>
              {activeTab === 'all' && (
                <Button onClick={() => navigate('/remote-jobs/recommendations')}>
                  Find Matching Jobs
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredProposals.map((proposal) => (
              <Card
                key={proposal.id}
                className="hover:shadow-lg transition-all"
                data-testid={`proposal-card-${proposal.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Job Info */}
                    <div className="flex-1">
                      <div className="flex items-start gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                          {proposal.company_name?.charAt(0)?.toUpperCase() || 'C'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3
                            className="font-semibold text-gray-900 hover:text-blue-600 cursor-pointer truncate"
                            onClick={() => navigate(`/remote-jobs/${proposal.job_id}`)}
                          >
                            {proposal.job_title}
                          </h3>
                          <p className="text-sm text-gray-600 flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {proposal.company_name}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 items-center">
                        {getStatusBadge(proposal.status)}
                        {proposal.proposed_rate && (
                          <Badge variant="outline" className="gap-1">
                            <DollarSign className="h-3 w-3" />
                            {formatRate(proposal)}
                          </Badge>
                        )}
                        <Badge variant="outline" className="gap-1">
                          <Clock className="h-3 w-3" />
                          {proposal.availability === 'immediate' ? 'Immediate' : proposal.availability}
                        </Badge>
                      </div>

                      <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                        {proposal.cover_letter?.substring(0, 150)}...
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col items-end gap-2 min-w-[140px]">
                      <p className="text-sm text-gray-500">
                        Submitted {formatDate(proposal.created_at)}
                      </p>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/remote-jobs/${proposal.job_id}`)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Job
                        </Button>
                        {proposal.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleWithdraw(proposal.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Tips */}
        <Card className="mt-6 bg-gradient-to-r from-indigo-600 to-purple-700 text-white">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-2">Tips for Better Results</h3>
            <ul className="text-sm text-indigo-100 space-y-1">
              <li>• Personalize each proposal for the specific job</li>
              <li>• Highlight relevant experience and skills</li>
              <li>• Keep your Talent Pool profile up-to-date</li>
              <li>• Respond quickly if an employer contacts you</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MyProposals;
