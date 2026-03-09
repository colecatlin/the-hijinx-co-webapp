import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { getEventProfileData } from '@/components/entities/publicPageDataApi';
import PageShell from '@/components/shared/PageShell';
import { EntityNotFound, EntityUnavailable } from '@/components/data/EntityNotFoundState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MapPin, Calendar, Trophy, Flag, Share2, AlertCircle, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, differenceInCalendarDays, parseISO, isValid } from 'date-fns';
import SocialShareButtons from '@/components/shared/SocialShareButtons';
import { createPageUrl } from '@/components/utils';
import ResultsPanel from '@/components/results/ResultsPanel';
import EventResultsSubmissionForm from '@/components/EventResultsSubmissionForm';
import { isEventPublic } from '@/components/system/publishHelpers';
import PublicMediaGallery from '@/components/media/PublicMediaGallery';

function safeDateFormat(dateStr, fmt = 'MMMM d, yyyy') {
  if (!dateStr) return 'TBA';
  try {
    const d = parseISO(dateStr);
    return isValid(d) ? format(d, fmt) : 'TBA';
  } catch {
    return 'TBA';
  }
}

function safeDaysUntil(dateStr) {
  if (!dateStr) return null;
  try {
    return differenceInCalendarDays(parseISO(dateStr), new Date());
  } catch {
    return null;
  }
}

