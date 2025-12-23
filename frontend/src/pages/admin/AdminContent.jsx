import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Switch } from '../../components/ui/switch';
import {
  FileText, MessageSquare, Star, Sparkles, Briefcase,
  Plus, Pencil, Trash2, Loader2, Search, Eye, EyeOff,
  Image, Save, X, ChevronDown, ChevronUp
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const AdminContent = () => {
  const { token } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('cv-templates');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Data states
  const [cvTemplates, setCvTemplates] = useState([]);
  const [coverLetterTemplates, setCoverLetterTemplates] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [features, setFeatures] = useState([]);
  const [industries, setIndustries] = useState([]);
  
  // Edit states
  const [editingItem, setEditingItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({});

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  // Fetch all content
  useEffect(() => {
    fetchAllContent();
  }, []);

  const fetchAllContent = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      const [cvRes, clRes, testRes, featRes, indRes] = await Promise.all([
        fetch(`${API_URL}/api/content/admin/cv-templates`, { headers }),
        fetch(`${API_URL}/api/content/admin/cover-letter-templates`, { headers }),
        fetch(`${API_URL}/api/content/admin/testimonials`, { headers }),
        fetch(`${API_URL}/api/content/admin/features`, { headers }),
        fetch(`${API_URL}/api/content/admin/industries`, { headers })
      ]);

      if (cvRes.ok) setCvTemplates((await cvRes.json()).templates || []);
      if (clRes.ok) setCoverLetterTemplates((await clRes.json()).templates || []);
      if (testRes.ok) setTestimonials((await testRes.json()).testimonials || []);
      if (featRes.ok) setFeatures((await featRes.json()).features || []);
      if (indRes.ok) setIndustries((await indRes.json()).industries || []);
    } catch (error) {
      console.error('Error fetching content:', error);
      toast({ title: 'Error', description: 'Failed to load content', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Get endpoint based on active tab
  const getEndpoint = () => {
    const endpoints = {
      'cv-templates': 'cv-templates',
      'cover-letter-templates': 'cover-letter-templates',
      'testimonials': 'testimonials',
      'features': 'features',
      'industries': 'industries'
    };
    return endpoints[activeTab];
  };

  // Handle create/update
  const handleSave = async () => {
    setSaving(true);
    try {
      const endpoint = getEndpoint();
      const method = editingItem ? 'PUT' : 'POST';
      const url = editingItem 
        ? `${API_URL}/api/content/admin/${endpoint}/${editingItem.id}`
        : `${API_URL}/api/content/admin/${endpoint}`;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast({ title: 'Success', description: `${editingItem ? 'Updated' : 'Created'} successfully` });
        setShowForm(false);
        setEditingItem(null);
        setFormData({});
        fetchAllContent();
      } else {
        const error = await response.json();
        toast({ title: 'Error', description: error.detail || 'Operation failed', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Operation failed', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async (item) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    
    try {
      const endpoint = getEndpoint();
      const response = await fetch(`${API_URL}/api/content/admin/${endpoint}/${item.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        toast({ title: 'Deleted', description: 'Item deleted successfully' });
        fetchAllContent();
      } else {
        toast({ title: 'Error', description: 'Delete failed', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Delete failed', variant: 'destructive' });
    }
  };

  // Start editing
  const startEdit = (item) => {
    setEditingItem(item);
    setFormData({ ...item });
    setShowForm(true);
  };

  // Start creating
  const startCreate = () => {
    setEditingItem(null);
    setFormData(getDefaultFormData());
    setShowForm(true);
  };

  // Get default form data based on tab
  const getDefaultFormData = () => {
    switch (activeTab) {
      case 'cv-templates':
        return { name: '', description: '', image: '', category: 'ats', industry: 'Any', is_active: true };
      case 'cover-letter-templates':
        return { name: '', description: '', image: '', category: 'professional', industry: 'Any', tone: 'Professional', is_active: true };
      case 'testimonials':
        return { name: '', role: '', location: '', content: '', rating: 5, avatar: '', is_active: true };
      case 'features':
        return { title: '', description: '', icon: 'Sparkles', color: 'blue', order: 0, is_active: true };
      case 'industries':
        return { name: '', order: 0, is_active: true };
      default:
        return {};
    }
  };

  // Get current data based on tab
  const getCurrentData = () => {
    const data = {
      'cv-templates': cvTemplates,
      'cover-letter-templates': coverLetterTemplates,
      'testimonials': testimonials,
      'features': features,
      'industries': industries
    }[activeTab] || [];

    if (!searchTerm) return data;
    return data.filter(item => 
      JSON.stringify(item).toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Render form fields based on tab
  const renderFormFields = () => {
    switch (activeTab) {
      case 'cv-templates':
      case 'cover-letter-templates':
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Name</Label>
                <Input value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={formData.category || ''} onValueChange={(v) => setFormData({...formData, category: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ats">ATS-Optimised</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="modern">Modern</SelectItem>
                    <SelectItem value="creative">Creative</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={formData.description || ''} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Industry</Label>
                <Input value={formData.industry || ''} onChange={(e) => setFormData({...formData, industry: e.target.value})} />
              </div>
              {activeTab === 'cover-letter-templates' && (
                <div>
                  <Label>Tone</Label>
                  <Input value={formData.tone || ''} onChange={(e) => setFormData({...formData, tone: e.target.value})} />
                </div>
              )}
            </div>
            <div>
              <Label>Image URL</Label>
              <Input value={formData.image || ''} onChange={(e) => setFormData({...formData, image: e.target.value})} placeholder="https://..." />
              {formData.image && <img src={formData.image} alt="Preview" className="mt-2 h-24 w-auto rounded" />}
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={formData.is_active !== false} onCheckedChange={(v) => setFormData({...formData, is_active: v})} />
              <Label>Active</Label>
            </div>
          </>
        );
      
      case 'testimonials':
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Name</Label>
                <Input value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <Label>Role</Label>
                <Input value={formData.role || ''} onChange={(e) => setFormData({...formData, role: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Location</Label>
                <Input value={formData.location || ''} onChange={(e) => setFormData({...formData, location: e.target.value})} />
              </div>
              <div>
                <Label>Rating (1-5)</Label>
                <Select value={String(formData.rating || 5)} onValueChange={(v) => setFormData({...formData, rating: parseInt(v)})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>{n} Star{n > 1 ? 's' : ''}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Testimonial Content</Label>
              <Textarea value={formData.content || ''} onChange={(e) => setFormData({...formData, content: e.target.value})} rows={4} />
            </div>
            <div>
              <Label>Avatar URL</Label>
              <Input value={formData.avatar || ''} onChange={(e) => setFormData({...formData, avatar: e.target.value})} placeholder="https://..." />
              {formData.avatar && <img src={formData.avatar} alt="Avatar" className="mt-2 h-16 w-16 rounded-full object-cover" />}
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={formData.is_active !== false} onCheckedChange={(v) => setFormData({...formData, is_active: v})} />
              <Label>Active</Label>
            </div>
          </>
        );
      
      case 'features':
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Title</Label>
                <Input value={formData.title || ''} onChange={(e) => setFormData({...formData, title: e.target.value})} />
              </div>
              <div>
                <Label>Order</Label>
                <Input type="number" value={formData.order || 0} onChange={(e) => setFormData({...formData, order: parseInt(e.target.value)})} />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={formData.description || ''} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Icon Name</Label>
                <Select value={formData.icon || 'Sparkles'} onValueChange={(v) => setFormData({...formData, icon: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sparkles">Sparkles</SelectItem>
                    <SelectItem value="FileText">FileText</SelectItem>
                    <SelectItem value="Mail">Mail</SelectItem>
                    <SelectItem value="Target">Target</SelectItem>
                    <SelectItem value="CheckCircle">CheckCircle</SelectItem>
                    <SelectItem value="Download">Download</SelectItem>
                    <SelectItem value="Zap">Zap</SelectItem>
                    <SelectItem value="Star">Star</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Color</Label>
                <Select value={formData.color || 'blue'} onValueChange={(v) => setFormData({...formData, color: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blue">Blue</SelectItem>
                    <SelectItem value="green">Green</SelectItem>
                    <SelectItem value="purple">Purple</SelectItem>
                    <SelectItem value="orange">Orange</SelectItem>
                    <SelectItem value="teal">Teal</SelectItem>
                    <SelectItem value="pink">Pink</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={formData.is_active !== false} onCheckedChange={(v) => setFormData({...formData, is_active: v})} />
              <Label>Active</Label>
            </div>
          </>
        );
      
      case 'industries':
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Industry Name</Label>
                <Input value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <Label>Order</Label>
                <Input type="number" value={formData.order || 0} onChange={(e) => setFormData({...formData, order: parseInt(e.target.value)})} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={formData.is_active !== false} onCheckedChange={(v) => setFormData({...formData, is_active: v})} />
              <Label>Active</Label>
            </div>
          </>
        );
      
      default:
        return null;
    }
  };

  // Render item card
  const renderItemCard = (item) => {
    const isActive = item.is_active !== false;
    
    return (
      <Card key={item.id} className={`${!isActive ? 'opacity-60' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Template items */}
              {(activeTab === 'cv-templates' || activeTab === 'cover-letter-templates') && (
                <div className="flex items-start gap-3">
                  {item.image && (
                    <img src={item.image} alt={item.name} className="w-16 h-20 object-cover rounded" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{item.name}</h3>
                    <p className="text-sm text-gray-500 line-clamp-2">{item.description}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="secondary">{item.category}</Badge>
                      <Badge variant="outline">{item.industry}</Badge>
                      {activeTab === 'cover-letter-templates' && <Badge variant="outline">{item.tone}</Badge>}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Testimonials */}
              {activeTab === 'testimonials' && (
                <div className="flex items-start gap-3">
                  {item.avatar && (
                    <img src={item.avatar} alt={item.name} className="w-12 h-12 rounded-full object-cover" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold">{item.name}</h3>
                    <p className="text-sm text-gray-500">{item.role} • {item.location}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {[...Array(item.rating || 5)].map((_, i) => (
                        <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">&ldquo;{item.content}&rdquo;</p>
                  </div>
                </div>
              )}
              
              {/* Features */}
              {activeTab === 'features' && (
                <div>
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg bg-${item.color}-100 flex items-center justify-center`}>
                      <Sparkles className={`h-4 w-4 text-${item.color}-600`} />
                    </div>
                    <h3 className="font-semibold">{item.title}</h3>
                    <Badge variant="outline">Order: {item.order}</Badge>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">{item.description}</p>
                </div>
              )}
              
              {/* Industries */}
              {activeTab === 'industries' && (
                <div className="flex items-center gap-3">
                  <Briefcase className="h-5 w-5 text-gray-400" />
                  <h3 className="font-semibold">{item.name}</h3>
                  <Badge variant="outline">Order: {item.order}</Badge>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {!isActive && <Badge variant="secondary">Inactive</Badge>}
              <Button variant="ghost" size="sm" onClick={() => startEdit(item)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleDelete(item)} className="text-red-600 hover:text-red-700">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const currentData = getCurrentData();

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Content Management</h1>
          <p className="text-gray-500">Manage templates, testimonials, and features</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setShowForm(false); }}>
        <TabsList className="mb-6">
          <TabsTrigger value="cv-templates" className="gap-2">
            <FileText className="h-4 w-4" />
            CV Templates ({cvTemplates.length})
          </TabsTrigger>
          <TabsTrigger value="cover-letter-templates" className="gap-2">
            <FileText className="h-4 w-4" />
            Cover Letters ({coverLetterTemplates.length})
          </TabsTrigger>
          <TabsTrigger value="testimonials" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Testimonials ({testimonials.length})
          </TabsTrigger>
          <TabsTrigger value="features" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Features ({features.length})
          </TabsTrigger>
          <TabsTrigger value="industries" className="gap-2">
            <Briefcase className="h-4 w-4" />
            Industries ({industries.length})
          </TabsTrigger>
        </TabsList>

        {/* Search and Add */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Search..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={startCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Add New
          </Button>
        </div>

        {/* Form Modal */}
        {showForm && (
          <Card className="mb-6 border-blue-200 bg-blue-50/50">
            <CardHeader>
              <CardTitle>{editingItem ? 'Edit' : 'Create'} {activeTab.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {renderFormFields()}
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  {editingItem ? 'Update' : 'Create'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Content Grid */}
        <div className="space-y-3">
          {currentData.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                No items found. Click "Add New" to create one.
              </CardContent>
            </Card>
          ) : (
            currentData.map(item => renderItemCard(item))
          )}
        </div>
      </Tabs>
    </div>
  );
};

export default AdminContent;
