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
import {
  MapPin, ExternalLink, TrendingUp, Camera, Calendar, Share2, Home,
  GitCompare, Flag, AlertCircle, CheckCircle, AlertTriangle, Globe,
  Instagram, Youtube, User, Trophy
} from 'lucide-react';
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
import DriverCareerTab from '@/components/drivers/DriverCareerTab';
import DriverSponsorsTab from '@/components/drivers/DriverSponsorsTab';
import DriverScorePlaceholder from '@/components/drivers/DriverScorePlaceholder';

const DQ = applyDefaultQueryOptions();

export const DriverRouteContext = createContext(null);

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

function StatPill({ label, value }) {
  if (value == null || value === '') return null;
  return (
    <div className="text-center">
      <div className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">{label}</div>
      <div className="font-bold text-[#232323] text-sm">{value}</div>
    </div>
  );
}

function SocialLink({ href, icon: Icon, label }) {
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:border-[#232323] hover:text-[#232323] transition-all">
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="truncate">{label}</span>
    </a>
  );
}

const TABS = [
  { id: 'overview',  label: 'Overview' },
  { id: 'career',    label: 'Career' },
  { id: 'schedule',  label: 'Schedule & Results' },
  { id: 'insights',  label: 'Insights' },
  { id: 'media',     label: 'Media' },
  { id: 'sponsors',  label: 'Sponsors' },
  { id: 'claims',    label: 'Claims' },
];

