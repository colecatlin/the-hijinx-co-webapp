import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/components/utils';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';
import { canAction } from '@/components/access/accessControl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Calendar, Users, Flag, Trophy, Lock } from 'lucide-react';
import { toast } from 'sonner';

const DQ = applyDefaultQueryOptions();

export default function SeasonCalendarManager({
  dashboardContext,
  selectedEvent,
  dashboardPermissions,
  onSelectEvent,
  onCreateEvent,
  invalidateAfterOperation,
}) {
  if (!dashboardContext?.orgId || !dashboardContext?.seasonYear) {
    return null;
  }

  // Load events for the selected org + season
  const { data: events = [] } = useQuery({
    queryKey: ['seasonCalendarEvents', dashboardContext.orgId, dashboardContext.seasonYear, dashboardContext.orgType],
    queryFn: async () => {
      const filterQuery = dashboardContext.orgType === 'track'
        ? { track_id: dashboardContext.orgId, season: dashboardContext.seasonYear }
        : { series_id: dashboardContext.orgId, season: dashboardContext.seasonYear };

      const allEvents = await base44.entities.Event.filter(filterQuery);
      return allEvents.sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
    },
    ...DQ,
  });

  // Load operational metrics for each event
  const eventMetrics = useMemo(() => {
    const metrics = {};

    events.forEach(event => {
      metrics[event.id] = {
        sessionsCount: 0,
        entriesCount: 0,
        resultsCount: 0,
        officialSessions: 0,
        checkedInCount: 0,
        techPassedCount: 0,
      };
    });

    return metrics;
  }, [events]);

  // Prefetch metrics for all events
  const { data: allEventSessions = [] } = useQuery({
    queryKey: ['seasonCalendarSessions', events.map(e => e.id).join(',')],
    queryFn: async () => {
      if (events.length === 0) return [];
      const sessions = await Promise.all(
        events.map(event =>
          base44.entities.Session.filter({ event_id: event.id })
            .then(s => s.map(sess => ({ ...sess, eventId: event.id })))
        )
      );
      return sessions.flat();
    },
    enabled: events.length > 0,
    ...DQ,
  });

  const { data: allEventEntries = [] } = useQuery({
    queryKey: ['seasonCalendarEntries', events.map(e => e.id).join(',')],
    queryFn: async () => {
      if (events.length === 0) return [];
      const entries = await Promise.all(
        events.map(event =>
          base44.entities.Entry.filter({ event_id: event.id })
            .then(e => e.map(entry => ({ ...entry, eventId: event.id })))
        )
      );
      return entries.flat();
    },
    enabled: events.length > 0,
    ...DQ,
  });

  const { data: allEventResults = [] } = useQuery({
    queryKey: ['seasonCalendarResults', events.map(e => e.id).join(',')],
    queryFn: async () => {
      if (events.length === 0) return [];
      const results = await Promise.all(
        events.map(event =>
          base44.entities.Results.filter({ event_id: event.id })
            .then(r => r.map(res => ({ ...res, eventId: event.id })))
        )
      );
      return results.flat();
    },
    enabled: events.length > 0,
    ...DQ,
  });

  // Compute metrics per event
  const computedMetrics = useMemo(() => {
    const metrics = {};

    events.forEach(event => {
      const eventSessions = allEventSessions.filter(s => s.eventId === event.id);
      const eventEntries = allEventEntries.filter(e => e.eventId === event.id);
      const eventResults = allEventResults.filter(r => r.eventId === event.id);

      metrics[event.id] = {
        sessionsCount: eventSessions.length,
        entriesCount: eventEntries.length,
        resultsCount: eventResults.length,
        officialSessions: eventSessions.filter(s => s.status === 'Official' || s.status === 'Locked').length,
        checkedInCount: eventEntries.filter(e => e.entry_status === 'Checked In' || e.entry_status === 'Teched').length,
        techPassedCount: eventEntries.filter(e => e.tech_status === 'Passed').length,
      };
    });

    return metrics;
  }, [events, allEventSessions, allEventEntries, allEventResults]);

  if (events.length === 0) {
    return (
      <Card className="bg-[#171717] border-gray-800 mb-6">
        <CardContent className="py-8 text-center">
          <Calendar className="w-8 h-8 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-400">No events found for this season</p>
          {canAction(dashboardPermissions, 'create_event') && (
            <Button
              onClick={onCreateEvent}
              className="mt-4 bg-blue-600 hover:bg-blue-700"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" /> Create First Event
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-400" />
            Season Calendar
          </h2>
          <p className="text-xs text-gray-400 mt-1">{events.length} events in {dashboardContext.seasonYear}</p>
        </div>
        {canAction(dashboardPermissions, 'create_event') && (
          <Button
            onClick={onCreateEvent}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-1" /> New Event
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {events.map(event => {
          const metrics = computedMetrics[event.id] || {};
          const isActive = selectedEvent?.id === event.id;

          return (
            <Card
              key={event.id}
              className={`cursor-pointer transition-all ${
                isActive
                  ? 'bg-blue-900/30 border-blue-600 border-2'
                  : 'bg-[#262626] border-gray-700 hover:bg-[#2a2a2a]'
              }`}
              onClick={() => onSelectEvent(event.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <CardTitle className="text-sm font-semibold text-white line-clamp-2">
                      {event.name}
                    </CardTitle>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(event.event_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                      {event.end_date && ` – ${new Date(event.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                    </p>
                  </div>
                  {isActive && (
                    <span className="inline-block px-2 py-1 bg-blue-600 text-white text-xs font-semibold rounded">
                      Active
                    </span>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Status Badge */}
                <div className="flex items-center gap-2">
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                    event.status === 'completed' ? 'bg-green-900/40 text-green-300' :
                    event.status === 'in_progress' ? 'bg-blue-900/40 text-blue-300' :
                    event.status === 'cancelled' ? 'bg-red-900/40 text-red-300' :
                    'bg-gray-900/40 text-gray-300'
                  }`}>
                    {event.status || 'upcoming'}
                  </span>
                </div>

                {/* Operational Metrics */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-gray-900/50 rounded p-2">
                    <p className="text-gray-400">Sessions</p>
                    <p className="font-semibold text-white">
                      {metrics.officialSessions}/{metrics.sessionsCount}
                    </p>
                  </div>
                  <div className="bg-gray-900/50 rounded p-2">
                    <p className="text-gray-400">Entries</p>
                    <p className="font-semibold text-white">
                      {metrics.checkedInCount}/{metrics.entriesCount}
                    </p>
                  </div>
                  <div className="bg-gray-900/50 rounded p-2">
                    <p className="text-gray-400">Results</p>
                    <p className="font-semibold text-white">{metrics.resultsCount}</p>
                  </div>
                  <div className="bg-gray-900/50 rounded p-2">
                    <p className="text-gray-400">Tech Pass</p>
                    <p className="font-semibold text-white">{metrics.techPassedCount}</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(createPageUrl(`EventProfile?eventId=${event.id}`), '_blank');
                    }}
                    className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700 h-8 text-xs"
                  >
                    Public Page
                  </Button>
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectEvent(event.id);
                    }}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 h-8 text-xs"
                  >
                    Open Race Core
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}