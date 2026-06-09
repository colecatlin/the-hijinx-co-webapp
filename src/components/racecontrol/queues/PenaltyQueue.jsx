/**
 * R9BQ Sprint 2 — PenaltyQueue
 * Read-only queue of active penalties for an event.
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Gavel } from 'lucide-react';

const ACTIVE_STATUSES = ['Proposed', 'Approved', 'Under Appeal'];

const STATUS_COLOR = {
  Proposed: 'bg-yellow-900/60 text-yellow-300',
  Approved: 'bg-green-900/60 text-green-300',
  'Under Appeal': 'bg-purple-900/60 text-purple-300',
};

export default function PenaltyQueue({ eventId }) {
  const { data: penalties = [], isLoading } = useQuery({
    queryKey: ['penalties', eventId],
    queryFn: () => base44.entities.Penalty.filter({ event_id: eventId }, '-created_date', 50),
    enabled: !!eventId,
  });

  const active = penalties.filter(p => ACTIVE_STATUSES.includes(p.status));

  if (isLoading) return <div className="text-gray-500 text-xs py-3">Loading penalties…</div>;
  if (active.length === 0) return <div className="text-gray-600 text-xs py-3">No active penalties</div>;

  return (
    <div className="space-y-2">
      {active.map(pen => (
        <div key={pen.id} className="rounded-lg border border-gray-800 bg-gray-900/40 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <Gavel className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
              <span className="text-xs font-semibold text-gray-200">{pen.penalty_number || '—'}</span>
              <span className="text-xs text-gray-400">{pen.penalty_type}</span>
            </div>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${STATUS_COLOR[pen.status] || 'bg-gray-700 text-gray-300'}`}>
              {pen.status}
            </span>
          </div>
          {pen.reason && <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{pen.reason}</p>}
          <div className="flex gap-3 mt-1 text-[10px] text-gray-600">
            {pen.rule_reference && <span>Rule: {pen.rule_reference}</span>}
            {pen.position_delta != null && <span>+{pen.position_delta} pos</span>}
            {pen.time_seconds != null && <span>+{pen.time_seconds}s</span>}
          </div>
        </div>
      ))}
    </div>
  );
}