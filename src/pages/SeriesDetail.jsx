import React, { useState, useMemo, useEffect } from 'react';
import SeoMeta, { buildEntityTitle, SITE_FALLBACK_IMAGE } from '@/components/system/seoMeta';
import Analytics from '@/components/system/analyticsTracker';
import { useSearchParams, useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getSeriesDetailData } from '@/components/entities/publicPageDataApi';
import { isPublicVisible } from '@/components/core/publishModel';
import PageShell from '@/components/shared/PageShell';
import { EntityNotFound } from '@/components/data/EntityNotFoundState';

import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format, parseISO, isValid } from 'date-fns';
import { ExternalLink, Globe, Instagram, Twitter, Youtube, Facebook, Calendar, MapPin, TrendingUp, Share2, Flag, BarChart3, AlertCircle } from 'lucide-react';
import { createPageUrl } from '@/components/utils';
import SocialShareButtons from '@/components/shared/SocialShareButtons';
import ClaimEntityButton from '@/components/onboarding/ClaimEntityButton';
import CompetitionLevelBadge from '@/components/competition/CompetitionLevelBadge';
import GeographicScopeTag from '@/components/competition/GeographicScopeTag';
import SeriesNameHistory from '@/components/series/SeriesNameHistory';
import PublicMediaGallery from '@/components/media/PublicMediaGallery';

function safeDateFormat(dateStr, fmt = 'MMM d, yyyy') {
  if (!dateStr) return 'TBA';
  try {
    const d = parseISO(dateStr);
    return isValid(d) ? format(d, fmt) : 'TBA';
  } catch {
    return 'TBA';
  }
}

// Route wrapper for /series/:slug path-based routing
export function SeriesDetailRouteWrapper() {
  const { slug } = useParams();
  return <SeriesDetail overrideSlug={slug} />;
}

