import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle } from 'lucide-react';
import { reviewCredentialRequest } from './mediaApi';

export default function MediaRequestsManager({
  dashboardContext,
  selectedEvent,
  selectedTrack,
  selectedSeries,
  dashboardPermissions,
  invalidateAfterOperation,
}) {
  const [pending, setPending] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [approvalForm, setApprovalForm] = useState({
    approved_access_level: '',
    approved_roles: [],
    expires_at: '',
    event_expiry_buffer_hours: 12,
  });
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  // Safety guards
  if (!dashboardContext?.orgId || !dashboardContext?.orgType) {
    return null;
  }

  if (!selectedEvent) {
    return null;
  }

  // Determine org context
  const orgEntityId = selectedTrack?.id || selectedSeries?.id;
  const orgEntityType = selectedTrack ? 'track' : 'series';

  // Load credential requests with proper scoping
  const { data: requests = [] } = useQuery({
    queryKey: ['credential_requests', orgEntityId, selectedEvent?.id],
    queryFn: async () => {
      if (!orgEntityId) return [];
      const allRequests = await base44.entities.CredentialRequest.filter({});
      return allRequests.filter(
        (cr) =>
          cr.target_entity_id === orgEntityId ||
          (selectedEvent && cr.related_event_id === selectedEvent.id) ||
          (selectedSeries && cr.target_entity_id === selectedSeries.id) ||
          (selectedTrack && cr.target_entity_id === selectedTrack.id)
      );
    },
    enabled: !!orgEntityId,
  });

  // Load media users for display
  const { data: mediaUsers = [] } = useQuery({
    queryKey: ['media_users'],
    queryFn: () => base44.entities.MediaUser.list(),
  });

  // Load waiver signatures scoped to this event for completion indicators
  const { data: waiverSigsForEvent = [] } = useQuery({
    queryKey: ['waiverSigsEvent', selectedEvent?.id],
    queryFn: () => base44.entities.WaiverSignature.filter({ event_id: selectedEvent.id }),
    enabled: !!selectedEvent?.id,
  });

  const getUserName = (mediaUserId) => {
    const mu = mediaUsers.find((m) => m.id === mediaUserId);
    return mu?.full_name || '—';
  };

  // Review mutation
  const reviewMutation = useMutation({
    mutationFn: async ({ requestId, action, notes, issuerEntityId, reviewerUserId, payload }) => {
      const actionMap = {
        under_review: 'under_review',
        request_info: 'request_info',
        deny: 'deny',
        approve: 'approve',
      };
      const result = await reviewCredentialRequest({
        request_id: requestId,
        action: actionMap[action],
        review_notes: notes,
        issuer_entity_id: issuerEntityId,
        reviewer_user_id: reviewerUserId,
        ...payload,
      });
      if (!result.ok) throw new Error(result.errorMessage);
      return result.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['credential_requests'] });
      invalidateAfterOperation(`media_request_${variables.action}`);
      setPending(false);
      setApprovalDialogOpen(false);
      setError('');
    },
    onError: (err) => {
      setError(err.message);
      setPending(false);
    },
  });

  const handleAction = async (requestId, action, payload = {}) => {
    setPending(true);
    setError('');
    const user = await base44.auth.me();
    reviewMutation.mutate({
      requestId,
      action,
      notes: '',
      issuerEntityId: orgEntityId,
      reviewerUserId: user.id,
      payload,
    });
  };

  const handleApproveClick = (requestId) => {
    setSelectedRequestId(requestId);
    setApprovalForm({
      approved_access_level: '',
      approved_roles: [],
      expires_at: '',
      event_expiry_buffer_hours: 12,
    });
    setError('');
    setApprovalDialogOpen(true);
  };

  const handleConfirmApprove = async () => {
    if (!selectedRequestId) return;
    setPending(true);
    setError('');
    const user = await base44.auth.me();
    const payload = {};
    if (approvalForm.approved_access_level) payload.approved_access_level = approvalForm.approved_access_level;
    if (approvalForm.approved_roles?.length > 0) payload.approved_roles = approvalForm.approved_roles;
    if (approvalForm.expires_at) payload.expires_at = approvalForm.expires_at;
    if (approvalForm.event_expiry_buffer_hours !== 12) payload.event_expiry_buffer_hours = approvalForm.event_expiry_buffer_hours;
    
    reviewMutation.mutate({
      requestId: selectedRequestId,
      action: 'approve',
      notes: '',
      issuerEntityId: orgEntityId,
      reviewerUserId: user.id,
      payload,
    });
  };

  const statusColor = (status) => {
    switch (status) {
      case 'applied':
        return 'bg-blue-900/40 text-blue-300';
      case 'under_review':
        return 'bg-yellow-900/40 text-yellow-300';
      case 'approved':
        return 'bg-green-900/40 text-green-300';
      case 'denied':
        return 'bg-red-900/40 text-red-300';
      case 'change_requested':
        return 'bg-orange-900/40 text-orange-300';
      default:
        return 'bg-gray-900/40 text-gray-300';
    }
  };

  if (!orgEntityId) {
    return (
      <Card className="bg-[#1A1A1A] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Media Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-gray-400">
            <AlertCircle className="w-4 h-4" />
            <p>Select a track or series to view requests</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#1A1A1A] border-gray-800">
      <CardHeader>
        <CardTitle className="text-white">Media Credential Requests</CardTitle>
        <p className="text-xs text-gray-400 mt-2">
          {selectedEvent
            ? `Showing requests for ${orgEntityType} and event "${selectedEvent.name}"`
            : `Showing requests for ${orgEntityType}. Select an event to see event-specific requests.`}
        </p>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <p className="text-sm text-gray-500">No requests</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700 hover:bg-transparent">
                  <TableHead className="text-gray-400">Created</TableHead>
                  <TableHead className="text-gray-400">Applicant</TableHead>
                  <TableHead className="text-gray-400">Target</TableHead>
                  <TableHead className="text-gray-400">Roles</TableHead>
                  <TableHead className="text-gray-400">Access Level</TableHead>
                  <TableHead className="text-gray-400">Status</TableHead>
                  <TableHead className="text-gray-400">Waivers</TableHead>
                  <TableHead className="text-gray-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => (
                  <TableRow key={req.id} className="border-gray-700 hover:bg-gray-900/30">
                    <TableCell className="text-xs text-gray-300">
                      {new Date(req.created_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-xs text-gray-300">
                      {getUserName(req.holder_media_user_id)}
                    </TableCell>
                    <TableCell className="text-xs text-gray-300">
                      {req.target_entity_type}
                    </TableCell>
                    <TableCell className="text-xs text-gray-300">
                      {req.requested_roles?.join(', ') || '—'}
                    </TableCell>
                    <TableCell className="text-xs text-gray-300">
                      {req.requested_access_level || 'general'}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColor(req.status)}>
                        {req.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-gray-400">
                      {(() => {
                        const sigs = waiverSigsForEvent.filter(s => s.holder_media_user_id === req.holder_media_user_id && s.status === 'valid');
                        return sigs.length > 0
                          ? <span className="text-green-400">{sigs.length} signed</span>
                          : <span className="text-gray-600">—</span>;
                      })()}
                    </TableCell>
                    <TableCell className="flex gap-1">
                      {(req.status === 'applied' || req.status === 'under_review') && (
                        <>
                          <Button
                            size="sm"
                            disabled={pending}
                            onClick={() => handleApproveClick(req.id)}
                            className="h-6 px-2 text-xs bg-green-700 hover:bg-green-600"
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            disabled={pending}
                            onClick={() => handleAction(req.id, 'deny')}
                            className="h-6 px-2 text-xs bg-red-700 hover:bg-red-600"
                          >
                            Deny
                          </Button>
                          <Button
                            size="sm"
                            disabled={pending}
                            onClick={() => handleAction(req.id, 'request_info')}
                            className="h-6 px-2 text-xs bg-yellow-700 hover:bg-yellow-600"
                          >
                            Info
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Approval Dialog */}
      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent className="bg-[#262626] border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Approve Credential Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {error && (
              <div className="bg-red-900/30 border border-red-700 rounded p-3 text-red-300 text-sm">
                {error}
              </div>
            )}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Access Level (optional override)</label>
              <Select value={approvalForm.approved_access_level} onValueChange={(v) => setApprovalForm({...approvalForm, approved_access_level: v})}>
                <SelectTrigger className="bg-[#1A1A1A] border-gray-700 text-white">
                  <SelectValue placeholder="Use requested level" />
                </SelectTrigger>
                <SelectContent className="bg-[#262626] border-gray-700">
                  <SelectItem value={null}>Use Requested</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="pit">Pit</SelectItem>
                  <SelectItem value="hot_pit">Hot Pit</SelectItem>
                  <SelectItem value="restricted">Restricted</SelectItem>
                  <SelectItem value="drone">Drone</SelectItem>
                  <SelectItem value="all_access">All Access</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {!selectedEvent && (
              <>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Expires At (optional)</label>
                  <Input
                    type="datetime-local"
                    value={approvalForm.expires_at}
                    onChange={(e) => setApprovalForm({...approvalForm, expires_at: e.target.value})}
                    className="bg-[#1A1A1A] border-gray-700 text-white"
                  />
                </div>
              </>
            )}
            {selectedEvent && (
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Event Expiry Buffer (hours)</label>
                <Input
                  type="number"
                  value={approvalForm.event_expiry_buffer_hours}
                  onChange={(e) => setApprovalForm({...approvalForm, event_expiry_buffer_hours: parseInt(e.target.value) || 12})}
                  className="bg-[#1A1A1A] border-gray-700 text-white"
                />
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setApprovalDialogOpen(false)}
                className="border-gray-700 text-gray-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmApprove}
                disabled={pending}
                className="bg-green-700 hover:bg-green-600"
              >
                {pending ? 'Approving...' : 'Approve'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}