import React, { useState, useMemo, useEffect } from 'react';
import SeoMeta, { buildEntityTitle, SITE_FALLBACK_IMAGE } from '@/components/system/seoMeta';
import Analytics from '@/components/system/analyticsTracker';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { getEventProfileData } from '@/components/entities/publicPageDataApi';
import PageShell from '@/components/shared/PageShell';
import { EntityNotFound, EntityUnavailable } from '@/components/data/EntityNotFoundState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Calendar, Trophy, Flag, AlertCircle, ExternalLink } from 'lucide-react';
import ProfileClaimFooter from '@/components/onboarding/ProfileClaimFooter';
import { Link } from 'react-router-dom';
import { format, differenceInCalendarDays, parseISO, isValid } from 'date-fns';
import SocialShareButtons from '@/components/shared/SocialShareButtons';
import { createPageUrl } from '@/components/utils';
import ResultsPanel from '@/components/results/ResultsPanel';
import { isEventPublic } from '@/components/system/publishHelpers';
import PublicMediaGallery from '@/components/media/PublicMediaGallery';

function safeDateFormat(dateStr, fmt = 'MMMM d, yyyy') {
  if (!dateStr) return 'TBA';
  try { const d = parseISO(dateStr); return isValid(d) ? format(d, fmt) : 'TBA'; } catch { return 'TBA'; }
}

function safeDaysUntil(dateStr) {
  if (!dateStr) return null;
  try { return differenceInCalendarDays(parseISO(dateStr), new Date()); } catch { return null; }
}

const TABS = [
  { id: 'overview', label: 'Overview', icon: MapPin },
  { id: 'sessions', label: 'Sessions', icon: Calendar },
  { id: 'results', label: 'Results', icon: Trophy },
];

const SESSION_TYPE_ORDER = ['Practice', 'Qualifying', 'Heat', 'LCQ', 'Final'];

