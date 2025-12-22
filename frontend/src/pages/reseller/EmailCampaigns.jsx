import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Mail, Send, Users, Plus, Edit, Trash2, Eye, Clock, CheckCircle, XCircle, BarChart3, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';

const EmailCampaigns = () => {
  const { token } = useAuth();
  const { theme } = useTheme();
  const { darkMode } = useOutletContext() || {};
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sending, setSending] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    subject: '',
    content: '',
    audience: 'all',
    template: 'default'
  });

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/reseller/campaigns`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCampaigns(data.campaigns || []);
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async () => {
    if (!newCampaign.name || !newCampaign.subject || !newCampaign.content) {
      alert('Please fill in all required fields');
      return;
    }

    setSending(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/reseller/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newCampaign)
      });

      if (response.ok) {
        const data = await response.json();
        setCampaigns([data.campaign, ...campaigns]);
        setShowCreateModal(false);
        setNewCampaign({ name: '', subject: '', content: '', audience: 'all', template: 'default' });
        alert('Campaign created successfully!');
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to create campaign');
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
      alert('Error creating campaign');
    } finally {
      setSending(false);
    }
  };

  const handleSendCampaign = async (campaignId) => {
    if (!confirm('Are you sure you want to send this campaign to all selected recipients?')) return;

    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/reseller/campaigns/${campaignId}/send`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        fetchCampaigns();
        alert('Campaign sent successfully!');
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to send campaign');
      }
    } catch (error) {
      console.error('Error sending campaign:', error);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'sent': return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Sent</Badge>;
      case 'draft': return <Badge variant="secondary"><Edit className="h-3 w-3 mr-1" />Draft</Badge>;
      case 'scheduled': return <Badge className="bg-blue-500"><Clock className="h-3 w-3 mr-1" />Scheduled</Badge>;
      case 'failed': return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const cardBg = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white';
  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-gray-400' : 'text-gray-600';

  const audienceOptions = [
    { value: 'all', label: 'All Customers' },
    { value: 'active', label: 'Active Subscribers' },
    { value: 'inactive', label: 'Inactive Users' },
    { value: 'new', label: 'New Signups (Last 30 days)' },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${textPrimary}`}>Email Campaigns</h1>
          <p className={textSecondary}>Create and manage email campaigns for your customers</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} style={{ backgroundColor: theme.primaryColor }} className="text-white">
          <Plus className="h-4 w-4 mr-2" />
          New Campaign
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className={cardBg}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Mail className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className={`text-2xl font-bold ${textPrimary}`}>{campaigns.length}</p>
                <p className={`text-sm ${textSecondary}`}>Total Campaigns</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={cardBg}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <Send className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className={`text-2xl font-bold ${textPrimary}`}>{campaigns.filter(c => c.status === 'sent').length}</p>
                <p className={`text-sm ${textSecondary}`}>Sent</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={cardBg}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className={`text-2xl font-bold ${textPrimary}`}>{campaigns.reduce((acc, c) => acc + (c.recipients || 0), 0)}</p>
                <p className={`text-sm ${textSecondary}`}>Recipients</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={cardBg}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <BarChart3 className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className={`text-2xl font-bold ${textPrimary}`}>{campaigns.length > 0 ? Math.round(campaigns.reduce((acc, c) => acc + (c.open_rate || 0), 0) / campaigns.length) : 0}%</p>
                <p className={`text-sm ${textSecondary}`}>Avg Open Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns List */}
      <Card className={cardBg}>
        <CardHeader>
          <CardTitle className={textPrimary}>All Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-12">
              <Mail className={`h-16 w-16 mx-auto mb-4 ${textSecondary} opacity-50`} />
              <h3 className={`text-lg font-medium ${textPrimary}`}>No Campaigns Yet</h3>
              <p className={`${textSecondary} mb-4`}>Create your first email campaign to engage with customers</p>
              <Button onClick={() => setShowCreateModal(true)} style={{ backgroundColor: theme.primaryColor }} className="text-white">
                <Plus className="h-4 w-4 mr-2" />
                Create Campaign
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {campaigns.map((campaign) => (
                <div key={campaign.id} className={`p-4 rounded-xl border ${darkMode ? 'border-gray-700 bg-gray-700/30' : 'border-gray-200 bg-gray-50'}`}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`font-semibold ${textPrimary}`}>{campaign.name}</h3>
                        {getStatusBadge(campaign.status)}
                      </div>
                      <p className={`text-sm ${textSecondary}`}>Subject: {campaign.subject}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span className={textSecondary}><Users className="h-3 w-3 inline mr-1" />{campaign.recipients || 0} recipients</span>
                        {campaign.sent_at && <span className={textSecondary}><Clock className="h-3 w-3 inline mr-1" />{campaign.sent_at}</span>}
                        {campaign.open_rate !== undefined && <span className={textSecondary}><Eye className="h-3 w-3 inline mr-1" />{campaign.open_rate}% opened</span>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {campaign.status === 'draft' && (
                        <>
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" onClick={() => handleSendCampaign(campaign.id)} style={{ backgroundColor: theme.primaryColor }} className="text-white">
                            <Send className="h-4 w-4 mr-1" /> Send
                          </Button>
                        </>
                      )}
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto ${cardBg}`}>
            <CardHeader>
              <CardTitle className={textPrimary}>Create New Campaign</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Campaign Name *</label>
                <Input
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign({...newCampaign, name: e.target.value})}
                  placeholder="e.g., Monthly Newsletter"
                  className={darkMode ? 'bg-gray-700 border-gray-600' : ''}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Email Subject *</label>
                <Input
                  value={newCampaign.subject}
                  onChange={(e) => setNewCampaign({...newCampaign, subject: e.target.value})}
                  placeholder="e.g., Your Career Update for December"
                  className={darkMode ? 'bg-gray-700 border-gray-600' : ''}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Audience</label>
                <select
                  value={newCampaign.audience}
                  onChange={(e) => setNewCampaign({...newCampaign, audience: e.target.value})}
                  className={`w-full px-3 py-2 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                >
                  {audienceOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Email Content *</label>
                <textarea
                  value={newCampaign.content}
                  onChange={(e) => setNewCampaign({...newCampaign, content: e.target.value})}
                  placeholder="Write your email content here..."
                  rows={8}
                  className={`w-full px-3 py-2 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                />
                <p className={`text-xs ${textSecondary} mt-1`}>Use {'{{name}}'} for customer name, {'{{email}}'} for email address</p>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowCreateModal(false)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleCreateCampaign} disabled={sending} className="flex-1" style={{ backgroundColor: theme.primaryColor }}>
                  {sending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</> : <><Mail className="h-4 w-4 mr-2" />Create Campaign</>}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default EmailCampaigns;
