/**
 * R9BQ Sprint 2 — OfficialsSummary
 * Read-only summary of assigned event officials.
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { UserCheck } from 'lucide-react';

const STATUS_COLOR = {
  Invited: 'bg-yellow-900/60 text-yellow-300',
  Confirmed: 'bg-blue-900/60 text-blue-300',
  Active: 'bg-green-900/60 text-green-300',
  Withdrawn: 'bg-gray-700 text-gray-400',
};

export default function OfficialsSummary({ eventId }) {
  const { data: officials = [], isLoading } = useQuery({
    queryKey: ['eventOfficials', eventId],
    queryFn: () => base44.entities.EventOfficial.filter({ event_id: eventId }, 'role', 50),
    enabled: !!eventId,
  });

  if (isLoading) return <div className="text-gray-500 text-xs py-3">Loading officials…</div>;
  if (officials.length === 0) return <div className="text-gray-600 text-xs py-3">No officials assigned</div>;

  return (
    <div className="space-y-1.5">
      {officials.map(off => (
        <div key={off.id} className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900/40 px-3 py-2">
          <div className="flex items-center gap-2">
            <UserCheck className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
            <span className="text-xs font-medium text-gray-300">{off.role}</span>
          </div>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${STATUS_COLOR[off.status] || 'bg-gray-700 text-gray-300'}`}>
            {off.status}
          </span>
        </div>
      ))}
    </div>
  );
}