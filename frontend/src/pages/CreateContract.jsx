import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  FileText, Loader2, ArrowLeft, DollarSign, Calendar, Plus,
  Trash2, User, Building2, Briefcase
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const CreateContract = () => {
  const { proposalId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { token, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [proposal, setProposal] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    payment_amount: '',
    payment_currency: 'USD',
    payment_type: 'fixed',
    payment_schedule: 'on_completion',
    terms: '',
    milestones: [],
    // Comprehensive contract fields
    scope_of_work: '',
    deliverables: [],
    payment_terms: '',
    confidentiality_clause: 'Both parties agree to keep all project details, business information, and communications confidential. This obligation survives the termination of this contract.',
    termination_conditions: 'Either party may terminate this contract with 14 days written notice. In case of termination, payment will be made for all completed and approved work.',
    dispute_resolution: 'Any disputes arising from this contract will first be addressed through good-faith negotiation. If unresolved, disputes will be submitted to mediation before any legal proceedings.',
    intellectual_property: 'All work product created under this contract shall become the property of the Employer upon full payment. The Contractor retains rights to general knowledge and skills gained.'
  });

  const [newDeliverable, setNewDeliverable] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchProposal();
  }, [isAuthenticated, proposalId]);

  const fetchProposal = async () => {
    try {
      const response = await fetch(`${API_URL}/api/proposals/${proposalId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setProposal(data.proposal);
        
        // Pre-fill form data from proposal
        setFormData(prev => ({
          ...prev,
          title: `Contract for ${data.proposal.job_title}`,
          payment_amount: data.proposal.proposed_rate || '',
          payment_currency: data.proposal.currency || 'USD',
          payment_type: data.proposal.rate_type || 'fixed'
        }));
      } else {
        toast({
          title: 'Error',
          description: 'Proposal not found',
          variant: 'destructive'
        });
        navigate(-1);
      }
    } catch (error) {
      console.error('Error fetching proposal:', error);
    } finally {
      setLoading(false);
    }
  };

  const addMilestone = () => {
    setFormData(prev => ({
      ...prev,
      milestones: [
        ...prev.milestones,
        { title: '', description: '', amount: '', due_date: '' }
      ]
    }));
  };

  const removeMilestone = (index) => {
    setFormData(prev => ({
      ...prev,
      milestones: prev.milestones.filter((_, i) => i !== index)
    }));
  };

  const updateMilestone = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      milestones: prev.milestones.map((m, i) =>
        i === index ? { ...m, [field]: value } : m
      )
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast({ title: 'Error', description: 'Contract title is required', variant: 'destructive' });
      return;
    }

    if (!formData.payment_amount) {
      toast({ title: 'Error', description: 'Payment amount is required', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      // First, accept the proposal if not already accepted
      if (proposal?.status !== 'accepted') {
        const acceptRes = await fetch(`${API_URL}/api/proposals/${proposalId}/status`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ status: 'accepted' })
        });

        if (!acceptRes.ok) {
          const error = await acceptRes.json();
          throw new Error(error.detail || 'Failed to accept proposal');
        }
      }

      // Create the contract
      const payload = {
        proposal_id: proposalId,
        title: formData.title,
        description: formData.description || null,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        payment_amount: parseFloat(formData.payment_amount),
        payment_currency: formData.payment_currency,
        payment_type: formData.payment_type,
        payment_schedule: formData.payment_schedule,
        terms: formData.terms || null,
        milestones: formData.milestones
          .filter(m => m.title.trim())
          .map(m => ({
            title: m.title,
            description: m.description || null,
            amount: parseFloat(m.amount) || 0,
            due_date: m.due_date || null
          }))
      };

      const response = await fetch(`${API_URL}/api/contracts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Contract Created!',
          description: 'The contract has been sent to the contractor for review.'
        });
        navigate(`/contracts/${data.contract.id}`);
      } else {
        throw new Error(data.detail || 'Failed to create contract');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {/* Proposal Summary */}
        {proposal && (
          <Card className="mb-6 bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                  {proposal.applicant_name?.charAt(0)?.toUpperCase() || 'C'}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{proposal.applicant_name}</h3>
                  <p className="text-sm text-gray-600">
                    Applied for: {proposal.job_title}
                  </p>
                  <div className="flex gap-2 mt-1">
                    {proposal.proposed_rate && (
                      <Badge variant="secondary">
                        {proposal.currency === 'ZAR' ? 'R' : '$'}{proposal.proposed_rate.toLocaleString()}
                        /{proposal.rate_type}
                      </Badge>
                    )}
                    <Badge variant="outline">{proposal.availability}</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Contract Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Create Contract
            </CardTitle>
            <CardDescription>
              Define the terms of your working agreement
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Contract Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Senior React Developer Contract"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the scope of work..."
                    rows={3}
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_date">Start Date *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="end_date">End Date (optional)</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                  <p className="text-xs text-gray-500 mt-1">Leave empty for ongoing contracts</p>
                </div>
              </div>

              {/* Payment */}
              <div className="p-4 bg-gray-50 rounded-lg space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Payment Terms
                </h4>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="payment_amount">Amount *</Label>
                    <Input
                      id="payment_amount"
                      type="number"
                      value={formData.payment_amount}
                      onChange={(e) => setFormData({ ...formData, payment_amount: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>Currency</Label>
                    <Select
                      value={formData.payment_currency}
                      onValueChange={(v) => setFormData({ ...formData, payment_currency: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="ZAR">ZAR (R)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Payment Type</Label>
                    <Select
                      value={formData.payment_type}
                      onValueChange={(v) => setFormData({ ...formData, payment_type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed Price</SelectItem>
                        <SelectItem value="hourly">Hourly Rate</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Payment Schedule</Label>
                  <Select
                    value={formData.payment_schedule}
                    onValueChange={(v) => setFormData({ ...formData, payment_schedule: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="on_completion">On Completion</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="bi-weekly">Bi-Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="milestones">By Payment Milestones</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Payment Milestones */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Payment Milestones (Optional)</h4>
                  <Button type="button" variant="outline" size="sm" onClick={addMilestone}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Payment Milestone
                  </Button>
                </div>

                {formData.milestones.map((milestone, idx) => (
                  <div key={idx} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-500">Payment Milestone #{idx + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMilestone(idx)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid md:grid-cols-2 gap-3">
                      <Input
                        placeholder="Milestone title"
                        value={milestone.title}
                        onChange={(e) => updateMilestone(idx, 'title', e.target.value)}
                      />
                      <Input
                        type="number"
                        placeholder="Amount"
                        value={milestone.amount}
                        onChange={(e) => updateMilestone(idx, 'amount', e.target.value)}
                      />
                    </div>
                    <div className="grid md:grid-cols-2 gap-3">
                      <Input
                        placeholder="Description (optional)"
                        value={milestone.description}
                        onChange={(e) => updateMilestone(idx, 'description', e.target.value)}
                      />
                      <Input
                        type="date"
                        placeholder="Due date"
                        value={milestone.due_date}
                        onChange={(e) => updateMilestone(idx, 'due_date', e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Terms */}
              <div>
                <Label htmlFor="terms">Additional Terms & Conditions (Optional)</Label>
                <Textarea
                  id="terms"
                  value={formData.terms}
                  onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                  placeholder="Any specific terms, conditions, or agreements..."
                  rows={3}
                />
              </div>

              {/* Comprehensive Contract Sections */}
              <div className="space-y-6 pt-4 border-t">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Contract Details
                </h3>

                {/* Scope of Work */}
                <div>
                  <Label htmlFor="scope_of_work">Scope of Work *</Label>
                  <Textarea
                    id="scope_of_work"
                    value={formData.scope_of_work}
                    onChange={(e) => setFormData({ ...formData, scope_of_work: e.target.value })}
                    placeholder="Describe the detailed scope of work, responsibilities, and expectations..."
                    rows={4}
                    required
                  />
                </div>

                {/* Deliverables */}
                <div>
                  <Label>Deliverables</Label>
                  <div className="space-y-2 mt-2">
                    {formData.deliverables.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                        <span className="flex-1">{item}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const updated = formData.deliverables.filter((_, i) => i !== idx);
                            setFormData({ ...formData, deliverables: updated });
                          }}
                          className="text-red-600 h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Input
                        value={newDeliverable}
                        onChange={(e) => setNewDeliverable(e.target.value)}
                        placeholder="Add a deliverable..."
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (newDeliverable.trim()) {
                              setFormData({
                                ...formData,
                                deliverables: [...formData.deliverables, newDeliverable.trim()]
                              });
                              setNewDeliverable('');
                            }
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          if (newDeliverable.trim()) {
                            setFormData({
                              ...formData,
                              deliverables: [...formData.deliverables, newDeliverable.trim()]
                            });
                            setNewDeliverable('');
                          }
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Payment Terms */}
                <div>
                  <Label htmlFor="payment_terms">Payment Terms</Label>
                  <Textarea
                    id="payment_terms"
                    value={formData.payment_terms}
                    onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                    placeholder="e.g., Payment due within 7 days of milestone approval..."
                    rows={2}
                  />
                </div>

                {/* Confidentiality */}
                <div>
                  <Label htmlFor="confidentiality">Confidentiality Clause</Label>
                  <Textarea
                    id="confidentiality"
                    value={formData.confidentiality_clause}
                    onChange={(e) => setFormData({ ...formData, confidentiality_clause: e.target.value })}
                    rows={3}
                  />
                </div>

                {/* Termination Conditions */}
                <div>
                  <Label htmlFor="termination">Termination Conditions</Label>
                  <Textarea
                    id="termination"
                    value={formData.termination_conditions}
                    onChange={(e) => setFormData({ ...formData, termination_conditions: e.target.value })}
                    rows={3}
                  />
                </div>

                {/* Dispute Resolution */}
                <div>
                  <Label htmlFor="dispute">Dispute Resolution</Label>
                  <Textarea
                    id="dispute"
                    value={formData.dispute_resolution}
                    onChange={(e) => setFormData({ ...formData, dispute_resolution: e.target.value })}
                    rows={3}
                  />
                </div>

                {/* Intellectual Property */}
                <div>
                  <Label htmlFor="ip">Intellectual Property Rights</Label>
                  <Textarea
                    id="ip"
                    value={formData.intellectual_property}
                    onChange={(e) => setFormData({ ...formData, intellectual_property: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Create Contract
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateContract;
