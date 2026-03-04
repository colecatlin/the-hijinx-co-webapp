import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/components/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Calendar, Plus, ExternalLink } from 'lucide-react';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';
import { canAction } from '@/components/access/accessControl';

const DQ = applyDefaultQueryOptions();

export default function SeasonCalendarManager({
  dashboardContext,
  selectedEvent,
  dashboardPermissions,
  onSelectEvent,
  onCreateEvent,
  invalidateAfterOperation,
}) {
  // Load all events for org + season
  const { data: seasonEvents = [] } = useQuery({
    queryKey: ['seasonCalendarEvents', dashboardContext.orgId, dashboardContext.orgType, dashboardContext.seasonYear],
    queryFn: async () => {
      if (!dashboardContext.orgId || !dashboardContext.seasonYear) return [];
      
      const filter = { season: dashboardContext.seasonYear };
      if (dashboardContext.orgType === 'track') {
        filter.track_id = dashboardContext.orgId;
      } else if (dashboardContext.orgType === 'series') {
        filter.series_id = dashboardContext.orgId;
      }
      
      const events = await base44.entities.Event.filter(filter);
      return events.sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
    },
    enabled: !!dashboardContext.orgId && !!dashboardContext.seasonYear,
    ...DQ,
  });

  // Load operational metrics for each event
  const eventMetrics = useMemo(() => {
    return seasonEvents.map(event => ({
      eventId: event.id,
      sessionsCount: 0,
      entriesCount: 0,
      resultsCount: 0,
      officialSessionsCount: 0,
      checkedInCount: 0,
    }));
  }, [seasonEvents]);

  // Fetch sessions for all events
  const { data: allSessions = [] } = useQuery({
    queryKey: ['seasonCalendarSessions', seasonEvents.map(e => e.id).join(',')],
    queryFn: async () => {
      if (seasonEvents.length === 0) return [];
      const sessions = await Promise.all(
        seasonEvents.map(e => base44.entities.Session.filter({ event_id: e.id }))
      );
      return sessions.flat();
    },
    enabled: seasonEvents.length > 0,
    ...DQ,
  });

  // Fetch entries for all events
  const { data: allEntries = [] } = useQuery({
    queryKey: ['seasonCalendarEntries', seasonEvents.map(e => e.id).join(',')],
    queryFn: async () => {
      if (seasonEvents.length === 0) return [];
      const entries = await Promise.all(
        seasonEvents.map(e => base44.entities.Entry.filter({ event_id: e.id }))
      );
      return entries.flat();
    },
    enabled: seasonEvents.length > 0,
    ...DQ,
  });

  // Fetch results for all events
  const { data: allResults = [] } = useQuery({
    queryKey: ['seasonCalendarResults', seasonEvents.map(e => e.id).join(',')],
    queryFn: async () => {
      if (seasonEvents.length === 0) return [];
      const results = await Promise.all(
        seasonEvents.map(e => base44.entities.Results.filter({ event_id: e.id }))
      );
      return results.flat();
    },
    enabled: seasonEvents.length > 0,
    ...DQ,
  });

  // Compute metrics per event
  const eventCardsData = useMemo(() => {
    return seasonEvents.map(event => {
      const sessionsList = allSessions.filter(s => s.event_id === event.id);
      const entriesList = allEntries.filter(e => e.event_id === event.id);
      const resultsList = allResults.filter(r => r.event_id === event.id);
      
      return {
        ...event,
        sessionCount: sessionsList.length,
        entryCount: entriesList.length,
        resultCount: resultsList.length,
        officialSessionCount: sessionsList.filter(s => s.status === 'Official' || s.status === 'Locked').length,
        checkedInCount: entriesList.filter(e => e.entry_status === 'Checked In').length,
      };
    });
  }, [seasonEvents, allSessions, allEntries, allResults]);

  if (seasonEvents.length === 0) {
    return null;
  }

  const isEventActive = (eventId) => eventId === selectedEvent?.id;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8"
    >
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-400" />
            <CardTitle className="text-white">Season Calendar</CardTitle>
          </div>
          {canAction(dashboardPermissions, 'create_event') && (
            <Button
              onClick={onCreateEvent}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-1" /> Create Event
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {eventCardsData.map((event) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.02 }}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  isEventActive(event.id)
                    ? 'bg-blue-900/30 border-blue-700 ring-2 ring-blue-600'
                    : 'bg-gray-900/50 border-gray-700 hover:border-gray-600'
                }`}
              >
                {isEventActive(event.id) && (
                  <div className="mb-2">
                    <Badge className="bg-blue-600 text-white text-xs">Active Event</Badge>
                  </div>
                )}
                
                <div className="space-y-2 mb-4">
                  <h3 className="font-semibold text-white text-sm">{event.name}</h3>
                  <p className="text-xs text-gray-400">
                    {event.event_date}
                    {event.end_date && ` – ${event.end_date}`}
                  </p>
                  {event.round_number && (
                    <p className="text-xs text-gray-500">Round {event.round_number}</p>
                  )}
                </div>

                {/* Operational Badges */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="bg-gray-800/50 rounded p-2">
                    <p className="text-xs text-gray-400">Sessions</p>
                    <p className="text-sm font-semibold text-white">{event.sessionCount}</p>
                  </div>
                  <div className="bg-gray-800/50 rounded p-2">
                    <p className="text-xs text-gray-400">Entries</p>
                    <p className="text-sm font-semibold text-white">{event.entryCount}</p>
                  </div>
                  <div className="bg-gray-800/50 rounded p-2">
                    <p className="text-xs text-gray-400">Results</p>
                    <p className="text-sm font-semibold text-white">{event.resultCount}</p>
                  </div>
                  <div className="bg-gray-800/50 rounded p-2">
                    <p className="text-xs text-gray-400">Official</p>
                    <p className="text-sm font-semibold text-white">{event.officialSessionCount}</p>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="mb-4">
                  <Badge className={`text-xs ${
                    event.status === 'completed' ? 'bg-green-900/40 text-green-300' :
                    event.status === 'in_progress' ? 'bg-blue-900/40 text-blue-300' :
                    event.status === 'cancelled' ? 'bg-red-900/40 text-red-300' :
                    'bg-gray-900/40 text-gray-300'
                  }`}>
                    {event.status || 'upcoming'}
                  </Badge>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => onSelectEvent(event.id)}
                    size="sm"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs h-8"
                  >
                    Open Race Core
                  </Button>
                  <Button
                    onClick={() => window.open(createPageUrl('EventProfile') + `?eventId=${event.id}`, '_blank')}
                    size="sm"
                    variant="outline"
                    className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800 text-xs h-8"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}