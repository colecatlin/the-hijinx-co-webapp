import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/components/utils';
import PageShell from '@/components/shared/PageShell';
import PolicyAcceptancePanel from '@/components/media/PolicyAcceptancePanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertCircle, Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function MediaPortal() {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [user, setUser] = useState(null);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [requestDetailOpen, setRequestDetailOpen] = useState(false);
  const queryClient = useQueryClient();

  // Auth check
  useEffect(() => {
    async function checkAuth() {
      const auth = await base44.auth.isAuthenticated();
      setIsAuthenticated(auth);
      if (auth) {
        const me = await base44.auth.me();
        setUser(me);
      }
    }
    checkAuth();
  }, []);

  if (isAuthenticated === null) {
    return (
      <PageShell>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-gray-400">Loading...</p>
        </div>
      </PageShell>
    );
  }

  if (!isAuthenticated) {
    return (
      <PageShell>
        <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 py-12">
          <div className="max-w-4xl mx-auto px-6">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-black text-gray-900 mb-4">Index46 Media Portal</h1>
              <p className="text-lg text-gray-600">Apply for media credentials and manage your portfolio</p>
            </div>

            <Card className="bg-white border-gray-200">
              <CardContent className="py-12 text-center space-y-6">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Sign in to apply</h3>
                  <p className="text-gray-600 mb-6">Create your profile and apply for media credentials to cover events and access pit areas.</p>
                </div>
                <Button
                  onClick={() => base44.auth.redirectToLogin()}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Sign In
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 py-12">
        <div className="max-w-6xl mx-auto px-6">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-black text-gray-900 mb-4">Index46 Media Portal</h1>
            <p className="text-lg text-gray-600">Apply for media credentials and manage your portfolio</p>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            {/* Profile Card */}
            <ProfileCard user={user} />

            {/* Apply Card */}
            <ApplyCard user={user} onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['credential_requests'] });
            }} />
          </div>

          {/* My Requests */}
          <MyRequestsList user={user} onSelectRequest={(id) => {
            setSelectedRequestId(id);
            setRequestDetailOpen(true);
          }} />
        </div>

        {/* Request Detail Dialog */}
        {selectedRequestId && (
          <RequestDetailDialog
            requestId={selectedRequestId}
            open={requestDetailOpen}
            onOpenChange={setRequestDetailOpen}
          />
        )}
      </div>
    </PageShell>
  );
}