export default function SeriesDetail({ overrideSlug } = {}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const seriesSlug = overrideSlug || (searchParams.get('slug') || searchParams.get('id') || '').trim() || null;
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedClassName, setSelectedClassName] = useState('');

  const { data: profileData, isLoading } = useQuery({
    queryKey: ['seriesDetailData', seriesSlug],   // stable — matches QueryKeys.profiles.series(seriesSlug)
    queryFn: () => getSeriesDetailData({ id: seriesSlug, slug: seriesSlug }),
    enabled: !!seriesSlug,
  });

  const series    = profileData?.series    ?? null;
  const classes   = profileData?.classes   ?? [];
  const allEvents = profileData?.events    ?? [];
  const allTracks = profileData?.tracks    ?? [];
  const sessions  = profileData?.sessions  ?? [];
  const results   = profileData?.results   ?? [];
  const standings = profileData?.standings ?? [];

  const seasonYear = searchParams.get('seasonYear') || new Date().getFullYear().toString();

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

  const sections = [
    { id: 'overview', label: 'Overview', icon: MapPin },
    { id: 'history', label: 'History', icon: TrendingUp },
    { id: 'classes', label: 'Classes', icon: Flag },
    { id: 'schedule', label: 'Schedule', icon: Calendar },
  ];

  const displayLevel = series.override_competition_level || series.derived_competition_level;
  const isOverride = !!series.override_competition_level;
  const activeClasses = classes.filter(c => c.active !== false);

  // Public-visible events
  const publicEvents = allEvents.filter(e => isPublicVisible('Event', e));

  // Season-filtered events
  const seasonEvents = useMemo(() => {
    return allEvents
      .filter(e => e.season === seasonYear && isPublicVisible('Event', e))
      .sort((a, b) => (a.event_date || '').localeCompare(b.event_date || ''));
  }, [allEvents, seasonYear]);

  const tracksMap = useMemo(() => {
    const map = {};
    allTracks.forEach(t => { if (t?.id) map[t.id] = t; });
    return map;
  }, [allTracks]);

  const seasonSessions = useMemo(() => {
    const seasonEventIds = new Set(seasonEvents.map(e => e.id));
    return sessions.filter(s => seasonEventIds.has(s.event_id));
  }, [sessions, seasonEvents]);

  const officialSessions = useMemo(() => {
    return seasonSessions.filter(s => ['Official', 'Locked'].includes(s.status));
  }, [seasonSessions]);

  const seasonResults = useMemo(() => {
    const seasonEventIds = new Set(seasonEvents.map(e => e.id));
    return results.filter(r => seasonEventIds.has(r.event_id));
  }, [results, seasonEvents]);

  const activeClassName = selectedClassName || (activeClasses[0]?.class_name || '');

  const seasonStandings = useMemo(() => {
    return standings
      .filter(s =>
        s.series_id === series?.id &&
        s.season_year === seasonYear &&
        s.class_name === activeClassName
      )
      .sort((a, b) => (a.position || 999) - (b.position || 999))
      .slice(0, 10);
  }, [standings, series?.id, seasonYear, activeClassName]);

  const seriesImg = series.banner_url || series.logo_url || SITE_FALLBACK_IMAGE;
  const seriesDesc = [
    series.discipline || '',
    series.geographic_scope || '',
    series.sanctioning_body ? `Sanctioned by ${series.sanctioning_body}` : '',
  ].filter(Boolean).join(' · ') || `${series.name} racing series on HIJINX.`;

  return (
    <PageShell className="bg-white">
      <SeoMeta
        title={buildEntityTitle(series.name, 'Series')}
        description={series.description || seriesDesc}
        image={seriesImg}
      />
      {series.banner_url && (
        <div className="w-full h-[400px] relative overflow-hidden">
          <img src={series.banner_url} alt={series.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-4">
          <Link to={createPageUrl('SeriesHome')} className="text-sm text-gray-600 hover:text-[#00FFDA]">
            ← Back to Series
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6 items-start">
          <div className="lg:col-span-2">
            <Separator className="mb-3" />
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="text-4xl font-black text-[#232323] leading-none">{series.name}</h1>
            </div>

            {(displayLevel || series.geographic_scope) && (
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                {displayLevel && <CompetitionLevelBadge level={displayLevel} isOverride={isOverride} size="md" />}
                {series.geographic_scope && <GeographicScopeTag scope={series.geographic_scope} size="md" />}
                {isOverride && series.override_reason && (
                  <span className="text-xs text-gray-400 italic">Override: {series.override_reason}</span>
                )}
              </div>
            )}

            {series.title_sponsor_name && (
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-gray-400 uppercase tracking-widest font-medium">Presented by</span>
                {series.title_sponsor_url ? (
                  <a href={series.title_sponsor_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    {series.title_sponsor_logo_url
                      ? <img src={series.title_sponsor_logo_url} alt={series.title_sponsor_name} className="h-5 object-contain" />
                      : <span className="text-sm font-bold text-[#232323]">{series.title_sponsor_name}</span>
                    }
                  </a>
                ) : (
                  <div className="flex items-center gap-2">
                    {series.title_sponsor_logo_url
                      ? <img src={series.title_sponsor_logo_url} alt={series.title_sponsor_name} className="h-5 object-contain" />
                      : <span className="text-sm font-bold text-[#232323]">{series.title_sponsor_name}</span>
                    }
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-1 overflow-x-auto border-b border-gray-200 mb-3">
              {sections.map(section => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => {
                      setActiveTab(section.id);
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
                      activeTab === section.id
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

            <div className="flex items-center gap-3 mb-3">
              {series.website_url && (
                <a href={series.website_url} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-[#232323] transition-colors">
                  <Globe className="w-4 h-4" />
                </a>
              )}
              {series.social_instagram && (
                <a href={`https://instagram.com/${series.social_instagram.replace('@','')}`} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-[#232323] transition-colors">
                  <Instagram className="w-4 h-4" />
                </a>
              )}
              {series.social_x && (
                <a href={`https://x.com/${series.social_x.replace('@','')}`} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-[#232323] transition-colors">
                  <Twitter className="w-4 h-4" />
                </a>
              )}
              {series.social_youtube && (
                <a href={series.social_youtube} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-[#232323] transition-colors">
                  <Youtube className="w-4 h-4" />
                </a>
              )}
              {series.social_facebook && (
                <a href={series.social_facebook} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-[#232323] transition-colors">
                  <Facebook className="w-4 h-4" />
                </a>
              )}
            </div>

            <Separator className="mb-3" />

            <div className="bg-white p-8 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  {series.discipline && (
                    <div className="mb-4">
                      <div className="text-sm text-gray-600 mb-1">Discipline</div>
                      <div className="text-lg font-semibold text-[#232323]">{series.discipline}</div>
                    </div>
                  )}
                  {series.region && (
                    <div className="mb-4">
                      <div className="text-sm text-gray-600 mb-1">Region</div>
                      <div className="text-lg font-semibold text-[#232323]">{series.region}</div>
                    </div>
                  )}
                  {series.series_level && (
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Level</div>
                      <div className="text-lg font-semibold text-[#232323]">{series.series_level}</div>
                    </div>
                  )}
                </div>
                <div>
                  {series.sanctioning_body && (
                    <div className="mb-4">
                      <div className="text-sm text-gray-600 mb-1">Sanctioning Body</div>
                      <div className="text-lg font-semibold text-[#232323]">{series.sanctioning_body}</div>
                    </div>
                  )}
                  {series.season_year && (
                    <div className="mb-4">
                      <div className="text-sm text-gray-600 mb-1">Season</div>
                      <div className="text-lg font-semibold text-[#232323]">{series.season_year}</div>
                    </div>
                  )}
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Events</div>
                    <div className="text-lg font-semibold text-[#232323]">{publicEvents.length}</div>
                  </div>
                </div>
              </div>
              {series.description && (
                <p className="text-gray-700 leading-relaxed mt-4">{series.description}</p>
              )}
              <div className="flex flex-wrap gap-2 mt-4">
                <Badge className={series.status === 'Active' ? 'bg-[#00FFDA] text-[#232323]' : 'bg-gray-200 text-gray-700'}>
                  {series.status}
                </Badge>
              </div>
            </div>
          </div>

          <div className="space-y-6 relative -mt-1">
            <div className="absolute -top-12 right-0 z-10 flex items-center gap-2">
              <ClaimEntityButton entityType="Series" entityId={series?.id} entityName={series.name} />
              <SocialShareButtons
                url={window.location.href}
                title={`${series.name} - Series`}
                description={series.description}
              />
            </div>
            <div className="bg-white">
              {series.logo_url ? (
                <div className="w-full bg-gray-50 border border-gray-200 flex items-center justify-center p-8" style={{minHeight: 240}}>
                  <img src={series.logo_url} alt={series.name} className="max-w-full max-h-48 object-contain" />
                </div>
              ) : (
                <div className="w-full bg-gray-50 border border-gray-200 flex items-center justify-center" style={{minHeight: 240}}>
                  <div className="text-center text-gray-400">
                    <div className="text-4xl font-black mb-2">{(series.name || '').substring(0, 3).toUpperCase()}</div>
                    <div className="text-xs">No logo uploaded</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Season Selector */}
        <div className="bg-white border-b border-gray-200 p-6 mb-6 sticky top-0 z-30">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <span className="text-sm font-medium text-gray-600">Season:</span>
            <Select value={seasonYear} onValueChange={(value) => {
              const params = new URLSearchParams(searchParams);
              params.set('seasonYear', value);
              setSearchParams(params);
            }}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2025, 2026, 2027, 2028].map(year => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div id="section-history" className="space-y-4 mb-4">
          <SeriesNameHistory series={series} />
        </div>

        <div id="section-classes" className="space-y-4">
          <section className="bg-white border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-[#232323] mb-6">Racing Classes</h2>
            {activeClasses.length === 0 ? (
              <p className="text-gray-500 text-sm">No classes defined for this series yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeClasses.map(cls => (
                  <div key={cls.id} className="border border-gray-200 rounded-lg p-4 hover:border-[#00FFDA] transition-colors">
                    <div className="mb-3">
                      <div className="font-semibold text-[#232323] mb-2">{cls.class_name}</div>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {cls.competition_level && <CompetitionLevelBadge level={cls.competition_level} size="sm" />}
                        {cls.geographic_scope && <GeographicScopeTag scope={cls.geographic_scope} size="sm" />}
                      </div>
                      {cls.vehicle_type && <p className="text-xs text-gray-500">Vehicle: {cls.vehicle_type}</p>}
                    </div>
                    {cls.description_summary && <p className="text-sm text-gray-600 mb-3">{cls.description_summary}</p>}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => {
                        setSelectedClassName(cls.class_name);
                        const element = document.getElementById('section-standings');
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                      }}
                    >
                      View Standings
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div id="section-schedule" className="space-y-4 mb-6">
          <section className="bg-white border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-[#232323] mb-6">Event Schedule - {seasonYear}</h2>
            {seasonEvents.length === 0 ? (
              <p className="text-gray-500 text-sm">No events scheduled for this season yet.</p>
            ) : (
              <div className="space-y-3">
                {seasonEvents.map(event => {
                  const track = tracksMap[event.track_id];
                  const statusColors = {
                    'Draft': 'bg-gray-100 text-gray-700',
                    'Published': 'bg-blue-100 text-blue-700',
                    'Live': 'bg-green-100 text-green-700',
                    'completed': 'bg-gray-100 text-gray-600',
                  };
                  return (
                    <div key={event.id} className="border border-gray-200 rounded-lg p-4 hover:border-[#00FFDA] transition-colors">
                      <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-[#232323]">{event.name}</h3>
                            <Badge className={statusColors[event.status] || 'bg-gray-100 text-gray-700'}>
                              {event.status}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-600">
                            {track?.name || 'N/A'} • {safeDateFormat(event.event_date)}
                            {event.end_date && event.end_date !== event.event_date && ` - ${safeDateFormat(event.end_date)}`}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Link to={`${createPageUrl('EventProfile')}?id=${event.id}`}>
                            <Button variant="outline" size="sm" className="text-xs">View Event</Button>
                          </Link>
                          <Link to={`${createPageUrl('RegistrationDashboard')}?orgType=series&orgId=${series.id}&seasonYear=${seasonYear}&eventId=${event.id}`}>
                            <Button variant="outline" size="sm" className="text-xs">Manage</Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <div id="section-standings" className="space-y-4 mb-6">
          <section className="bg-white border border-gray-200 p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-[#232323]">Standings Preview</h2>
              {activeClasses.length > 0 && (
                <Select value={activeClassName} onValueChange={setSelectedClassName}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {activeClasses.map(cls => (
                      <SelectItem key={cls.id} value={cls.class_name}>
                        {cls.class_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
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
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-2 font-semibold text-gray-600">#</th>
                        <th className="text-left py-3 px-2 font-semibold text-gray-600">Driver</th>
                        <th className="text-right py-3 px-2 font-semibold text-gray-600">Points</th>
                        <th className="text-right py-3 px-2 font-semibold text-gray-600">Wins</th>
                        <th className="text-right py-3 px-2 font-semibold text-gray-600">Podiums</th>
                      </tr>
                    </thead>
                    <tbody>
                      {seasonStandings.map(stand => (
                        <tr key={stand.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-2 font-semibold text-[#232323]">{stand.position}</td>
                          <td className="py-3 px-2">
                            <div className="font-medium text-[#232323]">{stand.driver_name || 'N/A'}</div>
                          </td>
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
                  <Link to={`${createPageUrl('RegistrationDashboard')}?orgType=series&orgId=${series.id}&seasonYear=${seasonYear}&tab=PointsAndStandings`}>
                    <Button variant="outline" size="sm">Manage Points</Button>
                  </Link>
                </div>
              </>
            )}
          </section>
        </div>

        <div className="mb-6">
          <section className="bg-white border border-gray-200 p-8">
            <PublicMediaGallery
              targetType={['series_feed', 'event_recap']}
              targetEntityId={series?.id}
              title="Media"
            />
          </section>
        </div>

        <div className="mb-6">
          <section className="bg-white border border-gray-200 p-8">
            <h3 className="text-lg font-bold text-[#232323] mb-4">Season Data Health</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-black text-[#232323]">{seasonEvents.length}</div>
                <div className="text-xs text-gray-600 uppercase tracking-wide mt-1">Events</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-black text-[#232323]">{seasonSessions.length}</div>
                <div className="text-xs text-gray-600 uppercase tracking-wide mt-1">Sessions</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-black text-[#232323]">{officialSessions.length}</div>
                <div className="text-xs text-gray-600 uppercase tracking-wide mt-1">Official/Locked</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-black text-[#232323]">
                  {seasonSessions.length > 0 ? Math.round((officialSessions.length / seasonSessions.length) * 100) : 0}%
                </div>
                <div className="text-xs text-gray-600 uppercase tracking-wide mt-1">Results Coverage</div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </PageShell>
  );
}