import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { 
  Briefcase, 
  Plus, 
  Search, 
  MapPin, 
  Building2, 
  Calendar,
  ExternalLink,
  Trash2,
  Edit,
  CheckCircle,
  Clock,
  XCircle,
  Send,
  Star,
  Loader2,
  X
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const JobTracker = () => {
  const { getAuthHeader } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [newJob, setNewJob] = useState({
    company: '',
    position: '',
    location: '',
    url: '',
    status: 'saved',
    notes: ''
  });

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await fetch(`${API_URL}/api/customer/jobs`, {
        headers: getAuthHeader()
      });
      if (response.ok) {
        const data = await response.json();
        setJobs(data.jobs || []);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddJob = async () => {
    if (!newJob.company || !newJob.position) {
      alert('Please fill in company and position');
      return;
    }
    try {
      const response = await fetch(`${API_URL}/api/customer/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify(newJob)
      });
      if (response.ok) {
        const data = await response.json();
        setJobs([data.job, ...jobs]);
        setShowAddModal(false);
        setNewJob({ company: '', position: '', location: '', url: '', status: 'saved', notes: '' });
      }
    } catch (error) {
      console.error('Error adding job:', error);
    }
  };

  const handleUpdateStatus = async (jobId, newStatus) => {
    try {
      const response = await fetch(`${API_URL}/api/customer/jobs/${jobId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) {
        setJobs(jobs.map(j => j.id === jobId ? { ...j, status: newStatus } : j));
      }
    } catch (error) {
      console.error('Error updating job:', error);
    }
  };

  const handleDeleteJob = async (jobId) => {
    if (!window.confirm('Delete this job application?')) return;
    try {
      await fetch(`${API_URL}/api/customer/jobs/${jobId}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });
      setJobs(jobs.filter(j => j.id !== jobId));
    } catch (error) {
      console.error('Error deleting job:', error);
    }
  };

  const getStatusConfig = (status) => {
    const configs = {
      saved: { label: 'Saved', color: 'bg-gray-100 text-gray-700', icon: Star },
      applied: { label: 'Applied', color: 'bg-blue-100 text-blue-700', icon: Send },
      interviewing: { label: 'Interviewing', color: 'bg-purple-100 text-purple-700', icon: Calendar },
      offered: { label: 'Offered', color: 'bg-green-100 text-green-700', icon: CheckCircle },
      rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: XCircle }
    };
    return configs[status] || configs.saved;
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = 
      job.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.position?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: jobs.length,
    applied: jobs.filter(j => j.status === 'applied').length,
    interviewing: jobs.filter(j => j.status === 'interviewing').length,
    offered: jobs.filter(j => j.status === 'offered').length
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Job Application Tracker</h1>
          <p className="text-gray-600">Track your job applications in one place</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="bg-gradient-to-r from-blue-600 to-purple-600">
          <Plus className="h-4 w-4 mr-2" />
          Add Application
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-500">Total Jobs</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-blue-600">{stats.applied}</div>
            <div className="text-sm text-gray-500">Applied</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-purple-600">{stats.interviewing}</div>
            <div className="text-sm text-gray-500">Interviewing</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-green-600">{stats.offered}</div>
            <div className="text-sm text-gray-500">Offered</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by company or position..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg text-sm"
            >
              <option value="all">All Status</option>
              <option value="saved">Saved</option>
              <option value="applied">Applied</option>
              <option value="interviewing">Interviewing</option>
              <option value="offered">Offered</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Jobs List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : filteredJobs.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Briefcase className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || statusFilter !== 'all' ? 'No jobs found' : 'No job applications yet'}
            </h3>
            <p className="text-gray-500 mb-4">Start tracking your job applications</p>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Application
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredJobs.map((job) => {
            const statusConfig = getStatusConfig(job.status);
            const StatusIcon = statusConfig.icon;
            return (
              <Card key={job.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-gray-500" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{job.position}</h3>
                        <p className="text-gray-600">{job.company}</p>
                        <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                          {job.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {job.location}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(job.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={statusConfig.color}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusConfig.label}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex gap-2">
                      <select
                        value={job.status}
                        onChange={(e) => handleUpdateStatus(job.id, e.target.value)}
                        className="text-sm border rounded px-2 py-1"
                      >
                        <option value="saved">Saved</option>
                        <option value="applied">Applied</option>
                        <option value="interviewing">Interviewing</option>
                        <option value="offered">Offered</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      {job.url && (
                        <a href={job.url} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </a>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteJob(job.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Job Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Add Job Application</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowAddModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Company *</label>
                <Input
                  value={newJob.company}
                  onChange={(e) => setNewJob({ ...newJob, company: e.target.value })}
                  placeholder="Company name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Position *</label>
                <Input
                  value={newJob.position}
                  onChange={(e) => setNewJob({ ...newJob, position: e.target.value })}
                  placeholder="Job title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Location</label>
                <Input
                  value={newJob.location}
                  onChange={(e) => setNewJob({ ...newJob, location: e.target.value })}
                  placeholder="e.g., Johannesburg, Remote"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Job URL</label>
                <Input
                  value={newJob.url}
                  onChange={(e) => setNewJob({ ...newJob, url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  value={newJob.status}
                  onChange={(e) => setNewJob({ ...newJob, status: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="saved">Saved</option>
                  <option value="applied">Applied</option>
                  <option value="interviewing">Interviewing</option>
                </select>
              </div>
              <div className="flex gap-2 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleAddJob}>
                  Add Application
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default JobTracker;
