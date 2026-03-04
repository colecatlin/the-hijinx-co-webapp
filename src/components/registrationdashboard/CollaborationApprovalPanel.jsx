import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, XCircle, Clock, Users, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { buildInvalidateAfterOperation } from './invalidationHelper';
import { getEntityAccessForUser, canApproveCollaboration } from './entityAccess';
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

export default function CollaborationApprovalPanel({ eventId, isAdmin, currentUser }) {
  const queryClient = useQueryClient();
  const invalidateAfterOperation = buildInvalidateAfterOperation(queryClient);
  const [declineNote, setDeclineNote] = useState('');
  const [decliningFor, setDecliningFor] = useState(null); // 'track' | 'series'

  // Access state
  const [trackAccess, setTrackAccess] = useState({ hasAccess: false, role: null });
  const [seriesAccess, setSeriesAccess] = useState({ hasAccess: false, role: null });
  const [accessLoading, setAccessLoading] = useState(false);

  const { data: event = null, isLoading: eventLoading } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => base44.entities.Event.get(eventId),
    enabled: !!eventId,
    staleTime: 15000,
  });

  const { data: collabs = [], isLoading: collabLoading } = useQuery({
    queryKey: ['eventCollaboration', eventId],
    queryFn: () => base44.entities.EventCollaboration.filter({ event_id: eventId }),
    enabled: !!eventId,
    staleTime: 15000,
  });

  const isLoading = eventLoading || collabLoading;
  const collab = collabs[0] || null;

  // Resolve entity access whenever collab or user changes
  useEffect(() => {
    if (!currentUser?.id || !collab) return;
    setAccessLoading(true);
    Promise.all([
      collab.track_id
        ? getEntityAccessForUser(currentUser.id, 'Track', collab.track_id)
        : Promise.resolve({ hasAccess: false, role: null }),
      collab.series_id
        ? getEntityAccessForUser(currentUser.id, 'Series', collab.series_id)
        : Promise.resolve({ hasAccess: false, role: null }),
    ]).then(([tAccess, sAccess]) => {
      setTrackAccess(tAccess);
      setSeriesAccess(sAccess);
    }).finally(() => setAccessLoading(false));
  }, [currentUser?.id, collab?.id, collab?.track_id, collab?.series_id]);

  const canTrack = canApproveCollaboration('Track', trackAccess, isAdmin);
  const canSeries = canApproveCollaboration('Series', seriesAccess, isAdmin);

  const logOperation = async (operationType, notes) => {
    await base44.entities.OperationLog.create({
      operation_type: operationType,
      entity_type: 'Event',
      entity_id: eventId,
      user_email: currentUser?.email || '',
      message: notes || operationType,
      status: 'completed',
    }).catch(() => {});
    invalidateAfterOperation('event_collaboration_updated', { eventId });
  };

  const handleAccept = async (side) => {
    if (!collab) return;

    // Re-check access before writing
    if (side === 'track' && !canTrack) {
      toast.error('You do not have permission to approve for this Track');
      return;
    }
    if (side === 'series' && !canSeries) {
      toast.error('You do not have permission to approve for this Series');
      return;
    }

    const now = new Date().toISOString();
    const patch = side === 'track'
      ? { track_acceptance: 'accepted', track_accepted_by_user_id: currentUser?.id, track_accepted_date: now }
      : { series_acceptance: 'accepted', series_accepted_by_user_id: currentUser?.id, series_accepted_date: now };

    await base44.entities.EventCollaboration.update(collab.id, patch);

    // Call backend to update Event states
    await base44.functions.invoke('respondEventCollaboration', {
      eventId,
      responderType: side,
      decision: 'accepted',
      userId: currentUser?.id
    });

    const opType = side === 'track' ? 'event_collaboration_track_accepted' : 'event_collaboration_series_accepted';
    await logOperation(opType, `${side} approved collaboration`);
    queryClient.invalidateQueries({ queryKey: ['eventCollaboration', eventId] });
    queryClient.invalidateQueries({ queryKey: ['event', eventId] });
    toast.success(`${side === 'track' ? 'Track' : 'Series'} approval accepted`);
  };

  const handleDeclineSubmit = async () => {
    if (!collab || !decliningFor) return;

    // Re-check access before writing
    if (decliningFor === 'track' && !canTrack) {
      toast.error('You do not have permission to decline for this Track');
      setDecliningFor(null);
      return;
    }
    if (decliningFor === 'series' && !canSeries) {
      toast.error('You do not have permission to decline for this Series');
      setDecliningFor(null);
      return;
    }

    const patch = decliningFor === 'track'
      ? { track_acceptance: 'rejected', notes: declineNote }
      : { series_acceptance: 'rejected', notes: declineNote };

    await base44.entities.EventCollaboration.update(collab.id, patch);

    // Call backend to update Event states
    await base44.functions.invoke('respondEventCollaboration', {
      eventId,
      responderType: decliningFor,
      decision: 'rejected',
      userId: currentUser?.id
    });

    const opType = decliningFor === 'track' ? 'event_collaboration_track_declined' : 'event_collaboration_series_declined';
    await logOperation(opType, `${decliningFor} declined: ${declineNote}`);
    queryClient.invalidateQueries({ queryKey: ['eventCollaboration', eventId] });
    queryClient.invalidateQueries({ queryKey: ['event', eventId] });
    toast.success(`${decliningFor === 'track' ? 'Track' : 'Series'} approval declined`);
    setDecliningFor(null);
    setDeclineNote('');
  };

  if (!eventId) return null;
  if (isLoading || accessLoading) return <div className="text-gray-500 text-sm py-2">Loading collaboration status...</div>;
  if (!collab) return (
    <Card className="bg-[#1a1a1a] border-gray-800">
      <CardContent className="pt-4">
        <p className="text-gray-500 text-sm">No collaboration record found. Save the event to create one.</p>
      </CardContent>
    </Card>
  );

  const trackState = event?.track_publish_state || collab?.track_acceptance || 'pending';
  const seriesState = event?.series_publish_state || collab?.series_acceptance || 'pending';
  const bothAccepted = trackState === 'accepted' && seriesState === 'accepted';
  const publishReady = event?.publish_ready || false;
  const hasDecline = trackState === 'rejected' || seriesState === 'rejected';

  return (
    <Card className="bg-[#171717] border-gray-800">
      <CardHeader className="border-b border-gray-800 pb-4">
        <CardTitle className="text-white text-sm flex items-center gap-2">
          <Users className="w-4 h-4" />
          Collaboration Approval
        </CardTitle>
        {publishReady && (
          <p className="text-green-400 text-xs mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Published — both sides approved and published
          </p>
        )}
        {bothAccepted && !publishReady && (
          <p className="text-blue-400 text-xs mt-1 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Accepted by both — ready to publish
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
        <div className="p-3 bg-[#262626] rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <StatusIcon status={trackState} />
              <div>
                <p className="text-white text-sm font-medium">Track Approval</p>
                {collab?.track_accepted_date && (
                  <p className="text-gray-500 text-xs">{format(new Date(collab.track_accepted_date), 'MMM d, yyyy')}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={trackState} />
              {canTrack && trackState === 'pending' && (
                <>
                  <Button size="sm" onClick={() => handleAccept('track')} className="h-7 px-2 text-xs bg-green-800 hover:bg-green-700 text-white border-0">Accept</Button>
                  <Button size="sm" onClick={() => setDecliningFor('track')} className="h-7 px-2 text-xs bg-red-900 hover:bg-red-800 text-white border-0">Decline</Button>
                </>
              )}
            </div>
          </div>
          {!canTrack && trackState === 'pending' && (
            <p className="text-gray-500 text-xs flex items-center gap-1 pl-7">
              <Lock className="w-3 h-3" /> You do not have permission to approve for this Track
            </p>
          )}
        </div>

        {/* Series Approval */}
        {event?.series_id || collab?.series_id ? (
          <div className="p-3 bg-[#262626] rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <StatusIcon status={seriesState} />
                <div>
                  <p className="text-white text-sm font-medium">Series Approval</p>
                  {collab?.series_accepted_date && (
                    <p className="text-gray-500 text-xs">{format(new Date(collab.series_accepted_date), 'MMM d, yyyy')}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={seriesState} />
                {canSeries && seriesState === 'pending' && (
                  <>
                    <Button size="sm" onClick={() => handleAccept('series')} className="h-7 px-2 text-xs bg-green-800 hover:bg-green-700 text-white border-0">Accept</Button>
                    <Button size="sm" onClick={() => setDecliningFor('series')} className="h-7 px-2 text-xs bg-red-900 hover:bg-red-800 text-white border-0">Decline</Button>
                  </>
                )}
              </div>
            </div>
            {!canSeries && seriesState === 'pending' && (
              <p className="text-gray-500 text-xs flex items-center gap-1 pl-7">
                <Lock className="w-3 h-3" /> You do not have permission to approve for this Series
              </p>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between p-3 bg-[#262626] rounded-lg opacity-60">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <p className="text-gray-400 text-sm">Series Approval</p>
            </div>
            <Badge className="bg-green-900 text-green-300 border-green-700 text-xs">Auto-accepted (no series)</Badge>
          </div>
        )}

        {/* Decline reason display */}
        {collab.notes && (collab.track_status === 'declined' || collab.series_status === 'declined') && (
          <div className="p-3 bg-red-950 border border-red-900 rounded-lg">
            <p className="text-red-400 text-xs font-medium mb-1">Decline Reason</p>
            <p className="text-red-300 text-sm">{collab.notes}</p>
          </div>
        )}

        {/* Decline input form */}
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