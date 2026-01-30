import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import {
  FileText, Loader2, ArrowLeft, DollarSign, Calendar, CheckCircle,
  Clock, AlertCircle, Building2, User, XCircle, Milestone, Play,
  Send, ThumbsUp, CreditCard, Edit, Trash2, FileSignature, Wallet,
  BanknoteIcon, Shield
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const ContractDetails = () => {
  const { contractId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { token, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [contract, setContract] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Handle payment callback
  useEffect(() => {
    const payment = searchParams.get('payment');
    const sessionId = searchParams.get('session_id');
    
    if (payment === 'success' && sessionId) {
      verifyPayment(sessionId);
    } else if (payment === 'cancelled') {
      toast({
        title: 'Payment Cancelled',
        description: 'Your payment was not processed.',
        variant: 'destructive'
      });
      // Clear URL params
      navigate(`/contracts/${contractId}`, { replace: true });
    }
  }, [searchParams]);

  const verifyPayment = async (sessionId) => {
    setPaymentLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/payments/status/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.payment_status === 'paid') {
          toast({
            title: 'Payment Successful!',
            description: 'The funds have been added to escrow.'
          });
          fetchContract(); // Refresh contract data
        } else {
          // Poll a few more times
          setTimeout(() => verifyPayment(sessionId), 2000);
          return;
        }
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
    } finally {
      setPaymentLoading(false);
      // Clear URL params
      navigate(`/contracts/${contractId}`, { replace: true });
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchContract();
  }, [isAuthenticated, contractId]);

  const fetchContract = async () => {
    try {
      const response = await fetch(`${API_URL}/api/contracts/${contractId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setContract(data.contract);
      } else {
        toast({
          title: 'Error',
          description: 'Contract not found',
          variant: 'destructive'
        });
        navigate('/contracts');
      }
    } catch (error) {
      console.error('Error fetching contract:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action, milestoneId = null) => {
    setActionLoading(true);
    try {
      let url = `${API_URL}/api/contracts/${contractId}`;
      let body = {};

      switch (action) {
        case 'sign':
          url += '/sign';
          break;
        case 'complete':
          url += '/complete';
          break;
        case 'cancel':
          url += '/cancel';
          body = { reason: 'Contract cancelled by user' };
          break;
        case 'submit_milestone':
          url += `/milestones/${milestoneId}/submit`;
          body = { notes: 'Work completed' };
          break;
        case 'approve_milestone':
          url += `/milestones/${milestoneId}/approve`;
          break;
        case 'pay_milestone':
          url += `/milestones/${milestoneId}/pay`;
          break;
        default:
          return;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Action completed successfully`
        });
        fetchContract();
      } else {
        const data = await response.json();
        throw new Error(data.detail || 'Action failed');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'draft':
        return <Badge className="bg-gray-100 text-gray-800 gap-1"><Clock className="h-3 w-3" />Draft</Badge>;
      case 'active':
        return <Badge className="bg-green-100 text-green-800 gap-1"><CheckCircle className="h-3 w-3" />Active</Badge>;
      case 'completed':
        return <Badge className="bg-blue-100 text-blue-800 gap-1"><CheckCircle className="h-3 w-3" />Completed</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800 gap-1"><XCircle className="h-3 w-3" />Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getMilestoneStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-800 gap-1"><Play className="h-3 w-3" />In Progress</Badge>;
      case 'submitted':
        return <Badge className="bg-yellow-100 text-yellow-800 gap-1"><Send className="h-3 w-3" />Submitted</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 gap-1"><ThumbsUp className="h-3 w-3" />Approved</Badge>;
      case 'paid':
        return <Badge className="bg-emerald-100 text-emerald-800 gap-1"><CreditCard className="h-3 w-3" />Paid</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatCurrency = (amount, currency) => {
    const symbol = currency === 'ZAR' ? 'R' : '$';
    return `${symbol}${amount?.toLocaleString() || 0}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!contract) return null;

  const isEmployer = contract.user_role === 'employer';
  const isContractor = contract.user_role === 'contractor';
  const paymentProgress = contract.payment_amount > 0 
    ? (contract.total_paid / contract.payment_amount) * 100 
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/contracts')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Contracts
        </Button>

        {/* Contract Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CardTitle className="text-xl">{contract.title}</CardTitle>
                  {getStatusBadge(contract.status)}
                </div>
                <CardDescription>
                  {contract.job_title} • {contract.company_name || 'Independent Contract'}
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-sm">
                {isEmployer ? (
                  <><Building2 className="h-3 w-3 mr-1" />You are Employer</>
                ) : (
                  <><User className="h-3 w-3 mr-1" />You are Contractor</>
                )}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {/* Parties */}
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-600 font-medium mb-1">EMPLOYER</p>
                <p className="font-semibold">{contract.employer_name}</p>
                <p className="text-sm text-gray-600">{contract.company_name}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-xs text-green-600 font-medium mb-1">CONTRACTOR</p>
                <p className="font-semibold">{contract.contractor_name}</p>
              </div>
            </div>

            {/* Contract Details */}
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div>
                <p className="text-xs text-gray-500 mb-1">Contract Value</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(contract.payment_amount, contract.payment_currency)}
                </p>
                <p className="text-sm text-gray-500">{contract.payment_type} • {contract.payment_schedule}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Start Date</p>
                <p className="font-medium">{formatDate(contract.start_date)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">End Date</p>
                <p className="font-medium">{contract.end_date ? formatDate(contract.end_date) : 'Ongoing'}</p>
              </div>
            </div>

            {/* Payment Progress */}
            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Payment Progress</span>
                <span className="font-medium">
                  {formatCurrency(contract.total_paid, contract.payment_currency)} / {formatCurrency(contract.payment_amount, contract.payment_currency)}
                </span>
              </div>
              <Progress value={paymentProgress} className="h-3" />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 pt-4 border-t">
              {/* Contractor: Sign draft contract */}
              {isContractor && contract.status === 'draft' && !contract.contractor_signed && (
                <Button
                  onClick={() => handleAction('sign')}
                  disabled={actionLoading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileSignature className="h-4 w-4 mr-2" />}
                  Sign & Accept Contract
                </Button>
              )}

              {/* Employer: Complete active contract */}
              {isEmployer && contract.status === 'active' && (
                <Button
                  onClick={() => handleAction('complete')}
                  disabled={actionLoading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark as Completed
                </Button>
              )}

              {/* Cancel button */}
              {contract.status !== 'completed' && contract.status !== 'cancelled' && (
                <Button
                  variant="outline"
                  onClick={() => {
                    if (confirm('Are you sure you want to cancel this contract?')) {
                      handleAction('cancel');
                    }
                  }}
                  disabled={actionLoading}
                  className="text-red-600 hover:text-red-700"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel Contract
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Description */}
        {contract.description && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 whitespace-pre-wrap">{contract.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Milestones */}
        {contract.has_milestones && contract.milestones?.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Milestone className="h-5 w-5" />
                Milestones
              </CardTitle>
              <CardDescription>
                {contract.milestones.filter(m => m.status === 'paid').length} of {contract.milestones.length} completed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {contract.milestones.map((milestone, idx) => (
                  <div
                    key={milestone.id}
                    className={`p-4 rounded-lg border ${
                      milestone.status === 'paid' ? 'bg-green-50 border-green-200' :
                      milestone.status === 'approved' ? 'bg-blue-50 border-blue-200' :
                      milestone.status === 'submitted' ? 'bg-yellow-50 border-yellow-200' :
                      'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-gray-500">#{idx + 1}</span>
                          <h4 className="font-semibold">{milestone.title}</h4>
                          {getMilestoneStatusBadge(milestone.status)}
                        </div>
                        {milestone.description && (
                          <p className="text-sm text-gray-600 mb-2">{milestone.description}</p>
                        )}
                        <div className="flex gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            {formatCurrency(milestone.amount, contract.payment_currency)}
                          </span>
                          {milestone.due_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              Due: {formatDate(milestone.due_date)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Milestone Actions */}
                      <div className="flex gap-2">
                        {/* Contractor: Submit for review */}
                        {isContractor && contract.status === 'active' && 
                          (milestone.status === 'pending' || milestone.status === 'in_progress') && (
                          <Button
                            size="sm"
                            onClick={() => handleAction('submit_milestone', milestone.id)}
                            disabled={actionLoading}
                          >
                            <Send className="h-4 w-4 mr-1" />
                            Submit
                          </Button>
                        )}

                        {/* Employer: Approve submitted milestone */}
                        {isEmployer && milestone.status === 'submitted' && (
                          <Button
                            size="sm"
                            onClick={() => handleAction('approve_milestone', milestone.id)}
                            disabled={actionLoading}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <ThumbsUp className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                        )}

                        {/* Employer: Accept and create contract */}
                        {isEmployer && milestone.status === 'approved' && (
                          <Button
                            size="sm"
                            onClick={() => handleAction('pay_milestone', milestone.id)}
                            disabled={actionLoading}
                            className="bg-emerald-600 hover:bg-emerald-700"
                          >
                            <CreditCard className="h-4 w-4 mr-1" />
                            Mark Paid
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Terms */}
        {contract.terms && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Terms & Conditions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 whitespace-pre-wrap text-sm">{contract.terms}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ContractDetails;
