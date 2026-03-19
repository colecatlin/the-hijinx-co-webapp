import React, { useState, useMemo, useEffect, createContext, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import SeoMeta, { buildEntityTitle, SITE_FALLBACK_IMAGE } from '@/components/system/seoMeta';
import Analytics from '@/components/system/analyticsTracker';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { QueryKeys } from '@/components/utils/queryKeys';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';
import { isPublicVisible } from '@/components/core/publishModel';
import { getDriverProfileData } from '@/components/entities/publicPageDataApi';
import PageShell from '@/components/shared/PageShell';
import { EntityNotFound, EntityUnavailable } from '@/components/data/EntityNotFoundState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { MapPin, ExternalLink, TrendingUp, Camera, Calendar, Share2, Home, GitCompare, Flag, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import CareerStatusTag from '@/components/competition/CareerStatusTag';
import CompetitionLevelBadge from '@/components/competition/CompetitionLevelBadge';
import GeographicScopeTag from '@/components/competition/GeographicScopeTag';
import StatsSection from '@/components/drivers/StatsSection';
import { format, isValid } from 'date-fns';
import SocialIconsDisplay from '@/components/teams/SocialIconsDisplay';
import SocialShareButtons from '@/components/shared/SocialShareButtons';
import CountryFlag from '@/components/shared/CountryFlag';
import { createPageUrl } from '@/components/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import ScheduleSection from '@/components/schedule/ScheduleSection';
import FollowDriverButton from '@/components/drivers/FollowDriverButton';
import ClaimEntityButton from '@/components/onboarding/ClaimEntityButton';
import ResultsPanel from '@/components/results/ResultsPanel';
import ProgramsTimeline from '@/components/drivers/ProgramsTimeline';
import PublicMediaGallery from '@/components/media/PublicMediaGallery';

const DQ = applyDefaultQueryOptions();

// Context used to pass the route :slug param into DriverProfile
// when rendered via the /drivers/:slug route
export const DriverRouteContext = createContext(null);

/**
 * Wrapper used by the /drivers/:slug route.
 * Injects the canonical slug from React Router into DriverProfile.
 */
export function DriverProfileRouteWrapper() {
  const { slug } = useParams();
  return (
    <DriverRouteContext.Provider value={{ slug }}>
      <DriverProfile />
    </DriverRouteContext.Provider>
  );
}

function safeDateFormat(dateStr, fmt = 'MMM d, yyyy') {
  if (!dateStr) return 'TBA';
  const d = new Date(dateStr);
  return isValid(d) ? format(d, fmt) : 'TBA';
}

export default function DriverProfile() {
  // Support both new canonical route (/drivers/:slug via React Router params)
  // and legacy query-param routes (?slug=... or ?id=...)
  const { slug: routeSlug } = useContext(DriverRouteContext) || {};
  const urlParams = new URLSearchParams(window.location.search);

  // Canonical slug: prefer route param, then ?slug query param
  const canonicalSlug = routeSlug || urlParams.get('slug') || null;
  // Legacy id fallback only — used when no slug is available
  const legacyId = (!canonicalSlug && urlParams.get('id')) ? urlParams.get('id').trim() || null : null;
  // driverSlug is what we pass to the resolver
  const driverSlug = canonicalSlug ? canonicalSlug.trim() || null : legacyId;

  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('overview');
  const [showCompareDialog, setShowCompareDialog] = useState(false);
  const [compareDriverId, setCompareDriverId] = useState('');

  React.useEffect(() => {
    window.scrollTo(0, 0);
    setActiveSection('overview');
  }, [driverSlug]);

  const { data: isAuthenticated } = useQuery({
    queryKey: QueryKeys.auth.status(),
    queryFn: () => base44.auth.isAuthenticated(),
    ...DQ,
  });

  const { data: user } = useQuery({
    queryKey: QueryKeys.auth.me(),
    queryFn: () => base44.auth.me(),
    enabled: !!isAuthenticated,
    ...DQ,
  });

  // Single consolidated data loader
  // - canonicalSlug  → preferred: resolves by canonical_slug field
  // - legacyId       → fallback: resolves by record id (legacy links only)
  const { data: profileData, isLoading } = useQuery({
    queryKey: QueryKeys.profiles.driver(driverSlug),
    queryFn: () => getDriverProfileData({
      slug: canonicalSlug || undefined,
      id: legacyId || undefined,
    }),
    enabled: !!driverSlug,
    ...DQ,
  });

  // Separate driver list query for the compare dialog only — only load when viewing a valid profile
  const { data: allDrivers = [] } = useQuery({
    queryKey: QueryKeys.drivers.list(),
    queryFn: () => base44.entities.Driver.list(),
    enabled: !!driverSlug,
    ...DQ,
  });

  const driver   = profileData?.driver   ?? null;
  const media    = profileData?.media    ?? null;
  const programs = profileData?.programs ?? [];
  const entries  = profileData?.entries  ?? [];
  const results  = profileData?.results  ?? [];
  const sessions = profileData?.sessions ?? [];
  const allSeries= profileData?.series   ?? [];
  const allClasses= profileData?.classes ?? [];
  const driverTeam= profileData?.team    ?? null;

  // If we resolved by legacy id and the driver has a canonical_slug, redirect to canonical route
  useEffect(() => {
    if (driver && legacyId && driver.canonical_slug) {
      navigate(`/drivers/${encodeURIComponent(driver.canonical_slug)}`, { replace: true });
    }
  }, [driver?.id, legacyId, driver?.canonical_slug]);

  // Track analytics on load
  useEffect(() => {
    if (driver) {
      Analytics.profileViewDriver(driver.id, `${driver.first_name} ${driver.last_name}`, driver.primary_discipline);
    }
  }, [driver?.id]);

  // No slug or id in URL at all — redirect to directory
  if (!driverSlug) {
    return (
      <PageShell className="bg-white">
        <div className="max-w-7xl mx-auto px-6 py-12 text-center">
          <p className="text-gray-500 mb-4">No driver specified.</p>
          <a href="/DriverDirectory" className="text-sm text-[#232323] underline">← Back to Drivers</a>
        </div>
      </PageShell>
    );
  }

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

  if (!driver) return <EntityNotFound entityType="Driver" />;

  // Unpublished drivers are visible to admin only
  if (driver.profile_status === 'draft' && user?.role !== 'admin') {
    return <EntityUnavailable entityType="Driver" />;
  }

  const getSeriesName = (seriesId) => allSeries.find(s => s.id === seriesId)?.name || 'N/A';

  const driverSeriesList = programs
    .map(p => allSeries.find(s => s.id === p.series_id))
    .filter(Boolean)
    .filter((s, i, arr) => arr.findIndex(x => x.id === s.id) === i)
    .sort((a, b) => (a.popularity_rank ?? 9999) - (b.popularity_rank ?? 9999));

  const sections = [
    { id: 'overview', label: 'Event Participation', icon: Calendar },
    { id: 'programs', label: 'Programs', icon: Flag },
    { id: 'stats', label: 'Stats', icon: TrendingUp },
    { id: 'results', label: 'Results', icon: Flag },
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'social', label: 'Social Media', icon: Share2 },
  ];

  const handleCalendarCreated = async (calendarId) => {
    await base44.functions.invoke('saveEntityCalendarId', {
      entityType: 'Driver', entityId: driver.id, calendarId
    });
  };

  const searchDriverPhotos = async () => {
    try {
      const response = await base44.functions.invoke('searchDriverPhotos', {
        firstName: driver.first_name,
        lastName: driver.last_name
      });
      return response.data?.images || [];
    } catch {
      return [];
    }
  };

  // Official results: sessions with Official or Locked status
  const officialResults = useMemo(() => {
    const officialSessionIds = new Set(
      sessions.filter(s => ['Official', 'Locked'].includes(s.status)).map(s => s.id)
    );
    return results.filter(r => officialSessionIds.has(r.session_id)).slice(0, 10);
  }, [results, sessions]);

  // Events for entry display
  const allEvents = useMemo(() => {
    const eventIds = [...new Set(entries.map(e => e.event_id).filter(Boolean))];
    return eventIds; // events are loaded via profile data
  }, [entries]);

  // We need events + tracks for entry display — load them separately since
  // getDriverProfileData doesn't load all events/tracks (avoids over-fetching)
  const { data: eventsForEntries = [] } = useQuery({
    queryKey: QueryKeys.events.list({ _driver: driver?.id }),
    queryFn: () => base44.entities.Event.list(),
    enabled: entries.length > 0,
    ...DQ,
  });
  const { data: tracksForEntries = [] } = useQuery({
    queryKey: QueryKeys.tracks.list(),
    queryFn: () => base44.entities.Track.list(),
    enabled: entries.length > 0,
    ...DQ,
  });

  const upcomingEntries = entries
    .filter(entry => {
      const event = eventsForEntries.find(e => e.id === entry.event_id);
      return event && isPublicVisible('Event', event);
    })
    .map(entry => {
      const event = eventsForEntries.find(e => e.id === entry.event_id);
      const track = tracksForEntries.find(t => t.id === event?.track_id);
      return { entry, event, track };
    });

  const pastEntries = entries
    .filter(entry => {
      const event = eventsForEntries.find(e => e.id === entry.event_id);
      return event && event.status === 'completed' && isPublicVisible('Event', event);
    })
    .map(entry => {
      const event = eventsForEntries.find(e => e.id === entry.event_id);
      const track = tracksForEntries.find(t => t.id === event?.track_id);
      const officialSession = sessions.find(s => s.event_id === event?.id && ['Official', 'Locked'].includes(s.status));
      const resultData = officialSession ? results.find(r => r.session_id === officialSession.id && r.driver_id === driver.id) : null;
      return { entry, event, track, resultData };
    });

  const driverImg = media?.headshot_url || media?.hero_image_url || SITE_FALLBACK_IMAGE;
  const driverDesc = [
    driver.career_status ? `${driver.career_status} driver` : 'Racing driver',
    driver.primary_discipline || '',
    driver.hometown_city ? `from ${driver.hometown_city}, ${driver.hometown_country || ''}` : '',
  ].filter(Boolean).join(' · ');

  return (
    <PageShell className="bg-white">
      <SeoMeta
        title={buildEntityTitle(`${driver.first_name} ${driver.last_name}`, 'Driver Profile')}
        description={driverDesc}
        image={driverImg}
        type="profile"
      />
      <div className="max-w-7xl mx-auto px-6 pt-4">
        <Link to={createPageUrl('DriverDirectory')} className="text-sm text-gray-600 hover:text-[#00FFDA]">
          ← Back to Drivers
        </Link>
      </div>

      {media?.hero_image_url && (
        <div className="max-w-7xl mx-auto px-6 mt-3">
          <div className="h-[400px] relative overflow-hidden rounded-lg">
            <img
              src={media.hero_image_url}
              alt={`${driver.first_name} ${driver.last_name}`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-2">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6 items-start">
          <div className="lg:col-span-2">
            <Separator className="mb-3" />
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3 flex-wrap">
                <CountryFlag country={driver.hometown_country} />
                <div className="flex items-baseline gap-2">
                  <h1 className="text-4xl font-black text-[#232323] leading-none">{driver.first_name} {driver.last_name}</h1>
                  {driver.primary_number && (
                    <div className="text-4xl font-black text-[#232323] leading-none">#{driver.primary_number}</div>
                  )}
                </div>
                {driver.career_status && <CareerStatusTag status={driver.career_status} size="md" />}
              </div>
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

            <div className="flex justify-center mb-4">
              <SocialIconsDisplay media={media} />
            </div>

            <Separator className="mb-3" />

            {(driverTeam || driver.manufacturer) && (
              <div className="flex flex-wrap gap-6 mb-4 px-1">
                {driverTeam && (
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Team</div>
                    <Link
                      to={`${createPageUrl('TeamProfile')}?id=${driverTeam.id}`}
                      className="text-2xl font-black text-[#232323] hover:text-[#00FFDA] transition-colors"
                    >
                      {driverTeam.name}
                    </Link>
                  </div>
                )}
                {driver.manufacturer && (
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Manufacturer</div>
                    <div className="text-2xl font-black text-[#232323]">{driver.manufacturer}</div>
                  </div>
                )}
              </div>
            )}

            <Separator className="mb-3" />
            <div className="bg-white p-8 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-sm text-gray-600 mb-1">Age</div>
                  <div className="text-lg font-semibold text-[#232323] mb-4">
                    {driver.date_of_birth ? new Date().getFullYear() - new Date(driver.date_of_birth).getFullYear() : 'N/A'}
                  </div>

                  {driverSeriesList.length > 0 && (
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Series</div>
                      <div className="flex flex-col gap-1">
                        {driverSeriesList.map(s => (
                          <div key={s.id} className="text-lg font-semibold text-[#232323] leading-tight">
                            {s.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {(() => {
                    const activeProgram = programs.find(p => p.status === 'active') || programs[0];
                    const primaryClass = (driver.primary_class_id
                      ? allClasses.find(c => c.id === driver.primary_class_id)
                      : null) || (activeProgram?.series_class_id
                      ? allClasses.find(c => c.id === activeProgram.series_class_id)
                      : null);
                    const className = primaryClass?.class_name || activeProgram?.class_name;
                    const isRookie = activeProgram?.is_rookie;
                    if (!className && !isRookie) return null;
                    return (
                      <div className="mt-3">
                        <div className="text-sm text-gray-600 mb-1">Class</div>
                        <div className="flex flex-wrap items-center gap-2">
                          {className && <span className="text-sm font-semibold text-[#232323]">{className}</span>}
                          {isRookie && (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-yellow-400 text-black font-black text-xs leading-none">R</span>
                          )}
                          {primaryClass?.competition_level && <CompetitionLevelBadge level={primaryClass.competition_level} size="sm" />}
                          {primaryClass?.geographic_scope && <GeographicScopeTag scope={primaryClass.geographic_scope} size="sm" />}
                        </div>
                      </div>
                    );
                  })()}
                </div>
                <div>
                  {(driver.hometown_city || driver.hometown_country) && (
                    <>
                      <div className="flex items-center gap-1 text-sm text-gray-600 mb-1">
                        <Home className="w-4 h-4" />
                        Hometown
                      </div>
                      <div className="flex items-center gap-2 mb-4">
                        <CountryFlag country={driver.hometown_country} />
                        <div className="text-lg font-semibold text-[#232323]">
                          {[driver.hometown_city, driver.hometown_state, driver.hometown_country].filter(Boolean).join(', ')}
                        </div>
                      </div>
                    </>
                  )}
                  {(driver.racing_base_city || driver.racing_base_state || driver.racing_base_country) && (
                    <div>
                      <div className="flex items-center gap-1 text-sm text-gray-600 mb-1">
                        <MapPin className="w-4 h-4" />
                        Racing Base
                      </div>
                      <div className="text-lg font-semibold text-[#232323]">
                        {[driver.racing_base_city, driver.racing_base_state, driver.racing_base_country].filter(Boolean).join(', ')}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <FollowDriverButton driverId={driver?.id} />
              <ClaimEntityButton entityType="Driver" entityId={driver?.id} entityName={`${driver.first_name} ${driver.last_name}`} />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCompareDialog(true)}
              >
                <GitCompare className="w-4 h-4 mr-2" />
                Compare Driver
              </Button>
              <SocialShareButtons
                url={window.location.href}
                title={`${driver.first_name} ${driver.last_name} - Driver Profile`}
                description=""
              />
            </div>
            {media?.headshot_url && (
              <div className="bg-white">
                <div className="w-full h-[480px] relative bg-gray-50 overflow-hidden">
                  <img src={media.headshot_url} alt={`${driver.first_name} ${driver.last_name}`} className="w-full h-full object-cover" />
                </div>
              </div>
            )}

            {!media?.headshot_url && (
              <div className="bg-white p-6">
                <Button
                  onClick={searchDriverPhotos}
                  className="w-full bg-[#232323] hover:bg-[#1A3249]"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Search for Driver Photos
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <section id="section-overview" className="bg-white p-8">
            <Separator className="mb-3" />
            <h2 className="text-2xl font-bold text-[#232323] mb-6 mt-3">Event Participation</h2>

            {entries.length === 0 ? (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 text-gray-600">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p>This driver has no registered events.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {upcomingEntries.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-[#232323] mb-4">Upcoming Events</h3>
                    <div className="space-y-3">
                      {upcomingEntries.map(({ entry, event, track }) => event && (
                        <Link
                          key={entry.id}
                          to={`${createPageUrl('EventProfile')}?id=${event.id}`}
                          className="block p-4 border border-gray-200 rounded-lg hover:border-[#00FFDA] hover:shadow-md transition-all"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-[#232323]">{event.name}</h4>
                                {event.status === 'Live' && (
                                  <Badge className="bg-red-500 text-white text-xs">Live</Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-600">
                                {track?.name || 'N/A'} • {safeDateFormat(event.event_date)}
                              </p>
                            </div>
                            <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline" className="text-xs">
                              {entry.entry_status || 'Registered'}
                            </Badge>
                            {entry.payment_status === 'Unpaid' && (
                              <Badge className="bg-orange-100 text-orange-800 text-xs">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Payment Pending
                              </Badge>
                            )}
                            {entry.payment_status === 'Paid' && (
                              <Badge className="bg-green-100 text-green-800 text-xs">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Paid
                              </Badge>
                            )}
                            {entry.tech_status && entry.tech_status !== 'Not Inspected' && (
                              <Badge variant="outline" className="text-xs">
                                Tech: {entry.tech_status}
                              </Badge>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {pastEntries.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-[#232323] mb-4">Past Events</h3>
                    <div className="space-y-3">
                      {pastEntries.map(({ entry, event, track, resultData }) => event && (
                        <Link
                          key={entry.id}
                          to={`${createPageUrl('EventResults')}?eventId=${event.id}`}
                          className="block p-4 border border-gray-200 rounded-lg hover:border-[#00FFDA] hover:shadow-md transition-all"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h4 className="font-semibold text-[#232323]">{event.name}</h4>
                              <p className="text-sm text-gray-600">
                                {track?.name || 'N/A'} • {safeDateFormat(event.event_date)}
                              </p>
                            </div>
                            <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          </div>
                          {resultData?.position && (
                            <div className="flex items-center gap-2">
                              <Badge className="bg-blue-100 text-blue-800 text-xs">
                                Finished P{resultData.position}
                              </Badge>
                            </div>
                          )}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          <section id="section-programs" className="bg-white p-8">
            <Separator className="mb-3" />
            <h2 className="text-2xl font-bold text-[#232323] mb-6 mt-3">Racing Programs</h2>
            <ProgramsTimeline programs={programs} teams={driverTeam ? [driverTeam] : []} allSeries={allSeries} allClasses={allClasses} />
          </section>

          <section id="section-stats" className="bg-white p-8">
            <Separator className="mb-3" />
            <h2 className="text-2xl font-bold text-[#232323] mb-6 mt-3">Stats</h2>
            <StatsSection
              driver={driver}
              results={results}
              sessions={sessions}
              events={eventsForEntries}
            />
          </section>

          <section id="section-results" className="bg-white p-8">
            <Separator className="mb-3" />
            <h2 className="text-2xl font-bold text-[#232323] mb-6 mt-3">Recent Official Results</h2>
            {officialResults.length === 0 ? (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 text-gray-600">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p>No official results yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-2 font-semibold text-gray-600">Event</th>
                      <th className="text-left py-3 px-2 font-semibold text-gray-600">Session</th>
                      <th className="text-left py-3 px-2 font-semibold text-gray-600">Finish</th>
                      <th className="text-right py-3 px-2 font-semibold text-gray-600">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {officialResults.map((result) => {
                      const session = sessions.find(s => s.id === result.session_id);
                      const event = eventsForEntries.find(e => e.id === session?.event_id);
                      return (
                        <tr key={result.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-2">
                            {event ? (
                              <Link to={`${createPageUrl('EventProfile')}?id=${event.id}`} className="font-medium text-[#0A0A0A] hover:underline">
                                {event.name}
                              </Link>
                            ) : '—'}
                          </td>
                          <td className="py-3 px-2 text-gray-600">{session?.name || '—'}</td>
                          <td className="py-3 px-2 font-semibold">{result.position ? `P${result.position}` : '—'}</td>
                          <td className="py-3 px-2 text-right font-semibold">{result.points ?? '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section id="section-standings" className="bg-white p-8">
            <Separator className="mb-3" />
            <h2 className="text-2xl font-bold text-[#232323] mb-6 mt-3">Standings & Rankings</h2>
            <ResultsPanel driverId={driver.id} />
          </section>

          <section id="section-schedule" className="bg-white p-8">
            <Separator className="mb-3" />
            <h2 className="text-2xl font-bold text-[#232323] mb-6 mt-3">Race Schedule</h2>
            <ScheduleSection
              entityType="Driver"
              entityId={driver.id}
              entityName={`${driver.first_name} ${driver.last_name}`}
              calendarId={driver.calendar_id}
              onCalendarCreated={handleCalendarCreated}
              isOwner={user?.role === 'admin'}
            />
          </section>

          <section className="bg-white p-8">
            <Separator className="mb-3" />
            <PublicMediaGallery
              targetType="driver_gallery"
              targetEntityId={driver?.id}
              title="Media"
            />
          </section>

          <section id="section-social" className="bg-white p-8">
            <Separator className="mb-3" />
            <h2 className="text-2xl font-bold text-[#232323] mb-6 mt-3">Social Media</h2>
            {media && (media.instagram || media.facebook || media.tiktok || media.x || media.threads || media.youtube || media.website) ? (
              <div className="flex flex-col items-center gap-6">
                <div className="flex justify-center">
                  <SocialIconsDisplay media={media} />
                </div>
                <div className="text-sm text-gray-600 text-center">
                  Connect with {driver.first_name} on social media
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No social media information available.</p>
            )}
          </section>
        </div>
      </div>

      <Dialog open={showCompareDialog} onOpenChange={setShowCompareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Compare with Another Driver</DialogTitle>
            <DialogDescription>
              Select a driver to compare with {driver.first_name} {driver.last_name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={compareDriverId} onValueChange={setCompareDriverId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a driver to compare" />
              </SelectTrigger>
              <SelectContent>
                {allDrivers.filter(d => d.id !== driver.id).map(d => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.first_name} {d.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowCompareDialog(false)}>
              Cancel
            </Button>
            <Button
              disabled={!compareDriverId}
              onClick={() => {
                if (compareDriverId) {
                  navigate(`${createPageUrl('DriverComparison')}?driver1=${driver.id}&driver2=${compareDriverId}`);
                }
              }}
            >
              Compare
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}