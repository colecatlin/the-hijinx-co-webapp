import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertCircle, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import PolicyAcceptancePanel from '@/components/media/PolicyAcceptancePanel';

export default function MediaGovernanceManager({
  dashboardContext,
  selectedEvent,
  selectedTrack,
  selectedSeries,
  dashboardPermissions,
  invalidateAfterOperation,
}) {
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [requestDetailOpen, setRequestDetailOpen] = useState(false);
  const [selectedCredentialId, setSelectedCredentialId] = useState(null);
  const [credentialDetailOpen, setCredentialDetailOpen] = useState(false);

  // Get current user
  React.useEffect(() => {
    async function loadUser() {
      const me = await base44.auth.me();
      setCurrentUser(me);
    }
    loadUser();
  }, []);

  const isAdmin = currentUser?.role === 'admin';

  // Check if we have org context
  if (!dashboardContext?.orgId || !dashboardContext?.orgType) {
    return (
      <Card className="bg-[#1A1A1A] border-gray-800">
        <CardContent className="py-12 text-center">
          <AlertCircle className="w-10 h-10 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-300">Select a Track or Series to manage media.</p>
        </CardContent>
      </Card>
    );
  }

  // Load manageable entities
  const { data: collaborations = [] } = useQuery({
    queryKey: ['entity_collaborators', currentUser?.id],
    queryFn: () =>
      currentUser?.id
        ? base44.entities.EntityCollaborator.filter({ user_id: currentUser.id })
        : [],
    enabled: !!currentUser?.id && !isAdmin,
  });

  const manageableEntities = useMemo(() => {
    if (isAdmin) {
      // Admins can manage all
      return [
        { entity_type: 'track', entity_id: dashboardContext.orgId },
        ...(selectedEvent ? [{ entity_type: 'event', entity_id: selectedEvent.id }] : []),
        ...(selectedTrack ? [{ entity_type: 'track', entity_id: selectedTrack.id }] : []),
        ...(selectedSeries ? [{ entity_type: 'series', entity_id: selectedSeries.id }] : []),
      ];
    }

    // Non-admin: filter collaborations to current org context
    const managed = collaborations
      .filter((c) => {
        if (dashboardContext.orgType === 'track' && c.entity_id === dashboardContext.orgId) return true;
        if (dashboardContext.orgType === 'series' && c.entity_id === dashboardContext.orgId) return true;
        return false;
      })
      .map((c) => ({ entity_type: c.entity_type, entity_id: c.entity_id }));

    // Also add selected event if in context
    if (selectedEvent && !managed.some((m) => m.entity_id === selectedEvent.id)) {
      managed.push({ entity_type: 'event', entity_id: selectedEvent.id });
    }

    return managed;
  }, [isAdmin, collaborations, dashboardContext.orgId, dashboardContext.orgType, selectedEvent]);

  if (!isAdmin && manageableEntities.length === 0) {
    return (
      <Card className="bg-[#1A1A1A] border-gray-800">
        <CardContent className="py-12 text-center">
          <AlertCircle className="w-10 h-10 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-300">You do not have media governance access for this selection.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="requests" className="w-full">
        <TabsList className="bg-[#171717] border border-gray-800">
          <TabsTrigger value="requests" className="text-gray-400 px-4 py-2">Requests</TabsTrigger>
          <TabsTrigger value="credentials" className="text-gray-400 px-4 py-2">Credentials</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="mt-6">
          <RequestsView
            manageableEntities={manageableEntities}
            selectedEvent={selectedEvent}
            currentUser={currentUser}
            isAdmin={isAdmin}
            onSelectRequest={(id) => {
              setSelectedRequestId(id);
              setRequestDetailOpen(true);
            }}
            invalidateAfterOperation={invalidateAfterOperation}
          />
        </TabsContent>

        <TabsContent value="credentials" className="mt-6">
          <CredentialsView
            manageableEntities={manageableEntities}
            currentUser={currentUser}
            isAdmin={isAdmin}
            onSelectCredential={(id) => {
              setSelectedCredentialId(id);
              setCredentialDetailOpen(true);
            }}
            invalidateAfterOperation={invalidateAfterOperation}
          />
        </TabsContent>
      </Tabs>

      {/* Request Detail Dialog */}
      {selectedRequestId && (
        <RequestDetailDialog
          requestId={selectedRequestId}
          open={requestDetailOpen}
          onOpenChange={setRequestDetailOpen}
          currentUser={currentUser}
          isAdmin={isAdmin}
          manageableEntities={manageableEntities}
          invalidateAfterOperation={invalidateAfterOperation}
        />
      )}

      {/* Credential Detail Dialog */}
      {selectedCredentialId && (
        <CredentialDetailDialog
          credentialId={selectedCredentialId}
          open={credentialDetailOpen}
          onOpenChange={setCredentialDetailOpen}
          currentUser={currentUser}
          isAdmin={isAdmin}
          invalidateAfterOperation={invalidateAfterOperation}
        />
      )}
    </div>
  );
}

function RequestsView({
  manageableEntities,
  selectedEvent,
  currentUser,
  isAdmin,
  onSelectRequest,
  invalidateAfterOperation,
}) {
  const entityIds = manageableEntities.map((e) => e.entity_id);

  const { data: requests = [] } = useQuery({
    queryKey: ['mediaRequests', entityIds],
    queryFn: async () => {
      if (entityIds.length === 0) return [];
      const all = await base44.entities.CredentialRequest.list();
      return all
        .filter((r) => entityIds.includes(r.target_entity_id) || (selectedEvent && r.related_event_id === selectedEvent.id))
        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: entityIds.length > 0 || !!selectedEvent,
  });

  if (requests.length === 0) {
    return (
      <Card className="bg-[#1A1A1A] border-gray-800">
        <CardContent className="py-12 text-center">
          <p className="text-gray-400">No credential requests yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((req) => (
        <RequestRow
          key={req.id}
          request={req}
          onClick={() => onSelectRequest(req.id)}
        />
      ))}
    </div>
  );
}

function RequestRow({ request, onClick }) {
  const { data: mediaUser } = useQuery({
    queryKey: ['media_user', request.holder_media_user_id],
    queryFn: () => base44.entities.MediaUser.get(request.holder_media_user_id),
  });

  const statusColor = (status) => {
    switch (status) {
      case 'applied': return 'bg-blue-100 text-blue-800';
      case 'under_review': return 'bg-yellow-100 text-yellow-800';
      case 'change_requested': return 'bg-orange-100 text-orange-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'denied': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-[#262626] border border-gray-700 rounded p-4 hover:bg-[#2a2a2a] transition-colors"
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex-1">
          <p className="font-medium text-white">{mediaUser?.full_name || 'Unknown'}</p>
          <p className="text-xs text-gray-500 mt-1">
            {request.target_entity_type} • {request.requested_access_level}
          </p>
        </div>
        <Badge className={statusColor(request.status)}>{request.status}</Badge>
      </div>
      <p className="text-xs text-gray-400 flex items-center gap-1">
        View details
        <ChevronRight className="w-3 h-3" />
      </p>
    </button>
  );
}

function RequestDetailDialog({
  requestId,
  open,
  onOpenChange,
  currentUser,
  isAdmin,
  manageableEntities,
  invalidateAfterOperation,
}) {
  const [denyNotes, setDenyNotes] = useState('');
  const [denyDialogOpen, setDenyDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: request, refetch: refetchRequest } = useQuery({
    queryKey: ['credential_request', requestId],
    queryFn: () => base44.entities.CredentialRequest.get(requestId),
    enabled: !!requestId,
  });

  const { data: mediaUser } = useQuery({
    queryKey: ['media_user', request?.holder_media_user_id],
    queryFn: () => request ? base44.entities.MediaUser.get(request.holder_media_user_id) : null,
    enabled: !!request?.holder_media_user_id,
  });

  const { data: insurance } = useQuery({
    queryKey: ['insurance', request?.holder_media_user_id],
    queryFn: () =>
      request
        ? base44.entities.InsuranceProfile.filter({ media_user_id: request.holder_media_user_id }).then(
            (res) => res[0]
          )
        : null,
    enabled: !!request?.holder_media_user_id,
  });

  const { data: acceptances = [] } = useQuery({
    queryKey: ['policyAcceptances', request?.id],
    queryFn: () => (request ? base44.entities.PolicyAcceptance.filter({ request_id: request.id }) : []),
    enabled: !!request?.id,
  });

  const [resolvedScopeIds, setResolvedScopeIds] = useState([]);

  // Resolve scope
  React.useEffect(() => {
    async function resolveScope() {
      if (!request) return;

      const ids = [request.target_entity_id];

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
          // ignore
        }
      }

      setResolvedScopeIds(ids);
    }

    resolveScope();
  }, [request]);

  const approveMutation = useMutation({
    mutationFn: async () => {
      const issuerEntityId = manageableEntities[0]?.entity_id;
      if (!issuerEntityId) throw new Error('No manageable entity found');

      // Get event expiration if applicable
      let expiresAt = null;
      if (request.related_event_id || request.target_entity_type === 'event') {
        try {
          const eventId = request.related_event_id || request.target_entity_id;
          const event = await base44.entities.Event.get(eventId);
          if (event?.end_date || event?.event_date) {
            const baseDate = new Date(event.end_date || event.event_date);
            baseDate.setDate(baseDate.getDate() + 2);
            expiresAt = baseDate.toISOString();
          }
        } catch (err) {
          // ignore
        }
      }

      // Update request
      await base44.entities.CredentialRequest.update(request.id, {
        status: 'approved',
        reviewed_by_user_id: currentUser.id,
        reviewed_at: new Date().toISOString(),
      });

      // Create or update credential
      const existing = await base44.entities.MediaCredential.filter({
        holder_media_user_id: request.holder_media_user_id,
        scope_entity_id: request.target_entity_id,
      }).then((res) => res[0]);

      const credData = {
        issuer_entity_id: issuerEntityId,
        issuer_entity_type: manageableEntities[0]?.entity_type,
        holder_media_user_id: request.holder_media_user_id,
        scope_entity_id: request.target_entity_id,
        scope_entity_type: request.target_entity_type,
        roles: request.requested_roles || [],
        access_level: request.requested_access_level,
        status: 'active',
        issued_at: new Date().toISOString(),
        ...(expiresAt && { expires_at: expiresAt }),
      };

      if (existing?.id) {
        await base44.entities.MediaCredential.update(existing.id, credData);
      } else {
        await base44.entities.MediaCredential.create(credData);
      }

      invalidateAfterOperation?.('media_request_updated');
      invalidateAfterOperation?.('media_credential_updated');
      toast.success('Request approved');
    },
  });

  const denyMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.CredentialRequest.update(request.id, {
        status: 'denied',
        reviewed_by_user_id: currentUser.id,
        reviewed_at: new Date().toISOString(),
        review_notes: denyNotes,
      });
      invalidateAfterOperation?.('media_request_updated');
      toast.success('Request denied');
    },
  });

  if (!request) return null;

  const canApprove =
    ['under_review', 'applied'].includes(request.status) &&
    !acceptances.some((a) => a.status === 'change_requested');

  const acceptedCount = acceptances.filter((a) => a.status === 'accepted').length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Credential Request</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {/* Applicant */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Applicant</p>
              <p className="text-white font-medium">{mediaUser?.full_name || 'Unknown'}</p>
              <p className="text-xs text-gray-400">{mediaUser?.email}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Status</p>
              <Badge className={request.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                {request.status}
              </Badge>
            </div>
          </div>

          {/* Insurance */}
          {insurance && (
            <div className="bg-[#1A1A1A] border border-gray-700 rounded p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Insurance</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-gray-400">{insurance.carrier_name}</p>
                  <p className="text-xs text-gray-600">{insurance.policy_number}</p>
                </div>
                <div className="text-right">
                  <Badge className={insurance.verification_status === 'verified' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                    {insurance.verification_status}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {/* Request Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Access Level</p>
              <p className="text-white">{request.requested_access_level}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Roles</p>
              <p className="text-white">{request.requested_roles?.join(', ') || '—'}</p>
            </div>
          </div>

          {/* Policies */}
          {resolvedScopeIds.length > 0 && (
            <div className="border-t border-gray-700 pt-4">
              <h3 className="font-semibold text-white mb-3">Policy Completion</h3>
              <p className="text-sm text-gray-300 mb-3">
                Policies completed: {acceptedCount} policy acceptances recorded
              </p>
              <PolicyAcceptancePanel
                mediaUserId={request.holder_media_user_id}
                request={request}
                resolvedScopeEntityIds={resolvedScopeIds}
                onRequestStatusChange={() => refetchRequest()}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t border-gray-700">
            <Button
              onClick={() => {
                denyMutation.mutate();
                setDenyDialogOpen(false);
              }}
              disabled={denyMutation.isPending}
              variant="outline"
              className="flex-1 border-red-900 text-red-400 hover:bg-red-900/20"
            >
              Deny
            </Button>
            <Button
              onClick={() => approveMutation.mutate()}
              disabled={!canApprove || approveMutation.isPending}
              className="flex-1 bg-green-700 hover:bg-green-600"
            >
              Approve
            </Button>
          </div>

          {/* Deny Dialog */}
          {denyDialogOpen && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <Card className="bg-[#262626] border-gray-700 w-96">
                <CardHeader>
                  <CardTitle className="text-white">Deny Request</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    value={denyNotes}
                    onChange={(e) => setDenyNotes(e.target.value)}
                    placeholder="Reason for denial (optional)"
                    rows={3}
                    className="bg-[#1A1A1A] border-gray-700 text-white"
                  />
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setDenyDialogOpen(false)} className="flex-1 border-gray-700">
                      Cancel
                    </Button>
                    <Button
                      onClick={() => denyMutation.mutate()}
                      disabled={denyMutation.isPending}
                      className="flex-1 bg-red-700 hover:bg-red-600"
                    >
                      Confirm Deny
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CredentialsView({
  manageableEntities,
  currentUser,
  isAdmin,
  onSelectCredential,
  invalidateAfterOperation,
}) {
  const entityIds = manageableEntities.map((e) => e.entity_id);

  const { data: credentials = [] } = useQuery({
    queryKey: ['mediaCredentials', entityIds],
    queryFn: async () => {
      if (entityIds.length === 0) return [];
      const all = await base44.entities.MediaCredential.list();
      return all
        .filter((c) => entityIds.includes(c.issuer_entity_id) || entityIds.includes(c.scope_entity_id))
        .sort((a, b) => new Date(b.issued_at) - new Date(a.issued_at));
    },
    enabled: entityIds.length > 0,
  });

  if (credentials.length === 0) {
    return (
      <Card className="bg-[#1A1A1A] border-gray-800">
        <CardContent className="py-12 text-center">
          <p className="text-gray-400">No credentials issued yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {credentials.map((cred) => (
        <CredentialRow
          key={cred.id}
          credential={cred}
          onClick={() => onSelectCredential(cred.id)}
        />
      ))}
    </div>
  );
}

function CredentialRow({ credential, onClick }) {
  const { data: mediaUser } = useQuery({
    queryKey: ['media_user', credential.holder_media_user_id],
    queryFn: () => base44.entities.MediaUser.get(credential.holder_media_user_id),
  });

  const statusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'revoked': return 'bg-red-100 text-red-800';
      case 'expired': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-[#262626] border border-gray-700 rounded p-4 hover:bg-[#2a2a2a] transition-colors"
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex-1">
          <p className="font-medium text-white">{mediaUser?.full_name || 'Unknown'}</p>
          <p className="text-xs text-gray-500 mt-1">
            {credential.access_level} • {credential.roles?.join(', ') || 'no roles'}
          </p>
        </div>
        <Badge className={statusColor(credential.status)}>{credential.status}</Badge>
      </div>
    </button>
  );
}

function CredentialDetailDialog({
  credentialId,
  open,
  onOpenChange,
  currentUser,
  isAdmin,
  invalidateAfterOperation,
}) {
  const queryClient = useQueryClient();

  const { data: credential } = useQuery({
    queryKey: ['media_credential', credentialId],
    queryFn: () => base44.entities.MediaCredential.get(credentialId),
    enabled: !!credentialId,
  });

  const { data: mediaUser } = useQuery({
    queryKey: ['media_user', credential?.holder_media_user_id],
    queryFn: () => credential ? base44.entities.MediaUser.get(credential.holder_media_user_id) : null,
    enabled: !!credential?.holder_media_user_id,
  });

  const revokeMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.MediaCredential.update(credential.id, {
        status: 'revoked',
        revoked_at: new Date().toISOString(),
        revoked_by_user_id: currentUser.id,
      });
      invalidateAfterOperation?.('media_credential_updated');
      toast.success('Credential revoked');
      queryClient.invalidateQueries({ queryKey: ['media_credential', credential.id] });
    },
  });

  if (!credential) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Credential Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Holder</p>
            <p className="text-white font-medium">{mediaUser?.full_name}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Access Level</p>
              <p className="text-white">{credential.access_level}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Status</p>
              <Badge className={credential.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                {credential.status}
              </Badge>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Roles</p>
            <p className="text-white">{credential.roles?.join(', ') || '—'}</p>
          </div>
          {credential.expires_at && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Expires</p>
              <p className="text-white">{new Date(credential.expires_at).toLocaleDateString()}</p>
            </div>
          )}
          {credential.status === 'active' && (
            <Button
              onClick={() => revokeMutation.mutate()}
              disabled={revokeMutation.isPending}
              variant="outline"
              className="w-full border-red-900 text-red-400 hover:bg-red-900/20"
            >
              Revoke
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}