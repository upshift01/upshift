import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Receipt, Plus, CheckCircle, Clock, AlertTriangle, RefreshCw, Wifi, WifiOff, Download, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

const AUTO_REFRESH_INTERVAL = 15000; // 15 seconds

const AdminInvoices = () => {
  const { token } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [generating, setGenerating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [recentlyPaid, setRecentlyPaid] = useState(new Set());

  const fetchInvoices = useCallback(async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setIsRefreshing(true);
    
    try {
      const url = new URL(`${process.env.REACT_APP_BACKEND_URL}/api/admin/invoices`);
      if (statusFilter) url.searchParams.append('status_filter', statusFilter);
      
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        
        // Check for newly paid invoices
        const newInvoices = data.invoices;
        const oldInvoiceMap = new Map(invoices.map(inv => [inv.id, inv]));
        const newlyPaidIds = new Set();
        
        newInvoices.forEach(inv => {
          const oldInv = oldInvoiceMap.get(inv.id);
          if (oldInv && oldInv.status === 'pending' && inv.status === 'paid') {
            newlyPaidIds.add(inv.id);
          }
        });
        
        if (newlyPaidIds.size > 0) {
          setRecentlyPaid(prev => new Set([...prev, ...newlyPaidIds]));
          // Clear highlight after 5 seconds
          setTimeout(() => {
            setRecentlyPaid(prev => {
              const next = new Set(prev);
              newlyPaidIds.forEach(id => next.delete(id));
              return next;
            });
          }, 5000);
        }
        
        setInvoices(newInvoices);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [token, statusFilter, invoices]);

  // Initial fetch
  useEffect(() => {
    fetchInvoices();
  }, [statusFilter]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      fetchInvoices(true);
    }, AUTO_REFRESH_INTERVAL);
    
    return () => clearInterval(interval);
  }, [autoRefresh, fetchInvoices]);

  const generateInvoices = async () => {
    setGenerating(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/generate-invoices`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        alert(`Generated ${data.invoices_created} invoices for period ${data.period}`);
        fetchInvoices();
      }
    } catch (error) {
      console.error('Error generating invoices:', error);
    } finally {
      setGenerating(false);
    }
  };

  const markAsPaid = async (invoiceId) => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/admin/invoices/${invoiceId}/mark-paid`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      if (response.ok) {
        // Add to recently paid for highlight effect
        setRecentlyPaid(prev => new Set([...prev, invoiceId]));
        setTimeout(() => {
          setRecentlyPaid(prev => {
            const next = new Set(prev);
            next.delete(invoiceId);
            return next;
          });
        }, 5000);
        fetchInvoices();
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to mark invoice as paid');
      }
    } catch (error) {
      console.error('Error marking invoice as paid:', error);
    }
  };

  const cancelInvoice = async (invoiceId) => {
    if (!window.confirm('Are you sure you want to cancel this invoice? This will remove it from analytics.')) {
      return;
    }
    try {
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/admin/invoices/${invoiceId}/cancel`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      if (response.ok) {
        fetchInvoices();
        alert('Invoice cancelled successfully');
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to cancel invoice');
      }
    } catch (error) {
      console.error('Error cancelling invoice:', error);
    }
  };

  const downloadInvoicePDF = async (invoiceId, invoiceNumber) => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/admin/invoices/${invoiceId}/pdf`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice_${invoiceNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Failed to download invoice PDF');
      }
    } catch (error) {
      console.error('Error downloading invoice PDF:', error);
      alert('Error downloading invoice PDF');
    }
  };

  const formatCurrency = (cents) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(cents / 100);
  };

  const getStatusBadge = (status, isRecent = false) => {
    const styles = {
      paid: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      overdue: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-500'
    };
    const icons = {
      paid: CheckCircle,
      pending: Clock,
      overdue: AlertTriangle,
      cancelled: XCircle
    };
    const Icon = icons[status] || Clock;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.pending} ${isRecent ? 'animate-pulse ring-2 ring-green-400' : ''}`}>
        <Icon className="h-3 w-3" />
        {status}
        {isRecent && <span className="ml-1 text-[10px]">NEW</span>}
      </span>
    );
  };

  const formatLastUpdated = () => {
    if (!lastUpdated) return '';
    const seconds = Math.floor((new Date() - lastUpdated) / 1000);
    if (seconds < 10) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ago`;
  };

  // Count stats
  const pendingCount = invoices.filter(i => i.status === 'pending').length;
  const paidCount = invoices.filter(i => i.status === 'paid').length;
  const totalPending = invoices
    .filter(i => i.status === 'pending')
    .reduce((sum, i) => sum + i.amount, 0);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-600">Manage reseller subscription invoices</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Auto-refresh indicator */}
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-1 px-2 py-1 rounded ${
                autoRefresh ? 'text-green-600 bg-green-50' : 'text-gray-400 bg-gray-50'
              }`}
              title={autoRefresh ? 'Auto-refresh ON (click to disable)' : 'Auto-refresh OFF (click to enable)'}
            >
              {autoRefresh ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
              <span className="hidden sm:inline">Live</span>
            </button>
            {lastUpdated && (
              <span className="text-gray-400 text-xs">
                Updated {formatLastUpdated()}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchInvoices(true)}
              disabled={isRefreshing}
              className="p-1"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          
          <Button onClick={generateInvoices} disabled={generating}>
            <Plus className="h-4 w-4 mr-2" />
            {generating ? 'Generating...' : 'Generate Monthly Invoices'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending Invoices</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-200" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending Amount</p>
                <p className="text-2xl font-bold">{formatCurrency(totalPending)}</p>
              </div>
              <Receipt className="h-8 w-8 text-gray-200" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Paid This Period</p>
                <p className="text-2xl font-bold text-green-600">{paidCount}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex gap-4 items-center justify-between">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>
            
            {autoRefresh && (
              <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                Auto-updating every 15s
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No invoices found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Invoice #</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Reseller</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Period</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Amount</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Due Date</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => {
                    const isRecentlyPaid = recentlyPaid.has(invoice.id);
                    return (
                      <tr 
                        key={invoice.id} 
                        className={`border-b transition-colors duration-500 ${
                          isRecentlyPaid 
                            ? 'bg-green-50 hover:bg-green-100' 
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <td className="py-3 px-4 font-mono text-sm">{invoice.invoice_number}</td>
                        <td className="py-3 px-4">{invoice.reseller_name}</td>
                        <td className="py-3 px-4">{invoice.period}</td>
                        <td className="py-3 px-4 font-medium">{formatCurrency(invoice.amount)}</td>
                        <td className="py-3 px-4 text-sm">
                          {new Date(invoice.due_date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          {getStatusBadge(invoice.status, isRecentlyPaid && invoice.status === 'paid')}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => downloadInvoicePDF(invoice.id, invoice.invoice_number)}
                              title="Download PDF"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            {invoice.status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => markAsPaid(invoice.id)}
                                >
                                  Mark Paid
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => cancelInvoice(invoice.id)}
                                  className="text-gray-500 hover:text-red-600 hover:border-red-300"
                                  title="Cancel Invoice"
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {invoice.status === 'overdue' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => markAsPaid(invoice.id)}
                                >
                                  Mark Paid
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => cancelInvoice(invoice.id)}
                                  className="text-gray-500 hover:text-red-600 hover:border-red-300"
                                  title="Cancel Invoice"
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {invoice.status === 'paid' && (
                              <span className="text-sm text-gray-500">
                                Paid {invoice.paid_date && new Date(invoice.paid_date).toLocaleDateString()}
                              </span>
                            )}
                            {invoice.status === 'cancelled' && (
                              <span className="text-sm text-gray-400 italic">
                                Cancelled
                              </span>
                            )}
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
    </div>
  );
};

export default AdminInvoices;
