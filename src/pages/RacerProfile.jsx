/**
 * RacerProfile.jsx
 *
 * Phase 7 — Canonical public racer profile page.
 *
 * Loads a RacerProfile by slug and renders the full profile through
 * the modern identity chain:
 *   RacerProfile → PersonIdentity → SeasonParticipation → Entry → Results → Standings
 *
 * Uses the compatibility adapter to reuse existing Driver-shaped
 * components (StatsSection, ResultsPanel, ProgramsTimeline, etc.)
 * without modification.
 *
 * Route: /racers/:slug
 */

import React, { useState, useMemo, useEffect, createContext, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import SeoMeta, { buildEntityTitle, SITE_FALLBACK_IMAGE } from '@/components/system/seoMeta';
import Analytics from '@/components/system/analyticsTracker';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';
import { getRacerProfilePageData, isRacerProfilePublic } from '@/components/racerprofile/publicRacerProfileApi';
import { racerProfileToDriverShape, getRacerProfileUrl } from '@/components/racerprofile/racerProfileAdapter';
import PageShell from '@/components/shared/PageShell';
import MobileBackHeader from '@/components/shared/MobileBackHeader';
import { EntityNotFound, EntityUnavailable } from '@/components/data/EntityNotFoundState';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  MapPin, ExternalLink, Calendar, Home,
  Globe, Instagram, User, ArrowLeft, CheckCircle,
} from 'lucide-react';
import CareerStatusTag from '@/components/competition/CareerStatusTag';
import StatsSection from '@/components/drivers/StatsSection';
import { format, isValid } from 'date-fns';
import SocialIconsDisplay from '@/components/teams/SocialIconsDisplay';
import SocialShareButtons from '@/components/shared/SocialShareButtons';
import CountryFlag from '@/components/shared/CountryFlag';
import ResultsPanel from '@/components/results/ResultsPanel';
import ProgramsTimeline from '@/components/drivers/ProgramsTimeline';
import PublicMediaGallery from '@/components/media/PublicMediaGallery';
import DriverCareerTab from '@/components/drivers/DriverCareerTab';
import DriverSponsorsTab from '@/components/drivers/DriverSponsorsTab';
import ClaimProfileButton from '@/components/identity/ClaimProfileButton';

const DQ = applyDefaultQueryOptions();

export const RacerProfileRouteContext = createContext(null);

export function RacerProfileRouteWrapper() {
  const { slug } = useParams();
  return (
    <RacerProfileRouteContext.Provider value={{ slug }}>
      <RacerProfile />
    </RacerProfileRouteContext.Provider>
  );
}

function safeDateFormat(dateStr, fmt = 'MMM d, yyyy') {
  if (!dateStr) return 'TBA';
  const d = new Date(dateStr);
  return isValid(d) ? format(d, fmt) : 'TBA';
}

const TABS = [
  { id: 'overview',  label: 'Overview' },
  { id: 'career',    label: 'Career' },
  { id: 'schedule',  label: 'Schedule & Results' },
  { id: 'media',     label: 'Media' },
  { id: 'sponsors',  label: 'Sponsors' },
];

