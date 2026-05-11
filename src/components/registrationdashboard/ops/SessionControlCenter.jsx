/**
 * REVISION 6A — SessionControlCenter
 * Replaces the flat session grid with a structured weekend timeline view.
 * Adds event-level derived status, round grouping, and operational state indicators.
 */
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';
import WeekendProgressionTimeline from './WeekendProgressionTimeline';
import { Badge } from '@/components/ui/badge';
import { sortSessionsChronologically } from './sessionOrdering';
import { deriveEventOperationalStatus, EVENT_STATUS_CONFIG } from './sessionStateIntelligence';

const DQ = applyDefaultQueryOptions();

export default function SessionControlCenter({
  sessions,
  results,
  selectedEvent,
  selectedSessionId,
  onSelectSession,
}) {
  const eventId = selectedEvent?.id;

  // Fetch series classes
  const { data: seriesClasses = [] } = useQuery({
    queryKey: ['seriesClasses'],
    queryFn: () => base44.entities.SeriesClass.list(),
    ...DQ,
  });

  // Fetch event classes
  const { data: eventClasses = [] } = useQuery({
    queryKey: ['eventClasses', eventId],
    queryFn: () => (eventId ? base44.entities.EventClass.filter({ event_id: eventId }) : Promise.resolve([])),
    enabled: !!eventId,
    ...DQ,
  });

  const sorted = sortSessionsChronologically(sessions);
  const derivedStatus = deriveEventOperationalStatus(sessions, results);
  const statusConfig = EVENT_STATUS_CONFIG[derivedStatus];

  // Part 7: derive selected session name for compact indicator
  const selectedSession = selectedSessionId
    ? sorted.find(s => s.id === selectedSessionId)
    : null;

  return (
    <div className="space-y-4">
      {/* Control center header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold text-white uppercase tracking-wide">
            Weekend Schedule
          </h2>
          <Badge className={`${statusConfig.badge} text-xs`}>
            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${statusConfig.dot}`} />
            {statusConfig.label}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {/* Part 7: compact selected session indicator */}
          {selectedSession && (
            <span className="text-xs text-green-400 font-medium bg-green-900/20 border border-green-800/40 px-2 py-0.5 rounded truncate max-w-[160px]">
              ↓ {selectedSession.name}
            </span>
          )}
          <span className="text-xs text-gray-500 font-mono">{sessions.length} sessions</span>
        </div>
      </div>

      {/* Timeline */}
      <WeekendProgressionTimeline
        sessions={sorted}
        results={results}
        seriesClasses={seriesClasses}
        eventClasses={eventClasses}
        selectedEvent={selectedEvent}
        selectedSessionId={selectedSessionId}
        onSelectSession={onSelectSession}
      />
    </div>
  );
}