export default function EventProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  const eventId   = (urlParams.get('id')   || '').trim() || null;
  const eventSlug = (urlParams.get('slug') || '').trim() || null;
  const [activeSection, setActiveSection] = useState('overview');
  const [selectedClassName, setSelectedClassName] = useState('');
  const [selectedSessionType, setSelectedSessionType] = useState('all');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    retry: false,
  });

  const { data: isAuthenticated } = useQuery({
    queryKey: ['isAuthenticated'],
    queryFn: () => base44.auth.isAuthenticated(),
    retry: false,
  });

  const { data: profileData, isLoading } = useQuery({
    queryKey: ['eventProfileData', eventId, eventSlug],
    queryFn: () => getEventProfileData({ id: eventId, slug: eventSlug }),
    enabled: !!(eventId || eventSlug),
  });

  const event    = profileData?.event    ?? null;
  const track    = profileData?.track    ?? null;
  const series   = profileData?.series   ?? null;  // single object, not array
  const sessions = profileData?.sessions ?? [];
  const classes  = profileData?.classes  ?? [];
  const allResults= profileData?.results  ?? [];
  const standings= profileData?.standings ?? [];

  const isPublicEvent = event && isEventPublic(event);
  const canViewDraft  = user?.role === 'admin' && event?.status === 'Draft';

  if (isLoading) {
    return (
      <PageShell className="bg-white">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <Skeleton className="h-12 w-64 mb-4" />
          <Skeleton className="h-96" />
        </div>
      </PageShell>
    );
  }

  if (!event) return <EntityNotFound entityType="Event" />;
  if (!isPublicEvent && !canViewDraft) return <EntityUnavailable entityType="Event" />;

  const sections = [
    { id: 'overview', label: 'Overview', icon: MapPin },
    { id: 'sessions', label: 'Sessions', icon: Calendar },
    { id: 'results', label: 'Results', icon: Trophy },
  ];

  const orgType  = event?.series_id ? 'series' : 'track';
  const orgId    = event?.series_id || event?.track_id;
  const racedayUrl = `${createPageUrl('RegistrationDashboard')}?orgType=${orgType}&orgId=${orgId}&seasonYear=${event?.season}&eventId=${event?.id}`;

  const activeClassSessions = useMemo(() => {
    if (!selectedClassName || selectedClassName === 'all') return sessions;
    return sessions.filter(s => s.series_class_id === selectedClassName || s.class_name === selectedClassName);
  }, [sessions, selectedClassName]);

  const filteredSessions = useMemo(() => {
    return activeClassSessions.filter(s =>
      selectedSessionType === 'all' || s.session_type === selectedSessionType
    );
  }, [activeClassSessions, selectedSessionType]);

  const officialSessions = useMemo(() => {
    return sessions.filter(s => ['Official', 'Locked'].includes(s.status));
  }, [sessions]);

  const eventStandings = useMemo(() => {
    return standings
      .filter(s => s.series_id === event?.series_id && s.season_year === event?.season)
      .sort((a, b) => (a.position || 999) - (b.position || 999))
      .slice(0, 10);
  }, [standings, event?.series_id, event?.season]);

  const sessionTypes = useMemo(() => {
    return [...new Set(sessions.map(s => s.session_type).filter(Boolean))].sort();
  }, [sessions]);

  const SESSION_TYPE_ORDER = ['Practice', 'Qualifying', 'Heat', 'LCQ', 'Final'];
  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => {
      const aIdx = SESSION_TYPE_ORDER.indexOf(a.session_type || '');
      const bIdx = SESSION_TYPE_ORDER.indexOf(b.session_type || '');
      if (aIdx !== bIdx) {
        return (aIdx >= 0 ? aIdx : SESSION_TYPE_ORDER.length) - (bIdx >= 0 ? bIdx : SESSION_TYPE_ORDER.length);
      }
      if (a.scheduled_time && b.scheduled_time) return new Date(a.scheduled_time) - new Date(b.scheduled_time);
      if (a.scheduled_time) return -1;
      if (b.scheduled_time) return 1;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [sessions]);

  const sessionStats = useMemo(() => {
    const statuses = {};
    sessions.forEach(s => {
      const status = (s.status || 'Draft').toLowerCase();
      statuses[status] = (statuses[status] || 0) + 1;
    });
    return statuses;
  }, [sessions]);

  const daysUntil = safeDaysUntil(event.event_date);

  return (
    <PageShell className="bg-white">
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-600 truncate">
              {event.name} • {track?.name || 'N/A'} • {safeDateFormat(event.event_date, 'MMM d, yyyy')}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link to={`${createPageUrl('EventResults')}?eventId=${event?.id}`}>
              <Button variant="outline" size="sm" className="text-xs">View Results</Button>
            </Link>
            {isAuthenticated && (
              <Link to={racedayUrl}>
                <Button
                  variant={user?.role === 'admin' ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs"
                >
                  {user?.role === 'admin' ? 'Manage RaceDay' : 'Staff Dashboard'}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-4 pb-0">
        <Link to={createPageUrl('EventDirectory')} className="text-sm text-gray-600 hover:text-[#00FFDA]">
          ← Back to Events
        </Link>
      </div>
      <div className="max-w-7xl mx-auto px-6 py-12">

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6 items-start">
          <div className="lg:col-span-2">
            <Separator className="mb-3" />
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-black text-[#232323] leading-none">
                {event.season ? `${event.season} ${event.name}` : event.name}
              </h1>
              {event.round_number && (
                <div className="text-xl font-bold text-gray-500">Rnd {event.round_number}</div>
              )}
            </div>

            <div className="flex gap-1 overflow-x-auto border-b border-gray-200 mb-3">
              {sections.map(section => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => {
                      setActiveSection(section.id);
                      if (section.id === 'overview') {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      } else {
                        const element = document.getElementById(`section-${section.id}`);
                        if (element) {
                          const offset = element.getBoundingClientRect().top + window.pageYOffset - 120;
                          window.scrollTo({ top: offset, behavior: 'smooth' });
                        }
                      }
                    }}
                    className={`flex items-center gap-2 px-4 py-3 text-xs font-medium whitespace-nowrap transition-colors ${
                      activeSection === section.id
                        ? 'text-[#232323] border-b-2 border-[#00FFDA]'
                        : 'text-gray-600 hover:text-[#232323]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {section.label}
                  </button>
                );
              })}
            </div>

            <Separator className="mb-3" />
            <div className="bg-white p-8 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  {event.series && (
                    <div className="mb-4">
                      <div className="text-sm text-gray-600 mb-1">Series</div>
                      <div className="text-lg font-semibold text-[#232323]">{event.series}</div>
                    </div>
                  )}
                  {event.season && (
                    <div className="mb-4">
                      <div className="text-sm text-gray-600 mb-1">Season</div>
                      <div className="text-lg font-semibold text-[#232323]">{event.season}</div>
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1 text-sm text-gray-600 mb-1">
                    <Calendar className="w-4 h-4" />
                    Event Date
                  </div>
                  <div className="text-lg font-semibold text-[#232323] mb-1">
                    {safeDateFormat(event.event_date)}
                    {event.end_date && event.end_date !== event.event_date && (
                      <span className="text-gray-500"> – {safeDateFormat(event.end_date)}</span>
                    )}
                  </div>
                  {(() => {
                    if (!event.event_date || event.status === 'completed' || event.status === 'cancelled') return null;
                    if (event.status === 'in_progress') return <div className="text-sm font-bold text-green-600 mb-4">In Progress</div>;
                    if (daysUntil === null || daysUntil < 0) return null;
                    if (daysUntil === 0) return <div className="text-sm font-bold text-green-600 mb-4">Today</div>;
                    return <div className="text-sm font-bold text-orange-500 mb-4">In {daysUntil} day{daysUntil !== 1 ? 's' : ''}</div>;
                  })()}
                  {track && (
                    <div>
                      <div className="flex items-center gap-1 text-sm text-gray-600 mb-1">
                        <MapPin className="w-4 h-4" />
                        Venue
                      </div>
                      <div className="text-lg font-semibold text-[#232323]">{track.name}</div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-6">
                <Badge className={`${
                  event.status === 'upcoming' ? 'bg-blue-100 text-blue-800' :
                  event.status === 'in_progress' ? 'bg-green-100 text-green-800' :
                  event.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {event.status}
                </Badge>
              </div>
            </div>
          </div>

          <div className="space-y-6 relative -mt-1">
            <div className="absolute -top-12 right-0 z-10">
              <SocialShareButtons
                url={window.location.href}
                title={`${event.name} - Event`}
                description=""
              />
            </div>
          </div>
        </div>

        {/* Linked Entities Panel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {track && (
            <div className="bg-white border border-gray-200 rounded-lg p-6 hover:border-[#00FFDA] transition-colors">
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-3 font-medium">Venue</div>
              <Link to={`${createPageUrl('TrackProfile')}?id=${track.id}`} className="group">
                <div className="font-bold text-[#232323] text-lg mb-1 group-hover:text-[#00FFDA] transition-colors">{track.name}</div>
                {(track.location_city || track.location_state) && (
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <MapPin className="w-3 h-3" />
                    {[track.location_city, track.location_state].filter(Boolean).join(', ')}
                  </div>
                )}
                {track.track_type && (
                  <div className="text-xs text-gray-400 mt-2">{track.track_type}</div>
                )}
              </Link>
            </div>
          )}

          {series && (
            <div className="bg-white border border-gray-200 rounded-lg p-6 hover:border-[#00FFDA] transition-colors">
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-3 font-medium">Series</div>
              <Link to={`${createPageUrl('SeriesDetail')}?id=${series.id}`} className="group">
                <div className="font-bold text-[#232323] text-lg mb-1 group-hover:text-[#00FFDA] transition-colors">{series.name}</div>
                {event.season && (
                  <div className="text-sm text-gray-600">Season {event.season}</div>
                )}
              </Link>
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-3 font-medium">Status</div>
            <div className="flex items-center gap-2 mb-2">
              <Badge className={`${
                event.status === 'Draft' ? 'bg-gray-100 text-gray-700' :
                event.status === 'Published' ? 'bg-blue-100 text-blue-700' :
                event.status === 'Live' ? 'bg-green-100 text-green-700' :
                'bg-gray-100 text-gray-600'
              }`}>
                {event.status}
              </Badge>
            </div>
            {event.event_date && event.status !== 'completed' && daysUntil !== null && (
              <div className="text-sm text-gray-600">
                {daysUntil < 0 ? 'Event passed' : daysUntil === 0 ? 'Today' : `In ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`}
              </div>
            )}
          </div>
        </div>

        {/* Sessions Preview Card */}
        <div className="mb-6">
          <section className="bg-white border border-gray-200 p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-[#232323]">Sessions</h2>
              {sortedSessions.length > 12 && (
                <Link to={`${createPageUrl('EventResults')}?id=${event?.id}`} className="text-sm text-[#00FFDA] hover:underline font-medium">
                  View all sessions
                </Link>
              )}
            </div>

            {sortedSessions.length > 0 ? (
              <div className="space-y-3 mb-6">
                {sortedSessions.slice(0, 12).map(session => (
                  <div key={session.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:border-gray-300 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-[#232323] mb-1">
                        {session.name || `${session.session_type || ''}${session.session_number ? ` #${session.session_number}` : ''}`}
                      </div>
                      {session.scheduled_time && isValid(parseISO(session.scheduled_time)) && (
                        <div className="text-xs text-gray-500">
                          {format(parseISO(session.scheduled_time), 'MMM d, HH:mm')}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                      <Badge className={`${
                        session.status === 'Draft' ? 'bg-gray-100 text-gray-700' :
                        session.status === 'Provisional' ? 'bg-orange-100 text-orange-700' :
                        session.status === 'Official' || session.status === 'Locked' ? 'bg-green-100 text-green-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {session.status}
                      </Badge>
                      <Link to={`${createPageUrl('SessionProfile')}?id=${session.id}`}>
                        <Button variant="ghost" size="sm" className="text-xs h-7">Open</Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No sessions created for this event yet.</p>
            )}
          </section>
        </div>

        {/* Quick Stats Strip */}
        {sortedSessions.length > 0 && (
          <div className="mb-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-[#232323]">{sortedSessions.length}</div>
                <div className="text-xs text-gray-600 uppercase tracking-wide mt-1">Total Sessions</div>
              </div>
              {['draft', 'provisional', 'official', 'locked'].map(status => {
                const count = sessionStats[status] || 0;
                return count > 0 ? (
                  <div key={status} className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-[#232323]">{count}</div>
                    <div className="text-xs text-gray-600 uppercase tracking-wide mt-1">{status}</div>
                  </div>
                ) : null;
              })}
            </div>
          </div>
        )}

        {/* Classes Section */}
        {event.series_id ? (
          <div className="mb-6">
            <section className="bg-white border border-gray-200 p-8">
              <h2 className="text-2xl font-bold text-[#232323] mb-6">Racing Classes</h2>
              {classes.length === 0 ? (
                <p className="text-gray-500 text-sm">No classes defined for this series yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {classes.map(cls => (
                    <div key={cls.id} className="border border-gray-200 rounded-lg p-4 hover:border-[#00FFDA] transition-colors">
                      <div className="mb-3">
                        <div className="font-semibold text-[#232323] mb-2">{cls.class_name}</div>
                        {cls.vehicle_type && <p className="text-xs text-gray-500">Vehicle: {cls.vehicle_type}</p>}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => {
                          setSelectedClassName(cls.class_name);
                          const element = document.getElementById('section-sessions');
                          if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                      >
                        Jump to Sessions
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : (
          <div className="mb-6">
            <section className="bg-white border border-gray-200 p-8">
              <p className="text-gray-500 text-sm">Classes for this event are not linked to a series yet.</p>
            </section>
          </div>
        )}

        {/* Sessions Schedule Section */}
        <div className="space-y-4 mb-6">
          <section id="section-sessions" className="bg-white border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-[#232323] mb-6">Sessions Schedule</h2>

            {sessions.length > 0 && (
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                {classes.length > 0 && (
                  <div className="flex-1">
                    <label className="text-xs text-gray-600 font-medium mb-2 block">Filter by Class</label>
                    <Select value={selectedClassName || ''} onValueChange={setSelectedClassName}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="All sessions" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>All sessions</SelectItem>
                        {classes.map(cls => (
                          <SelectItem key={cls.id} value={cls.class_name}>
                            {cls.class_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex-1">
                  <label className="text-xs text-gray-600 font-medium mb-2 block">Filter by Type</label>
                  <Select value={selectedSessionType} onValueChange={setSelectedSessionType}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All types</SelectItem>
                      {sessionTypes.map(type => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {filteredSessions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-2 font-semibold text-gray-600">Time</th>
                      <th className="text-left py-3 px-2 font-semibold text-gray-600">Type</th>
                      <th className="text-left py-3 px-2 font-semibold text-gray-600">Name</th>
                      <th className="text-left py-3 px-2 font-semibold text-gray-600">Status</th>
                      <th className="text-right py-3 px-2 font-semibold text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSessions.map(session => {
                      const hasValidTime = session.scheduled_time && isValid(parseISO(session.scheduled_time));
                      return (
                        <tr key={session.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-2 text-xs">
                            {hasValidTime ? format(parseISO(session.scheduled_time), 'HH:mm') : 'TBA'}
                          </td>
                          <td className="py-3 px-2 font-medium text-[#232323]">{session.session_type}</td>
                          <td className="py-3 px-2">{session.name}</td>
                          <td className="py-3 px-2">
                            <Badge className={`${
                              session.status === 'Official' || session.status === 'Locked' ? 'bg-green-100 text-green-700' :
                              session.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {session.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-2 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link to={`${createPageUrl('SessionProfile')}?id=${session.id}`}>
                                <Button variant="ghost" size="sm" className="text-xs h-7">View</Button>
                              </Link>
                              {isAuthenticated && (
                                <Link to={`${racedayUrl}&tab=results`}>
                                  <Button variant="ghost" size="sm" className="text-xs h-7">Manage</Button>
                                </Link>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No sessions match the selected filters.</p>
            )}
          </section>
        </div>

        {/* Results Coverage Section */}
        <div className="mb-6">
          <section className="bg-white border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-[#232323] mb-6">Results Coverage</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-black text-[#232323]">{sessions.length}</div>
                <div className="text-xs text-gray-600 uppercase tracking-wide mt-1">Total Sessions</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-black text-[#232323]">{officialSessions.length}</div>
                <div className="text-xs text-gray-600 uppercase tracking-wide mt-1">Official/Locked</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-black text-[#232323]">{allResults.length}</div>
                <div className="text-xs text-gray-600 uppercase tracking-wide mt-1">Results Rows</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-black text-[#232323]">
                  {sessions.length > 0 ? Math.round((officialSessions.length / sessions.length) * 100) : 0}%
                </div>
                <div className="text-xs text-gray-600 uppercase tracking-wide mt-1">Coverage</div>
              </div>
            </div>
            {isAuthenticated && (
              <Link to={`${racedayUrl}&tab=results`}>
                <Button variant="outline">Open Results Console</Button>
              </Link>
            )}
          </section>
        </div>

        {/* Standings Preview */}
        {event.series_id && (
          <div className="mb-6">
            <section className="bg-white border border-gray-200 p-8">
              <h2 className="text-2xl font-bold text-[#232323] mb-6">Standings Preview</h2>
              {eventStandings.length === 0 ? (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 text-gray-600">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm">Standings not calculated yet for this season.</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto mb-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-2 font-semibold text-gray-600">#</th>
                          <th className="text-left py-3 px-2 font-semibold text-gray-600">Driver</th>
                          <th className="text-right py-3 px-2 font-semibold text-gray-600">Points</th>
                        </tr>
                      </thead>
                      <tbody>
                        {eventStandings.map(stand => (
                          <tr key={stand.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-2 font-semibold text-[#232323]">{stand.position}</td>
                            <td className="py-3 px-2 font-medium text-[#232323]">{stand.driver_name || 'N/A'}</td>
                            <td className="py-3 px-2 text-right font-semibold">{stand.total_points}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex gap-2">
                    <Link to={`${createPageUrl('StandingsHome')}?seriesId=${event.series_id}&seasonYear=${event.season}`}>
                      <Button variant="outline" size="sm">View Standings</Button>
                    </Link>
                    {isAuthenticated && (
                      <Link to={`${racedayUrl}&tab=pointsAndStandings`}>
                        <Button variant="outline" size="sm">Manage Points</Button>
                      </Link>
                    )}
                  </div>
                </>
              )}
            </section>
          </div>
        )}

        {/* Published Media Gallery */}
        <div className="mb-6">
          <section className="bg-white border border-gray-200 p-8">
            <PublicMediaGallery
              targetType="event_recap"
              targetEntityId={event?.id}
              title="Media"
            />
          </section>
        </div>

        <div className="space-y-4">
          <section id="section-results" className="bg-white border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-[#232323] mb-6">Submit Results</h2>
            <EventResultsSubmissionForm eventName={event.name} eventDate={event.event_date} />
          </section>
          <div className="bg-white border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-[#232323] mb-6">Official Results & Standings</h2>
            <ResultsPanel eventId={event?.id} seriesName={event.series} />
          </div>
        </div>
      </div>
    </PageShell>
  );
}