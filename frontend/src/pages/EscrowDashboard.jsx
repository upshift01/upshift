import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Progress } from '../components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Shield, Wallet, DollarSign, ArrowRight, Clock, CheckCircle,
  AlertTriangle, FileText, Loader2, RefreshCw, Eye, AlertCircle,
  Building2, User, Calendar, TrendingUp, TrendingDown, Scale,
  Download, MessageSquare, XCircle
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const EscrowDashboard = () => {
  const navigate = useNavigate();
  const { token, isAuthenticated, user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [disputes, setDisputes] = useState([]);
  const [selectedContract, setSelectedContract] = useState(null);
  const [contractDetails, setContractDetails] = useState(null);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [statementData, setStatementData] = useState(null);
  const [disputeForm, setDisputeForm] = useState({
    contract_id: '',
    milestone_id: '',
    reason: '',
    description: ''
  });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchDashboard();
    fetchDisputes();
  }, [isAuthenticated]);

  const fetchDashboard = async () => {
    try {
      const response = await fetch(`${API_URL}/api/payments/escrow/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setDashboard(data.dashboard);
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDisputes = async () => {
    try {
      const response = await fetch(`${API_URL}/api/payments/escrow/disputes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setDisputes(data.disputes || []);
      }
    } catch (error) {
      console.error('Error fetching disputes:', error);
    }
  };

  const fetchContractEscrow = async (contractId) => {
    setActionLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/payments/escrow/contract/${contractId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setContractDetails(data);
        setSelectedContract(contractId);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load contract details',
        variant: 'destructive'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const fetchStatement = async (contractId) => {
    setActionLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/payments/escrow/statement/${contractId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setStatementData(data.statement);
        setShowStatementModal(true);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate statement',
        variant: 'destructive'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateDispute = async () => {
    if (!disputeForm.reason || !disputeForm.description) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/api/payments/escrow/dispute/${disputeForm.contract_id}/${disputeForm.milestone_id}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            reason: disputeForm.reason,
            description: disputeForm.description,
            evidence_urls: []
          })
        }
      );

      if (response.ok) {
        toast({
          title: 'Dispute Created',
          description: 'Your dispute has been submitted for review'
        });
        setShowDisputeModal(false);
        fetchDisputes();
        fetchDashboard();
      } else {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to create dispute');
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

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const isEmployer = user?.role === 'employer';
  const employerStats = dashboard?.as_employer || {};
  const contractorStats = dashboard?.as_contractor || {};

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Shield className="h-8 w-8 text-emerald-600" />
            Escrow Dashboard
          </h1>
          <p className="text-gray-600 mt-2">
            Manage your escrow funds, track payments, and resolve disputes
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* As Employer */}
          {employerStats.active_contracts > 0 && (
            <>
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm">Total Funded</p>
                      <p className="text-2xl font-bold">{formatCurrency(employerStats.total_funded)}</p>
                    </div>
                    <Wallet className="h-10 w-10 text-blue-200" />
                  </div>
                  <p className="text-blue-100 text-xs mt-2">As employer</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-emerald-100 text-sm">Released</p>
                      <p className="text-2xl font-bold">{formatCurrency(employerStats.total_released)}</p>
                    </div>
                    <TrendingUp className="h-10 w-10 text-emerald-200" />
                  </div>
                  <p className="text-emerald-100 text-xs mt-2">Paid to contractors</p>
                </CardContent>
              </Card>
            </>
          )}

          {/* As Contractor */}
          {contractorStats.active_contracts > 0 && (
            <>
              <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-sm">Secured for You</p>
                      <p className="text-2xl font-bold">{formatCurrency(contractorStats.total_funded_for_you)}</p>
                    </div>
                    <Shield className="h-10 w-10 text-purple-200" />
                  </div>
                  <p className="text-purple-100 text-xs mt-2">In escrow</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-amber-100 text-sm">Pending Release</p>
                      <p className="text-2xl font-bold">{formatCurrency(contractorStats.pending_release)}</p>
                    </div>
                    <Clock className="h-10 w-10 text-amber-200" />
                  </div>
                  <p className="text-amber-100 text-xs mt-2">Awaiting payment</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-white border">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending Actions
              {(employerStats.pending_approvals > 0 || contractorStats.awaiting_payment > 0) && (
                <Badge variant="destructive" className="ml-1">
                  {(employerStats.pending_approvals || 0) + (contractorStats.awaiting_payment || 0)}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="disputes" className="flex items-center gap-2">
              <Scale className="h-4 w-4" />
              Disputes
              {disputes.filter(d => d.status === 'open').length > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {disputes.filter(d => d.status === 'open').length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Employer Section */}
              {employerStats.active_contracts > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-blue-600" />
                      As Employer
                    </CardTitle>
                    <CardDescription>
                      {employerStats.active_contracts} active contract(s)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Escrow Funded</span>
                        <span className="font-medium">{formatCurrency(employerStats.total_funded)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Released to Contractors</span>
                        <span className="font-medium text-emerald-600">{formatCurrency(employerStats.total_released)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Held in Escrow</span>
                        <span className="font-medium text-blue-600">{formatCurrency(employerStats.pending_release)}</span>
                      </div>
                    </div>

                    {employerStats.pending_release > 0 && (
                      <div className="pt-2">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Release Progress</span>
                          <span>
                            {Math.round((employerStats.total_released / (employerStats.total_funded || 1)) * 100)}%
                          </span>
                        </div>
                        <Progress 
                          value={(employerStats.total_released / (employerStats.total_funded || 1)) * 100} 
                          className="h-2"
                        />
                      </div>
                    )}

                    {employerStats.unfunded_milestones > 0 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-amber-700">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="text-sm font-medium">
                            {employerStats.unfunded_milestones} milestone(s) need funding
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Contractor Section */}
              {contractorStats.active_contracts > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5 text-purple-600" />
                      As Contractor
                    </CardTitle>
                    <CardDescription>
                      {contractorStats.active_contracts} active contract(s)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Secured in Escrow</span>
                        <span className="font-medium">{formatCurrency(contractorStats.total_funded_for_you)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Received</span>
                        <span className="font-medium text-emerald-600">{formatCurrency(contractorStats.total_received)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Pending Release</span>
                        <span className="font-medium text-purple-600">{formatCurrency(contractorStats.pending_release)}</span>
                      </div>
                    </div>

                    {contractorStats.awaiting_payment > 0 && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-emerald-700">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-sm font-medium">
                            {contractorStats.awaiting_payment} approved milestone(s) awaiting payment release
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Pending Actions Tab */}
          <TabsContent value="pending">
            <div className="space-y-6">
              {/* Pending Approvals (Employer) */}
              {dashboard?.pending_approvals?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-amber-600">
                      <Clock className="h-5 w-5" />
                      Pending Approvals
                    </CardTitle>
                    <CardDescription>
                      Work submitted and waiting for your review
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {dashboard.pending_approvals.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-lg"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{item.milestone_title}</p>
                            <p className="text-sm text-gray-600">{item.contract_title}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              Submitted by {item.contractor_name} • {formatDate(item.submitted_at)}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-bold text-gray-900">
                              {formatCurrency(item.amount, item.currency)}
                            </span>
                            <Button
                              size="sm"
                              onClick={() => navigate(`/contracts/${item.contract_id}`)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Review
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Awaiting Payment (Contractor) */}
              {dashboard?.awaiting_payment?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-emerald-600">
                      <CheckCircle className="h-5 w-5" />
                      Awaiting Payment Release
                    </CardTitle>
                    <CardDescription>
                      Approved milestones waiting for payment release
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {dashboard.awaiting_payment.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-lg"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{item.milestone_title}</p>
                            <p className="text-sm text-gray-600">{item.contract_title}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              Approved {formatDate(item.approved_at)} • {item.employer_name}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-bold text-emerald-600">
                              {formatCurrency(item.amount, item.currency)}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(`/contracts/${item.contract_id}`)}
                            >
                              View Contract
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Unfunded Milestones (Employer) */}
              {dashboard?.unfunded_milestones?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-gray-600">
                      <Wallet className="h-5 w-5" />
                      Unfunded Milestones
                    </CardTitle>
                    <CardDescription>
                      Fund these milestones to protect both parties
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {dashboard.unfunded_milestones.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{item.milestone_title}</p>
                            <p className="text-sm text-gray-600">{item.contract_title}</p>
                            {item.due_date && (
                              <p className="text-xs text-gray-500 mt-1">
                                Due: {formatDate(item.due_date)}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-bold text-gray-900">
                              {formatCurrency(item.amount, item.currency)}
                            </span>
                            <Button
                              size="sm"
                              onClick={() => navigate(`/contracts/${item.contract_id}`)}
                            >
                              <Wallet className="h-4 w-4 mr-1" />
                              Fund
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {!dashboard?.pending_approvals?.length && 
               !dashboard?.awaiting_payment?.length && 
               !dashboard?.unfunded_milestones?.length && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">All caught up!</h3>
                    <p className="text-gray-600 mt-1">No pending actions at the moment</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Disputes Tab */}
          <TabsContent value="disputes">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="h-5 w-5" />
                  Escrow Disputes
                </CardTitle>
                <CardDescription>
                  Manage and resolve payment disputes
                </CardDescription>
              </CardHeader>
              <CardContent>
                {disputes.length > 0 ? (
                  <div className="space-y-4">
                    {disputes.map((dispute) => (
                      <div
                        key={dispute.id}
                        className={`p-4 rounded-lg border ${
                          dispute.status === 'open' ? 'bg-red-50 border-red-200' :
                          dispute.status === 'under_review' ? 'bg-amber-50 border-amber-200' :
                          'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge
                                className={
                                  dispute.status === 'open' ? 'bg-red-100 text-red-800' :
                                  dispute.status === 'under_review' ? 'bg-amber-100 text-amber-800' :
                                  'bg-gray-100 text-gray-800'
                                }
                              >
                                {dispute.status.replace('_', ' ').toUpperCase()}
                              </Badge>
                              <span className="text-sm text-gray-500">
                                {formatCurrency(dispute.amount, dispute.currency)}
                              </span>
                            </div>
                            <p className="font-medium text-gray-900">{dispute.reason}</p>
                            <p className="text-sm text-gray-600 mt-1">{dispute.description}</p>
                            <p className="text-xs text-gray-500 mt-2">
                              Created by {dispute.created_by_name} • {formatDate(dispute.created_at)}
                            </p>
                            {dispute.resolution && (
                              <div className="mt-3 p-2 bg-white rounded border">
                                <p className="text-sm font-medium text-gray-900">
                                  Resolution: {dispute.resolution.replace('_', ' ').toUpperCase()}
                                </p>
                                {dispute.resolution_notes && (
                                  <p className="text-sm text-gray-600">{dispute.resolution_notes}</p>
                                )}
                              </div>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/contracts/${dispute.contract_id}`)}
                          >
                            View Contract
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <Scale className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">No Disputes</h3>
                    <p className="text-gray-600 mt-1">You don't have any escrow disputes</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Escrow Statement Modal */}
        <Dialog open={showStatementModal} onOpenChange={setShowStatementModal}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Escrow Statement
              </DialogTitle>
              <DialogDescription>
                {statementData?.contract?.title}
              </DialogDescription>
            </DialogHeader>

            {statementData && (
              <div className="space-y-6 py-4">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <p className="text-sm text-blue-600">Total Funded</p>
                    <p className="text-xl font-bold text-blue-700">
                      {formatCurrency(statementData.summary.total_funded, statementData.contract.currency)}
                    </p>
                  </div>
                  <div className="bg-emerald-50 p-4 rounded-lg text-center">
                    <p className="text-sm text-emerald-600">Released</p>
                    <p className="text-xl font-bold text-emerald-700">
                      {formatCurrency(statementData.summary.total_released, statementData.contract.currency)}
                    </p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg text-center">
                    <p className="text-sm text-purple-600">Balance</p>
                    <p className="text-xl font-bold text-purple-700">
                      {formatCurrency(statementData.summary.current_balance, statementData.contract.currency)}
                    </p>
                  </div>
                </div>

                {/* Transaction History */}
                <div>
                  <h4 className="font-medium mb-3">Transaction History</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-3">Date</th>
                          <th className="text-left p-3">Type</th>
                          <th className="text-left p-3">Description</th>
                          <th className="text-right p-3">Credit</th>
                          <th className="text-right p-3">Debit</th>
                          <th className="text-right p-3">Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statementData.entries.map((entry, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="p-3">{formatDate(entry.date)}</td>
                            <td className="p-3">
                              <Badge variant={entry.type === 'DEPOSIT' ? 'default' : 'secondary'}>
                                {entry.type}
                              </Badge>
                            </td>
                            <td className="p-3">{entry.description}</td>
                            <td className="p-3 text-right text-emerald-600">
                              {entry.credit > 0 ? formatCurrency(entry.credit, statementData.contract.currency) : '-'}
                            </td>
                            <td className="p-3 text-right text-red-600">
                              {entry.debit > 0 ? formatCurrency(entry.debit, statementData.contract.currency) : '-'}
                            </td>
                            <td className="p-3 text-right font-medium">
                              {formatCurrency(entry.balance, statementData.contract.currency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <p className="text-xs text-gray-500 text-center">
                  Generated on {formatDate(statementData.generated_at)}
                </p>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowStatementModal(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default EscrowDashboard;
