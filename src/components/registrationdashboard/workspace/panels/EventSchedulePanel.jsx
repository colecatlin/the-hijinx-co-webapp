/**
 * REVISION 7A Part 2 — EventSchedulePanel
 * Schedule view inside the event workspace.
 * Admins can create/edit EventDay records (the weekend day structure)
 * via EventDayManager. The timeline below remains a visual progression.
 */
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useEventWorkspace } from '../EventWorkspaceContext';
import SessionTimelinePolished from '../SessionTimelinePolished';
import EventDayManager from '@/components/registrationdashboard/EventDayManager';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';
import { Calendar } from 'lucide-react';
import { REG_QK } from '@/components/registrationdashboard/queryKeys';

const DQ = applyDefaultQueryOptions();

export default function EventSchedulePanel() {
  const { selectedEvent, eventId, isAdmin } = useEventWorkspace();

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

  // R8AH: EventDay records for grouped schedule display
  const { data: eventDays = [] } = useQuery({
    queryKey: REG_QK.eventDays(eventId),
    queryFn: () => base44.entities.EventDay.filter({ event_id: eventId }, 'sort_order', 50),
    enabled: !!eventId,
    ...DQ,
  });

  if (!selectedEvent) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-2">
        <Calendar className="w-8 h-8 text-foreground-quiet" />
        <p className="text-sm text-foreground-quiet">No event selected.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-1">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-foreground-quiet">Weekend Schedule</p>
          <p className="text-[11px] text-foreground-quiet mt-0.5">{sessions.length} sessions · {results.length} results entered</p>
        </div>
      </div>

      {/* EventDayManager — create/edit the weekend day structure (admin only) */}
      <EventDayManager event={selectedEvent} isAdmin={isAdmin} />

      {/* SessionTimelinePolished — enhanced visual progression */}
      <SessionTimelinePolished
        sessions={sessions}
        results={results}
        entries={[]}
        eventDays={eventDays}
      />
    </div>
  );
}