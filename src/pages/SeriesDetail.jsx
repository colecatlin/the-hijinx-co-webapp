import React, { useState, useEffect } from 'react';
import SeoMeta, { buildEntityTitle, SITE_FALLBACK_IMAGE } from '@/components/system/seoMeta';
import Analytics from '@/components/system/analyticsTracker';
import { useSearchParams, useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageShell from '@/components/shared/PageShell';
import MobileBackHeader from '@/components/shared/MobileBackHeader';
import { EntityNotFound, EntityUnavailable } from '@/components/data/EntityNotFoundState';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Calendar, Trophy, Flag, BarChart3, Users, Car, Clock, History, Award, Image as ImageIcon } from 'lucide-react';
import SocialShareButtons from '@/components/shared/SocialShareButtons';
import ProfileClaimFooter from '@/components/onboarding/ProfileClaimFooter';
import SeriesOverview from '@/components/series/SeriesOverview';
import SeriesSchedule from '@/components/series/SeriesSchedule';
import SeriesClasses from '@/components/series/SeriesClasses';
import SeriesRacerRoster from '@/components/series/SeriesRacerRoster';
import SeriesTeamRoster from '@/components/series/SeriesTeamRoster';
import SeriesVehicleParticipation from '@/components/series/SeriesVehicleParticipation';
import SeriesStandings from '@/components/series/SeriesStandings';
import SeriesChampions from '@/components/series/SeriesChampions';
import SeriesRecords from '@/components/series/SeriesRecords';
import SeriesStatistics from '@/components/series/SeriesStatistics';
import SeriesTimeline from '@/components/series/SeriesTimeline';
import SeriesHistory from '@/components/series/SeriesHistory';
import SeriesTracks from '@/components/series/SeriesTracks';
import SeriesSponsors from '@/components/series/SeriesSponsors';
import SeriesMedia from '@/components/series/SeriesMedia';

const TABS = [
  { id: 'overview', label: 'Overview', icon: MapPin },
  { id: 'schedule', label: 'Schedule', icon: Calendar },
  { id: 'classes', label: 'Classes', icon: Flag },
  { id: 'standings', label: 'Standings', icon: BarChart3 },
  { id: 'racers', label: 'Racers', icon: Users },
  { id: 'teams', label: 'Teams', icon: Users },
  { id: 'vehicles', label: 'Vehicles', icon: Car },
  { id: 'champions', label: 'Champions', icon: Trophy },
  { id: 'records', label: 'Records', icon: Award },
  { id: 'statistics', label: 'Statistics', icon: BarChart3 },
  { id: 'timeline', label: 'Timeline', icon: Clock },
  { id: 'history', label: 'History', icon: History },
  { id: 'tracks', label: 'Tracks', icon: MapPin },
  { id: 'sponsors', label: 'Sponsors', icon: Award },
  { id: 'media', label: 'Media', icon: ImageIcon },
];

export function SeriesDetailRouteWrapper() {
  const { slug } = useParams();
  return <SeriesDetail overrideSlug={slug} />;
}

