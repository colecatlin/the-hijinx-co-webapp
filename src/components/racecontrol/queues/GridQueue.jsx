/**
 * R9BQ Sprint 2 — GridQueue
 * Read-only queue of grid lineups for an event.
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { LayoutList } from 'lucide-react';

const ACTIVE_STATUSES = ['Draft', 'Pending Approval', 'Approved'];

const STATUS_COLOR = {
  Draft: 'bg-gray-700 text-gray-300',
  'Pending Approval': 'bg-yellow-900/60 text-yellow-300',
  Approved: 'bg-green-900/60 text-green-300',
};

export default function GridQueue({ eventId }) {
  const { data: lineups = [], isLoading } = useQuery({
    queryKey: ['gridLineups', eventId],
    queryFn: () => base44.entities.GridLineup.filter({ event_id: eventId }, '-created_date', 50),
    enabled: !!eventId,
  });

  const active = lineups.filter(l => ACTIVE_STATUSES.includes(l.status));

  if (isLoading) return <div className="text-gray-500 text-xs py-3">Loading lineups…</div>;
  if (active.length === 0) return <div className="text-gray-600 text-xs py-3">No generated lineups</div>;

  return (
    <div className="space-y-2">
      {active.map(lineup => (
        <div key={lineup.id} className="rounded-lg border border-gray-800 bg-gray-900/40 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <LayoutList className="w-3.5 h-3.5 text-teal-400 flex-shrink-0 mt-0.5" />
              <span className="text-xs font-semibold text-gray-200">{lineup.generation_method}</span>
              <span className="text-xs text-gray-500">{lineup.rows?.length ?? 0} positions</span>
            </div>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${STATUS_COLOR[lineup.status] || 'bg-gray-700 text-gray-300'}`}>
              {lineup.status}
            </span>
          </div>
          {lineup.notes && <p className="text-xs text-gray-500 mt-1.5 line-clamp-1">{lineup.notes}</p>}
        </div>
      ))}
    </div>
  );
}