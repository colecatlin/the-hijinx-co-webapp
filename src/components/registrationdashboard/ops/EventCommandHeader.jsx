/**
 * REVISION 5E — EventCommandHeader
 * Compact event identity header with key operational metrics.
 */
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Trophy } from 'lucide-react';
import { deriveEventOperationalStatus, EVENT_STATUS_CONFIG } from './sessionStateIntelligence';

export default function EventCommandHeader({ selectedEvent, selectedTrack, selectedSeries, sessions, results, standings }) {
  if (!selectedEvent) return null;

  const derivedStatus = deriveEventOperationalStatus(sessions, results);
  const statusConfig = EVENT_STATUS_CONFIG[derivedStatus];

  // Count Finals (scoring sessions)
  const finalCount = sessions.filter(s => s.session_type === 'Final' || s.session_type === 'Feature').length;
  const officialFinals = sessions.filter(
    s => (s.session_type === 'Final' || s.session_type === 'Feature') && (s.status === 'Official' || s.status === 'Locked')
  ).length;

  // Multi-day detection
  const isMultiDay = selectedEvent.end_date && selectedEvent.end_date !== selectedEvent.event_date;

  const dateStr = selectedEvent.event_date
    ? new Date(selectedEvent.event_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : null;
  const endDateStr = isMultiDay
    ? new Date(selectedEvent.end_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : null;

  return (
    <div className="bg-[#171717] border border-gray-800 rounded-lg px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        {/* Left: Identity */}
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-black text-white leading-tight">{selectedEvent.name}</h1>
            {selectedEvent.round_number && (
              <Badge className="bg-gray-800 text-gray-300 border border-gray-700 text-xs font-mono">
                Round {selectedEvent.round_number}
              </Badge>
            )}
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-3 flex-wrap text-xs text-gray-500">
            {(selectedTrack?.name || selectedEvent.location_note) && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {selectedTrack?.name || selectedEvent.location_note}
              </span>
            )}
            {dateStr && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {isMultiDay ? `${dateStr} – ${endDateStr}` : dateStr}
                {isMultiDay && <span className="text-blue-400 font-semibold ml-1">Multi-Day</span>}
              </span>
            )}
            {selectedSeries?.name && (
              <span className="text-gray-600">{selectedSeries.name}</span>
            )}
          </div>
        </div>

        {/* Right: Key metrics */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {/* Derived operational status */}
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-semibold ${statusConfig.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
            {statusConfig.label}
          </span>

          {/* Quick stats */}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>{sessions.length} sessions</span>
            {finalCount > 0 && (
              <span className="flex items-center gap-1">
                <Trophy className="w-3 h-3 text-amber-500" />
                {officialFinals}/{finalCount} Finals
              </span>
            )}
            {standings.length > 0 && (
              <span className="text-green-400">{standings.length} standings</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}