export default function EventProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  const eventId   = (urlParams.get('id')   || '').trim() || null;
  const eventSlug = (urlParams.get('slug') || '').trim() || null;
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedClassName, setSelectedClassName] = useState('');
  const [selectedSessionType, setSelectedSessionType] = useState('all');

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me(), retry: false });
  const { data: isAuthenticated } = useQuery({ queryKey: ['isAuthenticated'], queryFn: () => base44.auth.isAuthenticated(), retry: false });

  const { data: profileData, isLoading } = useQuery({
    queryKey: ['eventProfileData', eventId, eventSlug],
    queryFn: () => getEventProfileData({ id: eventId, slug: eventSlug }),
    enabled: !!(eventId || eventSlug),
  });

  const event     = profileData?.event    ?? null;
  const track     = profileData?.track    ?? null;
  const series    = profileData?.series   ?? null;
  const sessions  = profileData?.sessions ?? [];
  const classes   = profileData?.classes  ?? [];
  const allResults= profileData?.results  ?? [];
  const standings = profileData?.standings ?? [];

  const isPublicEvent = event && isEventPublic(event);
  const canViewDraft  = user?.role === 'admin' && event?.status === 'Draft';
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (event) Analytics.profileViewEvent(event.id, event.name, event.status);
  }, [event?.id]);

  const activeClassSessions = useMemo(() => {
    if (!selectedClassName || selectedClassName === 'all') return sessions;
    return sessions.filter(s => s.series_class_id === selectedClassName || s.class_name === selectedClassName);
  }, [sessions, selectedClassName]);

  const filteredSessions = useMemo(() =>
    activeClassSessions.filter(s => selectedSessionType === 'all' || s.session_type === selectedSessionType),
  [activeClassSessions, selectedSessionType]);

  const officialSessions = useMemo(() => sessions.filter(s => ['Official', 'Locked'].includes(s.status)), [sessions]);

  const eventStandings = useMemo(() =>
    standings.filter(s => s.series_id === event?.series_id && s.season_year === event?.season)
      .sort((a, b) => (a.position || 999) - (b.position || 999)).slice(0, 10),
  [standings, event?.series_id, event?.season]);

  const sessionTypes = useMemo(() => [...new Set(sessions.map(s => s.session_type).filter(Boolean))].sort(), [sessions]);

  const sortedSessions = useMemo(() => [...sessions].sort((a, b) => {
    const aIdx = SESSION_TYPE_ORDER.indexOf(a.session_type || '');
    const bIdx = SESSION_TYPE_ORDER.indexOf(b.session_type || '');
    if (aIdx !== bIdx) return (aIdx >= 0 ? aIdx : SESSION_TYPE_ORDER.length) - (bIdx >= 0 ? bIdx : SESSION_TYPE_ORDER.length);
    if (a.scheduled_time && b.scheduled_time) return new Date(a.scheduled_time) - new Date(b.scheduled_time);
    if (a.scheduled_time) return -1; if (b.scheduled_time) return 1;
    return (a.name || '').localeCompare(b.name || '');
  }), [sessions]);

  const sessionStats = useMemo(() => {
    const s = {}; sessions.forEach(sess => { const st = (sess.status || 'Draft').toLowerCase(); s[st] = (s[st] || 0) + 1; }); return s;
  }, [sessions]);

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

  const heroImg = track?.image_url || null;
  const orgType = event?.series_id ? 'series' : 'track';
  const orgId   = event?.series_id || event?.track_id;
  const racedayUrl = `${createPageUrl('RegistrationDashboard')}?orgType=${orgType}&orgId=${orgId}&seasonYear=${event?.season}&eventId=${event?.id}`;
  const daysUntil = safeDaysUntil(event?.event_date);
  const eventTitle = event.season ? `${event.season} ${event.name}` : event.name;
  const eventDesc = [track?.name ? `At ${track.name}` : '', event.event_date ? `on ${safeDateFormat(event.event_date)}` : '', series?.name ? `— ${series.name}` : ''].filter(Boolean).join(' ') || `${event.name} event details on HIJINX.`;

  return (
    <PageShell className="bg-white">
      <SeoMeta title={buildEntityTitle(eventTitle, 'Event')} description={eventDesc} image={heroImg || undefined} />

      {/* ── HERO ── */}
      <div className="relative w-full h-[300px] bg-[#0A0A0A] overflow-hidden">
        {heroImg ? (
          <>
            <img src={heroImg} alt={event.name} className="w-full h-full object-cover opacity-50" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/30 to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] to-[#0A0A0A]" />
        )}
        <div className="absolute bottom-0 left-0 right-0 max-w-7xl mx-auto px-6 pb-8">
          <div className="flex items-end gap-4">
            <div className="flex-1">
              {event.round_number && <div className="text-white/50 text-sm font-medium mb-1">Round {event.round_number}</div>}
              <h1 className="text-4xl md:text-5xl font-black text-white leading-none">{eventTitle}</h1>
              <div className="flex flex-wrap gap-4 mt-3 text-sm text-white/60">
                {track?.name && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{track.name}</span>}
                {event.event_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{safeDateFormat(event.event_date)}</span>}
                {series?.name && <span>{series.name}</span>}
              </div>
            </div>
            <div className="pb-2 flex-shrink-0 flex items-center gap-2">
              <SocialShareButtons url={window.location.href} title={`${event.name} - Event`} description="" />
              <Link to={`${createPageUrl('EventResults')}?id=${event?.id}`}>
                <button className="px-3 py-1.5 text-xs font-medium bg-white/10 text-white border border-white/20 rounded-lg hover:bg-white/20 transition-colors">View Results</button>
              </Link>
              {isAdmin && (
                <Link to={racedayUrl}>
                  <button className="px-3 py-1.5 text-xs font-medium bg-[#00FFDA] text-[#0A0A0A] rounded-lg hover:bg-[#00E6CC] transition-colors">Manage RaceDay</button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── NAV ── */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center gap-2 pt-2">
            <Link to={createPageUrl('EventDirectory')} className="text-xs text-gray-500 hover:text-[#232323] mr-4">← Events</Link>
          </div>
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-xs font-medium whitespace-nowrap transition-colors ${activeTab === tab.id ? 'text-[#232323] border-b-2 border-[#00FFDA] -mb-px' : 'text-gray-500 hover:text-[#232323]'}`}
                >
                  <Icon className="w-3.5 h-3.5" />{tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Linked Entities */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {track && (
                <div className="bg-white border border-gray-200 rounded-lg p-6 hover:border-[#00FFDA] transition-colors">
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-3 font-medium">Venue</div>
                  <Link to={`${createPageUrl('TrackProfile')}?slug=${track.canonical_slug || track.slug || track.id}`} className="group">
                    <div className="font-bold text-[#232323] text-lg mb-1 group-hover:text-[#00FFDA] transition-colors">{track.name}</div>
                    {(track.location_city || track.location_state) && (
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <MapPin className="w-3 h-3" />{[track.location_city, track.location_state].filter(Boolean).join(', ')}
                      </div>
                    )}
                    {track.track_type && <div className="text-xs text-gray-400 mt-2">{track.track_type}</div>}
                  </Link>
                </div>
              )}
              {series && (
                <div className="bg-white border border-gray-200 rounded-lg p-6 hover:border-[#00FFDA] transition-colors">
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-3 font-medium">Series</div>
                  <Link to={`/series/${series.canonical_slug || series.slug || series.id}`} className="group">
                    <div className="font-bold text-[#232323] text-lg mb-1 group-hover:text-[#00FFDA] transition-colors">{series.name}</div>
                    {event.season && <div className="text-sm text-gray-600">Season {event.season}</div>}
                  </Link>
                </div>
              )}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-3 font-medium">Status</div>
                <Badge className={`${event.status === 'Draft' ? 'bg-gray-100 text-gray-700' : event.status === 'Published' ? 'bg-blue-100 text-blue-700' : event.status === 'Live' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{event.status}</Badge>
                {event.event_date && event.status !== 'completed' && daysUntil !== null && (
                  <div className="text-sm text-gray-600 mt-2">{daysUntil < 0 ? 'Event passed' : daysUntil === 0 ? 'Today' : `In ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`}</div>
                )}
                <div className="mt-3">
                  <div className="text-xs text-gray-500 mb-1">Date</div>
                  <div className="font-semibold text-[#232323]">{safeDateFormat(event.event_date)}{event.end_date && event.end_date !== event.event_date ? ` – ${safeDateFormat(event.end_date)}` : ''}</div>
                </div>
              </div>
            </div>

            {/* Classes */}
            {classes.length > 0 && (
              <section className="bg-white border border-gray-200 rounded-lg p-8">
                <h2 className="text-2xl font-bold text-[#232323] mb-6">Racing Classes</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {classes.map(cls => (
                    <div key={cls.id} className="border border-gray-200 rounded-lg p-4 hover:border-[#00FFDA] transition-colors">
                      <div className="font-semibold text-[#232323] mb-2">{cls.class_name}</div>
                      {cls.vehicle_type && <p className="text-xs text-gray-500 mb-2">Vehicle: {cls.vehicle_type}</p>}
                      <Button variant="outline" size="sm" className="w-full text-xs"
                        onClick={() => { setSelectedClassName(cls.class_name); setActiveTab('sessions'); }}>
                        Jump to Sessions
                      </Button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Sessions preview */}
            {sortedSessions.length > 0 && (
              <section className="bg-white border border-gray-200 rounded-lg p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-[#232323]">Sessions</h2>
                  <button onClick={() => setActiveTab('sessions')} className="text-sm text-[#00FFDA] hover:underline font-medium">View all →</button>
                </div>
                <div className="space-y-3">
                  {sortedSessions.slice(0, 6).map(session => (
                    <div key={session.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:border-gray-300 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-[#232323] mb-1">{session.name || `${session.session_type || ''}${session.session_number ? ` #${session.session_number}` : ''}`}</div>
                        {session.scheduled_time && isValid(parseISO(session.scheduled_time)) && (
                          <div className="text-xs text-gray-500">{format(parseISO(session.scheduled_time), 'MMM d, HH:mm')}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                        <Badge className={`${session.status === 'Draft' ? 'bg-gray-100 text-gray-700' : session.status === 'Provisional' ? 'bg-orange-100 text-orange-700' : session.status === 'Official' || session.status === 'Locked' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{session.status}</Badge>
                        <Link to={`${createPageUrl('SessionProfile')}?id=${session.id}`}>
                          <Button variant="ghost" size="sm" className="text-xs h-7">Open</Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* SESSIONS */}
        {activeTab === 'sessions' && (
          <div className="space-y-4">
            <section className="bg-white border border-gray-200 rounded-lg p-8">
              <h2 className="text-2xl font-bold text-[#232323] mb-6">Sessions Schedule</h2>
              {sessions.length > 0 && (
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  {classes.length > 0 && (
                    <div className="flex-1">
                      <label className="text-xs text-gray-600 font-medium mb-2 block">Filter by Class</label>
                      <Select value={selectedClassName || ''} onValueChange={setSelectedClassName}>
                        <SelectTrigger className="w-full"><SelectValue placeholder="All sessions" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={null}>All sessions</SelectItem>
                          {classes.map(cls => <SelectItem key={cls.id} value={cls.class_name}>{cls.class_name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="flex-1">
                    <label className="text-xs text-gray-600 font-medium mb-2 block">Filter by Type</label>
                    <Select value={selectedSessionType} onValueChange={setSelectedSessionType}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All types</SelectItem>
                        {sessionTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              {filteredSessions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-2 font-semibold text-gray-600">Time</th>
                      <th className="text-left py-3 px-2 font-semibold text-gray-600">Type</th>
                      <th className="text-left py-3 px-2 font-semibold text-gray-600">Name</th>
                      <th className="text-left py-3 px-2 font-semibold text-gray-600">Status</th>
                      <th className="text-right py-3 px-2 font-semibold text-gray-600">Actions</th>
                    </tr></thead>
                    <tbody>
                      {filteredSessions.map(session => {
                        const hasValidTime = session.scheduled_time && isValid(parseISO(session.scheduled_time));
                        return (
                          <tr key={session.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-2 text-xs">{hasValidTime ? format(parseISO(session.scheduled_time), 'HH:mm') : 'TBA'}</td>
                            <td className="py-3 px-2 font-medium text-[#232323]">{session.session_type}</td>
                            <td className="py-3 px-2">{session.name}</td>
                            <td className="py-3 px-2">
                              <Badge className={`${session.status === 'Official' || session.status === 'Locked' ? 'bg-green-100 text-green-700' : session.status === 'completed' ? 'bg-gray-100 text-gray-700' : 'bg-blue-100 text-blue-700'}`}>{session.status}</Badge>
                            </td>
                            <td className="py-3 px-2 text-right">
                              <Link to={`${createPageUrl('SessionProfile')}?id=${session.id}`}>
                                <Button variant="ghost" size="sm" className="text-xs h-7">View</Button>
                              </Link>
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
        )}

        {/* RESULTS */}
        {activeTab === 'results' && (
          <div className="space-y-6">
            <section className="bg-white border border-gray-200 rounded-lg p-8">
              <h2 className="text-2xl font-bold text-[#232323] mb-6">Results Coverage</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[['Total Sessions', sessions.length], ['Official/Locked', officialSessions.length], ['Results Rows', allResults.length], ['Coverage', `${sessions.length > 0 ? Math.round((officialSessions.length / sessions.length) * 100) : 0}%`]].map(([label, val]) => (
                  <div key={label} className="bg-gray-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-black text-[#232323]">{val}</div>
                    <div className="text-xs text-gray-600 uppercase tracking-wide mt-1">{label}</div>
                  </div>
                ))}
              </div>
              {isAdmin && (
                <Link to={`${racedayUrl}&tab=results`}>
                  <Button variant="outline">Open Results Console</Button>
                </Link>
              )}
            </section>

            {event.series_id && (
              <section className="bg-white border border-gray-200 rounded-lg p-8">
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
                        <thead><tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-2 font-semibold text-gray-600">#</th>
                          <th className="text-left py-3 px-2 font-semibold text-gray-600">Driver</th>
                          <th className="text-right py-3 px-2 font-semibold text-gray-600">Points</th>
                        </tr></thead>
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
                      {isAdmin && (
                        <Link to={`${racedayUrl}&tab=pointsAndStandings`}>
                          <Button variant="outline" size="sm">Manage Points</Button>
                        </Link>
                      )}
                    </div>
                  </>
                )}
              </section>
            )}

            <section className="bg-white border border-gray-200 rounded-lg p-8">
              <PublicMediaGallery targetType="event_recap" targetEntityId={event?.id} title="Media" />
            </section>

            <div className="bg-white border border-gray-200 rounded-lg p-8">
              <h2 className="text-2xl font-bold text-[#232323] mb-6">Official Results & Standings</h2>
              <ResultsPanel eventId={event?.id} seriesName={event.series} />
            </div>
          </div>
        )}

        <ProfileClaimFooter entityType="Event" entityId={event?.id} entityName={event.name} />
      </div>
    </PageShell>
  );
}