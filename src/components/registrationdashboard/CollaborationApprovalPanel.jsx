import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, XCircle, Clock, Users } from 'lucide-react';
import { toast } from 'sonner';
import { buildInvalidateAfterOperation } from './invalidationHelper';
import { format } from 'date-fns';

function StatusBadge({ status }) {
  if (status === 'accepted') return <Badge className="bg-green-900 text-green-300 border-green-700">Accepted</Badge>;
  if (status === 'declined') return <Badge className="bg-red-900 text-red-300 border-red-700">Declined</Badge>;
  return <Badge className="bg-yellow-900 text-yellow-300 border-yellow-700">Pending</Badge>;
}

function StatusIcon({ status }) {
  if (status === 'accepted') return <CheckCircle2 className="w-4 h-4 text-green-400" />;
  if (status === 'declined') return <XCircle className="w-4 h-4 text-red-400" />;
  return <Clock className="w-4 h-4 text-yellow-400" />;
}

export default function CollaborationApprovalPanel({ eventId, canApproveAsTrack, canApproveAsSeries, currentUser }) {
  const queryClient = useQueryClient();
  const invalidateAfterOperation = buildInvalidateAfterOperation(queryClient);
  const [declineNote, setDeclineNote] = useState('');
  const [decliningFor, setDecliningFor] = useState(null); // 'track' | 'series'

  const { data: collabs = [], isLoading } = useQuery({
    queryKey: ['eventCollaboration', eventId],
    queryFn: () => base44.entities.EventCollaboration.filter({ event_id: eventId }),
    enabled: !!eventId,
    staleTime: 15000,
  });

  const collab = collabs[0] || null;

  const logOperation = async (operationType, notes) => {
    await base44.entities.OperationLog.create({
      operation_type: operationType,
      entity_type: 'Event',
      entity_id: eventId,
      user_email: currentUser?.email || '',
      message: notes || operationType,
      status: 'completed',
    }).catch(() => {});
    invalidateAfterOperation(operationType, { eventId });
  };

  const handleAccept = async (side) => {
    if (!collab) return;
    const now = new Date().toISOString();
    const patch = side === 'track'
      ? { track_status: 'accepted', track_accepted_by_user_id: currentUser?.id, track_accepted_date: now }
      : { series_status: 'accepted', series_accepted_by_user_id: currentUser?.id, series_accepted_date: now };

    await base44.entities.EventCollaboration.update(collab.id, patch);
    const opType = side === 'track' ? 'event_collaboration_track_accepted' : 'event_collaboration_series_accepted';
    await logOperation(opType, `${side} approved collaboration`);
    queryClient.invalidateQueries({ queryKey: ['eventCollaboration', eventId] });
    toast.success(`${side === 'track' ? 'Track' : 'Series'} approval accepted`);
  };

  const handleDeclineSubmit = async () => {
    if (!collab || !decliningFor) return;
    const patch = decliningFor === 'track'
      ? { track_status: 'declined', notes: declineNote }
      : { series_status: 'declined', notes: declineNote };

    await base44.entities.EventCollaboration.update(collab.id, patch);
    const opType = decliningFor === 'track' ? 'event_collaboration_track_declined' : 'event_collaboration_series_declined';
    await logOperation(opType, `${decliningFor} declined: ${declineNote}`);
    queryClient.invalidateQueries({ queryKey: ['eventCollaboration', eventId] });
    toast.success(`${decliningFor === 'track' ? 'Track' : 'Series'} approval declined`);
    setDecliningFor(null);
    setDeclineNote('');
  };

  if (!eventId) return null;
  if (isLoading) return <div className="text-gray-500 text-sm py-2">Loading collaboration status...</div>;
  if (!collab) return (
    <Card className="bg-[#1a1a1a] border-gray-800">
      <CardContent className="pt-4">
        <p className="text-gray-500 text-sm">No collaboration record found. Save the event to create one.</p>
      </CardContent>
    </Card>
  );

  const bothAccepted = collab.track_status === 'accepted' && collab.series_status === 'accepted';
  const hasDecline = collab.track_status === 'declined' || collab.series_status === 'declined';

  return (
    <Card className="bg-[#171717] border-gray-800">
      <CardHeader className="border-b border-gray-800 pb-4">
        <CardTitle className="text-white text-sm flex items-center gap-2">
          <Users className="w-4 h-4" />
          Collaboration Approval
        </CardTitle>
        {bothAccepted && (
          <p className="text-green-400 text-xs mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Both sides approved — event can be published
          </p>
        )}
        {hasDecline && !bothAccepted && (
          <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
            <XCircle className="w-3 h-3" /> Collaboration declined — event cannot be published
          </p>
        )}
        {!bothAccepted && !hasDecline && (
          <p className="text-yellow-400 text-xs mt-1 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Pending approvals — event cannot be published yet
          </p>
        )}
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {/* Track Approval */}
        <div className="flex items-center justify-between p-3 bg-[#262626] rounded-lg">
          <div className="flex items-center gap-3">
            <StatusIcon status={collab.track_status} />
            <div>
              <p className="text-white text-sm font-medium">Track Approval</p>
              {collab.track_accepted_date && (
                <p className="text-gray-500 text-xs">{format(new Date(collab.track_accepted_date), 'MMM d, yyyy')}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={collab.track_status} />
            {canApproveAsTrack && collab.track_status === 'pending' && (
              <>
                <Button size="sm" onClick={() => handleAccept('track')} className="h-7 px-2 text-xs bg-green-800 hover:bg-green-700 text-white border-0">Accept</Button>
                <Button size="sm" onClick={() => setDecliningFor('track')} className="h-7 px-2 text-xs bg-red-900 hover:bg-red-800 text-white border-0">Decline</Button>
              </>
            )}
          </div>
        </div>

        {/* Series Approval */}
        {collab.series_id && (
          <div className="flex items-center justify-between p-3 bg-[#262626] rounded-lg">
            <div className="flex items-center gap-3">
              <StatusIcon status={collab.series_status} />
              <div>
                <p className="text-white text-sm font-medium">Series Approval</p>
                {collab.series_accepted_date && (
                  <p className="text-gray-500 text-xs">{format(new Date(collab.series_accepted_date), 'MMM d, yyyy')}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={collab.series_status} />
              {canApproveAsSeries && collab.series_status === 'pending' && (
                <>
                  <Button size="sm" onClick={() => handleAccept('series')} className="h-7 px-2 text-xs bg-green-800 hover:bg-green-700 text-white border-0">Accept</Button>
                  <Button size="sm" onClick={() => setDecliningFor('series')} className="h-7 px-2 text-xs bg-red-900 hover:bg-red-800 text-white border-0">Decline</Button>
                </>
              )}
            </div>
          </div>
        )}

        {/* No series - show auto-accepted */}
        {!collab.series_id && (
          <div className="flex items-center justify-between p-3 bg-[#262626] rounded-lg opacity-60">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <p className="text-gray-400 text-sm">Series Approval</p>
            </div>
            <Badge className="bg-green-900 text-green-300 border-green-700 text-xs">Auto-accepted (no series)</Badge>
          </div>
        )}

        {/* Decline reason */}
        {collab.notes && (collab.track_status === 'declined' || collab.series_status === 'declined') && (
          <div className="p-3 bg-red-950 border border-red-900 rounded-lg">
            <p className="text-red-400 text-xs font-medium mb-1">Decline Reason</p>
            <p className="text-red-300 text-sm">{collab.notes}</p>
          </div>
        )}

        {/* Decline dialog */}
        {decliningFor && (
          <div className="p-3 bg-[#262626] border border-red-800 rounded-lg space-y-2">
            <p className="text-white text-sm font-medium">Reason for declining ({decliningFor})</p>
            <Textarea
              value={declineNote}
              onChange={e => setDeclineNote(e.target.value)}
              placeholder="Enter reason for declining..."
              className="bg-[#1a1a1a] border-gray-700 text-white text-sm min-h-[60px]"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleDeclineSubmit} className="h-7 px-3 text-xs bg-red-800 hover:bg-red-700 text-white border-0">Confirm Decline</Button>
              <Button size="sm" variant="outline" onClick={() => { setDecliningFor(null); setDeclineNote(''); }} className="h-7 px-3 text-xs border-gray-700 text-gray-300">Cancel</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}