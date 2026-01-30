import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  Users, Loader2, ArrowLeft, Target, MapPin,
  Briefcase, FileText, Mail, Globe, CheckCircle,
  Star, Filter, Download, Eye
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const CandidateMatches = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { token, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [totalMatches, setTotalMatches] = useState(0);
  const [regionFilter, setRegionFilter] = useState('all');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchMatches();
  }, [isAuthenticated, jobId, regionFilter]);

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '30' });
      if (regionFilter && regionFilter !== 'all') {
        params.append('region', regionFilter);
      }
      
      const response = await fetch(
        `${API_URL}/api/remote-jobs/jobs/${jobId}/matches?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.ok) {
        const data = await response.json();
        setJob(data.job);
        setCandidates(data.candidates);
        setTotalMatches(data.total_matches);
      } else {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to load matches');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load candidate matches',
        variant: 'destructive'
      });
      navigate('/remote-jobs/my-jobs');
    } finally {
      setLoading(false);
    }
  };

  const getMatchColor = (score) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 50) return 'text-blue-600';
    if (score >= 30) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const getMatchBgColor = (score) => {
    if (score >= 70) return 'bg-green-100 border-green-200';
    if (score >= 50) return 'bg-blue-50 border-blue-200';
    return 'bg-white';
  };

  const getExperienceBadge = (level) => {
    const colors = {
      entry: 'bg-green-100 text-green-800',
      mid: 'bg-yellow-100 text-yellow-800',
      senior: 'bg-red-100 text-red-800',
      executive: 'bg-purple-100 text-purple-800'
    };
    const names = {
      entry: 'Entry Level',
      mid: 'Mid Level',
      senior: 'Senior',
      executive: 'Executive'
    };
    return <Badge className={colors[level] || 'bg-gray-100'}>{names[level] || level}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Finding matching candidates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <Button
          variant="ghost"
          onClick={() => navigate('/remote-jobs/my-jobs')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to My Jobs
        </Button>

        {/* Job Context Card */}
        <Card className="mb-6 border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Target className="h-5 w-5 text-indigo-600" />
                  Candidate Matches for: {job?.title}
                </h1>
                <div className="flex flex-wrap gap-2 mt-2">
                  {job?.required_skills?.slice(0, 5).map((skill, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{skill}</Badge>
                  ))}
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-indigo-600">{totalMatches}</div>
                <div className="text-sm text-gray-500">Matching Candidates</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">Filter by Region:</span>
            </div>
            <Select value={regionFilter} onValueChange={setRegionFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                <SelectItem value="South Africa">South Africa</SelectItem>
                <SelectItem value="Africa">Africa</SelectItem>
                <SelectItem value="Europe">Europe</SelectItem>
                <SelectItem value="Asia">Asia</SelectItem>
                <SelectItem value="America">Americas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm text-gray-500">
            Showing {candidates.length} of {totalMatches} matches
          </div>
        </div>

        {/* Candidate List */}
        {candidates.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Matching Candidates</h3>
              <p className="text-gray-500 mb-4">
                {regionFilter !== 'all' 
                  ? 'Try removing the region filter to see more candidates'
                  : 'Candidates with matching skills will appear here'}
              </p>
              {regionFilter !== 'all' && (
                <Button variant="outline" onClick={() => setRegionFilter('all')}>
                  Clear Region Filter
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {candidates.map((candidate, index) => (
              <Card 
                key={candidate.id} 
                className={`hover:shadow-lg transition-all ${getMatchBgColor(candidate.match_score)}`}
                data-testid={`candidate-match-${candidate.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    {/* Profile Picture / Avatar */}
                    <div className="flex-shrink-0">
                      {candidate.profile_picture_url ? (
                        <img 
                          src={`${API_URL}${candidate.profile_picture_url}`}
                          alt={candidate.full_name}
                          className="w-14 h-14 rounded-full object-cover border-2 border-white shadow"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg shadow">
                          {candidate.full_name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                      )}
                    </div>
                    
                    {/* Candidate Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <div>
                          <h3 className="font-semibold text-gray-900 truncate">
                            {candidate.full_name}
                          </h3>
                          <p className="text-sm text-gray-600 truncate">
                            {candidate.job_title}
                          </p>
                        </div>
                        {/* Match Score */}
                        <div className="text-right ml-2">
                          <div className={`text-xl font-bold ${getMatchColor(candidate.match_score)}`}>
                            {Math.round(candidate.match_score)}%
                          </div>
                          <Progress 
                            value={candidate.match_score} 
                            className="h-1 w-16"
                          />
                        </div>
                      </div>
                      
                      {/* Location & Experience */}
                      <div className="flex flex-wrap items-center gap-2 mb-2 text-sm">
                        <span className="flex items-center gap-1 text-gray-500">
                          <MapPin className="h-3 w-3" />
                          {candidate.location}
                        </span>
                        {getExperienceBadge(candidate.experience_level)}
                        {candidate.is_remote_worker && (
                          <Badge className="bg-blue-100 text-blue-800 text-xs">
                            <Globe className="h-3 w-3 mr-1" />
                            Remote
                          </Badge>
                        )}
                      </div>
                      
                      {/* Match Reasons */}
                      {candidate.match_reasons && candidate.match_reasons.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {candidate.match_reasons.slice(0, 3).map((reason, i) => (
                            <Badge key={i} variant="outline" className="text-xs gap-1">
                              <CheckCircle className="h-3 w-3 text-green-500" />
                              {reason}
                            </Badge>
                          ))}
                        </div>
                      )}
                      
                      {/* Skills */}
                      <div className="flex flex-wrap gap-1 mb-3">
                        {candidate.skills?.slice(0, 4).map((skill, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {candidate.skills?.length > 4 && (
                          <Badge variant="secondary" className="text-xs">
                            +{candidate.skills.length - 4}
                          </Badge>
                        )}
                      </div>
                      
                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/talent-pool/${candidate.id}`);
                          }}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View Profile
                        </Button>
                        {candidate.cv_url && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(candidate.cv_url, '_blank');
                            }}
                          >
                            <FileText className="h-3 w-3 mr-1" />
                            CV
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

        {/* Tips Card */}
        <Card className="mt-6 bg-gradient-to-r from-indigo-600 to-purple-700 text-white">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <Star className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Finding the Right Talent</h3>
                <ul className="text-sm text-indigo-100 space-y-1">
                  <li>• Higher match scores indicate better skill alignment</li>
                  <li>• Filter by region to find local talent (often more cost-effective)</li>
                  <li>• Candidates marked "Remote Worker" have explicitly opted for remote work</li>
                  <li>• Check CV availability to quickly review qualifications</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CandidateMatches;
