import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import PageShell from '@/components/shared/PageShell';
import DirectoryFilters from '@/components/shared/DirectoryFilters';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Trophy, Medal, Flag, Layers, Map } from 'lucide-react';
import EventMapTab from '@/components/events/EventMapTab';
import { Link, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { format, differenceInCalendarDays, parseISO, differenceInCalendarDays as diffDays } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { isEventPublic } from '@/components/system/publishHelpers';
import PullToRefresh from '@/components/shared/PullToRefresh';
import { resolveEventClassification, buildClassificationMaps } from '@/components/utils/eventClassification';

function DaysUntilBadge({ eventDate, status }) {
  if (!eventDate || status === 'completed' || status === 'cancelled') return null;
  const days = differenceInCalendarDays(parseISO(eventDate), new Date());
  if (days < 0) return null;
  if (days === 0) return <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Today</span>;
  if (status === 'in_progress') return <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">In Progress</span>;
  return <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">In {days}d</span>;
}

export default function EventDirectory() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [disciplineFilter, setDisciplineFilter] = useState(searchParams.get('discipline') || 'all');
  const [formatFilter, setFormatFilter] = useState(searchParams.get('format') || 'all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('latest');
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'upcoming');

  // Sync filter state → URL
  const updateUrl = (tab, discipline, format) => {
    const params = {};
    if (tab && tab !== 'upcoming') params.tab = tab;
    if (discipline && discipline !== 'all') params.discipline = discipline;
    if (format && format !== 'all') params.format = format;
    setSearchParams(params, { replace: true });
  };

  const handleDisciplineChange = (v) => {
    setDisciplineFilter(v);
    setFormatFilter('all');
    updateUrl(activeTab, v, 'all');
  };

  const handleFormatChange = (v) => {
    setFormatFilter(v);
    updateUrl(activeTab, disciplineFilter, v);
  };

  const handleTabChange = (v) => {
    setActiveTab(v);
    updateUrl(v, disciplineFilter, formatFilter);
  };

  // Sync URL → filter state on browser back/forward
  useEffect(() => {
    const d = searchParams.get('discipline') || 'all';
    const f = searchParams.get('format') || 'all';
    const t = searchParams.get('tab') || 'upcoming';
    setDisciplineFilter(d);
    setFormatFilter(f);
    setActiveTab(t);
  }, [searchParams]);

  const today = new Date().toISOString().split('T')[0];

  const { data: allEventsList = [], refetch: refetchEvents } = useQuery({
    queryKey: ['events-all'],
    queryFn: async () => base44.entities.Event.list('event_date', 500),
    staleTime: 3 * 60 * 1000,
  });

  // An event is "upcoming" only while its final day is still today or later.
  // Events whose end_date (or event_date when there's no end_date) is in the
  // past automatically flow into the Results / past-events bucket — keeping a
  // Live/Published event from lingering under "Upcoming" after it's finished.
  const upcomingEvents = allEventsList.filter(e =>
    isEventPublic(e) && (e.end_date || e.event_date) >= today
  );

  const completedEvents = allEventsList.filter(e =>
    isEventPublic(e) && (e.end_date || e.event_date) < today
  );

  // If there are no upcoming events but past events exist, jump to the
  // Results tab automatically so the directory isn't an empty void.
  useEffect(() => {
    if (!allEventsList.length) return;
    if (activeTab === 'upcoming' && upcomingEvents.length === 0 && completedEvents.length > 0 && !searchParams.get('tab')) {
      setActiveTab('results');
      updateUrl('results', disciplineFilter, formatFilter);
    }
  }, [allEventsList.length, upcomingEvents.length, completedEvents.length, activeTab]);

  const isLoading = false;
  const completedLoading = false;

  const { data: allSeriesList = [] } = useQuery({
    queryKey: ['series'],
    queryFn: () => base44.entities.Series.list(),
    staleTime: 10 * 60 * 1000,
  });
  const seriesById = useMemo(() => Object.fromEntries(allSeriesList.map(s => [s.id, s])), [allSeriesList]);
  // legacy name map for existing series filter
  const seriesMap = useMemo(() => Object.fromEntries(allSeriesList.map(s => [s.name, s])), [allSeriesList]);

  const { data: disciplines = [] } = useQuery({
    queryKey: ['disciplines'],
    queryFn: () => base44.entities.Discipline.list('sort_order'),
    staleTime: 10 * 60 * 1000,
  });

  const { data: formats = [] } = useQuery({
    queryKey: ['formats'],
    queryFn: () => base44.entities.Format.list(),
    staleTime: 10 * 60 * 1000,
  });

  const { disciplineById, disciplineByName, formatById } = useMemo(
    () => buildClassificationMaps(disciplines, formats),
    [disciplines, formats]
  );

  // Pre-resolve classification for every event — used by filters and cards
  const classificationByEventId = useMemo(() => {
    const map = {};
    for (const e of allEventsList) {
      map[e.id] = resolveEventClassification(e, seriesById, disciplineById, disciplineByName, formatById);
    }
    return map;
  }, [allEventsList, seriesById, disciplineById, disciplineByName, formatById]);

  // Validate discipline filter against loaded records (ignore invalid/inactive from stale URL)
  const validatedDisciplineFilter = useMemo(() => {
    if (disciplineFilter === 'all') return 'all';
    const d = disciplines.find(d => d.id === disciplineFilter && d.is_active !== false);
    return d ? disciplineFilter : 'all';
  }, [disciplineFilter, disciplines]);

  // Dependent format options
  const availableFormats = useMemo(() => {
    if (validatedDisciplineFilter === 'all') return formats.filter(f => f.is_active !== false);
    return formats.filter(f => f.discipline_id === validatedDisciplineFilter && f.is_active !== false);
  }, [formats, validatedDisciplineFilter]);

  const resolvedFormatFilter = useMemo(() => {
    if (formatFilter === 'all') return 'all';
    const fmt = formats.find(f => f.id === formatFilter && f.is_active !== false);
    if (!fmt) return 'all';
    if (validatedDisciplineFilter !== 'all' && fmt.discipline_id !== validatedDisciplineFilter) return 'all';
    return formatFilter;
  }, [formatFilter, formats, validatedDisciplineFilter]);

  const { data: allResults = [], isLoading: resultsLoading } = useQuery({
    queryKey: ['results-all'],
    queryFn: () => base44.entities.Results.list('-position', 500),
    enabled: activeTab === 'results' && completedEvents.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const { data: drivers = [], isLoading: driversLoading } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.filter({ profile_status: 'live' }),
    enabled: activeTab === 'results' && allResults.length > 0,
    staleTime: 10 * 60 * 1000,
  });

  const { data: allSessions = [] } = useQuery({
    queryKey: ['sessions-directory'],
    queryFn: () => base44.entities.Session.list(),
    enabled: activeTab === 'results' && completedEvents.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // Count sessions per event
  const sessionCountByEvent = useMemo(() => {
    const map = {};
    for (const session of allSessions) {
      if (!map[session.event_id]) map[session.event_id] = 0;
      map[session.event_id]++;
    }
    return map;
  }, [allSessions]);

  const podiumByEvent = useMemo(() => {
    const map = {};
    for (const event of completedEvents) {
      const finalResults = allResults
        .filter(r => r.event_id === event.id && r.position && r.session_type === 'Final')
        .sort((a, b) => a.position - b.position);

      const fallback = allResults
        .filter(r => r.event_id === event.id && r.position)
        .sort((a, b) => a.position - b.position);

      const topResults = (finalResults.length > 0 ? finalResults : fallback).slice(0, 3);

      map[event.id] = topResults.map(r => {
        const driver = drivers.find(d => d.id === r.driver_id);
        return {
          position: r.position,
          number: driver?.primary_number || null,
          name: driver ? `${driver.first_name} ${driver.last_name}` : (r.team_name || '—'),
        };
      });
    }
    return map;
  }, [completedEvents, allResults, drivers]);

  const filteredUpcomingEvents = upcomingEvents.filter(event => {
    const matchesSearch = event.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || event.status === statusFilter;
    const cls = classificationByEventId[event.id];
    const matchesDiscipline = validatedDisciplineFilter === 'all' || cls?.disciplineId === validatedDisciplineFilter;
    const matchesFormat = resolvedFormatFilter === 'all' || cls?.formatId === resolvedFormatFilter;
    return matchesSearch && matchesStatus && matchesDiscipline && matchesFormat;
  }).sort((a, b) => {
    const da = a.event_date || '';
    const db = b.event_date || '';
    return sortBy === 'oldest' ? da.localeCompare(db) : db.localeCompare(da);
  });

  const filteredCompletedEvents = [...completedEvents]
    .sort((a, b) => {
      const da = a.event_date || '';
      const db = b.event_date || '';
      return sortBy === 'oldest' ? da.localeCompare(db) : db.localeCompare(da);
    })
    .filter(event => {
      const cls = classificationByEventId[event.id];
      const matchesDiscipline = validatedDisciplineFilter === 'all' || cls?.disciplineId === validatedDisciplineFilter;
      const matchesFormat = resolvedFormatFilter === 'all' || cls?.formatId === resolvedFormatFilter;
      if (!matchesDiscipline || !matchesFormat) return false;
      if (!searchQuery) return true;
      const term = searchQuery.toLowerCase();
      if (event.name?.toLowerCase().includes(term)) return true;
      if (event.series?.toLowerCase().includes(term)) return true;
      const podium = podiumByEvent[event.id] || [];
      return podium.some(p => p.name?.toLowerCase().includes(term));
    });



  const positionIcon = (pos) => {
    if (pos === 1) return <Trophy className="w-3.5 h-3.5 text-yellow-500" />;
    if (pos === 2) return <Medal className="w-3.5 h-3.5 text-gray-400" />;
    if (pos === 3) return <Medal className="w-3.5 h-3.5 text-amber-600" />;
    return null;
  };

  // Detect duplicate event names across years
  const nameCounts = useMemo(() => {
    const counts = {};
    for (const e of completedEvents) {
      if (e.name) counts[e.name] = (counts[e.name] || 0) + 1;
    }
    return counts;
  }, [completedEvents]);

  const getDisplayName = (event) => {
    if (nameCounts[event.name] > 1 && event.season) {
      return `${event.season} ${event.name}`;
    }
    if (nameCounts[event.name] > 1 && event.event_date) {
      return `${new Date(event.event_date).getFullYear()} ${event.name}`;
    }
    return event.name;
  };

  const EventResultCard = ({ event }) => {
    const podium = podiumByEvent[event.id] || [];
    const sessionCount = sessionCountByEvent[event.id] || 0;
    const isMultiDay = event.end_date && event.end_date !== event.event_date;
    const dayCount = isMultiDay
      ? differenceInCalendarDays(new Date(event.end_date), new Date(event.event_date)) + 1
      : 1;

    return (
      <Link
        to={createPageUrl('EventResults') + `?id=${event.id}`}
        className="bg-[#ffffff] border border-[#e5e7eb] rounded-lg p-6 hover:shadow-lg transition-shadow"
      >
        <div className="flex items-start justify-between mb-4">
          <h3 className="font-bold text-lg leading-tight text-[#232323]">{getDisplayName(event)}</h3>
          <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
            <span className="px-2 py-1 text-xs rounded bg-[#f3f4f6] text-[#444]">Completed</span>
            {sessionCount > 1 && (
              <span className="flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-blue-50 text-blue-700 font-medium">
                <Layers className="w-3 h-3" />
                {dayCount > 1 ? `${dayCount}-Day` : `${sessionCount} Sessions`}
              </span>
            )}
          </div>
        </div>
        <div className="space-y-3">
          <div className="space-y-1 text-sm text-[#3a3a3a]">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {event.event_date ? format(new Date(event.event_date), 'MMM d, yyyy') : 'TBA'}
              {isMultiDay && event.end_date && (
                <span className="text-[#999]">– {format(new Date(event.end_date), 'MMM d')}</span>
              )}
            </div>
            {event.series && (
              <div className="text-xs font-medium uppercase tracking-wide text-[#888]">{event.series}</div>
            )}
          </div>
          {podium.length > 0 && (
            <div className="pt-3 border-t border-gray-100">
              <div className="text-xs font-medium mb-2 text-[#888]">Top Finishers (Final)</div>
              <div className="space-y-1.5">
                {podium.map((p) => (
                  <div key={p.position} className="flex items-center gap-2">
                    {positionIcon(p.position)}
                    <span className="text-xs text-[#555]">
                      {p.number ? `#${p.number} ` : ''}{p.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Link>
    );
  };

  return (
    <PageShell className="bg-white">
      <PullToRefresh onRefresh={refetchEvents}>
      <div className="max-w-7xl mx-auto px-6 py-12">
        <DirectoryFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search events..."
          filters={{ discipline: validatedDisciplineFilter, format: resolvedFormatFilter, status: statusFilter }}
          onFilterChange={(key, value) => {
            if (key === 'discipline') handleDisciplineChange(value);
            else if (key === 'format') handleFormatChange(value);
            else if (key === 'status') setStatusFilter(value);
          }}
          filterConfig={[
            {
              key: 'discipline',
              label: 'Discipline',
              options: [
                { value: 'all', label: 'All Disciplines' },
                ...disciplines.filter(d => d.is_active !== false).map(d => ({ value: d.id, label: d.name })),
              ],
            },
            {
              key: 'format',
              label: 'Format',
              options: [
                { value: 'all', label: 'All Formats' },
                ...availableFormats.map(f => ({ value: f.id, label: f.name })),
              ],
            },
            {
              key: 'status',
              label: 'Status',
              options: [
                { value: 'all', label: 'All Status' },
                { value: 'upcoming', label: 'Upcoming' },
                { value: 'in_progress', label: 'In Progress' },
              ],
            },
          ]}
          sortBy={sortBy}
          onSortChange={setSortBy}
          sortOptions={[
            { value: 'latest', label: 'Latest First' },
            { value: 'oldest', label: 'Oldest First' },
          ]}
        />

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="mb-8 bg-transparent border-b border-gray-200 rounded-none w-full justify-start gap-0 h-auto p-0">
            <TabsTrigger
              value="upcoming"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#232323] data-[state=active]:bg-transparent data-[state=active]:text-[#232323] text-gray-400 px-4 pb-3 text-sm font-medium"
            >
              Upcoming
            </TabsTrigger>
            <TabsTrigger
              value="results"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#232323] data-[state=active]:bg-transparent data-[state=active]:text-[#232323] text-gray-400 px-4 pb-3 text-sm font-medium"
            >
              Results
            </TabsTrigger>
            <TabsTrigger
              value="map"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#232323] data-[state=active]:bg-transparent data-[state=active]:text-[#232323] text-gray-400 px-3 md:px-4 pb-3 text-sm font-medium flex items-center gap-1.5"
            >
              <Map className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Events Near Me</span>
              <span className="sm:hidden">Near Me</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-72 w-full" />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredUpcomingEvents.map(event => {
                  const cls = classificationByEventId[event.id] || {};
                  const seriesRecord = seriesById[event.series_id];
                  return (
                    <Link
                      key={event.id}
                      to={`${createPageUrl('EventProfile')}?id=${event.id}`}
                      className="bg-[#ffffff] border border-[#e5e7eb] rounded-lg p-6 hover:shadow-lg transition-shadow relative overflow-hidden"
                    >
                      {cls.disciplineColor && (
                        <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: cls.disciplineColor }} />
                      )}
                      <div className="mb-3 mt-1">
                        <h3 className="font-bold text-lg leading-tight text-[#232323]">{event.name}</h3>
                        {event.series_name && (
                          <div className="text-xs font-medium uppercase tracking-wide mt-0.5 text-[#888]">{event.series_name}</div>
                        )}
                      </div>
                      <div className="space-y-1 text-sm text-[#3a3a3a]">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Calendar className="w-4 h-4" />
                          {event.event_date ? format(new Date(event.event_date), 'MMM d, yyyy') : 'TBA'}
                          {event.round_number && seriesRecord?.uses_rounds && <span className="text-[#999]">&middot; Rd {event.round_number}</span>}
                          <DaysUntilBadge eventDate={event.event_date} status={event.status} />
                        </div>
                      </div>
                      {(cls.disciplineName || cls.formatName) && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {cls.disciplineName && (
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                              style={{ backgroundColor: cls.disciplineColor }}
                            >
                              {cls.disciplineName}
                            </span>
                          )}
                          {cls.formatName && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#f3f4f6] text-[#555]">
                              {cls.formatName}
                            </span>
                          )}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}

            {!isLoading && filteredUpcomingEvents.length === 0 && (
              <div className="text-center py-12 text-gray-600">
                No events found matching your filters.
              </div>
            )}
          </TabsContent>

          <TabsContent value="results">
            {isLoading || resultsLoading || driversLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-72 w-full" />)}
              </div>
            ) : filteredCompletedEvents.length === 0 ? (
              <div className="text-center py-12 text-gray-600">
                No events found matching your filters.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredCompletedEvents.map(event => (
                  <EventResultCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="map">
            <EventMapTab
              disciplineFilter={validatedDisciplineFilter}
              formatFilter={resolvedFormatFilter}
              onDisciplineChange={handleDisciplineChange}
              onFormatChange={handleFormatChange}
              disciplines={disciplines}
              formats={formats}
            />
          </TabsContent>
        </Tabs>
      </div>
      </PullToRefresh>
    </PageShell>
  );
}