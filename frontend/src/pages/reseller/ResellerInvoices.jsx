import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Receipt, CheckCircle, Clock, AlertTriangle, CreditCard, ExternalLink, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

const ResellerInvoices = () => {
  const { token } = useAuth();
  const { formatPrice, theme } = useTheme();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payingInvoice, setPayingInvoice] = useState(null);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/reseller/invoices`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setInvoices(data.invoices);
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePayInvoice = async (invoiceId) => {
    setPayingInvoice(invoiceId);
    try {
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/reseller/invoices/${invoiceId}/pay`,
        {
          method: 'POST',
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.redirect_url) {
          // Store checkout info for verification on return
          localStorage.setItem('pending_invoice_payment', JSON.stringify({
            invoiceId: invoiceId,
            checkoutId: data.checkout_id
          }));
          // Redirect to Yoco payment page
          window.location.href = data.redirect_url;
        }
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to initiate payment');
      }
    } catch (error) {
      console.error('Error initiating payment:', error);
      alert('Failed to initiate payment. Please try again.');
    } finally {
      setPayingInvoice(null);
    }
  };

  // Check for returning from payment
  useEffect(() => {
    const checkPaymentReturn = async () => {
      const pendingPayment = localStorage.getItem('pending_invoice_payment');
      if (pendingPayment && window.location.search.includes('success')) {
        const { invoiceId, checkoutId } = JSON.parse(pendingPayment);
        localStorage.removeItem('pending_invoice_payment');
        
        try {
          const response = await fetch(
            `${process.env.REACT_APP_BACKEND_URL}/api/reseller/invoices/${invoiceId}/verify-payment?checkout_id=${checkoutId}`,
            {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` }
            }
          );
          
          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              alert('Payment successful! Your invoice has been marked as paid.');
              fetchInvoices();
            }
          }
        } catch (error) {
          console.error('Error verifying payment:', error);
        }
      }
    };
    
    if (token) {
      checkPaymentReturn();
    }
  }, [token]);

  const getStatusBadge = (status) => {
    const styles = {
      paid: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      overdue: 'bg-red-100 text-red-800'
    };
    const icons = {
      paid: CheckCircle,
      pending: Clock,
      overdue: AlertTriangle
    };
    const Icon = icons[status] || Clock;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
        <Icon className="h-3 w-3" />
        {status}
      </span>
    );
  };

  const isOverdue = (dueDate) => {
    return new Date(dueDate) < new Date();
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Platform Invoices</h1>
        <p className="text-gray-600">Your monthly subscription invoices</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No invoices yet</p>
              <p className="text-sm text-gray-400">Invoices are generated monthly</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-6 font-medium text-gray-600">Invoice #</th>
                    <th className="text-left py-3 px-6 font-medium text-gray-600">Period</th>
                    <th className="text-left py-3 px-6 font-medium text-gray-600">Amount</th>
                    <th className="text-left py-3 px-6 font-medium text-gray-600">Due Date</th>
                    <th className="text-left py-3 px-6 font-medium text-gray-600">Status</th>
                    <th className="text-left py-3 px-6 font-medium text-gray-600">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="border-t hover:bg-gray-50">
                      <td className="py-4 px-6 font-mono text-sm">{invoice.invoice_number}</td>
                      <td className="py-4 px-6">{invoice.period}</td>
                      <td className="py-4 px-6 font-medium">{formatPrice(invoice.amount)}</td>
                      <td className="py-4 px-6 text-gray-500">
                        <span className={isOverdue(invoice.due_date) && invoice.status !== 'paid' ? 'text-red-600 font-medium' : ''}>
                          {new Date(invoice.due_date).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        {getStatusBadge(
                          invoice.status === 'pending' && isOverdue(invoice.due_date) 
                            ? 'overdue' 
                            : invoice.status
                        )}
                      </td>
                      <td className="py-4 px-6">
                        {invoice.status === 'paid' ? (
                          <span className="text-sm text-gray-500 flex items-center gap-1">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            Paid {invoice.paid_date && new Date(invoice.paid_date).toLocaleDateString()}
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handlePayInvoice(invoice.id)}
                            disabled={payingInvoice === invoice.id}
                            className="flex items-center gap-2"
                            style={{ backgroundColor: theme.primaryColor }}
                          >
                            {payingInvoice === invoice.id ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <CreditCard className="h-4 w-4" />
                                Pay Now
                              </>
                            )}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Payment Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• Invoices are generated on the 1st of each month</p>
            <p>• Payment is due within 15 days</p>
            <p>• Platform fee: R2,500/month for unlimited customers</p>
            <p>• Payments are processed securely via Yoco</p>
            <p>• Contact support@upshift.co.za for payment queries</p>
          </div>
        </CardContent>
      </Card>

      {/* Payment Methods Info */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Accepted Payment Methods
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg">
              <span className="text-sm font-medium">Visa</span>
            </div>
            <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg">
              <span className="text-sm font-medium">Mastercard</span>
            </div>
            <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg">
              <span className="text-sm font-medium">American Express</span>
            </div>
            <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg">
              <span className="text-sm font-medium">Instant EFT</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            All payments are securely processed by Yoco. Your card details are never stored on our servers.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResellerInvoices;
