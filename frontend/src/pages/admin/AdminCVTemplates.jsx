import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  FileText, Upload, Trash2, Edit2, Eye, Download, Search, 
  Plus, X, CheckCircle, AlertCircle, Loader2, FolderOpen 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useToast } from '../../hooks/use-toast';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminCVTemplates = () => {
  const { token } = useAuth();
  const { toast } = useToast();
  
  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPlaceholders, setShowPlaceholders] = useState(false);
  const [placeholders, setPlaceholders] = useState(null);

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
      const response = await fetch(`${API_URL}/api/cv-templates/admin/list`, {
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

  const templatesByCategory = filteredTemplates.reduce((acc, template) => {
    const cat = template.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(template);
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CV Templates</h1>
          <p className="text-gray-500">Manage .docx CV templates for the platform</p>
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

      {/* Templates List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : Object.keys(templatesByCategory).length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FolderOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No templates found</h3>
            <p className="text-gray-500 mt-2">Upload your first .docx CV template to get started</p>
            <Button onClick={() => setShowUploadModal(true)} className="mt-4">
              <Upload className="h-4 w-4 mr-2" />
              Upload Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        Object.entries(templatesByCategory).map(([catId, catTemplates]) => {
          const category = categories.find(c => c.id === catId) || { name: catId, description: '' };
          return (
            <Card key={catId}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {category.name}
                  <span className="text-sm font-normal text-gray-500">({catTemplates.length})</span>
                </CardTitle>
                <CardDescription>{category.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {catTemplates.map(template => (
                    <div 
                      key={template.id} 
                      className={`border rounded-lg p-4 ${template.is_active ? 'bg-white' : 'bg-gray-50 opacity-60'}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-medium">{template.name}</h4>
                          <p className="text-xs text-gray-500">{template.original_filename}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          template.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {template.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      
                      {template.description && (
                        <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                      )}
                      
                      <div className="flex items-center text-xs text-gray-500 mb-3">
                        <span>Used {template.usage_count || 0} times</span>
                        <span className="mx-2">•</span>
                        <span>{template.placeholders_found?.length || 0} placeholders</span>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => toggleActive(template.id, template.is_active)}
                        >
                          {template.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(`${API_URL}${template.file_url}`, '_blank')}
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDelete(template.id, template.name)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadTemplateModal
          categories={categories}
          token={token}
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            setShowUploadModal(false);
            fetchTemplates();
            toast({ title: 'Success', description: 'Template uploaded successfully' });
          }}
        />
      )}

      {/* Placeholders Modal */}
      {showPlaceholders && placeholders && (
        <PlaceholdersModal
          placeholders={placeholders}
          onClose={() => setShowPlaceholders(false)}
        />
      )}
    </div>
  );
};

// Upload Modal Component
const UploadTemplateModal = ({ categories, token, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    category: categories[0]?.id || 'professional',
    description: ''
  });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a .docx file');
      return;
    }

    setUploading(true);
    setError('');

    const data = new FormData();
    data.append('file', file);
    data.append('name', formData.name);
    data.append('category', formData.category);
    data.append('description', formData.description);
    if (preview) {
      data.append('preview', preview);
    }

    try {
      const response = await fetch(`${API_URL}/api/cv-templates/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: data
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        onSuccess();
      } else {
        setError(result.detail || 'Upload failed');
      }
    } catch (err) {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold">Upload CV Template</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Template Name *</label>
            <Input
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Modern Professional"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Category *</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the template..."
              className="w-full px-3 py-2 border rounded-lg"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Template File (.docx) *</label>
            <div className={`border-2 border-dashed rounded-lg p-6 text-center ${file ? 'border-green-300 bg-green-50' : 'border-gray-300'}`}>
              {file ? (
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-green-700">{file.name}</span>
                  <button 
                    type="button" 
                    onClick={() => setFile(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <span className="text-gray-600">Click to upload .docx file</span>
                  <input
                    type="file"
                    accept=".docx"
                    onChange={(e) => setFile(e.target.files[0])}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Preview Image (optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPreview(e.target.files[0])}
              className="w-full text-sm"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={uploading} className="flex-1">
              {uploading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...</>
              ) : (
                <><Upload className="h-4 w-4 mr-2" /> Upload Template</>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Placeholders Documentation Modal
const PlaceholdersModal = ({ placeholders, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
          <h3 className="text-lg font-semibold">Template Placeholders Guide</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <p className="text-gray-600">
            Use these placeholders in your .docx templates. They will be replaced with actual data when generating CVs.
          </p>

          {Object.entries(placeholders).map(([section, items]) => (
            <div key={section}>
              <h4 className="font-medium text-gray-900 capitalize mb-3 pb-2 border-b">
                {section.replace('_', ' ')}
              </h4>
              <div className="grid gap-2">
                {Object.entries(items).map(([placeholder, description]) => (
                  placeholder !== 'note' ? (
                    <div key={placeholder} className="flex items-start gap-3 text-sm">
                      <code className="bg-gray-100 px-2 py-1 rounded font-mono text-blue-600 whitespace-nowrap">
                        {placeholder}
                      </code>
                      <span className="text-gray-600">{description}</span>
                    </div>
                  ) : (
                    <p key="note" className="text-xs text-gray-500 italic mt-2">{description}</p>
                  )
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminCVTemplates;
