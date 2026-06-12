/**
 * R9DC Phase 4 — BulkPublishActions
 * Bulk actions now route through syncPublicData (publication authority)
 * rather than writing Results.status_state directly.
 * "Publish All Provisional" still sets rows to Provisional state (pre-publication staging).
 * "Mark All Official" routes through syncPublicData for full publication pipeline.
 */
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Zap, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function BulkPublishActions({ sessions = [], results = [], eventId, isAdmin }) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(null);

  const draftResults = results.filter(r => !r.status_state || r.status_state === 'Draft');
  const provisionalResults = results.filter(r => r.status_state === 'Provisional');

  // Staging step: set rows to Provisional (pre-publication, no session status change)
  const bulkMarkProvisional = async () => {
    if (draftResults.length === 0) { toast.info('No draft results to update'); return; }
    setLoading('Provisional');
    await Promise.all(
      draftResults.map(r => base44.entities.Results.update(r.id, { status_state: 'Provisional' }))
    );
    queryClient.invalidateQueries({ queryKey: ['results', eventId] });
    toast.success(`${draftResults.length} result${draftResults.length > 1 ? 's' : ''} staged as Provisional`);
    setLoading(null);
  };

  // Publication step: route through syncPublicData — the sole publication authority (R9DC Phase 4)
  const bulkMarkOfficial = async () => {
    if (provisionalResults.length === 0) { toast.info('No provisional results to publish'); return; }
    // Group by session and call syncPublicData per session
    const sessionIds = [...new Set(provisionalResults.map(r => r.session_id).filter(Boolean))];
    setLoading('Official');
    try {
      for (const sid of sessionIds) {
        // First advance session status to Official via state machine (Phase 1)
        await base44.functions.invoke('updateSessionStatus', {
          session_id: sid,
          new_status: 'Official',
        });
        // Then run full publication pipeline
        await base44.functions.invoke('syncPublicData', {
          event_id: eventId,
          session_id: sid,
          trigger: 'bulk_publish',
        });
      }
      queryClient.invalidateQueries({ queryKey: ['results', eventId] });
      queryClient.invalidateQueries({ queryKey: ['sessions', eventId] });
      toast.success(`${provisionalResults.length} results published Official via ${sessionIds.length} session(s)`);
    } catch (e) {
      toast.error('Bulk publish failed: ' + e.message);
    }
    setLoading(null);
  };

  if (!isAdmin) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={bulkMarkProvisional}
        disabled={!!loading || draftResults.length === 0}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border text-[11px] font-semibold uppercase tracking-wider bg-amber-900/30 border-amber-700/40 text-amber-300 hover:bg-amber-900/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Zap className="w-3.5 h-3.5" />
        {loading === 'Provisional' ? `Staging…` : `Stage All Provisional (${draftResults.length})`}
      </button>
      <button
        onClick={bulkMarkOfficial}
        disabled={!!loading || provisionalResults.length === 0}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border text-[11px] font-semibold uppercase tracking-wider bg-green-900/30 border-green-700/40 text-green-300 hover:bg-green-900/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <CheckCircle2 className="w-3.5 h-3.5" />
        {loading === 'Official' ? `Publishing…` : `Publish All Official (${provisionalResults.length})`}
      </button>
    </div>
  );
}