export default function SeriesDetail({ overrideSlug } = {}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const seriesSlug = overrideSlug || (searchParams.get('slug') || searchParams.get('id') || '').trim() || null;
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSeason, setSelectedSeason] = useState('');

  // Phase 14: Use getSeriesExperience backend function
  const { data: experienceData, isLoading } = useQuery({
    queryKey: ['seriesExperience', seriesSlug],
    queryFn: async () => {
      try {
        const res = await base44.functions.invoke('getSeriesExperience', { slug: seriesSlug });
        return res.data;
      } catch {
        return null;
      }
    },
    enabled: !!seriesSlug,
  });

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me(), retry: false });
  const { data: isAuthenticated } = useQuery({ queryKey: ['isAuthenticated'], queryFn: () => base44.auth.isAuthenticated(), retry: false });

  const series = experienceData?.series || null;
  const currentSeason = experienceData?.current_season || null;
  const allSeasons = experienceData?.all_seasons || [];
  const schedule = experienceData?.schedule || [];
  const classes = experienceData?.classes || [];
  const racers = experienceData?.racers || [];
  const teams = experienceData?.teams || [];
  const vehicles = experienceData?.vehicles || [];
  const standings = experienceData?.standings || [];
  const champions = experienceData?.champions || [];
  const records = experienceData?.records || null;
  const statistics = experienceData?.statistics || null;
  const timeline = experienceData?.timeline || [];
  const history = experienceData?.history || null;
  const tracks = experienceData?.tracks || [];
  const sponsors = experienceData?.sponsors || null;
  const media = experienceData?.media || null;
  const seo = experienceData?.seo || null;

  // Set selected season from current season on load
  useEffect(() => {
    if (currentSeason && !selectedSeason) setSelectedSeason(currentSeason);
  }, [currentSeason]);

  // Reload with selected season
  const { data: seasonData } = useQuery({
    queryKey: ['seriesExperience', seriesSlug, selectedSeason],
    queryFn: async () => {
      if (!selectedSeason || selectedSeason === currentSeason) return null;
      try {
        const res = await base44.functions.invoke('getSeriesExperience', { slug: seriesSlug, season_year: selectedSeason });
        return res.data;
      } catch {
        return null;
      }
    },
    enabled: !!seriesSlug && !!selectedSeason && selectedSeason !== currentSeason,
  });

  // Use season-specific data when available
  const activeSchedule = seasonData?.schedule || schedule;
  const activeRacers = seasonData?.racers || racers;
  const activeTeams = seasonData?.teams || teams;
  const activeVehicles = seasonData?.vehicles || vehicles;
  const activeStandings = seasonData?.standings || standings;
  const activeStatistics = seasonData?.statistics || statistics;

  useEffect(() => {
    if (series) Analytics.profileViewSeries(series.id, series.name, series.discipline);
  }, [series?.id]);

  if (isLoading) {
    return (
      <PageShell>
        <div className="max-w-7xl mx-auto px-6 py-12">
          <Skeleton className="h-12 w-1/3 mb-4" />
          <Skeleton className="h-32 w-full" />
        </div>
      </PageShell>
    );
  }

  if (!series) return <EntityNotFound entityType="Series" />;

  const isAdmin = user?.role === 'admin';
  const isPublic = series.visibility_status === 'live' && !series.is_archived;
  const canViewDraft = isAdmin && !isPublic;

  if (!isPublic && !canViewDraft) return <EntityUnavailable entityType="Series" />;

  const heroImg = series.hero_image_url || series.banner_url || series.logo_url || SITE_FALLBACK_IMAGE;
  const seriesDesc = seo?.description || series.description || series.bio ||
    [series.discipline || '', series.geographic_scope || '', series.sanctioning_body ? `Sanctioned by ${series.sanctioning_body}` : ''].filter(Boolean).join(' · ') ||
    `${series.name} racing series on HIJINX.`;

  const handleSeasonChange = (season) => {
    setSelectedSeason(season);
  };

  const handleClassChange = (classId) => {
    setSelectedClassId(classId);
    // Filter standings by class
  };

  const filteredStandings = selectedClassId
    ? activeStandings.filter(s => s.class_id === selectedClassId)
    : activeStandings;

  return (
    <PageShell className="light-page">
      <SeoMeta
        title={seo?.title || buildEntityTitle(series.name, 'Series')}
        description={seriesDesc}
        image={heroImg}
      />
      {seo?.structured_data && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(seo.structured_data) }} />
      )}

      <MobileBackHeader tone="light" title={series.name} to="/Directory?cat=series" />

      {/* HERO */}
      {heroImg && heroImg !== SITE_FALLBACK_IMAGE ? (
        <div className="hero-dark relative w-full h-[300px] bg-[#0A0A0A] overflow-hidden">
          <img src={heroImg} alt={series.name} className="w-full h-full object-cover opacity-50" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 max-w-7xl mx-auto px-6 pb-8">
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <h1 className="text-4xl md:text-5xl font-black text-white leading-none">{series.name}</h1>
                <div className="flex flex-wrap gap-4 mt-3 text-sm text-white/60">
                  {series.discipline && <span>{series.discipline}</span>}
                  {series.geographic_scope && <span>{series.geographic_scope}</span>}
                  {currentSeason && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{currentSeason} Season</span>}
                </div>
              </div>
              <div className="pb-2 flex-shrink-0">
                <SocialShareButtons url={window.location.href} title={`${series.name} - Series`} description={seriesDesc} />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="hero-dark relative w-full h-[200px] bg-[#0A0A0A] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] to-[#0A0A0A]" />
          <div className="absolute bottom-0 left-0 right-0 max-w-7xl mx-auto px-6 pb-8 flex items-end gap-5">
            {series.logo_url && (
              <div className="flex-shrink-0 hidden sm:flex w-20 h-20 rounded-xl bg-white/10 border border-white/20 items-center justify-center p-2">
                <img src={series.logo_url} alt={series.name} className="max-w-full max-h-full object-contain" />
              </div>
            )}
            <div className="flex-1 pb-1">
              <h1 className="text-4xl font-black text-white leading-none">{series.name}</h1>
              <div className="flex flex-wrap gap-4 mt-3 text-sm text-white/60">
                {series.discipline && <span>{series.discipline}</span>}
                {currentSeason && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{currentSeason} Season</span>}
              </div>
            </div>
            <div className="pb-2 flex-shrink-0">
              <SocialShareButtons url={window.location.href} title={`${series.name} - Series`} description={seriesDesc} />
            </div>
          </div>
        </div>
      )}

      {/* NAV */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center gap-2 pt-2">
            <Link to="/Directory?cat=series" className="text-xs text-gray-500 hover:text-black mr-4">← Series</Link>
          </div>
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-xs font-medium whitespace-nowrap transition-colors ${activeTab === tab.id ? 'text-black border-b-2 border-[#00FFDA] -mb-px' : 'text-gray-500 hover:text-black'}`}
                >
                  <Icon className="w-3.5 h-3.5" />{tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'overview' && (
          <SeriesOverview series={series} statistics={activeStatistics} currentSeason={currentSeason} schedule={activeSchedule} champions={champions} />
        )}

        {activeTab === 'schedule' && (
          <SeriesSchedule schedule={activeSchedule} allSeasons={allSeasons} selectedSeason={selectedSeason || currentSeason} onSeasonChange={handleSeasonChange} />
        )}

        {activeTab === 'classes' && (
          <SeriesClasses classes={classes} onViewStandings={(classId) => { setSelectedClassId(classId); setActiveTab('standings'); }} />
        )}

        {activeTab === 'standings' && (
          <SeriesStandings standings={filteredStandings} classes={classes} selectedClass={selectedClassId} onClassChange={handleClassChange} />
        )}

        {activeTab === 'racers' && (
          <SeriesRacerRoster racers={activeRacers} />
        )}

        {activeTab === 'teams' && (
          <SeriesTeamRoster teams={activeTeams} />
        )}

        {activeTab === 'vehicles' && (
          <SeriesVehicleParticipation vehicles={activeVehicles} />
        )}

        {activeTab === 'champions' && (
          <SeriesChampions champions={champions} />
        )}

        {activeTab === 'records' && (
          <SeriesRecords records={records} />
        )}

        {activeTab === 'statistics' && (
          <SeriesStatistics statistics={activeStatistics} />
        )}

        {activeTab === 'timeline' && (
          <SeriesTimeline timeline={timeline} />
        )}

        {activeTab === 'history' && (
          <SeriesHistory history={history} />
        )}

        {activeTab === 'tracks' && (
          <SeriesTracks tracks={tracks} />
        )}

        {activeTab === 'sponsors' && (
          <SeriesSponsors sponsors={sponsors} />
        )}

        {activeTab === 'media' && (
          <SeriesMedia media={media} />
        )}

        <ProfileClaimFooter entityType="Series" entityId={series?.id} entityName={series.name} />
      </div>
    </PageShell>
  );
}