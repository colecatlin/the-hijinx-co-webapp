/**
 * REVISION 7A Part 2 — EventSchedulePanel
 * Read-only schedule view inside the event workspace.
 * Renders WeekendProgressionTimeline as a black box.
 * No create/edit/delete/publish actions.
 */
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useEventWorkspace } from '../EventWorkspaceContext';
import WeekendProgressionTimeline from '../../ops/WeekendProgressionTimeline';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';
import { Calendar } from 'lucide-react';

const DQ = applyDefaultQueryOptions();

export default function EventSchedulePanel() {
  const { selectedEvent, eventId } = useEventWorkspace();

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions', eventId],
    queryFn: () => (eventId ? base44.entities.Session.filter({ event_id: eventId }) : Promise.resolve([])),
    enabled: !!eventId,
    ...DQ,
  });

  const { data: results = [] } = useQuery({
    queryKey: ['results', eventId],
    queryFn: () => (eventId ? base44.entities.Results.filter({ event_id: eventId }) : Promise.resolve([])),
    enabled: !!eventId,
    ...DQ,
  });

  const { data: eventClasses = [] } = useQuery({
    queryKey: ['eventClasses', eventId],
    queryFn: () => (eventId ? base44.entities.EventClass.filter({ event_id: eventId }) : Promise.resolve([])),
    enabled: !!eventId,
    ...DQ,
  });

  const { data: seriesClasses = [] } = useQuery({
    queryKey: ['seriesClasses'],
    queryFn: () => base44.entities.SeriesClass.list(),
    ...DQ,
  });

  if (!selectedEvent) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-2">
        <Calendar className="w-8 h-8 text-gray-700" />
        <p className="text-sm text-gray-500">No event selected.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-1">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-600">Weekend Schedule</p>
          <p className="text-[11px] text-gray-600 mt-0.5">Read-only view · {sessions.length} sessions · {results.length} results entered</p>
        </div>
        <span className="text-[10px] px-2 py-1 rounded border border-gray-800 text-gray-600 font-mono">READ ONLY</span>
      </div>

      {/* WeekendProgressionTimeline — untouched black box */}
      <WeekendProgressionTimeline
        sessions={sessions}
        results={results}
        seriesClasses={seriesClasses}
        eventClasses={eventClasses}
        selectedEvent={selectedEvent}
        selectedSessionId={null}
        onSelectSession={() => {}}
      />
    </div>
  );
}