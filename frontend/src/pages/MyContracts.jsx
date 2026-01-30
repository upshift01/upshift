import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  FileText, Loader2, Plus, Eye, DollarSign, Calendar,
  CheckCircle, Clock, AlertCircle, Building2, User,
  ArrowRight, Briefcase, XCircle
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const MyContracts = () => {
  const navigate = useNavigate();
  const { token, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState([]);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchData();
  }, [isAuthenticated]);

  const fetchData = async () => {
    try {
      const [contractsRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/api/contracts/my-contracts`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_URL}/api/contracts/stats/overview`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (contractsRes.ok) {
        const data = await contractsRes.json();
        setContracts(data.contracts || []);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching contracts:', error);
    } finally {
      setLoading(false);
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

  const formatCurrency = (amount, currency) => {
    const symbol = currency === 'ZAR' ? 'R' : '$';
    return `${symbol}${amount?.toLocaleString() || 0}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const filteredContracts = contracts.filter(c => {
    if (activeTab !== 'all' && c.status !== activeTab) return false;
    if (roleFilter !== 'all' && c.user_role !== roleFilter) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="h-6 w-6 text-blue-600" />
              My Contracts
            </h1>
            <p className="text-gray-600">Manage your work contracts and agreements</p>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Contracts</p>
                    <p className="text-2xl font-bold">{stats.total_contracts}</p>
                  </div>
                  <FileText className="h-8 w-8 text-gray-400" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">As Employer</p>
                    <p className="text-2xl font-bold">{stats.as_employer?.active || 0}</p>
                    <p className="text-xs text-gray-400">active</p>
                  </div>
                  <Building2 className="h-8 w-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">As Contractor</p>
                    <p className="text-2xl font-bold">{stats.as_contractor?.active || 0}</p>
                    <p className="text-xs text-gray-400">active</p>
                  </div>
                  <User className="h-8 w-8 text-green-400" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Earned</p>
                    <p className="text-2xl font-bold text-green-600">
                      ${stats.as_contractor?.total_earned?.toLocaleString() || 0}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-400" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="draft">Draft</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex gap-2">
            <Button
              variant={roleFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRoleFilter('all')}
            >
              All Roles
            </Button>
            <Button
              variant={roleFilter === 'employer' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRoleFilter('employer')}
            >
              <Building2 className="h-4 w-4 mr-1" />
              As Employer
            </Button>
            <Button
              variant={roleFilter === 'contractor' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRoleFilter('contractor')}
            >
              <User className="h-4 w-4 mr-1" />
              As Contractor
            </Button>
          </div>
        </div>

        {/* Contracts List */}
        {filteredContracts.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Contracts Yet</h3>
              <p className="text-gray-500 mb-4">
                Contracts are created when you accept proposals for your jobs
              </p>
              <Link to="/remote-jobs/my-jobs">
                <Button>
                  <Briefcase className="h-4 w-4 mr-2" />
                  View My Jobs
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredContracts.map((contract) => (
              <Card
                key={contract.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/contracts/${contract.id}`)}
                data-testid={`contract-card-${contract.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg text-gray-900">
                          {contract.title}
                        </h3>
                        {getStatusBadge(contract.status)}
                        <Badge variant="outline" className="text-xs">
                          {contract.user_role === 'employer' ? (
                            <><Building2 className="h-3 w-3 mr-1" />Employer</>
                          ) : (
                            <><User className="h-3 w-3 mr-1" />Contractor</>
                          )}
                        </Badge>
                      </div>

                      <p className="text-sm text-gray-600 mb-2">
                        {contract.job_title} • {contract.company_name || 'Independent'}
                      </p>

                      <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          {contract.user_role === 'employer' ? (
                            <>
                              <User className="h-4 w-4" />
                              <span>Contractor: {contract.contractor_name}</span>
                            </>
                          ) : (
                            <>
                              <Building2 className="h-4 w-4" />
                              <span>Client: {contract.employer_name}</span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          <span>{formatCurrency(contract.payment_amount, contract.payment_currency)}</span>
                          <span className="text-gray-400">
                            ({contract.payment_type})
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>Started {formatDate(contract.start_date)}</span>
                        </div>
                      </div>

                      {contract.has_milestones && (
                        <div className="mt-2">
                          <Badge variant="secondary" className="text-xs">
                            {contract.milestones?.filter(m => m.status === 'paid').length || 0}/
                            {contract.milestones?.length || 0} milestones completed
                          </Badge>
                        </div>
                      )}
                    </div>

                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4 mr-1" />
                      View
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>

                  {/* Progress bar for payments */}
                  {contract.payment_amount > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Payment Progress</span>
                        <span>
                          {formatCurrency(contract.total_paid, contract.payment_currency)} of{' '}
                          {formatCurrency(contract.payment_amount, contract.payment_currency)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all"
                          style={{
                            width: `${Math.min((contract.total_paid / contract.payment_amount) * 100, 100)}%`
                          }}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyContracts;
