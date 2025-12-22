import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Receipt, CheckCircle, Clock, AlertTriangle, CreditCard, ExternalLink, Loader2, Search, Filter, Download, Send, Eye, Plus, X, Link2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';

const ResellerInvoices = () => {
  const { token } = useAuth();
  const { formatPrice, theme } = useTheme();
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(null);
  const [newInvoice, setNewInvoice] = useState({
    customer_id: '',
    customer_name: '',
    customer_email: '',
    plan_name: '',
    amount: '',
    due_date: ''
  });

  useEffect(() => {
    fetchCustomerInvoices();
    fetchCustomers();
  }, []);

  const fetchCustomerInvoices = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/reseller/customer-invoices`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setInvoices(data.invoices || []);
      }
    } catch (error) {
      console.error('Error fetching customer invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/reseller/customers-list`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCustomers(data.customers || []);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const handleCreateInvoice = async () => {
    if (!newInvoice.customer_name || !newInvoice.customer_email || !newInvoice.amount) {
      alert('Please fill in customer name, email, and amount');
      return;
    }

    setCreating(true);
    try {
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/reseller/customer-invoices/create`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            ...newInvoice,
            amount: parseFloat(newInvoice.amount)
          })
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setInvoices([data.invoice, ...invoices]);
        setShowCreateModal(false);
        setNewInvoice({
          customer_id: '',
          customer_name: '',
          customer_email: '',
          plan_name: '',
          amount: '',
          due_date: ''
        });
        alert('Invoice created successfully!');
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to create invoice');
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      alert('Error creating invoice');
    } finally {
      setCreating(false);
    }
  };

  const handleGeneratePaymentLink = async (invoiceId) => {
    setGeneratingLink(invoiceId);
    try {
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/reseller/customer-invoices/${invoiceId}/create-payment-link`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        // Update invoice in state with payment URL
        setInvoices(invoices.map(inv => 
          inv.id === invoiceId ? { ...inv, payment_url: data.payment_url } : inv
        ));
        // Copy to clipboard
        navigator.clipboard.writeText(data.payment_url);
        alert('Payment link created and copied to clipboard!');
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to generate payment link');
      }
    } catch (error) {
      console.error('Error generating payment link:', error);
      alert('Error generating payment link');
    } finally {
      setGeneratingLink(null);
    }
  };

  const handleCustomerSelect = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setNewInvoice({
        ...newInvoice,
        customer_id: customer.id,
        customer_name: customer.full_name || '',
        customer_email: customer.email || ''
      });
    }
  };

  const handleSendReminder = async (invoiceId) => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/reseller/customer-invoices/${invoiceId}/send-reminder`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      if (response.ok) {
        alert('Payment reminder sent successfully!');
      } else {
        alert('Failed to send reminder');
      }
    } catch (error) {
      console.error('Error sending reminder:', error);
      alert('Error sending reminder');
    }
  };

  const handleMarkAsPaid = async (invoiceId) => {
    if (!window.confirm('Are you sure you want to mark this invoice as paid?')) return;
    
    try {
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/reseller/customer-invoices/${invoiceId}/mark-paid`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      if (response.ok) {
        fetchCustomerInvoices();
        alert('Invoice marked as paid!');
      } else {
        alert('Failed to update invoice');
      }
    } catch (error) {
      console.error('Error updating invoice:', error);
      alert('Error updating invoice');
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      paid: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      overdue: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };
    const icons = {
      paid: CheckCircle,
      pending: Clock,
      overdue: AlertTriangle,
      cancelled: AlertTriangle
    };
    const Icon = icons[status] || Clock;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const isOverdue = (dueDate) => {
    return new Date(dueDate) < new Date();
  };

  // Filter invoices based on search and status
  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const actualStatus = invoice.status === 'pending' && isOverdue(invoice.due_date) ? 'overdue' : invoice.status;
    const matchesStatus = statusFilter === 'all' || actualStatus === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Calculate summary stats
  const stats = {
    total: invoices.length,
    paid: invoices.filter(i => i.status === 'paid').length,
    pending: invoices.filter(i => i.status === 'pending' && !isOverdue(i.due_date)).length,
    overdue: invoices.filter(i => i.status === 'pending' && isOverdue(i.due_date)).length,
    totalRevenue: invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + (i.amount || 0), 0),
    outstanding: invoices.filter(i => i.status === 'pending').reduce((sum, i) => sum + (i.amount || 0), 0)
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customer Invoices</h1>
          <p className="text-gray-600">Manage and track invoices for your customers</p>
        </div>
        <Button 
          onClick={() => setShowCreateModal(true)}
          style={{ backgroundColor: theme.primaryColor }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Invoice
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500">Total Invoices</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500">Paid</div>
            <div className="text-2xl font-bold text-green-600">{stats.paid}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500">Pending</div>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500">Overdue</div>
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="text-sm text-green-700">Total Revenue (Paid)</div>
            <div className="text-2xl font-bold text-green-800">{formatPrice(stats.totalRevenue)}</div>
          </CardContent>
        </Card>
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4">
            <div className="text-sm text-yellow-700">Outstanding Amount</div>
            <div className="text-2xl font-bold text-yellow-800">{formatPrice(stats.outstanding)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by customer name, email, or invoice #"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg text-sm"
            >
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No customer invoices found</p>
              <p className="text-sm text-gray-400">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'Create your first invoice using the button above'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-6 font-medium text-gray-600">Invoice #</th>
                    <th className="text-left py-3 px-6 font-medium text-gray-600">Customer</th>
                    <th className="text-left py-3 px-6 font-medium text-gray-600">Plan</th>
                    <th className="text-left py-3 px-6 font-medium text-gray-600">Amount</th>
                    <th className="text-left py-3 px-6 font-medium text-gray-600">Due Date</th>
                    <th className="text-left py-3 px-6 font-medium text-gray-600">Status</th>
                    <th className="text-left py-3 px-6 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((invoice) => {
                    const actualStatus = invoice.status === 'pending' && isOverdue(invoice.due_date) ? 'overdue' : invoice.status;
                    return (
                      <tr key={invoice.id} className="border-t hover:bg-gray-50">
                        <td className="py-4 px-6 font-mono text-sm">{invoice.invoice_number}</td>
                        <td className="py-4 px-6">
                          <div className="font-medium">{invoice.customer_name}</div>
                          <div className="text-sm text-gray-500">{invoice.customer_email}</div>
                        </td>
                        <td className="py-4 px-6">{invoice.plan_name || 'N/A'}</td>
                        <td className="py-4 px-6 font-medium">{formatPrice(invoice.amount)}</td>
                        <td className="py-4 px-6 text-gray-500">
                          <span className={actualStatus === 'overdue' ? 'text-red-600 font-medium' : ''}>
                            {new Date(invoice.due_date).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          {getStatusBadge(actualStatus)}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            {invoice.status !== 'paid' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleSendReminder(invoice.id)}
                                  title="Send Reminder"
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleMarkAsPaid(invoice.id)}
                                  title="Mark as Paid"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedInvoice(invoice)}
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Invoice Details</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setSelectedInvoice(null)}>×</Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-500">Invoice Number</div>
                  <div className="font-mono font-medium">{selectedInvoice.invoice_number}</div>
                </div>
                <div>
                  <div className="text-gray-500">Status</div>
                  <div>{getStatusBadge(selectedInvoice.status === 'pending' && isOverdue(selectedInvoice.due_date) ? 'overdue' : selectedInvoice.status)}</div>
                </div>
                <div>
                  <div className="text-gray-500">Customer</div>
                  <div className="font-medium">{selectedInvoice.customer_name}</div>
                </div>
                <div>
                  <div className="text-gray-500">Email</div>
                  <div>{selectedInvoice.customer_email}</div>
                </div>
                <div>
                  <div className="text-gray-500">Plan</div>
                  <div>{selectedInvoice.plan_name || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-gray-500">Amount</div>
                  <div className="font-bold text-lg">{formatPrice(selectedInvoice.amount)}</div>
                </div>
                <div>
                  <div className="text-gray-500">Issue Date</div>
                  <div>{new Date(selectedInvoice.created_at).toLocaleDateString()}</div>
                </div>
                <div>
                  <div className="text-gray-500">Due Date</div>
                  <div className={isOverdue(selectedInvoice.due_date) && selectedInvoice.status !== 'paid' ? 'text-red-600 font-medium' : ''}>
                    {new Date(selectedInvoice.due_date).toLocaleDateString()}
                  </div>
                </div>
                {selectedInvoice.paid_date && (
                  <div className="col-span-2">
                    <div className="text-gray-500">Paid Date</div>
                    <div className="text-green-600">{new Date(selectedInvoice.paid_date).toLocaleDateString()}</div>
                  </div>
                )}
              </div>
              
              {selectedInvoice.status !== 'paid' && (
                <div className="flex gap-2 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    onClick={() => handleSendReminder(selectedInvoice.id)}
                    className="flex-1"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send Reminder
                  </Button>
                  <Button 
                    onClick={() => handleMarkAsPaid(selectedInvoice.id)}
                    className="flex-1"
                    style={{ backgroundColor: theme.primaryColor }}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Paid
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ResellerInvoices;
