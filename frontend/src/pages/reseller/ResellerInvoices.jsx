import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Receipt, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

const ResellerInvoices = () => {
  const { token } = useAuth();
  const { formatPrice } = useTheme();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

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
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="border-t hover:bg-gray-50">
                      <td className="py-4 px-6 font-mono text-sm">{invoice.invoice_number}</td>
                      <td className="py-4 px-6">{invoice.period}</td>
                      <td className="py-4 px-6 font-medium">{formatPrice(invoice.amount)}</td>
                      <td className="py-4 px-6 text-gray-500">
                        {new Date(invoice.due_date).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-6">{getStatusBadge(invoice.status)}</td>
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
            <p>• Contact support@upshift.co.za for payment queries</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResellerInvoices;
