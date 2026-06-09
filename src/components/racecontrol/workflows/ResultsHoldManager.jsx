/**
 * R9BR Sprint 3 — ResultsHoldManager
 * Hold / release results for a session. No standings modifications.
 * Phase 6.
 */
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useEventWorkspace } from '@/components/registrationdashboard/workspace/EventWorkspaceContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Lock, Unlock, AlertOctagon } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

async function logOp(eventId, action, entityId, detail) {
  try {
    await base44.functions.invoke('createActivityFeedItemSafe', {
      event_id: eventId, action,
      entity_type: 'Session', entity_id: entityId, detail,
    });
  } catch (_) { /* non-blocking */ }
}

export default function ResultsHoldManager({ eventId }) {
  const { isAdmin, eventPermissions } = useEventWorkspace();
  const canHold = isAdmin || !!eventPermissions?.canHoldResults;

  const queryClient = useQueryClient();
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [holdReason, setHoldReason] = useState('');
  const [acting, setActing] = useState(false);

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['sessions', eventId],
    queryFn: () => base44.entities.Session.filter({ event_id: eventId }, 'run_order', 100),
    enabled: !!eventId,
  });

  const selectedSession = sessions.find(s => s.id === selectedSessionId);
  const isOnHold = !!selectedSession?.results_on_hold;

  const handleHold = async () => {
    if (!selectedSessionId) return;
    setActing(true);
    try {
      await base44.functions.invoke('holdSessionResults', {
        session_id: selectedSessionId,
        hold_reason: holdReason || 'Manual hold by Race Control',
      });
      await logOp(eventId, 'results_held', selectedSessionId,
        `${selectedSession?.name}: held — ${holdReason || 'Manual hold'}`);
      await queryClient.invalidateQueries({ queryKey: ['sessions', eventId] });
      toast.success('Results placed on hold');
      setHoldReason('');
    } catch (err) {
      toast.error('Failed to hold: ' + (err.message || 'Unknown error'));
    } finally {
      setActing(false);
    }
  };

  const handleRelease = async (andRecalculate = false) => {
    if (!selectedSessionId) return;
    setActing(true);
    try {
      await base44.functions.invoke('releaseSessionResultsHold', {
        session_id: selectedSessionId,
      });
      await logOp(eventId, 'results_released', selectedSessionId,
        `${selectedSession?.name}: hold released`);
      await queryClient.invalidateQueries({ queryKey: ['sessions', eventId] });
      toast.success('Hold released');

      // Optionally trigger standings recalculation after release
      if (andRecalculate && selectedSession) {
        // Need to fetch the event to get series_id and season
        const events = await base44.entities.Event.filter({ id: eventId });
        const event = events?.[0];
        if (event?.series_id && event?.season) {
          try {
            await base44.functions.invoke('recalculateStandings', {
              series_id: event.series_id,
              season: event.season,
              series_class_id: selectedSession?.series_class_id || null,
              event_id: eventId,
            });
            await queryClient.invalidateQueries({ queryKey: ['standings'] });
            toast.success('Standings recalculated');
          } catch (err) {
            toast.error('Hold released but standings recalculation failed: ' + err.message);
          }
        } else {
          toast.warning('Hold released — no series/season to recalculate standings');
        }
      }
    } catch (err) {
      toast.error('Failed to release: ' + (err.message || 'Unknown error'));
    } finally {
      setActing(false);
    }
  };

  if (!canHold) {
    return (
      <div className="text-gray-600 text-xs py-2">Hold Results permission required.</div>
    );
  }

  if (isLoading) return <div className="text-gray-500 text-xs py-4">Loading sessions…</div>;

  // Sessions on hold summary
  const onHoldSessions = sessions.filter(s => s.results_on_hold);

  return (
    <div className="space-y-4">
      {/* Active holds summary */}
      {onHoldSessions.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500">Active Holds</p>
          {onHoldSessions.map(s => (
            <div key={s.id} className="flex items-center justify-between rounded-lg border border-amber-800/40 bg-amber-900/20 px-3 py-2">
              <div className="flex items-center gap-2">
                <AlertOctagon className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                <span className="text-xs text-amber-300 font-semibold">{s.name}</span>
                {s.hold_reason && <span className="text-[10px] text-amber-500">{s.hold_reason}</span>}
              </div>
              {s.hold_started_at && (
                <span className="text-[10px] text-amber-600 flex-shrink-0">
                  {format(new Date(s.hold_started_at), 'HH:mm')}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Hold / release controls */}
      <div className="p-3 bg-gray-900/60 border border-gray-800 rounded-lg space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Hold / Release Session</p>

        <div className="space-y-1.5">
          <Label className="text-gray-400 text-xs">Session</Label>
          <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
            <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
              <SelectValue placeholder="Select session…" />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700">
              {sessions.map(s => (
                <SelectItem key={s.id} value={s.id} className="text-gray-200">
                  {s.name} {s.results_on_hold ? '⚠ HOLD' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedSession && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500">Status:</span>
            {isOnHold ? (
              <span className="text-amber-400 font-semibold flex items-center gap-1">
                <Lock className="w-3 h-3" /> On Hold
              </span>
            ) : (
              <span className="text-green-400 font-semibold flex items-center gap-1">
                <Unlock className="w-3 h-3" /> Clear
              </span>
            )}
          </div>
        )}

        {!isOnHold && selectedSession && (
          <div className="space-y-1.5">
            <Label className="text-gray-400 text-xs">Hold Reason</Label>
            <Input value={holdReason} onChange={e => setHoldReason(e.target.value)}
              className="bg-gray-900 border-gray-700 text-white text-xs h-8"
              placeholder="Reason for hold…" />
          </div>
        )}

        {selectedSession && isOnHold && selectedSession.hold_reason && (
          <div>
            <p className="text-[10px] text-gray-600">Hold reason: <span className="text-gray-400">{selectedSession.hold_reason}</span></p>
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          {!isOnHold && (
            <Button size="sm" disabled={acting || !selectedSessionId}
              onClick={handleHold}
              className="bg-amber-800 hover:bg-amber-700 text-white text-xs h-8 gap-1">
              <Lock className="w-3 h-3" /> Hold Results
            </Button>
          )}
          {isOnHold && (
            <>
              <Button size="sm" disabled={acting || !selectedSessionId}
                onClick={() => handleRelease(false)}
                className="bg-green-800 hover:bg-green-700 text-white text-xs h-8 gap-1">
                <Unlock className="w-3 h-3" /> Release Hold
              </Button>
              <Button size="sm" disabled={acting || !selectedSessionId}
                onClick={() => handleRelease(true)}
                className="bg-teal-800 hover:bg-teal-700 text-white text-xs h-8 gap-1">
                <Unlock className="w-3 h-3" /> Release + Recalculate Standings
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}