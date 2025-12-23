import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Mail, Edit, Eye, Save, Loader2, FileText, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';

const EmailTemplates = () => {
  const { token } = useAuth();
  const { theme } = useTheme();
  const { darkMode } = useOutletContext() || {};
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [saving, setSaving] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState(null);

  const defaultTemplates = [
    {
      id: 'welcome',
      name: 'Welcome Email',
      description: 'Sent to new customers after registration',
      subject: 'Welcome to {{brand_name}}!',
      content: `Hi {{customer_name}},\n\nWelcome to {{brand_name}}! We're excited to have you on board.\n\nYour account is now active and you can start creating professional, ATS-optimised CVs and cover letters.\n\nGet started: {{portal_url}}\n\nBest regards,\n{{brand_name}} Team`
    },
    {
      id: 'invoice',
      name: 'Invoice Email',
      description: 'Sent when a new invoice is created',
      subject: 'Invoice #{{invoice_number}} from {{brand_name}}',
      content: `Hi {{customer_name}},\n\nA new invoice has been created for your account.\n\nInvoice Number: {{invoice_number}}\nAmount: {{amount}}\nDue Date: {{due_date}}\n\nPay Now: {{payment_url}}\n\nThank you for your business!\n\n{{brand_name}}`
    },
    {
      id: 'payment_success',
      name: 'Payment Confirmation',
      description: 'Sent after successful payment',
      subject: 'Payment Received - Thank You!',
      content: `Hi {{customer_name}},\n\nThank you for your payment!\n\nAmount Paid: {{amount}}\nTransaction ID: {{transaction_id}}\nPlan: {{plan_name}}\n\nYou now have full access to all features in your plan. Start creating amazing career documents!\n\nAccess Your Dashboard: {{portal_url}}\n\nBest regards,\n{{brand_name}} Team`
    },
    {
      id: 'password_reset',
      name: 'Password Reset',
      description: 'Sent when user requests password reset',
      subject: 'Reset Your Password - {{brand_name}}',
      content: `Hi {{customer_name}},\n\nWe received a request to reset your password.\n\nClick the link below to create a new password:\n{{reset_url}}\n\nThis link will expire in 24 hours.\n\nIf you didn't request this, please ignore this email.\n\n{{brand_name}} Team`
    },
    {
      id: 'reminder',
      name: 'Payment Reminder',
      description: 'Sent for overdue invoices',
      subject: 'Payment Reminder - Invoice #{{invoice_number}}',
      content: `Hi {{customer_name}},\n\nThis is a friendly reminder that invoice #{{invoice_number}} for {{amount}} is now overdue.\n\nPlease make payment at your earliest convenience to avoid service interruption.\n\nPay Now: {{payment_url}}\n\nIf you've already made payment, please disregard this message.\n\nThank you,\n{{brand_name}}`
    }
  ];

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/reseller/email-templates`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        // Merge with defaults
        const merged = defaultTemplates.map(dt => {
          const custom = data.templates?.find(t => t.id === dt.id);
          return custom ? { ...dt, ...custom, customised: true } : dt;
        });
        setTemplates(merged);
      } else {
        setTemplates(defaultTemplates);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      setTemplates(defaultTemplates);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!editingTemplate) return;
    setSaving(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/reseller/email-templates/${editingTemplate.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(editingTemplate)
      });
      if (response.ok) {
        setTemplates(templates.map(t => t.id === editingTemplate.id ? { ...editingTemplate, customised: true } : t));
        setEditingTemplate(null);
        alert('Template saved successfully!');
      }
    } catch (error) {
      console.error('Error saving template:', error);
    } finally {
      setSaving(false);
    }
  };

  const cardBg = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white';
  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-gray-400' : 'text-gray-600';

  const variables = [
    { name: '{{customer_name}}', description: 'Customer\'s full name' },
    { name: '{{customer_email}}', description: 'Customer\'s email' },
    { name: '{{brand_name}}', description: 'Your brand name' },
    { name: '{{portal_url}}', description: 'Link to customer portal' },
    { name: '{{amount}}', description: 'Payment/invoice amount' },
    { name: '{{invoice_number}}', description: 'Invoice reference' },
    { name: '{{payment_url}}', description: 'Payment link' },
  ];

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className={`text-2xl font-bold ${textPrimary}`}>Email Templates</h1>
        <p className={textSecondary}>Customise the emails sent to your customers</p>
      </div>

      {/* Variable Reference */}
      <Card className={cardBg}>
        <CardHeader>
          <CardTitle className={`text-lg ${textPrimary}`}>Available Variables</CardTitle>
          <CardDescription className={textSecondary}>Use these placeholders in your templates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {variables.map(v => (
              <div key={v.name} className={`px-3 py-1 rounded-full text-sm ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <code className={textPrimary}>{v.name}</code>
                <span className={`ml-2 text-xs ${textSecondary}`}>- {v.description}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Templates List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map(template => (
          <Card key={template.id} className={cardBg}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className={`text-lg ${textPrimary}`}>{template.name}</CardTitle>
                  <CardDescription className={textSecondary}>{template.description}</CardDescription>
                </div>
                {template.customised && (
                  <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Customised</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className={`p-3 rounded-lg mb-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <p className={`text-sm font-medium ${textPrimary}`}>Subject: {template.subject}</p>
                <p className={`text-sm ${textSecondary} mt-2 line-clamp-3`}>{template.content}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPreviewTemplate(template)} className="flex-1">
                  <Eye className="h-4 w-4 mr-1" /> Preview
                </Button>
                <Button size="sm" onClick={() => setEditingTemplate(template)} className="flex-1" style={{ backgroundColor: theme.primaryColor }}>
                  <Edit className="h-4 w-4 mr-1" /> Edit
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Modal */}
      {editingTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto ${cardBg}`}>
            <CardHeader>
              <CardTitle className={textPrimary}>Edit: {editingTemplate.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Subject Line</label>
                <Input
                  value={editingTemplate.subject}
                  onChange={(e) => setEditingTemplate({...editingTemplate, subject: e.target.value})}
                  className={darkMode ? 'bg-gray-700 border-gray-600' : ''}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Email Content</label>
                <textarea
                  value={editingTemplate.content}
                  onChange={(e) => setEditingTemplate({...editingTemplate, content: e.target.value})}
                  rows={12}
                  className={`w-full px-3 py-2 rounded-lg border font-mono text-sm ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                />
              </div>
              <div className="flex gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setEditingTemplate(null)} className="flex-1">Cancel</Button>
                <Button onClick={handleSaveTemplate} disabled={saving} className="flex-1" style={{ backgroundColor: theme.primaryColor }}>
                  {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : <><Save className="h-4 w-4 mr-2" />Save Template</>}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto ${cardBg}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className={textPrimary}>Preview: {previewTemplate.name}</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setPreviewTemplate(null)}>✕</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
                <div className={`border-b pb-3 mb-4 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <p className={`text-sm ${textSecondary}`}>Subject:</p>
                  <p className={`font-medium ${textPrimary}`}>
                    {previewTemplate.subject
                      .replace('{{brand_name}}', theme.brandName || 'Your Brand')
                      .replace('{{invoice_number}}', 'INV-2024-001')}
                  </p>
                </div>
                <div className={`whitespace-pre-wrap text-sm ${textPrimary}`}>
                  {previewTemplate.content
                    .replace(/\{\{customer_name\}\}/g, 'John Smith')
                    .replace(/\{\{brand_name\}\}/g, theme.brandName || 'Your Brand')
                    .replace(/\{\{portal_url\}\}/g, 'https://yoursite.upshift.works')
                    .replace(/\{\{amount\}\}/g, 'R1,500.00')
                    .replace(/\{\{invoice_number\}\}/g, 'INV-2024-001')
                    .replace(/\{\{due_date\}\}/g, '15 January 2025')
                    .replace(/\{\{payment_url\}\}/g, 'https://pay.yoco.com/...')
                    .replace(/\{\{plan_name\}\}/g, 'Professional Package')
                    .replace(/\{\{transaction_id\}\}/g, 'TXN-12345')
                    .replace(/\{\{reset_url\}\}/g, 'https://yoursite.upshift.works/reset/...')}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default EmailTemplates;
