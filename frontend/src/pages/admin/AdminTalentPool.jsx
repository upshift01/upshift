import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Switch } from '../../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Users, Eye, EyeOff, Loader2, Check, X, Save, Trash2, Plus,
  Search, Filter, CheckCircle, XCircle, Clock, Mail, Phone,
  Briefcase, MapPin, FileText, Crown, CreditCard, Settings
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const AdminTalentPool = () => {
  const { token } = useAuth();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState('candidates');
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [industries, setIndustries] = useState([]);
  const [experienceLevels, setExperienceLevels] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  
  // Filters
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    industry: ''
  });

  // Pricing settings
  const [pricing, setPricing] = useState({
    monthly: 99900,
    quarterly: 249900,
    annual: 799900
  });
  const [savingPricing, setSavingPricing] = useState(false);

  // New candidate form
  const [newCandidate, setNewCandidate] = useState({
    full_name: '',
    email: '',
    phone: '',
    job_title: '',
    industry: '',
    experience_level: '',
    location: '',
    skills: [],
    summary: '',
    is_visible: true,
    status: 'approved'
  });
  const [newSkill, setNewSkill] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch industries
      const industriesRes = await fetch(`${API_URL}/api/talent-pool/industries`);
      if (industriesRes.ok) {
        const data = await industriesRes.json();
        setIndustries(data.industries || []);
      }

      // Fetch experience levels
      const levelsRes = await fetch(`${API_URL}/api/talent-pool/experience-levels`);
      if (levelsRes.ok) {
        const data = await levelsRes.json();
        setExperienceLevels(data.levels || []);
      }

      // Fetch all candidates (admin view)
      const candidatesRes = await fetch(`${API_URL}/api/talent-pool/admin/candidates`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (candidatesRes.ok) {
        const data = await candidatesRes.json();
        setCandidates(data.candidates || []);
      }

      // Fetch recruiter subscriptions
      const subsRes = await fetch(`${API_URL}/api/talent-pool/admin/subscriptions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (subsRes.ok) {
        const data = await subsRes.json();
        setSubscriptions(data.subscriptions || []);
      }

      // Fetch pricing settings
      const pricingRes = await fetch(`${API_URL}/api/talent-pool/admin/pricing`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (pricingRes.ok) {
        const data = await pricingRes.json();
        if (data.pricing) {
          setPricing(data.pricing);
        }
      }

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveCandidate = async (candidateId, approved) => {
    try {
      const response = await fetch(`${API_URL}/api/talent-pool/admin/candidates/${candidateId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: approved ? 'approved' : 'rejected' })
      });

      if (response.ok) {
        toast({
          title: approved ? 'Candidate Approved' : 'Candidate Rejected',
          description: `The candidate has been ${approved ? 'approved and is now visible' : 'rejected'}`
        });
        fetchData();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update candidate status',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteCandidate = async (candidateId) => {
    if (!confirm('Are you sure you want to remove this candidate from the talent pool?')) return;
    
    try {
      const response = await fetch(`${API_URL}/api/talent-pool/admin/candidates/${candidateId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        toast({ title: 'Candidate Removed' });
        fetchData();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove candidate',
        variant: 'destructive'
      });
    }
  };

  const handleAddCandidate = async () => {
    if (!newCandidate.full_name || !newCandidate.email || !newCandidate.job_title) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in name, email, and job title',
        variant: 'destructive'
      });
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/talent-pool/admin/candidates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newCandidate)
      });

      if (response.ok) {
        toast({ title: 'Candidate Added', description: 'New candidate has been added to the talent pool' });
        setShowAddModal(false);
        setNewCandidate({
          full_name: '',
          email: '',
          phone: '',
          job_title: '',
          industry: '',
          experience_level: '',
          location: '',
          skills: [],
          summary: '',
          is_visible: true,
          status: 'approved'
        });
        fetchData();
      } else {
        const data = await response.json();
        toast({
          title: 'Error',
          description: data.detail || 'Failed to add candidate',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add candidate',
        variant: 'destructive'
      });
    }
  };

  const handleSavePricing = async () => {
    setSavingPricing(true);
    try {
      const response = await fetch(`${API_URL}/api/talent-pool/admin/pricing`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ pricing })
      });

      if (response.ok) {
        toast({ title: 'Pricing Updated', description: 'Recruiter subscription pricing has been updated' });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update pricing',
        variant: 'destructive'
      });
    } finally {
      setSavingPricing(false);
    }
  };

  const addSkillToNew = () => {
    if (newSkill.trim() && !newCandidate.skills.includes(newSkill.trim())) {
      setNewCandidate(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()]
      }));
      setNewSkill('');
    }
  };

  const removeSkillFromNew = (skill) => {
    setNewCandidate(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill)
    }));
  };

  const filteredCandidates = candidates.filter(c => {
    if (filters.status !== 'all' && c.status !== filters.status) return false;
    if (filters.industry && c.industry !== filters.industry) return false;
    if (filters.search) {
      const search = filters.search.toLowerCase();
      return (
        c.full_name?.toLowerCase().includes(search) ||
        c.email?.toLowerCase().includes(search) ||
        c.job_title?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  const getStatusBadge = (status) => {
    const badges = {
      pending: <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>,
      approved: <Badge className="bg-green-100 text-green-700"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>,
      rejected: <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>
    };
    return badges[status] || badges.pending;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Talent Pool Management</h1>
          <p className="text-gray-600">Manage candidates, subscriptions, and pricing</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="candidates" className="gap-2">
            <Users className="h-4 w-4" />
            Candidates ({candidates.length})
          </TabsTrigger>
          <TabsTrigger value="subscriptions" className="gap-2">
            <Crown className="h-4 w-4" />
            Subscriptions ({subscriptions.length})
          </TabsTrigger>
          <TabsTrigger value="pricing" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Pricing
          </TabsTrigger>
        </TabsList>

        {/* Candidates Tab */}
        <TabsContent value="candidates" className="space-y-4">
          {/* Filters & Actions */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search by name, email, or job title..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  />
                </div>
                <Select
                  value={filters.status}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={filters.industry}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, industry: value === 'all' ? '' : value }))}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Industry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Industries</SelectItem>
                    {industries.map(ind => (
                      <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={() => setShowAddModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Candidate
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Candidates List */}
          <div className="grid gap-4">
            {filteredCandidates.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">No candidates found</p>
                </CardContent>
              </Card>
            ) : (
              filteredCandidates.map(candidate => (
                <Card key={candidate.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{candidate.full_name}</h3>
                          {getStatusBadge(candidate.status)}
                          {candidate.is_visible ? (
                            <Badge variant="outline" className="text-green-600"><Eye className="h-3 w-3 mr-1" />Visible</Badge>
                          ) : (
                            <Badge variant="outline" className="text-gray-500"><EyeOff className="h-3 w-3 mr-1" />Hidden</Badge>
                          )}
                        </div>
                        <p className="text-gray-600 mb-2">{candidate.job_title}</p>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Mail className="h-4 w-4" />
                            {candidate.contact_email || candidate.email}
                          </span>
                          {candidate.contact_phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-4 w-4" />
                              {candidate.contact_phone}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Briefcase className="h-4 w-4" />
                            {candidate.industry}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {candidate.location}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {candidate.skills?.slice(0, 5).map((skill, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">{skill}</Badge>
                          ))}
                          {candidate.skills?.length > 5 && (
                            <Badge variant="secondary" className="text-xs">+{candidate.skills.length - 5}</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {candidate.status === 'pending' && (
                          <>
                            <Button size="sm" onClick={() => handleApproveCandidate(candidate.id, true)}>
                              <Check className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleApproveCandidate(candidate.id, false)}>
                              <X className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                        <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleDeleteCandidate(candidate.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Subscriptions Tab */}
        <TabsContent value="subscriptions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Recruiter Subscriptions</CardTitle>
              <CardDescription>Manage recruiter access to the talent pool</CardDescription>
            </CardHeader>
            <CardContent>
              {subscriptions.length === 0 ? (
                <div className="text-center py-8">
                  <Crown className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">No active subscriptions</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {subscriptions.map(sub => (
                    <div key={sub.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{sub.user_name || sub.user_email}</p>
                        <p className="text-sm text-gray-500">{sub.user_email}</p>
                      </div>
                      <div className="text-right">
                        <Badge className={sub.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                          {sub.plan_name}
                        </Badge>
                        <p className="text-sm text-gray-500 mt-1">
                          Expires: {new Date(sub.expires_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pricing Tab */}
        <TabsContent value="pricing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recruiter Subscription Pricing</CardTitle>
              <CardDescription>Set the pricing for recruiter access to the talent pool (in Rands)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label>Monthly Access (R)</Label>
                  <Input
                    type="number"
                    value={pricing.monthly / 100}
                    onChange={(e) => setPricing(prev => ({ ...prev, monthly: Math.round(parseFloat(e.target.value) * 100) }))}
                    placeholder="999"
                  />
                  <p className="text-xs text-gray-500 mt-1">30 days access</p>
                </div>
                <div>
                  <Label>Quarterly Access (R)</Label>
                  <Input
                    type="number"
                    value={pricing.quarterly / 100}
                    onChange={(e) => setPricing(prev => ({ ...prev, quarterly: Math.round(parseFloat(e.target.value) * 100) }))}
                    placeholder="2499"
                  />
                  <p className="text-xs text-gray-500 mt-1">90 days access</p>
                </div>
                <div>
                  <Label>Annual Access (R)</Label>
                  <Input
                    type="number"
                    value={pricing.annual / 100}
                    onChange={(e) => setPricing(prev => ({ ...prev, annual: Math.round(parseFloat(e.target.value) * 100) }))}
                    placeholder="7999"
                  />
                  <p className="text-xs text-gray-500 mt-1">365 days access</p>
                </div>
              </div>
              <Button onClick={handleSavePricing} disabled={savingPricing}>
                {savingPricing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save Pricing
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Candidate Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Add New Candidate</CardTitle>
              <CardDescription>Manually add a candidate to the talent pool</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Full Name *</Label>
                  <Input
                    value={newCandidate.full_name}
                    onChange={(e) => setNewCandidate(prev => ({ ...prev, full_name: e.target.value }))}
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={newCandidate.email}
                    onChange={(e) => setNewCandidate(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={newCandidate.phone}
                    onChange={(e) => setNewCandidate(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+27 12 345 6789"
                  />
                </div>
                <div>
                  <Label>Job Title *</Label>
                  <Input
                    value={newCandidate.job_title}
                    onChange={(e) => setNewCandidate(prev => ({ ...prev, job_title: e.target.value }))}
                    placeholder="Software Developer"
                  />
                </div>
                <div>
                  <Label>Industry</Label>
                  <Select
                    value={newCandidate.industry}
                    onValueChange={(value) => setNewCandidate(prev => ({ ...prev, industry: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {industries.map(ind => (
                        <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Experience Level</Label>
                  <Select
                    value={newCandidate.experience_level}
                    onValueChange={(value) => setNewCandidate(prev => ({ ...prev, experience_level: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      {experienceLevels.map(level => (
                        <SelectItem key={level.id} value={level.id}>{level.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label>Location</Label>
                  <Input
                    value={newCandidate.location}
                    onChange={(e) => setNewCandidate(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Johannesburg, South Africa"
                  />
                </div>
              </div>

              <div>
                <Label>Skills</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    placeholder="Add a skill"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkillToNew())}
                  />
                  <Button type="button" variant="outline" onClick={addSkillToNew}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {newCandidate.skills.map((skill, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      {skill}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => removeSkillFromNew(skill)} />
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label>Professional Summary</Label>
                <Textarea
                  value={newCandidate.summary}
                  onChange={(e) => setNewCandidate(prev => ({ ...prev, summary: e.target.value }))}
                  placeholder="Brief description of the candidate..."
                  rows={4}
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={newCandidate.is_visible}
                  onCheckedChange={(checked) => setNewCandidate(prev => ({ ...prev, is_visible: checked }))}
                />
                <Label>Visible to recruiters</Label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddCandidate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Candidate
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminTalentPool;
