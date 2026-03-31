import React, { useState, useMemo, useEffect } from 'react';
import SeoMeta, { buildEntityTitle, SITE_FALLBACK_IMAGE } from '@/components/system/seoMeta';
import Analytics from '@/components/system/analyticsTracker';
import { useSearchParams, useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { getSeriesDetailData } from '@/components/entities/publicPageDataApi';
import { isPublicVisible } from '@/components/core/publishModel';
import PageShell from '@/components/shared/PageShell';
import { EntityNotFound } from '@/components/data/EntityNotFoundState';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, parseISO, isValid } from 'date-fns';
import { ExternalLink, Globe, Instagram, Twitter, Youtube, Facebook, Calendar, MapPin, TrendingUp, Flag, BarChart3, AlertCircle } from 'lucide-react';
import { createPageUrl } from '@/components/utils';
import SocialShareButtons from '@/components/shared/SocialShareButtons';
import ProfileClaimFooter from '@/components/onboarding/ProfileClaimFooter';
import CompetitionLevelBadge from '@/components/competition/CompetitionLevelBadge';
import GeographicScopeTag from '@/components/competition/GeographicScopeTag';
import SeriesNameHistory from '@/components/series/SeriesNameHistory';
import PublicMediaGallery from '@/components/media/PublicMediaGallery';

function safeDateFormat(dateStr, fmt = 'MMM d, yyyy') {
  if (!dateStr) return 'TBA';
  try { const d = parseISO(dateStr); return isValid(d) ? format(d, fmt) : 'TBA'; } catch { return 'TBA'; }
}

export function SeriesDetailRouteWrapper() {
  const { slug } = useParams();
  return <SeriesDetail overrideSlug={slug} />;
}

const TABS = [
  { id: 'overview', label: 'Overview', icon: MapPin },
  { id: 'classes', label: 'Classes', icon: Flag },
  { id: 'schedule', label: 'Schedule', icon: Calendar },
  { id: 'standings', label: 'Standings', icon: BarChart3 },
  { id: 'media', label: 'Media', icon: TrendingUp },
];

