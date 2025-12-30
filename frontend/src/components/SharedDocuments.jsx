import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { useToast } from '../hooks/use-toast';
import { 
  FileText, Download, Trash2, Eye, Clock, Search, Plus, 
  File, FileType, Loader2, Edit, FolderOpen, LayoutTemplate
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

/**
 * Shared Documents Component
 * Works for both main platform and partner sites
 */
const SharedDocuments = ({
  isPartner = false,
  baseUrl = '',
  primaryColor = '#1e40af'
}) => {
  const { token, getAuthHeader } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [downloadingId, setDownloadingId] = useState(null);

  const getUrl = (path) => isPartner ? `${baseUrl}${path}` : path;

  useEffect(() => {
    if (token) {
      fetchDocuments();
    }
  }, [token]);

  const fetchDocuments = async () => {
    try {
      const headers = getAuthHeader ? getAuthHeader() : { Authorization: `Bearer ${token}` };
      
      // Fetch from CV documents endpoint
      const cvResponse = await fetch(`${API_URL}/api/cv/documents`, { headers });
      let cvDocs = [];
      if (cvResponse.ok) {
        const cvData = await cvResponse.json();
        cvDocs = cvData.documents || [];
      }

      // Also try customer documents for backward compatibility
      const oldResponse = await fetch(`${API_URL}/api/customer/documents`, { headers });
      let oldDocs = [];
      if (oldResponse.ok) {
        const oldData = await oldResponse.json();
        oldDocs = oldData.documents || [];
      }

      // Merge and dedupe
      const allDocs = [...cvDocs, ...oldDocs];
      const uniqueDocs = allDocs.filter((doc, index, self) => 
        index === self.findIndex(d => d.id === doc.id)
      );

      setDocuments(uniqueDocs);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      const headers = getAuthHeader ? getAuthHeader() : { Authorization: `Bearer ${token}` };
      const response = await fetch(`${API_URL}/api/cv/documents/${docId}`, {
        method: 'DELETE',
        headers
      });

      if (response.ok) {
        toast({ title: 'Document deleted successfully' });
        setDocuments(documents.filter(d => d.id !== docId));
      } else {
        throw new Error('Failed to delete document');
      }
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleDownload = async (doc) => {
    setDownloadingId(doc.id);
    try {
      const headers = getAuthHeader ? getAuthHeader() : { Authorization: `Bearer ${token}` };
      const response = await fetch(`${API_URL}/api/cv/documents/${doc.id}/download`, { headers });

      if (response.ok) {
        const data = await response.json();
        const pdfBlob = new Blob(
          [Uint8Array.from(atob(data.pdf_base64), c => c.charCodeAt(0))],
          { type: 'application/pdf' }
        );
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.filename || `${doc.name}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast({ title: 'Document downloaded' });
      } else {
        throw new Error('Failed to download');
      }
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleEdit = (doc) => {
    navigate(getUrl(`/builder?edit=${doc.id}`));
  };

  const getDocTypeInfo = (type) => {
    const types = {
      cv: { label: 'CV', color: 'bg-blue-100 text-blue-700', icon: FileText },
      cover_letter: { label: 'Cover Letter', color: 'bg-green-100 text-green-700', icon: File },
      resume: { label: 'Resume', color: 'bg-purple-100 text-purple-700', icon: FileType },
      default: { label: 'Document', color: 'bg-gray-100 text-gray-700', icon: FileText }
    };
    return types[type] || types.default;
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = !searchTerm || 
      doc.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || doc.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">My Documents</h1>
            <p className="text-gray-600">Manage your CVs, cover letters, and other documents</p>
          </div>
          <Link to={getUrl('/builder')}>
            <Button style={{ backgroundColor: primaryColor }}>
              <Plus className="h-4 w-4 mr-2" />
              Create New CV
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2 border rounded-lg min-w-[150px]"
              >
                <option value="all">All Types</option>
                <option value="cv">CVs</option>
                <option value="cover_letter">Cover Letters</option>
                <option value="resume">Resumes</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Documents List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: primaryColor }} />
          </div>
        ) : filteredDocuments.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FolderOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {documents.length === 0 ? 'No documents yet' : 'No matching documents'}
              </h3>
              <p className="text-gray-500 mb-6">
                {documents.length === 0 
                  ? 'Create your first CV to get started'
                  : 'Try adjusting your search or filters'}
              </p>
              {documents.length === 0 && (
                <Link to={getUrl('/builder')}>
                  <Button style={{ backgroundColor: primaryColor }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First CV
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredDocuments.map(doc => {
              const typeInfo = getDocTypeInfo(doc.type);
              const TypeIcon = typeInfo.icon;
              
              return (
                <Card key={doc.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div 
                          className="w-12 h-14 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${primaryColor}15` }}
                        >
                          <TypeIcon className="h-6 w-6" style={{ color: primaryColor }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900 truncate">{doc.name}</h3>
                            <Badge className={typeInfo.color}>{typeInfo.label}</Badge>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(doc.updated_at || doc.created_at).toLocaleDateString()}
                            </span>
                            {doc.template_id && (
                              <span className="flex items-center gap-1">
                                <LayoutTemplate className="h-3 w-3" />
                                {doc.template_id}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(doc)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(doc)}
                          disabled={downloadingId === doc.id}
                        >
                          {downloadingId === doc.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(doc.id)}
                          className="text-red-600 hover:text-red-700 hover:border-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Summary */}
        {documents.length > 0 && (
          <div className="mt-6 text-center text-sm text-gray-500">
            Showing {filteredDocuments.length} of {documents.length} documents
          </div>
        )}
      </div>
    </div>
  );
};

export default SharedDocuments;
