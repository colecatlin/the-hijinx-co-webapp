/**
 * R9CQ — BulkPublishActions
 * Bulk publish provisional / mark all official for an event.
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

  const bulkUpdate = async (targetResults, newState, label) => {
    if (targetResults.length === 0) {
      toast.info(`No ${label.toLowerCase()} results to update`);
      return;
    }
    setLoading(label);
    let success = 0;
    for (const r of targetResults) {
      await base44.entities.Results.update(r.id, { status_state: newState });
      success++;
    }
    queryClient.invalidateQueries({ queryKey: ['results', eventId] });
    toast.success(`${success} result${success > 1 ? 's' : ''} marked ${label}`);
    setLoading(null);
  };

  if (!isAdmin) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={() => bulkUpdate(draftResults, 'Provisional', 'Provisional')}
        disabled={!!loading || draftResults.length === 0}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border text-[11px] font-semibold uppercase tracking-wider bg-amber-900/30 border-amber-700/40 text-amber-300 hover:bg-amber-900/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Zap className="w-3.5 h-3.5" />
        {loading === 'Provisional' ? `Publishing…` : `Publish All Provisional (${draftResults.length})`}
      </button>
      <button
        onClick={() => bulkUpdate(provisionalResults, 'Official', 'Official')}
        disabled={!!loading || provisionalResults.length === 0}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border text-[11px] font-semibold uppercase tracking-wider bg-green-900/30 border-green-700/40 text-green-300 hover:bg-green-900/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <CheckCircle2 className="w-3.5 h-3.5" />
        {loading === 'Official' ? `Marking…` : `Mark All Official (${provisionalResults.length})`}
      </button>
    </div>
  );
}