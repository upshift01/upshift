import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePartner } from '../../context/PartnerContext';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { useToast } from '../../hooks/use-toast';
import { 
  FileText, 
  Download, 
  Trash2, 
  Eye, 
  Clock, 
  Search,
  Plus,
  File,
  FileType,
  Loader2,
  Edit
} from 'lucide-react';
import PartnerCustomerLayout from '../../components/PartnerCustomerLayout';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const PartnerDocuments = () => {
  const { token, getAuthHeader } = useAuth();
  const { primaryColor, baseUrl } = usePartner();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      // Try new CV documents endpoint first
      const cvResponse = await fetch(`${API_URL}/api/cv/documents`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      let cvDocs = [];
      if (cvResponse.ok) {
        const cvData = await cvResponse.json();
        cvDocs = cvData.documents || [];
      }

      // Also try old endpoint for backward compatibility
      const oldResponse = await fetch(`${API_URL}/api/customer/documents`, {
        headers: getAuthHeader ? getAuthHeader() : { Authorization: `Bearer ${token}` }
      });
      
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
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      let response = await fetch(`${API_URL}/api/cv/documents/${docId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        response = await fetch(`${API_URL}/api/customer/documents/${docId}`, {
          method: 'DELETE',
          headers: getAuthHeader ? getAuthHeader() : { Authorization: `Bearer ${token}` }
        });
      }

      if (response.ok) {
        setDocuments(documents.filter(d => d.id !== docId));
        toast({ title: 'Deleted', description: 'Document deleted successfully' });
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({ title: 'Error', description: 'Failed to delete document', variant: 'destructive' });
    }
  };

  const handleDownload = async (doc) => {
    setDownloadingId(doc.id);
    try {
      const response = await fetch(`${API_URL}/api/cv/documents/${doc.id}/download`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${doc.name || 'document'}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast({ title: 'Downloaded', description: 'Document downloaded successfully' });
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({ title: 'Error', description: 'Failed to download document', variant: 'destructive' });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleEdit = (doc) => {
    navigate(`${baseUrl}/builder?edit=${doc.id}`);
  };

  const getDocIcon = (type) => {
    const icons = { cv: FileText, cover_letter: File, resume: FileType };
    const Icon = icons[type] || FileText;
    return <Icon className="h-8 w-8" />;
  };

  const getTypeColor = (type) => {
    const colors = {
      cv: 'bg-blue-100 text-blue-700',
      cover_letter: 'bg-purple-100 text-purple-700',
      resume: 'bg-green-100 text-green-700'
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || doc.type === filterType;
    return matchesSearch && matchesType;
  });

  const stats = {
    total: documents.length,
    cvs: documents.filter(d => d.type === 'cv').length,
    coverLetters: documents.filter(d => d.type === 'cover_letter').length
  };

  return (
    <PartnerCustomerLayout>
      <div className="p-6">
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Documents</h1>
            <p className="text-gray-600">Manage your CVs, resumes, and cover letters</p>
          </div>
          <Link to={`${baseUrl}/builder`}>
            <Button style={{ backgroundColor: primaryColor }} className="text-white">
              <Plus className="h-4 w-4 mr-2" />
              Create New CV
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-500">Total Documents</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold" style={{ color: primaryColor }}>{stats.cvs}</div>
              <div className="text-sm text-gray-500">CVs/Resumes</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-purple-600">{stats.coverLetters}</div>
              <div className="text-sm text-gray-500">Cover Letters</div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filter */}
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
                className="px-4 py-2 border rounded-lg text-sm"
              >
                <option value="all">All Types</option>
                <option value="cv">CVs</option>
                <option value="cover_letter">Cover Letters</option>
                <option value="resume">Resumes</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Documents Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: primaryColor }} />
          </div>
        ) : filteredDocs.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || filterType !== 'all' ? 'No documents found' : 'No documents yet'}
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || filterType !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'Create your first CV or cover letter to get started'}
              </p>
              <Link to={`${baseUrl}/builder`}>
                <Button style={{ backgroundColor: primaryColor }} className="text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First CV
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocs.map((doc) => (
              <Card key={doc.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`p-3 rounded-lg ${getTypeColor(doc.type)}`}>
                      {getDocIcon(doc.type)}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {doc.type === 'cv' ? 'CV' : doc.type === 'cover_letter' ? 'Cover Letter' : 'Resume'}
                    </Badge>
                  </div>
                  <h3 className="font-medium text-gray-900 mb-1 truncate">{doc.name}</h3>
                  <p className="text-sm text-gray-500 flex items-center gap-1 mb-4">
                    <Clock className="h-3 w-3" />
                    {new Date(doc.updated_at || doc.created_at).toLocaleDateString()}
                  </p>
                  <div className="flex items-center gap-2">
                    {doc.type === 'cv' && doc.cv_data && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleEdit(doc)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    )}
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
                      variant="ghost" 
                      size="sm"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => handleDelete(doc.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PartnerCustomerLayout>
  );
};

export default PartnerDocuments;