function ProfileCard({ user }) {
  const [isEditing, setIsEditing] = useState(false);
  const queryClient = useQueryClient();

  const { data: mediaUser } = useQuery({
    queryKey: ['media_user', user?.id],
    queryFn: () => user?.id ? base44.entities.MediaUser.filter({ user_id: user.id }).then(res => res[0]) : null,
    enabled: !!user?.id,
  });

  const { data: organizations = [] } = useQuery({
    queryKey: ['media_organizations'],
    queryFn: () => base44.entities.MediaOrganization.list(),
  });

  const [formData, setFormData] = useState({
    full_name: '',
    legal_name: '',
    email: '',
    phone: '',
    portfolio_url: '',
    instagram_url: '',
    website_url: '',
    organization_id: '',
  });

  // Sync mediaUser to form
  React.useEffect(() => {
    if (mediaUser) {
      setFormData({
        full_name: mediaUser.full_name || '',
        legal_name: mediaUser.legal_name || '',
        email: mediaUser.email || '',
        phone: mediaUser.phone || '',
        portfolio_url: mediaUser.portfolio_url || '',
        instagram_url: mediaUser.instagram_url || '',
        website_url: mediaUser.website_url || '',
        organization_id: mediaUser.organization_id || '',
      });
    }
  }, [mediaUser]);

  const upsertMutation = useMutation({
    mutationFn: async (data) => {
      if (mediaUser?.id) {
        return base44.entities.MediaUser.update(mediaUser.id, data);
      } else {
        return base44.entities.MediaUser.create({
          user_id: user.id,
          ...data,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media_user'] });
      setIsEditing(false);
      toast.success('Profile saved');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <Card className="bg-white border-gray-200">
      <CardHeader className="border-b border-gray-100">
        <CardTitle className="text-gray-900">Your Profile</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        {!isEditing && mediaUser ? (
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Full Name</p>
              <p className="text-gray-900 font-medium">{mediaUser.full_name || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Email</p>
              <p className="text-gray-900">{mediaUser.email || user.email}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Organization</p>
              <p className="text-gray-900">{mediaUser.organization_id ? organizations.find(o => o.id === mediaUser.organization_id)?.name : '—'}</p>
            </div>
            <Button
              onClick={() => setIsEditing(true)}
              variant="outline"
              className="w-full border-gray-200"
            >
              Edit Profile
            </Button>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            upsertMutation.mutate(formData);
          }}>
            <div>
              <label className="text-xs text-gray-600 uppercase tracking-wide mb-1 block">Full Name</label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                placeholder="Your full name"
                className="border-gray-200"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 uppercase tracking-wide mb-1 block">Legal Name</label>
              <Input
                value={formData.legal_name}
                onChange={(e) => setFormData({...formData, legal_name: e.target.value})}
                placeholder="As it appears on documents"
                className="border-gray-200"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 uppercase tracking-wide mb-1 block">Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="your@email.com"
                className="border-gray-200"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 uppercase tracking-wide mb-1 block">Phone</label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="(555) 123-4567"
                className="border-gray-200"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 uppercase tracking-wide mb-1 block">Portfolio URL</label>
              <Input
                value={formData.portfolio_url}
                onChange={(e) => setFormData({...formData, portfolio_url: e.target.value})}
                placeholder="https://..."
                className="border-gray-200"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 uppercase tracking-wide mb-1 block">Instagram</label>
              <Input
                value={formData.instagram_url}
                onChange={(e) => setFormData({...formData, instagram_url: e.target.value})}
                placeholder="@username"
                className="border-gray-200"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 uppercase tracking-wide mb-1 block">Website</label>
              <Input
                value={formData.website_url}
                onChange={(e) => setFormData({...formData, website_url: e.target.value})}
                placeholder="https://..."
                className="border-gray-200"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 uppercase tracking-wide mb-1 block">Organization (optional)</label>
              <Select value={formData.organization_id} onValueChange={(v) => setFormData({...formData, organization_id: v})}>
                <SelectTrigger className="border-gray-200">
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>None</SelectItem>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditing(false)}
                className="flex-1 border-gray-200"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={upsertMutation.isPending}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {upsertMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function ApplyCard({ user, onSuccess }) {
  const [entityType, setEntityType] = useState('track');
  const [entityId, setEntityId] = useState('');
  const [accessLevel, setAccessLevel] = useState('general');
  const [roles, setRoles] = useState([]);
  const [description, setDescription] = useState('');

  const { data: mediaUser } = useQuery({
    queryKey: ['media_user', user?.id],
    queryFn: () => user?.id ? base44.entities.MediaUser.filter({ user_id: user.id }).then(res => res[0]) : null,
    enabled: !!user?.id,
  });

  const { data: tracks = [] } = useQuery({
    queryKey: ['tracks'],
    queryFn: () => base44.entities.Track.list(),
  });

  const { data: series = [] } = useQuery({
    queryKey: ['series'],
    queryFn: () => base44.entities.Series.list(),
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list(),
  });

  const entities = entityType === 'track' ? tracks : entityType === 'series' ? series : events;

  const applyMutation = useMutation({
    mutationFn: async () => {
      return base44.entities.CredentialRequest.create({
        holder_media_user_id: mediaUser.id,
        target_entity_id: entityId,
        target_entity_type: entityType,
        requested_access_level: accessLevel,
        requested_roles: roles,
        assignment_description: description,
        status: 'applied',
      });
    },
    onSuccess: () => {
      setEntityId('');
      setAccessLevel('general');
      setRoles([]);
      setDescription('');
      onSuccess();
      toast.success('Application submitted');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const isRoleSelected = (role) => roles.includes(role);
  const toggleRole = (role) => {
    setRoles(roles.includes(role) ? roles.filter(r => r !== role) : [...roles, role]);
  };

  if (!mediaUser) {
    return (
      <Card className="bg-white border-gray-200">
        <CardContent className="py-12 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-gray-400 mx-auto" />
          <div>
            <p className="text-gray-700 font-medium">Create your profile first</p>
            <p className="text-sm text-gray-600">You need to set up your profile before applying for credentials.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border-gray-200">
      <CardHeader className="border-b border-gray-100">
        <CardTitle className="text-gray-900">Apply for Credentials</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <form className="space-y-4" onSubmit={(e) => {
          e.preventDefault();
          if (!entityId || roles.length === 0) {
            toast.error('Please select entity and at least one role');
            return;
          }
          applyMutation.mutate();
        }}>
          <div>
            <label className="text-xs text-gray-600 uppercase tracking-wide mb-1 block">Entity Type</label>
            <Select value={entityType} onValueChange={setEntityType}>
              <SelectTrigger className="border-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="track">Track</SelectItem>
                <SelectItem value="series">Series</SelectItem>
                <SelectItem value="event">Event</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs text-gray-600 uppercase tracking-wide mb-1 block">Select {entityType}</label>
            <Select value={entityId} onValueChange={setEntityId}>
              <SelectTrigger className="border-gray-200">
                <SelectValue placeholder={`Choose a ${entityType}`} />
              </SelectTrigger>
              <SelectContent>
                {entities.map((entity) => (
                  <SelectItem key={entity.id} value={entity.id}>
                    {entityType === 'event' 
                      ? `${entity.name} (${entity.event_date || '—'})`
                      : entity.name
                    }
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs text-gray-600 uppercase tracking-wide mb-2 block">Access Level</label>
            <Select value={accessLevel} onValueChange={setAccessLevel}>
              <SelectTrigger className="border-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="pit">Pit</SelectItem>
                <SelectItem value="hot_pit">Hot Pit</SelectItem>
                <SelectItem value="restricted">Restricted</SelectItem>
                <SelectItem value="drone">Drone</SelectItem>
                <SelectItem value="all_access">All Access</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs text-gray-600 uppercase tracking-wide mb-2 block">Roles (select all that apply)</label>
            <div className="space-y-2">
              {['photographer', 'videographer', 'editor', 'social', 'other'].map((role) => (
                <label key={role} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isRoleSelected(role)}
                    onChange={() => toggleRole(role)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700 capitalize">{role}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-600 uppercase tracking-wide mb-1 block">Assignment Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell us about what you plan to cover..."
              rows={3}
              className="border-gray-200"
            />
          </div>

          <Button
            type="submit"
            disabled={applyMutation.isPending}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {applyMutation.isPending ? 'Submitting...' : 'Submit Application'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function MyRequestsList({ user }) {
  const { data: requests = [] } = useQuery({
    queryKey: ['my_credential_requests', user?.id],
    queryFn: async () => {
      const mediaUser = await base44.entities.MediaUser.filter({ user_id: user.id }).then(res => res[0]);
      if (!mediaUser) return [];
      return base44.entities.CredentialRequest.filter({ holder_media_user_id: mediaUser.id });
    },
    enabled: !!user?.id,
  });

  const statusColor = (status) => {
    switch (status) {
      case 'applied': return 'bg-blue-100 text-blue-800';
      case 'under_review': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'denied': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (requests.length === 0) {
    return null;
  }

  return (
    <Card className="bg-white border-gray-200">
      <CardHeader className="border-b border-gray-100">
        <CardTitle className="text-gray-900">My Requests</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-100">
                <TableHead className="text-gray-700">Applied</TableHead>
                <TableHead className="text-gray-700">Entity</TableHead>
                <TableHead className="text-gray-700">Access Level</TableHead>
                <TableHead className="text-gray-700">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((req) => (
                <TableRow key={req.id} className="border-gray-100 hover:bg-gray-50 cursor-pointer">
                  <TableCell className="text-sm text-gray-600">
                    {new Date(req.created_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-sm text-gray-900 font-medium">{req.target_entity_type}</TableCell>
                  <TableCell className="text-sm text-gray-600">{req.requested_access_level}</TableCell>
                  <TableCell>
                    <Badge className={statusColor(req.status)}>
                      {req.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function RequestDetailDialog({ requestId, open, onOpenChange }) {
  const [requestStatus, setRequestStatus] = useState(null);
  const { data: request, refetch: refetchRequest } = useQuery({
    queryKey: ['credential_request', requestId],
    queryFn: () => base44.entities.CredentialRequest.get(requestId),
    enabled: !!requestId,
  });

  const [resolvedScopeIds, setResolvedScopeIds] = useState([]);

  // Resolve policy scope entity ids
  useEffect(() => {
    async function resolveScope() {
      if (!request) return;

      const ids = [request.target_entity_id];

      // If target is an Event, also include track and series
      if (request.target_entity_type === 'event' || request.related_event_id) {
        try {
          const eventId = request.related_event_id || request.target_entity_id;
          const event = await base44.entities.Event.get(eventId);
          if (event?.track_id && !ids.includes(event.track_id)) {
            ids.push(event.track_id);
          }
          if (event?.series_id && !ids.includes(event.series_id)) {
            ids.push(event.series_id);
          }
        } catch (err) {
          // Event not found or already handled
        }
      }

      setResolvedScopeIds(ids);
    }

    resolveScope();
  }, [request]);

  const statusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'under_review': return 'bg-blue-100 text-blue-800';
      case 'change_requested': return 'bg-orange-100 text-orange-800';
      case 'denied': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-gray-900">Request Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {request && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">Status</p>
                  <Badge className={statusColor(requestStatus || request.status)}>
                    {requestStatus || request.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">Access Level</p>
                  <p className="text-gray-900">{request.requested_access_level}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">Roles</p>
                <p className="text-gray-900">{request.requested_roles?.join(', ') || '—'}</p>
              </div>

              {/* Policies Section */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="font-semibold text-gray-900 mb-4">Required Policies</h3>
                {resolvedScopeIds.length > 0 && (
                  <PolicyAcceptancePanel
                    mediaUserId={request.holder_media_user_id}
                    request={request}
                    resolvedScopeEntityIds={resolvedScopeIds}
                    onRequestStatusChange={(newStatus) => {
                      setRequestStatus(newStatus);
                      refetchRequest();
                    }}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}