export default function SeriesDetail({ overrideSlug } = {}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const seriesSlug = overrideSlug || (searchParams.get('slug') || searchParams.get('id') || '').trim() || null;
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedClassName, setSelectedClassName] = useState('');

  const { data: profileData, isLoading } = useQuery({
    queryKey: ['seriesDetailData', seriesSlug],
    queryFn: () => getSeriesDetailData({ id: seriesSlug, slug: seriesSlug }),
    enabled: !!seriesSlug,
  });

  const { data: isAuthenticated } = useQuery({ queryKey: ['isAuthenticated'], queryFn: () => base44.auth.isAuthenticated() });
  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me(), enabled: !!isAuthenticated });

  const series    = profileData?.series    ?? null;
  const classes   = profileData?.classes   ?? [];
  const allEvents = profileData?.events    ?? [];
  const allTracks = profileData?.tracks    ?? [];
  const sessions  = profileData?.sessions  ?? [];
  const results   = profileData?.results   ?? [];
  const standings = profileData?.standings ?? [];

  const CURRENT_YEAR = new Date().getFullYear();
  const seasonYear = searchParams.get('seasonYear') || CURRENT_YEAR.toString();

  const availableYears = useMemo(() => {
    const earliestFromEvents = allEvents.reduce((min, e) => {
      const y = parseInt(e.season || (e.event_date ? e.event_date.substring(0, 4) : null));
      return y && y < min ? y : min;
    }, CURRENT_YEAR - 1);
    const earliest = Math.min(earliestFromEvents, CURRENT_YEAR - 1);
    const years = [];
    for (let y = CURRENT_YEAR + 2; y >= earliest; y--) years.push(y);
    return years;
  }, [allEvents, CURRENT_YEAR]);

  const sortedClasses = useMemo(() => [...classes].sort((a, b) => {
    const aHasOrder = a.sort_order != null, bHasOrder = b.sort_order != null;
    if (aHasOrder && bHasOrder) return a.sort_order - b.sort_order;
    if (aHasOrder) return -1; if (bHasOrder) return 1;
    return (b.competition_level || 0) - (a.competition_level || 0);
  }), [classes]);

  const activeClasses = useMemo(() => sortedClasses.filter(c => c.active !== false), [sortedClasses]);
  const publicEvents = useMemo(() => allEvents.filter(e => isPublicVisible('Event', e)), [allEvents]);

  const seasonEvents = useMemo(() =>
    allEvents.filter(e => e.season === seasonYear && isPublicVisible('Event', e))
      .sort((a, b) => (a.event_date || '').localeCompare(b.event_date || '')),
  [allEvents, seasonYear]);

  const tracksMap = useMemo(() => {
    const map = {}; allTracks.forEach(t => { if (t?.id) map[t.id] = t; }); return map;
  }, [allTracks]);

  const seasonSessions = useMemo(() => {
    const ids = new Set(seasonEvents.map(e => e.id));
    return sessions.filter(s => ids.has(s.event_id));
  }, [sessions, seasonEvents]);

  const activeClassName = selectedClassName || (activeClasses[0]?.class_name || '');

  const seasonStandings = useMemo(() =>
    standings.filter(s => s.series_id === series?.id && s.season_year === seasonYear && s.class_name === activeClassName)
      .sort((a, b) => (a.position || 999) - (b.position || 999)).slice(0, 10),
  [standings, series?.id, seasonYear, activeClassName]);

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
  const displayLevel = series.override_competition_level || series.derived_competition_level;
  const isOverride = !!series.override_competition_level;
  const seriesImg = series.banner_url || series.logo_url || SITE_FALLBACK_IMAGE;
  const seriesDesc = [series.discipline || '', series.geographic_scope || '', series.sanctioning_body ? `Sanctioned by ${series.sanctioning_body}` : ''].filter(Boolean).join(' · ') || `${series.name} racing series on HIJINX.`;

  return (
    <PageShell className="bg-white">
      <SeoMeta
        title={buildEntityTitle(series.name, 'Series')}
        description={series.description || seriesDesc}
        image={seriesImg}
      />

      {/* ── HERO ── */}
      {series.banner_url ? (
        <div className="w-full h-[360px] relative overflow-hidden">
          <img src={series.banner_url} alt={series.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 max-w-7xl mx-auto px-6 pb-8">
            <h1 className="text-4xl md:text-5xl font-black text-white leading-none">{series.name}</h1>
            {series.discipline && <p className="text-white/60 mt-1.5 text-sm">{series.discipline}{series.geographic_scope ? ` · ${series.geographic_scope}` : ''}</p>}
          </div>
        </div>
      ) : (
        <div className="relative w-full h-[200px] bg-[#0A0A0A] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] to-[#0A0A0A]" />
          <div className="absolute bottom-0 left-0 right-0 max-w-7xl mx-auto px-6 pb-8 flex items-end gap-5">
            {series.logo_url && (
              <div className="flex-shrink-0 hidden sm:flex w-20 h-20 rounded-xl bg-white/10 border border-white/20 items-center justify-center p-2">
                <img src={series.logo_url} alt={series.name} className="max-w-full max-h-full object-contain" />
              </div>
            )}
            <div className="flex-1 pb-1">
              <h1 className="text-4xl font-black text-white leading-none">{series.name}</h1>
              {series.discipline && <p className="text-white/60 mt-1.5 text-sm">{series.discipline}</p>}
            </div>
          </div>
        </div>
      )}

      {/* ── IDENTITY + TABS ── */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between pt-3 pb-0">
            <Link to={createPageUrl('SeriesHome')} className="text-xs text-gray-500 hover:text-[#232323]">← Series</Link>
            <div className="flex items-center gap-3">
              {series.website_url && <a href={series.website_url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#232323]"><Globe className="w-4 h-4" /></a>}
              {series.social_instagram && <a href={`https://instagram.com/${series.social_instagram.replace('@','')}`} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#232323]"><Instagram className="w-4 h-4" /></a>}
              {series.social_x && <a href={`https://x.com/${series.social_x.replace('@','')}`} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#232323]"><Twitter className="w-4 h-4" /></a>}
              {series.social_youtube && <a href={series.social_youtube} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#232323]"><Youtube className="w-4 h-4" /></a>}
              {series.social_facebook && <a href={series.social_facebook} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#232323]"><Facebook className="w-4 h-4" /></a>}
              <SocialShareButtons url={window.location.href} title={`${series.name} - Series`} description={seriesDesc} />
            </div>
          </div>
          <div className="flex gap-1 overflow-x-auto mt-1">
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                {(displayLevel || series.geographic_scope) && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {displayLevel && <CompetitionLevelBadge level={displayLevel} isOverride={isOverride} size="md" />}
                    {series.geographic_scope && <GeographicScopeTag scope={series.geographic_scope} size="md" />}
                    {isOverride && series.override_reason && <span className="text-xs text-gray-400 italic">Override: {series.override_reason}</span>}
                  </div>
                )}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      {series.discipline && <div className="mb-3"><div className="text-xs text-gray-500 mb-1">Discipline</div><div className="font-semibold text-[#232323]">{series.discipline}</div></div>}
                      {series.sanctioning_body && <div className="mb-3"><div className="text-xs text-gray-500 mb-1">Sanctioning Body</div><div className="font-semibold text-[#232323]">{series.sanctioning_body}</div></div>}
                    </div>
                    <div>
                      {series.season_year && <div className="mb-3"><div className="text-xs text-gray-500 mb-1">Season</div><div className="font-semibold text-[#232323]">{series.season_year}</div></div>}
                      <div className="mb-3"><div className="text-xs text-gray-500 mb-1">Events</div><div className="font-semibold text-[#232323]">{publicEvents.length}</div></div>
                    </div>
                  </div>
                  {series.description && <p className="text-gray-700 leading-relaxed mt-2">{series.description}</p>}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Badge className={series.operational_status === 'Active' ? 'bg-[#00FFDA] text-[#232323]' : 'bg-gray-200 text-gray-700'}>{series.operational_status}</Badge>
                  </div>
                </div>
                {series.title_sponsor_name && (
                  <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-3">
                    <span className="text-xs text-gray-400 uppercase tracking-widest font-medium">Presented by</span>
                    {series.title_sponsor_logo_url
                      ? <img src={series.title_sponsor_logo_url} alt={series.title_sponsor_name} className="h-5 object-contain" />
                      : <span className="text-sm font-bold text-[#232323]">{series.title_sponsor_name}</span>}
                  </div>
                )}
                <SeriesNameHistory series={series} />
              </div>
              <div>
                {series.logo_url && !series.banner_url && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center p-6">
                    <img src={series.logo_url} alt={series.name} className="max-w-full max-h-40 object-contain" />
                  </div>
                )}
                {!series.logo_url && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center p-8">
                    <div className="text-center text-gray-400">
                      <div className="text-4xl font-black mb-1">{(series.name || '').substring(0, 3).toUpperCase()}</div>
                      <div className="text-xs">No logo</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* CLASSES */}
        {activeTab === 'classes' && (
          <section className="bg-white border border-gray-200 rounded-lg p-8">
            <h2 className="text-2xl font-bold text-[#232323] mb-6">Racing Classes</h2>
            {activeClasses.length === 0 ? (
              <p className="text-gray-500 text-sm">No classes defined for this series yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeClasses.map(cls => (
                  <div key={cls.id} className="border border-gray-200 rounded-lg p-4 hover:border-[#00FFDA] transition-colors">
                    <div className="font-semibold text-[#232323] mb-2">{cls.class_name}</div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {cls.competition_level && <CompetitionLevelBadge level={cls.competition_level} size="sm" />}
                      {cls.geographic_scope && <GeographicScopeTag scope={cls.geographic_scope} size="sm" />}
                    </div>
                    {cls.vehicle_type && <p className="text-xs text-gray-500 mb-2">Vehicle: {cls.vehicle_type}</p>}
                    {cls.description_summary && <p className="text-sm text-gray-600 mb-3">{cls.description_summary}</p>}
                    <Button variant="outline" size="sm" className="w-full text-xs"
                      onClick={() => { setSelectedClassName(cls.class_name); setActiveTab('standings'); }}>
                      View Standings
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* SCHEDULE */}
        {activeTab === 'schedule' && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg">
              <span className="text-sm font-medium text-gray-600">Season:</span>
              <Select value={seasonYear} onValueChange={value => { const p = new URLSearchParams(searchParams); p.set('seasonYear', value); setSearchParams(p); }}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>{availableYears.map(y => <SelectItem key={y} value={y.toString()}>{y}{y === CURRENT_YEAR ? ' (Current)' : ''}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <section className="bg-white border border-gray-200 rounded-lg p-8">
              <h2 className="text-2xl font-bold text-[#232323] mb-6">Event Schedule — {seasonYear}</h2>
              {seasonEvents.length === 0 ? (
                <p className="text-gray-500 text-sm">No events scheduled for this season yet.</p>
              ) : (
                <div className="space-y-3">
                  {seasonEvents.map(event => {
                    const track = tracksMap[event.track_id];
                    const statusColors = { Draft: 'bg-gray-100 text-gray-700', Published: 'bg-blue-100 text-blue-700', Live: 'bg-green-100 text-green-700', completed: 'bg-gray-100 text-gray-600' };
                    return (
                      <div key={event.id} className="border border-gray-200 rounded-lg p-4 hover:border-[#00FFDA] transition-colors">
                        <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-[#232323]">{event.name}</h3>
                              <Badge className={statusColors[event.status] || 'bg-gray-100 text-gray-700'}>{event.status}</Badge>
                            </div>
                            <div className="text-sm text-gray-600">{track?.name || 'N/A'} • {safeDateFormat(event.event_date)}{event.end_date && event.end_date !== event.event_date ? ` - ${safeDateFormat(event.end_date)}` : ''}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Link to={`${createPageUrl('EventProfile')}?id=${event.id}`}>
                              <Button variant="outline" size="sm" className="text-xs">View Event</Button>
                            </Link>
                            {isAdmin && (
                              <Link to={`${createPageUrl('RegistrationDashboard')}?orgType=series&orgId=${series.id}&seasonYear=${seasonYear}&eventId=${event.id}`}>
                                <Button variant="outline" size="sm" className="text-xs">Manage</Button>
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {/* STANDINGS */}
        {activeTab === 'standings' && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg">
              <span className="text-sm font-medium text-gray-600">Season:</span>
              <Select value={seasonYear} onValueChange={value => { const p = new URLSearchParams(searchParams); p.set('seasonYear', value); setSearchParams(p); }}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>{availableYears.map(y => <SelectItem key={y} value={y.toString()}>{y}{y === CURRENT_YEAR ? ' (Current)' : ''}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <section className="bg-white border border-gray-200 rounded-lg p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-[#232323]">Standings — {seasonYear}</h2>
                {activeClasses.length > 0 && (
                  <Select value={activeClassName} onValueChange={setSelectedClassName}>
                    <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>{activeClasses.map(cls => <SelectItem key={cls.id} value={cls.class_name}>{cls.class_name}</SelectItem>)}</SelectContent>
                  </Select>
                )}
              </div>
              {seasonStandings.length === 0 ? (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 text-gray-600">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm">No standings calculated yet for this class and season.</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto mb-4">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-2 font-semibold text-gray-600">#</th>
                        <th className="text-left py-3 px-2 font-semibold text-gray-600">Driver</th>
                        <th className="text-right py-3 px-2 font-semibold text-gray-600">Points</th>
                        <th className="text-right py-3 px-2 font-semibold text-gray-600">Wins</th>
                        <th className="text-right py-3 px-2 font-semibold text-gray-600">Podiums</th>
                      </tr></thead>
                      <tbody>
                        {seasonStandings.map(stand => (
                          <tr key={stand.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-2 font-semibold text-[#232323]">{stand.position}</td>
                            <td className="py-3 px-2 font-medium text-[#232323]">{stand.driver_name || 'N/A'}</td>
                            <td className="py-3 px-2 text-right font-semibold text-[#232323]">{stand.total_points}</td>
                            <td className="py-3 px-2 text-right">{stand.wins || 0}</td>
                            <td className="py-3 px-2 text-right">{stand.podiums || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex gap-2">
                    <Link to={`${createPageUrl('StandingsHome')}?seriesId=${series.id}&seasonYear=${seasonYear}&className=${activeClassName}`}>
                      <Button variant="outline" size="sm">View Full Standings</Button>
                    </Link>
                    {isAdmin && (
                      <Link to={`${createPageUrl('RegistrationDashboard')}?orgType=series&orgId=${series.id}&seasonYear=${seasonYear}&tab=PointsAndStandings`}>
                        <Button variant="outline" size="sm">Manage Points</Button>
                      </Link>
                    )}
                  </div>
                </>
              )}
            </section>
          </div>
        )}

        {/* MEDIA */}
        {activeTab === 'media' && (
          <section className="bg-white border border-gray-200 rounded-lg p-8">
            <PublicMediaGallery targetType={['series_feed', 'event_recap']} targetEntityId={series?.id} title="Media" />
          </section>
        )}

        <ProfileClaimFooter entityType="Series" entityId={series?.id} entityName={series.name} />
      </div>
    </PageShell>
  );
}