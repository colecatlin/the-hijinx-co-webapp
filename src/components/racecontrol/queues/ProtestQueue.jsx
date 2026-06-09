/**
 * R9BQ Sprint 2 — ProtestQueue
 * Read-only queue of active protests for an event.
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { MessageSquareWarning } from 'lucide-react';

const ACTIVE_STATUSES = ['Filed', 'Accepted', 'Under Review', 'Hearing Scheduled', 'Appealed'];

const STATUS_COLOR = {
  Filed: 'bg-yellow-900/60 text-yellow-300',
  Accepted: 'bg-blue-900/60 text-blue-300',
  'Under Review': 'bg-orange-900/60 text-orange-300',
  'Hearing Scheduled': 'bg-purple-900/60 text-purple-300',
  Appealed: 'bg-red-900/60 text-red-300',
};

export default function ProtestQueue({ eventId }) {
  const { data: protests = [], isLoading } = useQuery({
    queryKey: ['protests', eventId],
    queryFn: () => base44.entities.Protest.filter({ event_id: eventId }, '-created_date', 50),
    enabled: !!eventId,
  });

  const active = protests.filter(p => ACTIVE_STATUSES.includes(p.status));

  if (isLoading) return <div className="text-gray-500 text-xs py-3">Loading protests…</div>;
  if (active.length === 0) return <div className="text-gray-600 text-xs py-3">No active protests</div>;

  return (
    <div className="space-y-2">
      {active.map(pro => (
        <div key={pro.id} className="rounded-lg border border-gray-800 bg-gray-900/40 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <MessageSquareWarning className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <span className="text-xs font-semibold text-gray-200">{pro.protest_number || '—'}</span>
              <span className="text-xs text-gray-400">{pro.protest_type}</span>
            </div>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${STATUS_COLOR[pro.status] || 'bg-gray-700 text-gray-300'}`}>
              {pro.status}
            </span>
          </div>
          {pro.description && <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{pro.description}</p>}
        </div>
      ))}
    </div>
  );
}