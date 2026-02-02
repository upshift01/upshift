import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import {
  ArrowLeft, Briefcase, MapPin, Award, FileText, Mail, Phone,
  Loader2, Send, CheckCircle, Clock, User, Star, Download,
  MessageSquare, AlertCircle
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const TalentPoolProfile = () => {
  const { profileId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { toast } = useToast();
  
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requestMessage, setRequestMessage] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);

  useEffect(() => {
    fetchCandidate();
  }, [profileId]);

  const fetchCandidate = async () => {
    try {
      const response = await fetch(`${API_URL}/api/talent-pool/candidate/${profileId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setCandidate(data.candidate);
      } else if (response.status === 403) {
        toast({
          title: 'Access Denied',
          description: 'Subscription required to view profiles',
          variant: 'destructive'
        });
        navigate(-1);
      } else if (response.status === 404) {
        toast({
          title: 'Not Found',
          description: 'Candidate profile not found',
          variant: 'destructive'
        });
        navigate(-1);
      }
    } catch (error) {
      console.error('Error fetching candidate:', error);
      toast({
        title: 'Error',
        description: 'Failed to load candidate profile',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRequestContact = async () => {
    if (!requestMessage.trim()) {
      toast({
        title: 'Message Required',
        description: 'Please include a message with your contact request',
        variant: 'destructive'
      });
      return;
    }

    setSendingRequest(true);
    try {
      const response = await fetch(`${API_URL}/api/talent-pool/request-contact/${profileId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ message: requestMessage })
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Request Sent',
          description: 'Your contact request has been sent to the candidate'
        });
        setShowRequestForm(false);
        setRequestMessage('');
        // Refresh candidate data
        fetchCandidate();
      } else {
        toast({
          title: 'Error',
          description: data.detail || 'Failed to send contact request',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error requesting contact:', error);
      toast({
        title: 'Error',
        description: 'Failed to send contact request',
        variant: 'destructive'
      });
    } finally {
      setSendingRequest(false);
    }
  };

  const getExperienceBadgeColor = (level) => {
    const colors = {
      entry: 'bg-green-100 text-green-700',
      mid: 'bg-blue-100 text-blue-700',
      senior: 'bg-purple-100 text-purple-700',
      executive: 'bg-orange-100 text-orange-700'
    };
    return colors[level] || 'bg-gray-100 text-gray-700';
  };

  const formatExperienceLevel = (level) => {
    const levels = {
      entry: 'Entry Level (0-2 years)',
      mid: 'Mid Level (3-5 years)',
      senior: 'Senior (6-10 years)',
      executive: 'Executive (10+ years)'
    };
    return levels[level] || level;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="py-8 text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Candidate Not Found</h2>
            <p className="text-gray-600 mb-4">This profile may no longer be available.</p>
            <Button onClick={() => navigate('/talent-pool')}>
              Back to Talent Pool
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            className="text-white hover:bg-white/10 mb-4"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            {/* Profile Picture */}
            <div className="flex-shrink-0">
              {candidate.profile_picture_url ? (
                <img 
                  src={`${API_URL}${candidate.profile_picture_url}`}
                  alt={candidate.full_name}
                  className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-4 border-white shadow-lg"
                />
              ) : (
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-white/20 flex items-center justify-center text-4xl font-bold">
                  {candidate.full_name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              )}
            </div>
            
            {/* Name and Title */}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">{candidate.full_name}</h1>
                {candidate.is_remote_worker && (
                  <Badge className="bg-white/20 text-white border-white/30">
                    🌍 Remote Worker
                  </Badge>
                )}
              </div>
              <p className="text-xl text-white/80 mb-3">{candidate.job_title}</p>
              <Badge className={`${getExperienceBadgeColor(candidate.experience_level)} text-sm px-3 py-1`}>
                {formatExperienceLevel(candidate.experience_level)}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Left Column - Main Info */}
          <div className="md:col-span-2 space-y-6">
            {/* Professional Summary */}
            {candidate.summary && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Professional Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 whitespace-pre-wrap">{candidate.summary}</p>
                </CardContent>
              </Card>
            )}

            {/* Bio / About */}
            {candidate.bio && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    About Me
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 whitespace-pre-wrap">{candidate.bio}</p>
                </CardContent>
              </Card>
            )}

            {/* Skills */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Skills
                </CardTitle>
              </CardHeader>
              <CardContent>
                {candidate.skills && candidate.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {candidate.skills.map((skill, i) => (
                      <Badge key={i} variant="secondary" className="text-sm">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No skills listed</p>
                )}
              </CardContent>
            </Card>

            {/* CV Download */}
            {candidate.cv_url && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Resume / CV
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    onClick={() => window.open(candidate.cv_url, '_blank')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download CV
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Contact & Details */}
          <div className="space-y-6">
            {/* Quick Info */}
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Briefcase className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Industry</p>
                    <p className="font-medium">{candidate.industry || 'Not specified'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Location</p>
                    <p className="font-medium">{candidate.location || 'Not specified'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <Award className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Experience Level</p>
                    <p className="font-medium">{formatExperienceLevel(candidate.experience_level)}</p>
                  </div>
                </div>
                {candidate.is_remote_worker && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                      <Globe className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Work Preference</p>
                      <p className="font-medium text-indigo-600">Available for Remote Work</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contact Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Contact
                </CardTitle>
              </CardHeader>
              <CardContent>
                {candidate.contact_approved ? (
                  // Contact details revealed
                  <div className="space-y-3">
                    <div className="p-3 bg-green-50 rounded-lg border border-green-200 mb-4">
                      <p className="text-sm text-green-700 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Contact request approved
                      </p>
                    </div>
                    {candidate.contact_email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <a href={`mailto:${candidate.contact_email}`} className="text-blue-600 hover:underline">
                          {candidate.contact_email}
                        </a>
                      </div>
                    )}
                    {candidate.contact_phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <a href={`tel:${candidate.contact_phone}`} className="text-blue-600 hover:underline">
                          {candidate.contact_phone}
                        </a>
                      </div>
                    )}
                  </div>
                ) : candidate.contact_request_pending ? (
                  // Request pending
                  <div className="text-center py-4">
                    <Clock className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                    <p className="font-medium text-gray-700">Contact Request Pending</p>
                    <p className="text-sm text-gray-500">
                      Waiting for the candidate to approve your request
                    </p>
                  </div>
                ) : showRequestForm ? (
                  // Request form
                  <div className="space-y-4">
                    <div>
                      <Label>Message to Candidate</Label>
                      <Textarea
                        placeholder="Introduce yourself and explain why you'd like to connect..."
                        value={requestMessage}
                        onChange={(e) => setRequestMessage(e.target.value)}
                        rows={4}
                        className="mt-1"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        className="flex-1"
                        onClick={handleRequestContact}
                        disabled={sendingRequest}
                      >
                        {sendingRequest ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Send className="h-4 w-4 mr-2" />
                        )}
                        Send Request
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowRequestForm(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Request button
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-600 mb-4">
                      Request contact to get this candidate&apos;s email and phone number
                    </p>
                    <Button onClick={() => setShowRequestForm(true)} className="w-full">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Request Contact
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TalentPoolProfile;
