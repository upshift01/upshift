import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  FileText, Upload, Trash2, Eye, Download, Search, 
  Plus, X, CheckCircle, AlertCircle, Loader2, FolderOpen 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { useToast } from '../../hooks/use-toast';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ResellerCVTemplates = () => {
  const { token, user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef(null);
  
  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPlaceholders, setShowPlaceholders] = useState(false);
  const [placeholders, setPlaceholders] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    name: '',
    category: 'professional',
    description: '',
    file: null
  });

  useEffect(() => {
    fetchCategories();
    fetchTemplates();
    fetchPlaceholders();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_URL}/api/cv-templates/categories`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      // Fetch reseller-specific templates
      const response = await fetch(`${API_URL}/api/cv-templates/reseller/list`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlaceholders = async () => {
    try {
      const response = await fetch(`${API_URL}/api/cv-templates/placeholders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPlaceholders(data.placeholders);
      }
    } catch (error) {
      console.error('Error fetching placeholders:', error);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadForm.file || !uploadForm.name) {
      toast({ title: 'Error', description: 'Please provide a name and select a file', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadForm.file);
      formData.append('name', uploadForm.name);
      formData.append('category', uploadForm.category);
      formData.append('description', uploadForm.description);

      const response = await fetch(`${API_URL}/api/cv-templates/reseller/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Template uploaded successfully' });
        setShowUploadModal(false);
        setUploadForm({ name: '', category: 'professional', description: '', file: null });
        fetchTemplates();
      } else {
        const data = await response.json();
        toast({ title: 'Error', description: data.detail || 'Failed to upload template', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to upload template', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (templateId, templateName) => {
    if (!window.confirm(`Are you sure you want to delete "${templateName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/cv-templates/${templateId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        toast({ title: 'Template Deleted', description: 'Template has been removed' });
        fetchTemplates();
      } else {
        const data = await response.json();
        toast({ title: 'Error', description: data.detail || 'Failed to delete template', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete template', variant: 'destructive' });
    }
  };

  const toggleActive = async (templateId, currentState) => {
    try {
      const response = await fetch(`${API_URL}/api/cv-templates/${templateId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ is_active: !currentState })
      });

      if (response.ok) {
        toast({ title: 'Success', description: `Template ${!currentState ? 'activated' : 'deactivated'}` });
        fetchTemplates();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update template', variant: 'destructive' });
    }
  };

  const filteredTemplates = templates.filter(t => {
    const matchesCategory = !selectedCategory || t.category === selectedCategory;
    const matchesSearch = !searchTerm || 
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCategoryColor = (category) => {
    const colors = {
      'professional': 'bg-blue-100 text-blue-800',
      'creative': 'bg-green-100 text-green-800',
      'ats-friendly': 'bg-gray-100 text-gray-800',
      'academic': 'bg-purple-100 text-purple-800',
      'executive': 'bg-red-100 text-red-800',
      'entry-level': 'bg-yellow-100 text-yellow-800',
      'industry-specific': 'bg-teal-100 text-teal-800',
      'minimalist': 'bg-slate-100 text-slate-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CV Templates</h1>
          <p className="text-gray-500">Manage custom .docx CV templates for your partner site</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowPlaceholders(true)}>
            <Eye className="h-4 w-4 mr-2" />
            View Placeholders
          </Button>
          <Button onClick={() => setShowUploadModal(true)} className="bg-blue-600 hover:bg-blue-700">
            <Upload className="h-4 w-4 mr-2" />
            Upload Template
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-blue-600">{templates.length}</div>
            <div className="text-sm text-gray-500">Total Templates</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-green-600">{templates.filter(t => t.is_active).length}</div>
            <div className="text-sm text-gray-500">Active</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-purple-600">{categories.length}</div>
            <div className="text-sm text-gray-500">Categories</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-orange-600">
              {templates.reduce((sum, t) => sum + (t.usage_count || 0), 0)}
            </div>
            <div className="text-sm text-gray-500">Total Uses</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border rounded-lg min-w-[200px]"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Templates List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FolderOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
            <p className="text-gray-500 mb-4">
              {templates.length === 0 
                ? "You haven't uploaded any custom templates yet."
                : "No templates match your search criteria."}
            </p>
            {templates.length === 0 && (
              <Button onClick={() => setShowUploadModal(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Your First Template
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredTemplates.map(template => (
            <Card key={template.id} className={`${!template.is_active ? 'opacity-60' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-14 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{template.name}</h3>
                        <Badge className={getCategoryColor(template.category)}>
                          {template.category}
                        </Badge>
                        {!template.is_active && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 line-clamp-1 mb-2">
                        {template.description || 'No description'}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span>{template.original_filename || template.filename}</span>
                        <span>Used {template.usage_count || 0} times</span>
                        <span>{template.placeholders_found?.length || 0} placeholders</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleActive(template.id, template.is_active)}
                    >
                      {template.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                    {template.file_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`${API_URL}${template.file_url}`, '_blank')}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(template.id, template.name)}
                      className="text-red-600 hover:text-red-700 hover:border-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Upload CV Template</h2>
              <button onClick={() => setShowUploadModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <Label>Template Name *</Label>
                <Input
                  value={uploadForm.name}
                  onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })}
                  placeholder="e.g., Professional Blue Template"
                  required
                />
              </div>
              
              <div>
                <Label>Category</Label>
                <select
                  value={uploadForm.category}
                  onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <Label>Description</Label>
                <Textarea
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                  placeholder="Brief description of the template style and use case..."
                  rows={3}
                />
              </div>
              
              <div>
                <Label>Template File (.docx) *</Label>
                <div 
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-gray-50 ${
                    uploadForm.file ? 'border-green-300 bg-green-50' : 'border-gray-300'
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".docx"
                    onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files?.[0] })}
                    className="hidden"
                  />
                  {uploadForm.file ? (
                    <div className="flex items-center justify-center gap-2 text-green-600">
                      <CheckCircle className="h-5 w-5" />
                      <span>{uploadForm.file.name}</span>
                    </div>
                  ) : (
                    <div className="text-gray-500">
                      <Upload className="h-8 w-8 mx-auto mb-2" />
                      <p>Click to select a .docx file</p>
                      <p className="text-xs">Use placeholders like {"{{FULL_NAME}}"}, {"{{EMAIL}}"}, etc.</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowUploadModal(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={uploading} className="flex-1">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                  Upload
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Placeholders Modal */}
      {showPlaceholders && placeholders && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold">Template Placeholders</h2>
              <button onClick={() => setShowPlaceholders(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <p className="text-gray-600 mb-4">
                Use these placeholders in your .docx templates. They will be replaced with user data when generating CVs.
              </p>
              {Object.entries(placeholders).map(([section, items]) => (
                <div key={section} className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-2 capitalize">{section}</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    {Object.entries(items).map(([placeholder, description]) => (
                      <div key={placeholder} className="flex items-start gap-3">
                        <code className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-mono">
                          {placeholder}
                        </code>
                        <span className="text-gray-600 text-sm">{description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResellerCVTemplates;
