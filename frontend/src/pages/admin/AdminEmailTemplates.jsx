import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  Mail, Edit, Eye, RotateCcw, Send, Loader2, CheckCircle,
  XCircle, Code, FileText, Building2, CreditCard, Briefcase
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const AdminEmailTemplates = () => {
  const { token } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState({});
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  // Edit form state
  const [editForm, setEditForm] = useState({
    subject: '',
    body_html: '',
    is_active: true
  });

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/email-templates/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.success) {
        setTemplates(data.templates || []);
        setCategories(data.categories || {});
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: 'Error',
        description: 'Failed to load email templates',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const openEditModal = async (template) => {
    try {
      const res = await fetch(`${API_URL}/api/email-templates/${template.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.success) {
        setSelectedTemplate(data.template);
        setEditForm({
          subject: data.template.custom_subject || data.template.default_subject,
          body_html: data.template.custom_body_html || '',
          is_active: data.template.is_active
        });
        setShowEditModal(true);
      }
    } catch (error) {
      console.error('Error fetching template:', error);
    }
  };

  const openPreviewModal = async (template) => {
    try {
      const res = await fetch(`${API_URL}/api/email-templates/${template.id}/preview`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.success) {
        setSelectedTemplate(template);
        setPreviewData(data.preview);
        setShowPreviewModal(true);
      }
    } catch (error) {
      console.error('Error fetching preview:', error);
    }
  };

  const handleSave = async () => {
    if (!selectedTemplate) return;
    setProcessing(true);
    
    try {
      const res = await fetch(`${API_URL}/api/email-templates/${selectedTemplate.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editForm)
      });
      const data = await res.json();
      
      if (data.success) {
        toast({ title: 'Success', description: 'Template saved successfully' });
        setShowEditModal(false);
        fetchTemplates();
      } else {
        toast({ title: 'Error', description: data.detail, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save template', variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = async (template) => {
    if (!window.confirm(`Reset "${template.name}" to default? This will remove all customizations.`)) return;
    
    try {
      const res = await fetch(`${API_URL}/api/email-templates/${template.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.success) {
        toast({ title: 'Success', description: 'Template reset to default' });
        fetchTemplates();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to reset template', variant: 'destructive' });
    }
  };

  const handleSendTest = async (template) => {
    try {
      const res = await fetch(`${API_URL}/api/email-templates/${template.id}/test`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.success) {
        toast({ title: 'Success', description: data.message });
      } else {
        toast({ title: 'Error', description: data.detail, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to send test email', variant: 'destructive' });
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'employer': return <Building2 className="h-4 w-4" />;
      case 'jobs': return <Briefcase className="h-4 w-4" />;
      case 'contracts': return <FileText className="h-4 w-4" />;
      case 'payments': return <CreditCard className="h-4 w-4" />;
      default: return <Mail className="h-4 w-4" />;
    }
  };

  const getCategoryLabel = (category) => {
    switch (category) {
      case 'employer': return 'Employer Management';
      case 'jobs': return 'Jobs & Proposals';
      case 'contracts': return 'Contracts';
      case 'payments': return 'Payments';
      default: return 'General';
    }
  };

  const renderTemplateCard = (template) => (
    <Card key={template.id} className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-white font-medium truncate">{template.name}</h3>
              {template.is_customized && (
                <Badge className="bg-blue-500/20 text-blue-400 text-xs">Customized</Badge>
              )}
              {!template.is_active && (
                <Badge className="bg-red-500/20 text-red-400 text-xs">Disabled</Badge>
              )}
            </div>
            <p className="text-slate-400 text-sm mb-2">{template.description}</p>
            <p className="text-slate-500 text-xs font-mono truncate">
              Subject: {template.custom_subject || template.default_subject}
            </p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => openPreviewModal(template)}
              title="Preview"
            >
              <Eye className="h-4 w-4 text-slate-400" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => openEditModal(template)}
              title="Edit"
            >
              <Edit className="h-4 w-4 text-slate-400" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleSendTest(template)}
              title="Send Test Email"
            >
              <Send className="h-4 w-4 text-slate-400" />
            </Button>
            {template.is_customized && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleReset(template)}
                title="Reset to Default"
              >
                <RotateCcw className="h-4 w-4 text-amber-400" />
              </Button>
            )}
          </div>
        </div>
        {template.variables && (
          <div className="mt-3 pt-3 border-t border-slate-700">
            <p className="text-slate-500 text-xs mb-1">Variables:</p>
            <div className="flex flex-wrap gap-1">
              {template.variables.map((v) => (
                <code key={v} className="text-xs bg-slate-700 text-blue-300 px-1.5 py-0.5 rounded">
                  {`{{${v}}}`}
                </code>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-email-templates">
      {/* Header */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Mail className="h-5 w-5 text-purple-400" />
            Email Templates
          </CardTitle>
          <CardDescription className="text-slate-400">
            Customize email notifications sent by the platform. Use variables like {`{{variable_name}}`} to insert dynamic content.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Templates by Category */}
      <Tabs defaultValue="employer" className="space-y-6">
        <TabsList className="bg-slate-800 border-slate-700">
          {Object.keys(categories).map((cat) => (
            <TabsTrigger 
              key={cat} 
              value={cat}
              className="data-[state=active]:bg-slate-700 text-slate-300"
            >
              <span className="flex items-center gap-2">
                {getCategoryIcon(cat)}
                {getCategoryLabel(cat)}
                <Badge variant="secondary" className="ml-1 text-xs">
                  {categories[cat].length}
                </Badge>
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(categories).map(([cat, catTemplates]) => (
          <TabsContent key={cat} value={cat} className="space-y-4">
            <div className="grid gap-4">
              {catTemplates.map(renderTemplateCard)}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Email Template</DialogTitle>
            <DialogDescription className="text-slate-400">
              {selectedTemplate?.name} - {selectedTemplate?.description}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm text-slate-400 block mb-1">Subject Line</label>
              <Input
                value={editForm.subject}
                onChange={(e) => setEditForm(f => ({ ...f, subject: e.target.value }))}
                className="bg-slate-800 border-slate-700 text-white font-mono"
                placeholder={selectedTemplate?.default_subject}
              />
            </div>
            
            <div>
              <label className="text-sm text-slate-400 block mb-1">Email Body (HTML)</label>
              <textarea
                value={editForm.body_html}
                onChange={(e) => setEditForm(f => ({ ...f, body_html: e.target.value }))}
                className="w-full h-64 bg-slate-800 border border-slate-700 rounded-md p-3 text-white font-mono text-sm resize-y"
                placeholder="Leave empty to use the default template. Enter custom HTML here..."
              />
            </div>
            
            {selectedTemplate?.variables && (
              <div className="bg-slate-800 rounded-lg p-3">
                <p className="text-slate-400 text-sm mb-2">Available Variables:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedTemplate.variables.map((v) => (
                    <button
                      key={v}
                      onClick={() => {
                        const varText = `{{${v}}}`;
                        setEditForm(f => ({ ...f, body_html: f.body_html + varText }));
                      }}
                      className="text-xs bg-slate-700 hover:bg-slate-600 text-blue-300 px-2 py-1 rounded transition-colors"
                    >
                      {`{{${v}}}`}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={editForm.is_active}
                onChange={(e) => setEditForm(f => ({ ...f, is_active: e.target.checked }))}
                className="rounded"
              />
              <label htmlFor="is_active" className="text-sm text-slate-300">
                Template is active (emails will be sent)
              </label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={processing} className="bg-blue-600 hover:bg-blue-700">
              {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
            <DialogDescription className="text-slate-400">
              {selectedTemplate?.name}
            </DialogDescription>
          </DialogHeader>
          
          {previewData && (
            <div className="space-y-4">
              <div className="bg-slate-800 rounded-lg p-3">
                <p className="text-slate-400 text-xs mb-1">Subject:</p>
                <p className="text-white font-medium">{previewData.subject}</p>
              </div>
              
              <div className="bg-white rounded-lg overflow-hidden">
                {previewData.body_html ? (
                  <div 
                    className="p-4"
                    dangerouslySetInnerHTML={{ __html: previewData.body_html }}
                  />
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    <Code className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Using default template</p>
                    <p className="text-sm">Customize this template to see a preview</p>
                  </div>
                )}
              </div>
              
              <div className="bg-slate-800 rounded-lg p-3">
                <p className="text-slate-400 text-xs mb-2">Sample Data Used:</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(previewData.preview_data || {}).map(([key, value]) => (
                    <div key={key} className="flex gap-2">
                      <span className="text-blue-400">{key}:</span>
                      <span className="text-slate-300 truncate">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowPreviewModal(false)}>
              Close
            </Button>
            <Button 
              onClick={() => selectedTemplate && handleSendTest(selectedTemplate)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Send className="h-4 w-4 mr-2" />
              Send Test Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminEmailTemplates;