export default function DriverProfile() {
  const { slug: routeSlug } = useContext(DriverRouteContext) || {};
  const urlParams = new URLSearchParams(window.location.search);
  const canonicalSlug = routeSlug || urlParams.get('slug') || null;
  const legacyId = (!canonicalSlug && urlParams.get('id')) ? urlParams.get('id').trim() || null : null;
  const driverSlug = canonicalSlug ? canonicalSlug.trim() || null : legacyId;

  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [showCompareDialog, setShowCompareDialog] = useState(false);
  const [compareDriverId, setCompareDriverId] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
    setActiveTab('overview');
  }, [driverSlug]);

  const { data: isAuthenticated } = useQuery({ queryKey: QueryKeys.auth.status(), queryFn: () => base44.auth.isAuthenticated(), ...DQ });
  const { data: user } = useQuery({ queryKey: QueryKeys.auth.me(), queryFn: () => base44.auth.me(), enabled: !!isAuthenticated, ...DQ });

  const { data: profileData, isLoading } = useQuery({
    queryKey: QueryKeys.profiles.driver(driverSlug),
    queryFn: () => getDriverProfileData({ slug: canonicalSlug || undefined, id: legacyId || undefined }),
    enabled: !!driverSlug,
    ...DQ,
  });

  const { data: allDrivers = [] } = useQuery({
    queryKey: QueryKeys.drivers.list(),
    queryFn: () => base44.entities.Driver.list(),
    enabled: !!driverSlug,
    ...DQ,
  });

  const driver       = profileData?.driver        ?? null;
  const media        = profileData?.media         ?? null;
  const programs     = profileData?.programs      ?? [];
  const entries      = profileData?.entries       ?? [];
  const results      = profileData?.results       ?? [];
  const sessions     = profileData?.sessions      ?? [];
  const allSeries    = profileData?.series        ?? [];
  const allClasses   = profileData?.classes       ?? [];
  const driverTeam   = profileData?.team          ?? null;
  const careerEntries= profileData?.careerEntries ?? [];
  const sponsors     = profileData?.sponsors      ?? [];

  useEffect(() => {
    if (driver && legacyId && driver.canonical_slug) {
      navigate(`/drivers/${encodeURIComponent(driver.canonical_slug)}`, { replace: true });
    }
  }, [driver?.id, legacyId, driver?.canonical_slug]);

  useEffect(() => {
    if (driver) Analytics.profileViewDriver(driver.id, `${driver.first_name} ${driver.last_name}`, driver.primary_discipline);
  }, [driver?.id]);

  const officialResults = useMemo(() => {
    const officialSessionIds = new Set(sessions.filter(s => ['Official', 'Locked'].includes(s.status)).map(s => s.id));
    return results.filter(r => officialSessionIds.has(r.session_id)).slice(0, 10);
  }, [results, sessions]);

  const { data: eventsForEntries = [] } = useQuery({
    queryKey: QueryKeys.events.list({ _driver: driver?.id }),
    queryFn: () => base44.entities.Event.list(),
    enabled: !!driver?.id && entries.length > 0,
    ...DQ,
  });
  const { data: tracksForEntries = [] } = useQuery({
    queryKey: QueryKeys.tracks.list(),
    queryFn: () => base44.entities.Track.list(),
    enabled: !!driver?.id && entries.length > 0,
    ...DQ,
  });

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
        <Skeleton className="w-full h-[360px]" />
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
        </div>
      </PageShell>
    );
  }

  if (!driver) return <EntityNotFound entityType="Driver" />;
  if (driver.profile_status === 'draft' && user?.role !== 'admin') return <EntityUnavailable entityType="Driver" />;

  const fullName = `${driver.first_name} ${driver.last_name}`;
  const hometown = [driver.hometown_city, driver.hometown_state, driver.hometown_country].filter(Boolean).join(', ');
  const racingBase = [driver.racing_base_city, driver.racing_base_state, driver.racing_base_country].filter(Boolean).join(', ');
  const heroImg = driver.hero_image_url || media?.hero_image_url || null;
  const profileImg = driver.profile_image_url || media?.headshot_url || null;
  const driverDesc = [driver.career_status ? `${driver.career_status} driver` : 'Racing driver', driver.primary_discipline, hometown ? `from ${hometown}` : ''].filter(Boolean).join(' · ');

  const driverSeriesList = programs
    .map(p => allSeries.find(s => s.id === p.series_id))
    .filter(Boolean)
    .filter((s, i, arr) => arr.findIndex(x => x.id === s.id) === i)
    .sort((a, b) => (a.popularity_rank ?? 9999) - (b.popularity_rank ?? 9999));

  const activeProgram = programs.find(p => p.status === 'active') || programs[0];
  const primaryClass = (driver.primary_class_id ? allClasses.find(c => c.id === driver.primary_class_id) : null)
    || (activeProgram?.series_class_id ? allClasses.find(c => c.id === activeProgram.series_class_id) : null);
  const className = primaryClass?.class_name || activeProgram?.class_name;

  const upcomingEntries = entries
    .filter(entry => { const event = eventsForEntries.find(e => e.id === entry.event_id); return event && isPublicVisible('Event', event); })
    .map(entry => { const event = eventsForEntries.find(e => e.id === entry.event_id); const track = tracksForEntries.find(t => t.id === event?.track_id); return { entry, event, track }; });

  const pastEntries = entries
    .filter(entry => { const event = eventsForEntries.find(e => e.id === entry.event_id); return event && event.status === 'completed' && isPublicVisible('Event', event); })
    .map(entry => {
      const event = eventsForEntries.find(e => e.id === entry.event_id);
      const track = tracksForEntries.find(t => t.id === event?.track_id);
      const officialSession = sessions.find(s => s.event_id === event?.id && ['Official', 'Locked'].includes(s.status));
      const resultData = officialSession ? results.find(r => r.session_id === officialSession.id && r.driver_id === driver.id) : null;
      return { entry, event, track, resultData };
    });

  const hasSocials = driver.website_url || driver.instagram_url || driver.facebook_url || driver.tiktok_url || driver.x_url || driver.youtube_url
    || media?.instagram || media?.facebook || media?.tiktok || media?.x || media?.youtube || media?.website;

  const yearsLabel = driver.years_active_start
    ? `${driver.years_active_start} – ${driver.years_active_end || 'Present'}`
    : null;

  const handleCalendarCreated = async (calendarId) => {
    await base44.functions.invoke('saveEntityCalendarId', { entityType: 'Driver', entityId: driver.id, calendarId });
  };

  const searchDriverPhotos = async () => {
    try {
      const response = await base44.functions.invoke('searchDriverPhotos', { firstName: driver.first_name, lastName: driver.last_name });
      return response.data?.images || [];
    } catch { return []; }
  };

  return (
    <PageShell className="bg-white">
      <SeoMeta
        title={buildEntityTitle(fullName, 'Driver Profile')}
        description={driverDesc}
        image={heroImg || profileImg || SITE_FALLBACK_IMAGE}
        type="profile"
      />

      {/* ── HERO ─────────────────────────────────────────── */}
      <div className="relative w-full h-[380px] bg-[#0A0A0A] overflow-hidden">
        {heroImg ? (
          <>
            <img src={heroImg} alt={fullName} className="w-full h-full object-cover opacity-60" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/40 to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] to-[#0A0A0A]" />
        )}

        <div className="absolute bottom-0 left-0 right-0 max-w-7xl mx-auto px-6 pb-8">
          <div className="flex items-end gap-5">
            {/* Portrait */}
            <div className="flex-shrink-0 hidden sm:block">
              {profileImg ? (
                <img src={profileImg} alt={fullName} className="w-28 h-28 rounded-xl object-cover border-2 border-white/20 shadow-xl" />
              ) : (
                <div className="w-28 h-28 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
                  <User className="w-10 h-10 text-white/40" />
                </div>
              )}
            </div>

            {/* Identity */}
            <div className="flex-1 pb-1">
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <CountryFlag country={driver.hometown_country} />
                {driver.career_status && <CareerStatusTag status={driver.career_status} size="sm" />}
                {driver.status && driver.status !== 'Active' && (
                  <Badge className="bg-white/10 text-white/70 border border-white/20 text-xs">{driver.status}</Badge>
                )}
              </div>
              <div className="flex items-baseline gap-3 flex-wrap">
                <h1 className="text-4xl md:text-5xl font-black text-white leading-none">{fullName}</h1>
                {driver.primary_number && (
                  <span className="text-3xl font-black text-[#00FFDA] leading-none">#{driver.primary_number}</span>
                )}
              </div>
              {driver.tagline && (
                <p className="text-white/60 mt-1.5 text-sm italic max-w-lg">{driver.tagline}</p>
              )}
              <div className="flex flex-wrap gap-4 mt-3 text-sm text-white/60">
                {driver.primary_discipline && <span>{driver.primary_discipline}</span>}
                {hometown && <span className="flex items-center gap-1"><Home className="w-3 h-3" />{hometown}</span>}
                {driverTeam && (
                  <Link to={`${createPageUrl('TeamProfile')}?id=${driverTeam.id}`} className="hover:text-[#00FFDA] transition-colors font-medium text-white/80">
                    {driverTeam.name}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── QUICK IDENTITY BAR ──────────────────────────── */}
      <div className="bg-[#131313] border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-3 flex flex-wrap items-center gap-6 text-xs text-white/50">
          {yearsLabel && <StatPill label="Active" value={<span className="text-white/80">{yearsLabel}</span>} />}
          {driver.manufacturer && <StatPill label="Manufacturer" value={<span className="text-white/80">{driver.manufacturer}</span>} />}
          {driverSeriesList.length > 0 && <StatPill label="Series" value={<span className="text-white/80">{driverSeriesList.map(s => s.name).join(', ')}</span>} />}
          {className && <StatPill label="Class" value={<span className="text-white/80">{className}</span>} />}
          {driver.represented_by && <StatPill label="Represented By" value={<span className="text-white/80">{driver.represented_by}</span>} />}
          {driver.nicknames?.length > 0 && <StatPill label="Known As" value={<span className="text-white/80 italic">"{driver.nicknames.join('", "')}"</span>} />}
          {racingBase && <StatPill label="Racing Base" value={<span className="text-white/80">{racingBase}</span>} />}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6">
        {/* ── ACTION ROW ─────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2 pt-4 pb-2">
          <Link to={createPageUrl('DriverDirectory')} className="text-xs text-gray-400 hover:text-[#232323] mr-2">← Drivers</Link>
          <FollowDriverButton driverId={driver?.id} />
          <ClaimEntityButton entityType="Driver" entityId={driver?.id} entityName={fullName} />
          <Button variant="outline" size="sm" onClick={() => setShowCompareDialog(true)}>
            <GitCompare className="w-4 h-4 mr-1.5" />Compare
          </Button>
          <SocialShareButtons url={window.location.href} title={`${fullName} - Driver Profile`} description="" />
        </div>

        {/* ── TAB NAV ────────────────────────────────────── */}
        <div className="flex gap-1 overflow-x-auto border-b border-gray-200 mt-2 mb-6 scrollbar-hide">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-xs font-semibold whitespace-nowrap transition-colors flex-shrink-0 ${
                activeTab === tab.id
                  ? 'text-[#232323] border-b-2 border-[#00FFDA] -mb-px'
                  : 'text-gray-400 hover:text-[#232323]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ───────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
            <div className="lg:col-span-2 space-y-8">
              {/* Bio */}
              {(driver.bio || driver.tagline || hometown || racingBase || yearsLabel || driver.primary_discipline) && (
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">About</h2>
                  {driver.bio && (
                    <p className="text-gray-700 leading-relaxed mb-4">{driver.bio}</p>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {hometown && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1"><Home className="w-3 h-3" /> Hometown</div>
                        <div className="font-semibold text-[#232323] text-sm">{hometown}</div>
                      </div>
                    )}
                    {racingBase && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> Racing Base</div>
                        <div className="font-semibold text-[#232323] text-sm">{racingBase}</div>
                      </div>
                    )}
                    {driver.primary_discipline && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Discipline</div>
                        <div className="font-semibold text-[#232323] text-sm">{driver.primary_discipline}</div>
                      </div>
                    )}
                    {yearsLabel && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Years Active</div>
                        <div className="font-semibold text-[#232323] text-sm">{yearsLabel}</div>
                      </div>
                    )}
                    {driver.date_of_birth && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Age</div>
                        <div className="font-semibold text-[#232323] text-sm">
                          {new Date().getFullYear() - new Date(driver.date_of_birth).getFullYear()}
                        </div>
                      </div>
                    )}
                    {driver.manufacturer && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Manufacturer</div>
                        <div className="font-semibold text-[#232323] text-sm">{driver.manufacturer}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Stats */}
              <div>
                <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Performance Stats</h2>
                <StatsSection driver={driver} results={results} sessions={sessions} events={eventsForEntries} />
              </div>

              {/* Programs timeline preview */}
              {programs.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">Racing Programs</h2>
                    <button onClick={() => setActiveTab('career')} className="text-xs text-gray-400 hover:text-[#232323] underline">View full career →</button>
                  </div>
                  <ProgramsTimeline programs={programs} teams={driverTeam ? [driverTeam] : []} allSeries={allSeries} allClasses={allClasses} />
                </div>
              )}

              {/* Score placeholder */}
              <DriverScorePlaceholder />
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Profile image / portrait */}
              {profileImg ? (
                <div className="overflow-hidden rounded-xl border border-gray-100 shadow-sm">
                  <img src={profileImg} alt={fullName} className="w-full object-cover max-h-[360px]" />
                </div>
              ) : (
                <div className="border border-gray-100 rounded-xl p-6 bg-gray-50">
                  <Button onClick={searchDriverPhotos} className="w-full bg-[#232323] hover:bg-[#111]">
                    <Camera className="w-4 h-4 mr-2" />Search for Photos
                  </Button>
                </div>
              )}

              {/* Team & series */}
              {(driverTeam || driverSeriesList.length > 0) && (
                <div className="border border-gray-200 rounded-xl p-4 space-y-4">
                  {driverTeam && (
                    <div>
                      <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Team</div>
                      <Link to={`${createPageUrl('TeamProfile')}?id=${driverTeam.id}`} className="font-bold text-[#232323] hover:text-[#00FFDA] transition-colors">
                        {driverTeam.name}
                      </Link>
                    </div>
                  )}
                  {driverSeriesList.length > 0 && (
                    <div>
                      <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Series</div>
                      {driverSeriesList.map(s => (
                        <Link key={s.id} to={`/SeriesDetail?slug=${s.slug || s.id}`} className="block font-semibold text-[#232323] hover:underline text-sm">{s.name}</Link>
                      ))}
                    </div>
                  )}
                  {className && (
                    <div>
                      <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Class</div>
                      <span className="font-semibold text-[#232323] text-sm">{className}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Socials */}
              {hasSocials && (
                <div className="border border-gray-200 rounded-xl p-4">
                  <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-3">Connect</div>
                  <div className="space-y-2">
                    {(driver.website_url || media?.website) && (
                      <SocialLink href={driver.website_url || media?.website} icon={Globe} label="Website" />
                    )}
                    {(driver.instagram_url || media?.instagram) && (
                      <SocialLink href={driver.instagram_url || `https://instagram.com/${media?.instagram}`} icon={Instagram} label="Instagram" />
                    )}
                    {(driver.youtube_url || media?.youtube) && (
                      <SocialLink href={driver.youtube_url || media?.youtube} icon={Youtube} label="YouTube" />
                    )}
                    <SocialIconsDisplay media={media} />
                  </div>
                </div>
              )}

              {/* Upcoming events quick view */}
              {upcomingEntries.length > 0 && (
                <div className="border border-gray-200 rounded-xl p-4">
                  <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" /> Next Up
                  </div>
                  <div className="space-y-3">
                    {upcomingEntries.slice(0, 3).map(({ entry, event, track }) => event && (
                      <div key={entry.id} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                        <div className="font-semibold text-sm text-[#232323] leading-snug">{event.name}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{track?.name} · {safeDateFormat(event.event_date)}</div>
                      </div>
                    ))}
                  </div>
                  {upcomingEntries.length > 3 && (
                    <button onClick={() => setActiveTab('schedule')} className="mt-2 text-xs text-gray-400 hover:text-[#232323] underline">
                      +{upcomingEntries.length - 3} more
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── CAREER TAB ─────────────────────────────────── */}
        {activeTab === 'career' && (
          <div className="pb-12">
            <h2 className="text-2xl font-black text-[#232323] mb-6">Career History</h2>
            <DriverCareerTab driverId={driver.id} />
          </div>
        )}

        {/* ── SCHEDULE & RESULTS TAB ─────────────────────── */}
        {activeTab === 'schedule' && (
          <div className="pb-12 space-y-8">
            {/* Event participation */}
            <div>
              <h2 className="text-2xl font-black text-[#232323] mb-6">Event Participation</h2>
              {entries.length === 0 ? (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 text-gray-600">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p>No registered events found.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {upcomingEntries.length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500 mb-3">Upcoming</h3>
                      <div className="space-y-3">
                        {upcomingEntries.map(({ entry, event, track }) => event && (
                          <Link key={entry.id} to={`${createPageUrl('EventProfile')}?id=${event.id}`}
                            className="block p-4 border border-gray-200 rounded-lg hover:border-[#00FFDA] hover:shadow-sm transition-all">
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold text-[#232323]">{event.name}</h4>
                                  {event.status === 'Live' && <Badge className="bg-red-500 text-white text-xs">Live</Badge>}
                                </div>
                                <p className="text-sm text-gray-500">{track?.name || 'N/A'} · {safeDateFormat(event.event_date)}</p>
                              </div>
                              <ExternalLink className="w-4 h-4 text-gray-300 flex-shrink-0 mt-1" />
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">{entry.entry_status || 'Registered'}</Badge>
                              {entry.payment_status === 'Unpaid' && <Badge className="bg-orange-100 text-orange-800 text-xs"><AlertTriangle className="w-3 h-3 mr-1" />Payment Pending</Badge>}
                              {entry.payment_status === 'Paid' && <Badge className="bg-green-100 text-green-800 text-xs"><CheckCircle className="w-3 h-3 mr-1" />Paid</Badge>}
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                  {pastEntries.length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500 mb-3">Past Events</h3>
                      <div className="space-y-3">
                        {pastEntries.map(({ entry, event, track, resultData }) => event && (
                          <Link key={entry.id} to={`${createPageUrl('EventResults')}?eventId=${event.id}`}
                            className="block p-4 border border-gray-200 rounded-lg hover:border-[#00FFDA] hover:shadow-sm transition-all">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-semibold text-[#232323]">{event.name}</h4>
                                <p className="text-sm text-gray-500">{track?.name || 'N/A'} · {safeDateFormat(event.event_date)}</p>
                              </div>
                              <ExternalLink className="w-4 h-4 text-gray-300 flex-shrink-0 mt-1" />
                            </div>
                            {resultData?.position && (
                              <Badge className="mt-2 bg-blue-100 text-blue-800 text-xs">Finished P{resultData.position}</Badge>
                            )}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Official results table */}
            <div>
              <h2 className="text-2xl font-black text-[#232323] mb-6">Official Results</h2>
              {officialResults.length === 0 ? (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 text-gray-500">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" /><p>No official results yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        {['Event', 'Session', 'Finish', 'Pts'].map(h => (
                          <th key={h} className={`py-3 px-4 font-semibold text-gray-600 ${h === 'Pts' ? 'text-right' : 'text-left'}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {officialResults.map(result => {
                        const session = sessions.find(s => s.id === result.session_id);
                        const event = eventsForEntries.find(e => e.id === session?.event_id);
                        return (
                          <tr key={result.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4">
                              {event ? <Link to={`${createPageUrl('EventProfile')}?id=${event.id}`} className="font-medium hover:underline">{event.name}</Link> : '—'}
                            </td>
                            <td className="py-3 px-4 text-gray-500">{session?.name || '—'}</td>
                            <td className="py-3 px-4 font-semibold">{result.position ? `P${result.position}` : '—'}</td>
                            <td className="py-3 px-4 text-right font-semibold">{result.points ?? '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Standings */}
            <div>
              <h2 className="text-2xl font-black text-[#232323] mb-6">Standings & Rankings</h2>
              <ResultsPanel driverId={driver.id} />
            </div>

            {/* Schedule */}
            <div>
              <h2 className="text-2xl font-black text-[#232323] mb-6">Race Schedule</h2>
              <ScheduleSection
                entityType="Driver"
                entityId={driver.id}
                entityName={fullName}
                calendarId={driver.calendar_id}
                onCalendarCreated={handleCalendarCreated}
                isOwner={user?.role === 'admin'}
              />
            </div>
          </div>
        )}

        {/* ── INSIGHTS TAB ───────────────────────────────── */}
        {activeTab === 'insights' && (
          <div className="pb-12 space-y-8">
            <h2 className="text-2xl font-black text-[#232323] mb-2">Performance Insights</h2>
            <StatsSection driver={driver} results={results} sessions={sessions} events={eventsForEntries} />
            <DriverScorePlaceholder />
          </div>
        )}

        {/* ── MEDIA TAB ──────────────────────────────────── */}
        {activeTab === 'media' && (
          <div className="pb-12">
            <h2 className="text-2xl font-black text-[#232323] mb-6">Media</h2>
            <PublicMediaGallery targetType="driver_gallery" targetEntityId={driver?.id} title="" />
          </div>
        )}

        {/* ── SPONSORS TAB ───────────────────────────────── */}
        {activeTab === 'sponsors' && (
          <div className="pb-12">
            <h2 className="text-2xl font-black text-[#232323] mb-6">Sponsors</h2>
            <DriverSponsorsTab driverId={driver.id} />
          </div>
        )}

        {/* ── CLAIMS TAB ─────────────────────────────────── */}
        {activeTab === 'claims' && (
          <div className="pb-12">
            <h2 className="text-2xl font-black text-[#232323] mb-6">Profile Claims</h2>
            <ClaimEntityButton entityType="Driver" entityId={driver?.id} entityName={fullName} />
          </div>
        )}
      </div>

      {/* Compare dialog — unchanged */}
      <Dialog open={showCompareDialog} onOpenChange={setShowCompareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Compare with Another Driver</DialogTitle>
            <DialogDescription>Select a driver to compare with {fullName}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={compareDriverId} onValueChange={setCompareDriverId}>
              <SelectTrigger><SelectValue placeholder="Select a driver" /></SelectTrigger>
              <SelectContent>
                {allDrivers.filter(d => d.id !== driver.id).map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.first_name} {d.last_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowCompareDialog(false)}>Cancel</Button>
            <Button disabled={!compareDriverId} onClick={() => { if (compareDriverId) navigate(`${createPageUrl('DriverComparison')}?driver1=${driver.id}&driver2=${compareDriverId}`); }}>
              Compare
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}