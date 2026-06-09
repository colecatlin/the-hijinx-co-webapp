/**
 * R9BQ Sprint 2 — TechHoldQueue
 * Read-only queue of tech inspection holds for an event.
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Wrench } from 'lucide-react';

const HOLD_STATUSES = ['Failed', 'Recheck Required', 'Impounded'];

const STATUS_COLOR = {
  Failed: 'bg-red-900/60 text-red-300',
  'Recheck Required': 'bg-orange-900/60 text-orange-300',
  Impounded: 'bg-purple-900/60 text-purple-300',
};

export default function TechHoldQueue({ eventId }) {
  const { data: records = [], isLoading } = useQuery({
    queryKey: ['techInspections', eventId],
    queryFn: () => base44.entities.TechInspectionRecord.filter({ event_id: eventId }, '-created_date', 50),
    enabled: !!eventId,
  });

  const holds = records.filter(r => HOLD_STATUSES.includes(r.status));

  if (isLoading) return <div className="text-gray-500 text-xs py-3">Loading tech holds…</div>;
  if (holds.length === 0) return <div className="text-gray-600 text-xs py-3">No tech holds</div>;

  return (
    <div className="space-y-2">
      {holds.map(rec => (
        <div key={rec.id} className="rounded-lg border border-gray-800 bg-gray-900/40 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <Wrench className="w-3.5 h-3.5 text-orange-400 flex-shrink-0 mt-0.5" />
              <span className="text-xs font-semibold text-gray-200">{rec.inspection_phase}</span>
              {rec.entry_id && <span className="text-xs text-gray-500 font-mono">{rec.entry_id.slice(-6)}</span>}
            </div>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${STATUS_COLOR[rec.status] || 'bg-gray-700 text-gray-300'}`}>
              {rec.status}
            </span>
          </div>
          {rec.failure_reasons?.length > 0 && (
            <p className="text-xs text-gray-500 mt-1.5">{rec.failure_reasons.join(', ')}</p>
          )}
        </div>
      ))}
    </div>
  );
}