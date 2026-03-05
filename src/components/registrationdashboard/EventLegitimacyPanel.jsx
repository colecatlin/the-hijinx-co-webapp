import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, ShieldAlert, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_BADGE = {
  confirmed:            'bg-green-900/50 text-green-300 border-green-700',
  pending_confirmation: 'bg-amber-900/50 text-amber-300 border-amber-700',
  rejected:             'bg-red-900/50 text-red-300 border-red-700',
  draft:                'bg-gray-700 text-gray-300 border-gray-600',
};

const PARTY_BADGE = {
  accepted: 'bg-green-900/50 text-green-300',
  rejected:  'bg-red-900/50 text-red-300',
  pending:   'bg-amber-900/50 text-amber-300',
};

const HELPER = {
  pending_confirmation: 'This event will not be treated as confirmed until required parties accept.',
  confirmed:            'This event is confirmed by required parties.',
  rejected:             'This event is rejected by a required party.',
  draft:                'Confirmation record not yet initialized.',
};

async function logOperation(operation_type, metadata) {
  try {
    await base44.entities.OperationLog.create({
      operation_type,
      source_type: 'entity_confirmation',
      entity_name: 'Event',
      status: 'success',
      metadata,
    });
  } catch (_) { /* non-fatal */ }
}

export default function EventLegitimacyPanel({ selectedEventId, event, isAdmin, currentUser, invalidateAfterOperation }) {
  const queryClient = useQueryClient();
  const [linkageResult, setLinkageResult] = useState(null);
  const [working, setWorking] = useState(false);

  // Load entity record for the event
  const { data: eventEntityList = [] } = useQuery({
    queryKey: ['entityRecord', 'event', selectedEventId],
    queryFn: () => base44.entities.Entity.filter({ entity_type: 'event', source_entity_id: selectedEventId }),
    enabled: !!selectedEventId,
    staleTime: 30000,
  });
  const eventEntity = eventEntityList[0] || null;

  // Load confirmation record
  const { data: confirmationList = [], refetch: refetchConfirmation } = useQuery({
    queryKey: ['entityConfirmation', eventEntity?.id],
    queryFn: () => base44.entities.EntityConfirmation.filter({ event_entity_id: eventEntity.id }),
    enabled: !!eventEntity?.id,
    staleTime: 15000,
  });
  const confirmation = confirmationList[0] || null;

  // If no confirmation exists yet, try to bootstrap via ensureEventEntityLinks
  useEffect(() => {
    if (!selectedEventId || eventEntity || working) return;
    // No entity record yet — bootstrap silently
    (async () => {
      try {
        const res = await base44.functions.invoke('ensureEventEntityLinks', { event_id: selectedEventId });
        setLinkageResult(res.data);
        queryClient.invalidateQueries({ queryKey: ['entityRecord', 'event', selectedEventId] });
      } catch (_) { /* non-fatal */ }
    })();
  }, [selectedEventId, eventEntity, working]);

  const handleEnsureLinks = async () => {
    setWorking(true);
    try {
      const res = await base44.functions.invoke('ensureEventEntityLinks', { event_id: selectedEventId });
      setLinkageResult(res.data);
      queryClient.invalidateQueries({ queryKey: ['entityRecord', 'event', selectedEventId] });
      queryClient.invalidateQueries({ queryKey: ['entityConfirmation', eventEntity?.id] });
      await refetchConfirmation();
      toast.success('Entity links ensured');
    } catch (e) {
      toast.error('Failed to ensure entity links: ' + e.message);
    } finally {
      setWorking(false);
    }
  };

  const recompute = async (confirmationId) => {
    const res = await base44.functions.invoke('recomputeEntityConfirmationStatus', { confirmation_id: confirmationId });
    queryClient.invalidateQueries({ queryKey: ['entityConfirmation', eventEntity?.id] });
    await refetchConfirmation();
    return res.data;
  };

  const handleRequestTrackConfirmation = async () => {
    if (!confirmation) return;
    setWorking(true);
    try {
      // Ensure a proposed relationship exists (ensureEventEntityLinks already does this, but call recompute to refresh)
      const result = await recompute(confirmation.id);
      await logOperation('event_confirmation_requested', {
        event_id: selectedEventId,
        track_id: event?.track_id,
        confirmation_id: confirmation.id,
      });
      toast.success('Track confirmation request noted');
      invalidateAfterOperation?.('event_updated', { eventId: selectedEventId });
    } catch (e) {
      toast.error(e.message);
    } finally {
      setWorking(false);
    }
  };

  const handleTrackDecision = async (accept) => {
    if (!confirmation) return;
    setWorking(true);
    try {
      await base44.entities.EntityConfirmation.update(confirmation.id, {
        track_status: accept ? 'accepted' : 'rejected',
        updated_at: new Date().toISOString(),
      });
      const result = await recompute(confirmation.id);
      await logOperation(accept ? 'event_track_accepted' : 'event_track_rejected', {
        event_id: selectedEventId,
        track_id: event?.track_id,
        confirmation_id: confirmation.id,
        by_user_id: currentUser?.id,
      });
      toast.success(`Track link ${accept ? 'accepted' : 'rejected'}`);
      invalidateAfterOperation?.('event_updated', { eventId: selectedEventId });
    } catch (e) {
      toast.error(e.message);
    } finally {
      setWorking(false);
    }
  };

  const handleSeriesDecision = async (accept) => {
    if (!confirmation) return;
    setWorking(true);
    try {
      await base44.entities.EntityConfirmation.update(confirmation.id, {
        series_status: accept ? 'accepted' : 'rejected',
        updated_at: new Date().toISOString(),
      });
      await recompute(confirmation.id);
      await logOperation(accept ? 'event_series_accepted' : 'event_series_rejected', {
        event_id: selectedEventId,
        series_id: event?.series_id,
        confirmation_id: confirmation.id,
        by_user_id: currentUser?.id,
      });
      toast.success(`Series link ${accept ? 'accepted' : 'rejected'}`);
      invalidateAfterOperation?.('event_updated', { eventId: selectedEventId });
    } catch (e) {
      toast.error(e.message);
    } finally {
      setWorking(false);
    }
  };

  if (!selectedEventId) return null;

  const effectiveStatus = confirmation?.effective_status || 'draft';
  const trackStatus = confirmation?.track_status || 'pending';
  const seriesStatus = confirmation?.series_status || 'pending';
  const hasSeries = !!event?.series_id;

  const StatusIcon = effectiveStatus === 'confirmed' ? ShieldCheck
    : effectiveStatus === 'rejected' ? ShieldAlert
    : Clock;

  return (
    <Card className="bg-[#1A1A1A] border-gray-700">
      <CardHeader className="border-b border-gray-800 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <StatusIcon className="w-4 h-4 text-blue-400" />
            Event Legitimacy
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge className={`text-xs border ${STATUS_BADGE[effectiveStatus] || STATUS_BADGE.draft}`}>
              {effectiveStatus.replace(/_/g, ' ')}
            </Badge>
            <button onClick={handleEnsureLinks} disabled={working} className="text-gray-500 hover:text-gray-300 transition-colors" title="Refresh entity links">
              <RefreshCw className={`w-3.5 h-3.5 ${working ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {/* Helper text */}
        <p className="text-xs text-gray-400">{HELPER[effectiveStatus] || HELPER.draft}</p>

        {/* Track status row */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Track Confirmation</span>
            <Badge className={`text-xs ${PARTY_BADGE[trackStatus] || PARTY_BADGE.pending}`}>{trackStatus}</Badge>
          </div>
          {isAdmin && confirmation && (
            <div className="flex gap-2">
              {trackStatus === 'pending' && (
                <Button size="sm" variant="outline" className="text-xs h-7 border-gray-700 text-gray-400" onClick={handleRequestTrackConfirmation} disabled={working}>
                  Request Confirmation
                </Button>
              )}
              {trackStatus !== 'accepted' && (
                <Button size="sm" className="text-xs h-7 bg-green-800 hover:bg-green-700 text-green-100 flex items-center gap-1" onClick={() => handleTrackDecision(true)} disabled={working}>
                  <CheckCircle className="w-3 h-3" /> Accept
                </Button>
              )}
              {trackStatus !== 'rejected' && trackStatus !== 'pending' && (
                <Button size="sm" variant="outline" className="text-xs h-7 border-red-800 text-red-400 hover:bg-red-900/20" onClick={() => handleTrackDecision(false)} disabled={working}>
                  <XCircle className="w-3 h-3 mr-1" /> Reject
                </Button>
              )}
              {trackStatus === 'accepted' && (
                <Button size="sm" variant="outline" className="text-xs h-7 border-red-800 text-red-400 hover:bg-red-900/20" onClick={() => handleTrackDecision(false)} disabled={working}>
                  <XCircle className="w-3 h-3 mr-1" /> Revoke
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Series status row */}
        {hasSeries && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Series Confirmation</span>
              <Badge className={`text-xs ${PARTY_BADGE[seriesStatus] || PARTY_BADGE.pending}`}>{seriesStatus}</Badge>
            </div>
            {isAdmin && confirmation && (
              <div className="flex gap-2">
                {seriesStatus !== 'accepted' && (
                  <Button size="sm" className="text-xs h-7 bg-green-800 hover:bg-green-700 text-green-100 flex items-center gap-1" onClick={() => handleSeriesDecision(true)} disabled={working}>
                    <CheckCircle className="w-3 h-3" /> Accept
                  </Button>
                )}
                {seriesStatus === 'accepted' && (
                  <Button size="sm" variant="outline" className="text-xs h-7 border-red-800 text-red-400 hover:bg-red-900/20" onClick={() => handleSeriesDecision(false)} disabled={working}>
                    <XCircle className="w-3 h-3 mr-1" /> Revoke
                  </Button>
                )}
                {seriesStatus === 'pending' && (
                  <Button size="sm" variant="outline" className="text-xs h-7 border-red-800 text-red-400 hover:bg-red-900/20" onClick={() => handleSeriesDecision(false)} disabled={working}>
                    <XCircle className="w-3 h-3 mr-1" /> Reject
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {!confirmation && (
          <Button size="sm" variant="outline" className="w-full border-gray-700 text-gray-400 text-xs" onClick={handleEnsureLinks} disabled={working}>
            {working ? <RefreshCw className="w-3 h-3 animate-spin mr-1" /> : null}
            Initialize Entity Links
          </Button>
        )}

        {!isAdmin && confirmation && (
          <p className="text-xs text-gray-600">Admin access required to change confirmation status.</p>
        )}
      </CardContent>
    </Card>
  );
}