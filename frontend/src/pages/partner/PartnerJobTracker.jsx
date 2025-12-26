import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePartner } from '../../context/PartnerContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { useToast } from '../../hooks/use-toast';
import { 
  Briefcase, 
  Plus, 
  ExternalLink, 
  Calendar,
  Building2,
  MapPin,
  Trash2,
  Loader2
} from 'lucide-react';
import PartnerCustomerLayout from '../../components/PartnerCustomerLayout';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const PartnerJobTracker = () => {
  const { getAuthHeader } = useAuth();
  const { primaryColor, brandName } = usePartner();
  const { toast } = useToast();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    company: '',
    position: '',
    location: '',
    url: '',
    status: 'applied'
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/api/customer/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const newJob = await response.json();
        setJobs([newJob, ...jobs]);
        setShowForm(false);
        setFormData({ company: '', position: '', location: '', url: '', status: 'applied' });
        toast({ title: 'Job added successfully' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add job', variant: 'destructive' });
    }
  };

  const handleDelete = async (jobId) => {
    if (!window.confirm('Delete this job application?')) return;
    try {
      await fetch(`${API_URL}/api/customer/jobs/${jobId}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });
      setJobs(jobs.filter(j => j.id !== jobId));
      toast({ title: 'Job deleted' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete job', variant: 'destructive' });
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      applied: 'bg-blue-100 text-blue-700',
      interviewing: 'bg-yellow-100 text-yellow-700',
      offered: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      accepted: 'bg-emerald-100 text-emerald-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const stats = {
    total: jobs.length,
    applied: jobs.filter(j => j.status === 'applied').length,
    interviewing: jobs.filter(j => j.status === 'interviewing').length,
    offered: jobs.filter(j => j.status === 'offered').length
  };

  return (
    <PartnerCustomerLayout>
      <div className="p-6">
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Job Tracker</h1>
            <p className="text-gray-600">Track your job applications</p>
          </div>
          <Button 
            onClick={() => setShowForm(!showForm)}
            style={{ backgroundColor: primaryColor }}
            className="text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Job
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-xs text-gray-500">Total</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.applied}</div>
              <div className="text-xs text-gray-500">Applied</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.interviewing}</div>
              <div className="text-xs text-gray-500">Interviewing</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.offered}</div>
              <div className="text-xs text-gray-500">Offered</div>
            </CardContent>
          </Card>
        </div>

        {/* Add Job Form */}
        {showForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Add New Application</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  placeholder="Company Name"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  required
                />
                <Input
                  placeholder="Position"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  required
                />
                <Input
                  placeholder="Location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
                <Input
                  placeholder="Job URL"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                />
                <select
                  className="px-3 py-2 border rounded-lg"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="applied">Applied</option>
                  <option value="interviewing">Interviewing</option>
                  <option value="offered">Offered</option>
                  <option value="rejected">Rejected</option>
                  <option value="accepted">Accepted</option>
                </select>
                <Button type="submit" style={{ backgroundColor: primaryColor }} className="text-white">
                  Add Application
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Jobs List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: primaryColor }} />
          </div>
        ) : jobs.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Briefcase className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No jobs tracked yet</h3>
              <p className="text-gray-500">Start tracking your job applications</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <Card key={job.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg" style={{ backgroundColor: `${primaryColor}15` }}>
                        <Building2 className="h-6 w-6" style={{ color: primaryColor }} />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{job.position}</h3>
                        <p className="text-sm text-gray-600">{job.company}</p>
                        {job.location && (
                          <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" /> {job.location}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={getStatusColor(job.status)}>
                        {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                      </Badge>
                      {job.url && (
                        <a href={job.url} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </a>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => handleDelete(job.id)}
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
      </div>
    </PartnerCustomerLayout>
  );
};

export default PartnerJobTracker;
