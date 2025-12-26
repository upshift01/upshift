import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import {
  Users,
  Phone,
  Mail,
  Building2,
  Calendar,
  MessageSquare,
  UserPlus,
  Filter,
  Search,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Clock,
  Star,
  Trash2,
  Send,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const AdminCRM = () => {
  const { getAuthHeader } = useAuth();
  const [leads, setLeads] = useState([]);
  const [statusCounts, setStatusCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    fetchLeads();
  }, [statusFilter, sourceFilter]);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      let url = `${API_URL}/api/admin/leads?limit=100`;
      if (statusFilter) url += `&status_filter=${statusFilter}`;
      if (sourceFilter) url += `&source_filter=${sourceFilter}`;

      const response = await fetch(url, { headers: getAuthHeader() });
      if (response.ok) {
        const data = await response.json();
        setLeads(data.leads || []);
        setStatusCounts(data.status_counts || {});
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeadDetails = async (leadId) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/leads/${leadId}`, {
        headers: getAuthHeader()
      });
      if (response.ok) {
        const data = await response.json();
        setSelectedLead(data.lead);
      }
    } catch (error) {
      console.error('Error fetching lead details:', error);
    }
  };

  const updateLeadStatus = async (leadId, newStatus) => {
    try {
      setActionLoading(leadId);
      const response = await fetch(`${API_URL}/api/admin/leads/${leadId}/status`, {
        method: 'PATCH',
        headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (response.ok) {
        fetchLeads();
        if (selectedLead?.id === leadId) {
          fetchLeadDetails(leadId);
        }
      }
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const addNote = async () => {
    if (!newNote.trim() || !selectedLead) return;
    
    try {
      setAddingNote(true);
      const response = await fetch(`${API_URL}/api/admin/leads/${selectedLead.id}/notes`, {
        method: 'POST',
        headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNote })
      });
      
      if (response.ok) {
        setNewNote('');
        fetchLeadDetails(selectedLead.id);
      }
    } catch (error) {
      console.error('Error adding note:', error);
    } finally {
      setAddingNote(false);
    }
  };

  const convertToReseller = async (leadId) => {
    if (!confirm('Are you sure you want to convert this lead to a reseller? This will create a new reseller account with a 7-day trial.')) {
      return;
    }
    
    try {
      setActionLoading(leadId);
      const response = await fetch(`${API_URL}/api/admin/leads/${leadId}/convert`, {
        method: 'POST',
        headers: getAuthHeader()
      });
      
      if (response.ok) {
        const data = await response.json();
        alert(`Lead converted successfully!\nReseller subdomain: ${data.subdomain}`);
        fetchLeads();
        if (selectedLead?.id === leadId) {
          fetchLeadDetails(leadId);
        }
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to convert lead');
      }
    } catch (error) {
      console.error('Error converting lead:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const deleteLead = async (leadId) => {
    if (!confirm('Are you sure you want to delete this lead? This action cannot be undone.')) {
      return;
    }
    
    try {
      setActionLoading(leadId);
      const response = await fetch(`${API_URL}/api/admin/leads/${leadId}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });
      
      if (response.ok) {
        fetchLeads();
        if (selectedLead?.id === leadId) {
          setSelectedLead(null);
        }
      }
    } catch (error) {
      console.error('Error deleting lead:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      new: 'bg-blue-100 text-blue-700',
      contacted: 'bg-yellow-100 text-yellow-700',
      qualified: 'bg-purple-100 text-purple-700',
      converted: 'bg-green-100 text-green-700',
      lost: 'bg-red-100 text-red-700'
    };
    return styles[status] || 'bg-gray-100 text-gray-700';
  };

  const getBusinessTypeLabel = (type) => {
    const labels = {
      recruitment: 'Recruitment Agency',
      education: 'Educational Institution',
      coaching: 'Career Coaching',
      hr: 'HR Consultancy',
      other: 'Other'
    };
    return labels[type] || type;
  };

  const filteredLeads = leads.filter(lead => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      lead.company?.toLowerCase().includes(query) ||
      lead.name?.toLowerCase().includes(query) ||
      lead.email?.toLowerCase().includes(query)
    );
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CRM - Lead Management</h1>
          <p className="text-gray-600">Manage partner enquiries and convert them to resellers</p>
        </div>
        <Button onClick={fetchLeads} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { label: 'New', value: statusCounts.new || 0, color: 'blue', icon: Star },
          { label: 'Contacted', value: statusCounts.contacted || 0, color: 'yellow', icon: Phone },
          { label: 'Qualified', value: statusCounts.qualified || 0, color: 'purple', icon: CheckCircle },
          { label: 'Converted', value: statusCounts.converted || 0, color: 'green', icon: UserPlus },
          { label: 'Lost', value: statusCounts.lost || 0, color: 'red', icon: XCircle }
        ].map((stat, idx) => (
          <Card 
            key={idx} 
            className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === stat.label.toLowerCase() ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => setStatusFilter(statusFilter === stat.label.toLowerCase() ? '' : stat.label.toLowerCase())}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className={`text-2xl font-bold text-${stat.color}-600`}>{stat.value}</p>
                </div>
                <stat.icon className={`h-8 w-8 text-${stat.color}-200`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by company, name, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="">All Business Types</option>
              <option value="recruitment">Recruitment Agency</option>
              <option value="education">Educational Institution</option>
              <option value="coaching">Career Coaching</option>
              <option value="hr">HR Consultancy</option>
              <option value="other">Other</option>
            </select>
            {(statusFilter || sourceFilter) && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => { setStatusFilter(''); setSourceFilter(''); }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leads List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Partner Enquiries ({filteredLeads.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              ) : filteredLeads.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No leads found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                        selectedLead?.id === lead.id ? 'border-blue-500 bg-blue-50' : ''
                      }`}
                      onClick={() => fetchLeadDetails(lead.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900">{lead.company}</h3>
                            <Badge className={getStatusBadge(lead.status)}>
                              {lead.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">{lead.name}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {lead.email}
                            </span>
                            {lead.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {lead.phone}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {getBusinessTypeLabel(lead.business_type)}
                            </Badge>
                            <span className="text-xs text-gray-400">
                              {formatDate(lead.created_at)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {actionLoading === lead.id ? (
                            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                          ) : (
                            <>
                              {lead.status !== 'converted' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    convertToReseller(lead.id);
                                  }}
                                  className="text-xs"
                                >
                                  <UserPlus className="h-3 w-3 mr-1" />
                                  Convert
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Lead Details Panel */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Lead Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedLead ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Select a lead to view details</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Lead Info */}
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900 mb-2">
                      {selectedLead.company}
                    </h3>
                    <Badge className={getStatusBadge(selectedLead.status) + ' mb-3'}>
                      {selectedLead.status}
                    </Badge>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-gray-400" />
                        <span>{getBusinessTypeLabel(selectedLead.business_type)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span>{selectedLead.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <a href={`mailto:${selectedLead.email}`} className="text-blue-600 hover:underline">
                          {selectedLead.email}
                        </a>
                      </div>
                      {selectedLead.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <a href={`tel:${selectedLead.phone}`} className="text-blue-600 hover:underline">
                            {selectedLead.phone}
                          </a>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span>{formatDate(selectedLead.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Message */}
                  {selectedLead.message && (
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">Message</h4>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                        {selectedLead.message}
                      </p>
                    </div>
                  )}

                  {/* Status Actions */}
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Update Status</h4>
                    <div className="flex flex-wrap gap-2">
                      {['new', 'contacted', 'qualified', 'converted', 'lost'].map((status) => (
                        <Button
                          key={status}
                          size="sm"
                          variant={selectedLead.status === status ? 'default' : 'outline'}
                          onClick={() => updateLeadStatus(selectedLead.id, status)}
                          disabled={actionLoading === selectedLead.id}
                          className="text-xs capitalize"
                        >
                          {status}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">
                      Notes ({selectedLead.notes?.length || 0})
                    </h4>
                    
                    {/* Add Note */}
                    <div className="flex gap-2 mb-3">
                      <Input
                        placeholder="Add a note..."
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addNote()}
                        disabled={addingNote}
                      />
                      <Button 
                        size="sm" 
                        onClick={addNote} 
                        disabled={!newNote.trim() || addingNote}
                      >
                        {addingNote ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    {/* Notes List */}
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {selectedLead.notes?.map((note, idx) => (
                        <div 
                          key={note.id || idx} 
                          className={`p-2 rounded-lg text-sm ${
                            note.type === 'status_change' 
                              ? 'bg-yellow-50 border border-yellow-200' 
                              : note.type === 'conversion'
                              ? 'bg-green-50 border border-green-200'
                              : 'bg-gray-50'
                          }`}
                        >
                          <p className="text-gray-700">{note.content}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {note.created_by} • {formatDate(note.created_at)}
                          </p>
                        </div>
                      ))}
                      {(!selectedLead.notes || selectedLead.notes.length === 0) && (
                        <p className="text-sm text-gray-400 text-center py-2">No notes yet</p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-4 border-t">
                    {selectedLead.status !== 'converted' && (
                      <Button
                        className="flex-1"
                        onClick={() => convertToReseller(selectedLead.id)}
                        disabled={actionLoading === selectedLead.id}
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Convert to Reseller
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => deleteLead(selectedLead.id)}
                      disabled={actionLoading === selectedLead.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminCRM;
