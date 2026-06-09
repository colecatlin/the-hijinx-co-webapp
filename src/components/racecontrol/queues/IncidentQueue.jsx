/**
 * R9BQ Sprint 2 — IncidentQueue
 * Read-only queue of open incidents for an event.
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const OPEN_STATUSES = ['Open', 'Under Review', 'Referred to Stewards', 'Appealed'];

const SEVERITY_COLOR = {
  Informational: 'bg-gray-700 text-gray-300',
  Minor: 'bg-yellow-900/60 text-yellow-300',
  Significant: 'bg-orange-900/60 text-orange-300',
  Major: 'bg-red-900/60 text-red-300',
  Serious: 'bg-red-600 text-white',
};

const STATUS_COLOR = {
  Open: 'bg-blue-900/60 text-blue-300',
  'Under Review': 'bg-yellow-900/60 text-yellow-300',
  'Referred to Stewards': 'bg-orange-900/60 text-orange-300',
  Appealed: 'bg-purple-900/60 text-purple-300',
};

export default function IncidentQueue({ eventId }) {
  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ['incidents', eventId],
    queryFn: () => base44.entities.Incident.filter({ event_id: eventId }, '-created_date', 50),
    enabled: !!eventId,
  });

  const open = incidents.filter(i => OPEN_STATUSES.includes(i.status));

  if (isLoading) return <div className="text-gray-500 text-xs py-3">Loading incidents…</div>;
  if (open.length === 0) return <div className="text-gray-600 text-xs py-3">No open incidents</div>;

  return (
    <div className="space-y-2">
      {open.map(inc => (
        <div key={inc.id} className="rounded-lg border border-gray-800 bg-gray-900/40 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-orange-400 flex-shrink-0 mt-0.5" />
              <span className="text-xs font-semibold text-gray-200">{inc.incident_number || '—'}</span>
              <span className="text-xs text-gray-400">{inc.incident_type}</span>
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${SEVERITY_COLOR[inc.severity] || 'bg-gray-700 text-gray-300'}`}>
                {inc.severity}
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${STATUS_COLOR[inc.status] || 'bg-gray-700 text-gray-300'}`}>
                {inc.status}
              </span>
            </div>
          </div>
          {inc.description && (
            <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{inc.description}</p>
          )}
          {(inc.lap_number || inc.location_description) && (
            <p className="text-[10px] text-gray-600 mt-1">
              {inc.lap_number ? `Lap ${inc.lap_number}` : ''}
              {inc.lap_number && inc.location_description ? ' · ' : ''}
              {inc.location_description || ''}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}