export default function RacerProfile() {
  const { slug: routeSlug } = useContext(RacerProfileRouteContext) || {};
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    window.scrollTo(0, 0);
    setActiveTab('overview');
  }, [routeSlug]);

  const { data: isAuthenticated } = useQuery({ queryKey: ['isAuthenticated'], queryFn: () => base44.auth.isAuthenticated(), ...DQ });
  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me(), enabled: !!isAuthenticated, ...DQ });

  const { data: profileData, isLoading } = useQuery({
    queryKey: ['racerProfileData', routeSlug],
    queryFn: () => getRacerProfilePageData({ slug: routeSlug, allowDraft: user?.role === 'admin' }),
    enabled: !!routeSlug,
    ...DQ,
  });

  const racerProfile = profileData?.racerProfile ?? null;
  const identity = profileData?.identity ?? null;
  const legacyDriver = profileData?.legacyDriver ?? null;
  const media = profileData?.media ?? null;
  const careerStats = profileData?.careerStats ?? null;
  const participations = profileData?.participations ?? [];
  const entries = profileData?.entries ?? [];
  const results = profileData?.results ?? [];
  const standings = profileData?.standings ?? [];
  const programs = profileData?.programs ?? [];
  const careerEntries = profileData?.careerEntries ?? [];
  const sponsors = profileData?.sponsors ?? [];
  const allSeries = profileData?.series ?? [];
  const allClasses = profileData?.classes ?? [];
  const allEvents = profileData?.events ?? [];
  const allTracks = profileData?.tracks ?? [];
  const allSessions = profileData?.sessions ?? [];
  const allTeams = profileData?.teams ?? [];

  // Build Driver-shaped object for compatibility with existing components
  const driverShape = useMemo(
    () => racerProfile ? racerProfileToDriverShape(racerProfile, legacyDriver) : null,
    [racerProfile, legacyDriver]
  );

  useEffect(() => {
    if (racerProfile) {
      Analytics.profileViewDriver(
        racerProfile.id,
        racerProfile.display_name || '',
        racerProfile.primary_discipline || legacyDriver?.primary_discipline
      );
    }
  }, [racerProfile?.id]);

  if (!routeSlug) {
    return (
      <PageShell className="bg-white">
        <div className="max-w-7xl mx-auto px-6 py-12 text-center">
          <p className="text-gray-500 mb-4">No racer specified.</p>
          <Link to="/Directory?cat=racers" className="text-sm text-[#232323] underline">← Back to Racers</Link>
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

  if (!racerProfile) return <EntityNotFound entityType="Racer" />;
  if (!isRacerProfilePublic(racerProfile) && user?.role !== 'admin') return <EntityUnavailable entityType="Racer" />;

  const fullName = racerProfile.display_name || `${legacyDriver?.first_name || ''} ${legacyDriver?.last_name || ''}`;
  const hometown = [racerProfile.hometown_city, racerProfile.hometown_state, racerProfile.hometown_country].filter(Boolean).join(', ');
  const racingBase = [racerProfile.racing_base_city, racerProfile.racing_base_state, racerProfile.racing_base_country].filter(Boolean).join(', ');
  const heroImg = racerProfile.hero_image_url || media?.hero_image_url || legacyDriver?.hero_image_url || null;
  const profileImg = racerProfile.profile_image_url || media?.headshot_url || legacyDriver?.profile_image_url || null;
  const racerDesc = [
    racerProfile.career_status || legacyDriver?.career_status || 'Racing competitor',
    racerProfile.primary_discipline || legacyDriver?.primary_discipline,
    hometown ? `from ${hometown}` : '',
  ].filter(Boolean).join(' · ');

  const isAdmin = user?.role === 'admin';

  // Build series list from programs (legacy compatibility)
  const driverSeriesList = programs
    .map(p => allSeries.find(s => s.id === p.series_id))
    .filter(Boolean)
    .filter((s, i, arr) => arr.findIndex(x => x.id === s.id) === i)
    .sort((a, b) => (a.popularity_rank ?? 9999) - (b.popularity_rank ?? 9999));

  const activeProgram = programs.find(p => p.status === 'active') || programs[0];
  const primaryClass = (legacyDriver?.primary_class_id ? allClasses.find(c => c.id === legacyDriver.primary_class_id) : null)
    || (activeProgram?.series_class_id ? allClasses.find(c => c.id === activeProgram.series_class_id) : null);
  const className = primaryClass?.class_name || activeProgram?.class_name;

  const driverTeam = legacyDriver?.team_id ? allTeams.find(t => t.id === legacyDriver.team_id) : null;

  const yearsLabel = racerProfile.years_active_start
    ? `${racerProfile.years_active_start} – ${racerProfile.years_active_end || 'Present'}`
    : legacyDriver?.years_active_start
    ? `${legacyDriver.years_active_start} – ${legacyDriver.years_active_end || 'Present'}`
    : null;

  // Official results
  const officialSessionIds = new Set(allSessions.filter(s => ['Official', 'Locked'].includes(s.status)).map(s => s.id));
  const officialResults = results.filter(r => officialSessionIds.has(r.session_id)).slice(0, 10);

  // Upcoming/past entries
  const upcomingEntries = entries
    .filter(entry => { const event = allEvents.find(e => e.id === entry.event_id); return event && event.status !== 'completed'; })
    .map(entry => { const event = allEvents.find(e => e.id === entry.event_id); const track = allTracks.find(t => t.id === event?.track_id); return { entry, event, track }; });

  const pastEntries = entries
    .filter(entry => { const event = allEvents.find(e => e.id === entry.event_id); return event && event.status === 'completed'; })
    .map(entry => {
      const event = allEvents.find(e => e.id === entry.event_id);
      const track = allTracks.find(t => t.id === event?.track_id);
      const officialSession = allSessions.find(s => s.event_id === event?.id && ['Official', 'Locked'].includes(s.status));
      const resultData = officialSession ? results.find(r => r.session_id === officialSession.id && (r.entry_id === entry.id || r.driver_id === legacyDriver?.id)) : null;
      return { entry, event, track, resultData };
    });

  // Season participation history
  const participationHistory = participations.map(p => {
    const series = allSeries.find(s => s.id === p.series_id);
    const pStandings = standings.filter(s => s.participation_id === p.id);
    return { participation: p, series, standings: pStandings };
  });

  return (
    <PageShell className="bg-white">
      <SeoMeta
        title={buildEntityTitle(fullName, 'Racer Profile')}
        description={racerDesc}
        image={heroImg || profileImg || SITE_FALLBACK_IMAGE}
        type="profile"
      />

      <MobileBackHeader tone="light" title={fullName} to="/Directory?cat=racers" />

      {isAdmin && racerProfile.visibility !== 'live' && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-2 text-center">
          <span className="text-xs font-semibold text-yellow-800 tracking-wide">ADMIN PREVIEW — This profile is {racerProfile.visibility} and not visible to the public.</span>
        </div>
      )}

      {/* HERO */}
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
            <div className="flex-shrink-0 hidden sm:block">
              {profileImg ? (
                <img src={profileImg} alt={fullName} className="w-28 h-28 rounded-xl object-cover border-2 border-white/20 shadow-xl" />
              ) : (
                <div className="w-28 h-28 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
                  <User className="w-10 h-10 text-white/40" />
                </div>
              )}
            </div>
            <div className="flex-1 pb-1">
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <CountryFlag country={racerProfile.hometown_country} />
                {racerProfile.career_status && <CareerStatusTag status={racerProfile.career_status} size="sm" />}
                {racerProfile.is_claimed && (
                  <Badge className="bg-teal-500/20 text-teal-300 border border-teal-400/30 text-xs flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Claimed
                  </Badge>
                )}
              </div>
              <div className="flex items-baseline gap-3 flex-wrap">
                <h1 className="text-4xl md:text-5xl font-black text-white leading-none">{fullName}</h1>
                {legacyDriver?.primary_number && (
                  <span className="text-3xl font-black text-[#00FFDA] leading-none">#{legacyDriver.primary_number}</span>
                )}
              </div>
              {racerProfile.tagline && (
                <p className="text-white/60 mt-1.5 text-sm italic max-w-lg">{racerProfile.tagline}</p>
              )}
              <div className="flex flex-wrap gap-4 mt-3 text-sm text-white/60">
                {(racerProfile.primary_discipline || legacyDriver?.primary_discipline) && <span>{racerProfile.primary_discipline || legacyDriver?.primary_discipline}</span>}
                {hometown && <span className="flex items-center gap-1"><Home className="w-3 h-3" />{hometown}</span>}
                {driverTeam && (
                  <Link to={`/TeamProfile?slug=${driverTeam.canonical_slug || driverTeam.slug || driverTeam.id}`} className="hover:text-[#00FFDA] transition-colors font-medium text-white/80">
                    {driverTeam.name}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* IDENTITY BAR */}
      <div className="bg-[#131313] border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-3 flex flex-wrap items-center gap-6 text-xs text-white/50">
          {yearsLabel && <div><span className="text-white/40">Active: </span><span className="text-white/80">{yearsLabel}</span></div>}
          {legacyDriver?.manufacturer && <div><span className="text-white/40">Manufacturer: </span><span className="text-white/80">{legacyDriver.manufacturer}</span></div>}
          {driverSeriesList.length > 0 && <div><span className="text-white/40">Series: </span><span className="text-white/80">{driverSeriesList.map(s => s.name).join(', ')}</span></div>}
          {className && <div><span className="text-white/40">Class: </span><span className="text-white/80">{className}</span></div>}
          {racerProfile.nicknames?.length > 0 && <div><span className="text-white/40">Known As: </span><span className="text-white/80 italic">"{racerProfile.nicknames.join('", "')}"</span></div>}
          {racingBase && <div><span className="text-white/40">Racing Base: </span><span className="text-white/80">{racingBase}</span></div>}
          {racerProfile.racecore_id && <div className="font-mono"><span className="text-white/40">RaceCore ID: </span><span className="text-teal-400">{racerProfile.racecore_id}</span></div>}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6">
        {/* ACTION ROW */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-4 pb-2">
          <Link to="/Directory?cat=racers" className="text-xs text-gray-400 hover:text-[#232323] flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /><span>Racers</span>
          </Link>
          <div className="flex items-center gap-2 ml-auto">
            <ClaimProfileButton identity={identity} racerProfileSlug={racerProfile.slug} />
            <SocialShareButtons url={window.location.href} title={`${fullName} - Racer Profile`} description="" />
          </div>
        </div>

        {/* TAB NAV */}
        <div className="flex gap-1 overflow-x-auto border-b border-gray-200 mt-2 mb-6 scrollbar-hide">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-xs font-semibold whitespace-nowrap transition-colors flex-shrink-0 ${
                activeTab === tab.id ? 'text-[#232323] border-b-2 border-[#00FFDA] -mb-px' : 'text-gray-400 hover:text-[#232323]'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
            <div className="lg:col-span-2 space-y-8">
              {(racerProfile.bio || hometown || racingBase || yearsLabel || racerProfile.primary_discipline) && (
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">About</h2>
                  {racerProfile.bio ? <p className="text-gray-700 leading-relaxed mb-4">{racerProfile.bio}</p> : <p className="text-gray-300 italic leading-relaxed mb-4">No bio added yet.</p>}
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
                    {(racerProfile.primary_discipline || legacyDriver?.primary_discipline) && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Discipline</div>
                        <div className="font-semibold text-[#232323] text-sm">{racerProfile.primary_discipline || legacyDriver?.primary_discipline}</div>
                      </div>
                    )}
                    {yearsLabel && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Years Active</div>
                        <div className="font-semibold text-[#232323] text-sm">{yearsLabel}</div>
                      </div>
                    )}
                    {legacyDriver?.manufacturer && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Manufacturer</div>
                        <div className="font-semibold text-[#232323] text-sm">{legacyDriver.manufacturer}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Career Stats from PersonIdentity */}
              {careerStats && (
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Career Statistics</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-black text-[#232323]">{careerStats.career_starts ?? 0}</div>
                      <div className="text-xs text-gray-500 uppercase">Starts</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-black text-[#232323]">{careerStats.career_wins ?? 0}</div>
                      <div className="text-xs text-gray-500 uppercase">Wins</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-black text-[#232323]">{careerStats.career_podiums ?? 0}</div>
                      <div className="text-xs text-gray-500 uppercase">Podiums</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-black text-[#232323]">{careerStats.career_points_total ?? 0}</div>
                      <div className="text-xs text-gray-500 uppercase">Points</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Performance */}
              {results.length > 0 && driverShape && (
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Performance</h2>
                  <StatsSection driver={driverShape} results={results} sessions={allSessions} events={allEvents} />
                </div>
              )}

              {/* Programs */}
              {programs.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">Racing Programs</h2>
                    <button onClick={() => setActiveTab('career')} className="text-xs text-gray-400 hover:text-[#232323] underline">View full career →</button>
                  </div>
                  <ProgramsTimeline programs={programs} teams={driverTeam ? [driverTeam] : []} allSeries={allSeries} allClasses={allClasses} />
                </div>
              )}

              {/* Media Gallery */}
              {media?.gallery_urls?.length > 0 && (
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Gallery</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {media.gallery_urls.slice(0, 6).map((url, i) => (
                      <img key={i} src={url} alt={`${fullName} gallery`} className="w-full aspect-square object-cover rounded-lg border border-gray-100" />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {profileImg && (
                <div className="overflow-hidden rounded-xl border border-gray-100 shadow-sm">
                  <img src={profileImg} alt={fullName} className="w-full object-cover max-h-[360px]" />
                </div>
              )}

              {(driverTeam || driverSeriesList.length > 0) && (
                <div className="border border-gray-200 rounded-xl p-4 space-y-4">
                  {driverTeam && (
                    <div>
                      <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Team</div>
                      <Link to={`/TeamProfile?slug=${driverTeam.canonical_slug || driverTeam.slug || driverTeam.id}`} className="font-bold text-[#232323] hover:text-[#00FFDA] transition-colors">{driverTeam.name}</Link>
                    </div>
                  )}
                  {driverSeriesList.length > 0 && (
                    <div>
                      <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Series</div>
                      {driverSeriesList.map(s => (
                        <Link key={s.id} to={`/series/${s.canonical_slug || s.slug || s.id}`} className="block font-semibold text-[#232323] hover:underline text-sm">{s.name}</Link>
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

              {/* Social Links */}
              {(racerProfile.website_url || racerProfile.instagram_url || racerProfile.facebook_url || racerProfile.x_url || racerProfile.youtube_url || racerProfile.tiktok_url) && (
                <div className="border border-gray-200 rounded-xl p-4">
                  <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-3">Links</div>
                  <SocialIconsDisplay entity={racerProfile} />
                </div>
              )}

              {/* Season Participation History */}
              {participationHistory.length > 0 && (
                <div className="border border-gray-200 rounded-xl p-4">
                  <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-3">Season History</div>
                  <div className="space-y-3">
                    {participationHistory.map(({ participation, series, standings: pStandings }) => (
                      <div key={participation.id} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                        <div className="font-semibold text-sm text-[#232323]">{series?.name || '—'}</div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {participation.season_year} · {participation.racer_type}
                          {pStandings.length > 0 && ` · P${pStandings[0].position || pStandings[0].rank || '—'}`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upcoming */}
              {upcomingEntries.length > 0 && (
                <div className="border border-gray-200 rounded-xl p-4">
                  <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5"><Calendar className="w-3 h-3" /> Next Up</div>
                  <div className="space-y-3">
                    {upcomingEntries.slice(0, 3).map(({ entry, event, track }) => event && (
                      <Link key={entry.id} to={`/EventProfile?id=${event.id}`} className="block border-b border-gray-100 pb-3 last:border-0 last:pb-0 hover:text-[#00FFDA] transition-colors">
                        <div className="font-semibold text-sm text-[#232323] leading-snug">{event.name}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{track?.name} · {safeDateFormat(event.event_date)}</div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CAREER TAB */}
        {activeTab === 'career' && (
          <div className="pb-12">
            <h2 className="text-2xl font-black text-[#232323] mb-6">Career History</h2>
            {careerEntries.length > 0 && legacyDriver ? (
              <DriverCareerTab driverId={legacyDriver.id} initialEntries={careerEntries} />
            ) : (
              <p className="text-gray-400 text-sm">No career history available.</p>
            )}
          </div>
        )}

        {/* SCHEDULE & RESULTS TAB */}
        {activeTab === 'schedule' && (
          <div className="pb-12 space-y-8">
            {pastEntries.length > 0 && (
              <div>
                <h2 className="text-2xl font-black text-[#232323] mb-4">Past Events</h2>
                <div className="space-y-3">
                  {pastEntries.map(({ entry, event, track, resultData }) => event && (
                    <Link key={entry.id} to={`/EventProfile?id=${event.id}`} className="block p-4 border border-gray-200 rounded-lg hover:border-[#00FFDA] hover:shadow-sm transition-all">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-[#232323]">{event.name}</h4>
                          <p className="text-sm text-gray-500">{track?.name} · {safeDateFormat(event.event_date)}</p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-gray-300 flex-shrink-0 mt-1" />
                      </div>
                      {resultData?.position && <Badge className="mt-2 bg-blue-100 text-blue-800 text-xs">Finished P{resultData.position}</Badge>}
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {officialResults.length > 0 && (
              <div>
                <h2 className="text-2xl font-black text-[#232323] mb-4">Official Results</h2>
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>{['Event','Session','Finish','Pts'].map(h => <th key={h} className={`py-3 px-4 font-semibold text-gray-600 ${h==='Pts'?'text-right':'text-left'}`}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {officialResults.map(result => {
                        const session = allSessions.find(s => s.id === result.session_id);
                        const event = allEvents.find(e => e.id === session?.event_id);
                        return (
                          <tr key={result.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4">{event ? <Link to={`/EventProfile?id=${event.id}`} className="font-medium hover:underline">{event.name}</Link> : '—'}</td>
                            <td className="py-3 px-4 text-gray-500">{session?.name || '—'}</td>
                            <td className="py-3 px-4 font-semibold">{result.position ? `P${result.position}` : '—'}</td>
                            <td className="py-3 px-4 text-right font-semibold">{result.points ?? '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {driverShape && (
              <div>
                <h2 className="text-2xl font-black text-[#232323] mb-4">Standings & Rankings</h2>
                <ResultsPanel driverId={driverShape.id} />
              </div>
            )}
          </div>
        )}

        {/* MEDIA TAB */}
        {activeTab === 'media' && (
          <div className="pb-12">
            <h2 className="text-2xl font-black text-[#232323] mb-6">Media</h2>
            {legacyDriver && <PublicMediaGallery targetType="driver_gallery" targetEntityId={legacyDriver.id} title="" />}
          </div>
        )}

        {/* SPONSORS TAB */}
        {activeTab === 'sponsors' && (
          <div className="pb-12">
            <h2 className="text-2xl font-black text-[#232323] mb-6">Sponsors</h2>
            {sponsors.length > 0 && legacyDriver ? (
              <DriverSponsorsTab driverId={legacyDriver.id} initialSponsors={sponsors} />
            ) : (
              <p className="text-gray-400 text-sm">No sponsor information available.</p>
            )}
          </div>
        )}
      </div>
    </PageShell>
  );
}