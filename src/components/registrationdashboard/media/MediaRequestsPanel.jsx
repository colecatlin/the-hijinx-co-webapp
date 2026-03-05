import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ChevronRight } from 'lucide-react';

const STATUS_COLORS = {
  draft: 'bg-gray-700 text-gray-300',
  applied: 'bg-blue-900/60 text-blue-300',
  change_requested: 'bg-orange-900/60 text-orange-300',
  under_review: 'bg-yellow-900/60 text-yellow-300',
  approved: 'bg-green-900/60 text-green-300',
  denied: 'bg-red-900/60 text-red-300',
  cancelled: 'bg-gray-800 text-gray-400',
};

export default function MediaRequestsPanel({ dashboardContext, selectedEvent, currentUser, isAdmin, invalidateAfterOperation }) {
  const [selectedReq, setSelectedReq] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const queryClient = useQueryClient();

  const entityId = dashboardContext?.orgId;
  const eventId = selectedEvent?.id;

  const { data: requests = [] } = useQuery({
    queryKey: ['mediaRequests', { entityId, eventId }],
    queryFn: async () => {
      const all = await base44.entities.CredentialRequest.list();
      return all.filter(r =>
        r.target_entity_id === entityId ||
        (eventId && r.related_event_id === eventId)
      ).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!entityId,
  });

  const { data: mediaUsers = [] } = useQuery({
    queryKey: ['media_users'],
    queryFn: () => base44.entities.MediaUser.list(),
  });

  const getUserName = (id) => mediaUsers.find(u => u.id === id)?.full_name || id?.slice(0,8) || '—';

  const updateMutation = useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();
      await base44.entities.CredentialRequest.update(selectedReq.id, {
        status: newStatus || selectedReq.status,
        review_notes: reviewNotes,
        reviewed_by_user_id: currentUser?.id,
        reviewed_at: now,
      });

      if (newStatus === 'approved') {
        let expiresAt = null;
        if (selectedEvent?.end_date || selectedEvent?.event_date) {
          const d = new Date(selectedEvent.end_date || selectedEvent.event_date);
          d.setDate(d.getDate() + 2);
          expiresAt = d.toISOString();
        }
        const existing = await base44.entities.MediaCredential.filter({
          holder_media_user_id: selectedReq.holder_media_user_id,
          scope_entity_id: selectedReq.target_entity_id,
        }).then(r => r[0]);

        const credData = {
          issuer_entity_id: entityId,
          issuer_entity_type: dashboardContext.orgType,
          holder_media_user_id: selectedReq.holder_media_user_id,
          scope_entity_id: selectedReq.target_entity_id,
          scope_entity_type: selectedReq.target_entity_type,
          roles: selectedReq.requested_roles || [],
          access_level: selectedReq.requested_access_level || 'general',
          status: 'active',
          issued_at: now,
          ...(expiresAt && { expires_at: expiresAt }),
        };
        if (existing?.id) {
          await base44.entities.MediaCredential.update(existing.id, credData);
        } else {
          await base44.entities.MediaCredential.create(credData);
        }
      }

      invalidateAfterOperation?.('media_request_updated');
      invalidateAfterOperation?.('media_credential_updated');
      toast.success('Request updated');
      setSelectedReq(null);
    },
  });

  return (
    <Card className="bg-[#1A1A1A] border-gray-800">
      <CardHeader>
        <CardTitle className="text-white text-sm">Credential Requests</CardTitle>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <p className="text-gray-500 text-sm">No requests for this context.</p>
        ) : (
          <div className="space-y-2">
            {requests.map(req => (
              <button
                key={req.id}
                onClick={() => { setSelectedReq(req); setReviewNotes(req.review_notes || ''); setNewStatus(req.status); }}
                className="w-full text-left bg-[#262626] border border-gray-700 rounded p-3 hover:bg-[#2a2a2a] transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-white text-xs font-medium">{getUserName(req.holder_media_user_id)}</p>
                    <p className="text-gray-500 text-xs">{req.target_entity_type} • {req.requested_access_level}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={STATUS_COLORS[req.status] || 'bg-gray-700 text-gray-300'}>{req.status}</Badge>
                    <ChevronRight className="w-3 h-3 text-gray-500" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={!!selectedReq} onOpenChange={(o) => !o && setSelectedReq(null)}>
        <DialogContent className="bg-[#262626] border-gray-700 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Review Request</DialogTitle>
          </DialogHeader>
          {selectedReq && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Applicant</p>
                  <p className="text-white">{getUserName(selectedReq.holder_media_user_id)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Current Status</p>
                  <Badge className={STATUS_COLORS[selectedReq.status]}>{selectedReq.status}</Badge>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Access Level</p>
                  <p className="text-white">{selectedReq.requested_access_level || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Roles</p>
                  <p className="text-white">{selectedReq.requested_roles?.join(', ') || '—'}</p>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Update Status</label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="bg-[#1A1A1A] border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1A1A1A] border-gray-700">
                    {['applied','under_review','change_requested','approved','denied','cancelled'].map(s => (
                      <SelectItem key={s} value={s} className="text-white">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Review Notes</label>
                <Textarea
                  value={reviewNotes}
                  onChange={e => setReviewNotes(e.target.value)}
                  rows={3}
                  className="bg-[#1A1A1A] border-gray-700 text-white resize-none"
                  placeholder="Optional notes..."
                />
              </div>
              <div className="flex flex-col gap-2">
                {selectedReq?.holder_media_user_id && (
                  <a
                    href={`${window.location.origin}${createPageUrl('MediaProfile')}?mediaUserId=${selectedReq.holder_media_user_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                  >
                    View Media Profile ↗
                  </a>
                )}
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" className="border-gray-700 text-gray-300" onClick={() => setSelectedReq(null)}>Cancel</Button>
                <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending} className="bg-blue-700 hover:bg-blue-600">
                  {updateMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}