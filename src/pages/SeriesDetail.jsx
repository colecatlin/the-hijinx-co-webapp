import React, { useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import PageShell from '@/components/shared/PageShell';
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
import { format, parseISO } from 'date-fns';
import { ExternalLink, Globe, Instagram, Twitter, Youtube, Facebook, Calendar, MapPin, TrendingUp, Share2, Flag, BarChart3, AlertCircle } from 'lucide-react';
import { createPageUrl } from '@/components/utils';
import SocialShareButtons from '@/components/shared/SocialShareButtons';
import CompetitionLevelBadge from '@/components/competition/CompetitionLevelBadge';
import GeographicScopeTag from '@/components/competition/GeographicScopeTag';
import SeriesNameHistory from '@/components/series/SeriesNameHistory';

export default function SeriesDetail() {
  const [searchParams, setSearchParams] = useSearchParams();
  const seriesSlug = searchParams.get('slug') || searchParams.get('id');
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedClassName, setSelectedClassName] = useState('');

  const { data: series, isLoading } = useQuery({
    queryKey: ['series', seriesSlug],
    queryFn: async () => {
      const all = await base44.entities.Series.list();
      return all.find(s => s.slug === seriesSlug || s.id === seriesSlug);
    },
    enabled: !!seriesSlug,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['seriesEvents', series?.id],
    queryFn: async () => {
      const allEvents = await base44.entities.Event.list('event_date', 500);
      const names = [series.name, series.full_name].filter(Boolean).map(n => n.toLowerCase().trim());
      return allEvents.filter(e => {
        if (!e.series) return false;
        const evSeries = e.series.toLowerCase().trim();
        return names.some(n => n === evSeries || n.includes(evSeries) || evSeries.includes(n));
      });
    },
    enabled: !!series?.id,
  });

  const seasonYear = searchParams.get('seasonYear') || new Date().getFullYear().toString();
  
  const { data: seriesClasses = [] } = useQuery({
    queryKey: ['seriesClasses', series?.id],
    queryFn: () => base44.entities.SeriesClass.filter({ series_id: series.id }),
    enabled: !!series?.id,
  });

  const { data: allEvents = [] } = useQuery({
    queryKey: ['allEvents'],
    queryFn: () => base44.entities.Event.list(),
  });

  const { data: allTracks = [] } = useQuery({
    queryKey: ['allTracks'],
    queryFn: () => base44.entities.Track.list(),
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => base44.entities.Session.list(),
  });

  const { data: results = [] } = useQuery({
    queryKey: ['results'],
    queryFn: () => base44.entities.Results.list(),
  });

  const { data: standings = [] } = useQuery({
    queryKey: ['standings'],
    queryFn: () => base44.entities.Standings.list(),
  });

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

  if (!series) {
    return (
      <PageShell>
        <div className="bg-white min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-black mb-2">Series Not Found</h1>
            <p className="text-gray-600">The series you're looking for doesn't exist.</p>
            <Link to={createPageUrl('SeriesHome')} className="text-sm text-blue-600 underline mt-4 inline-block">Back to Series</Link>
          </div>
        </div>
      </PageShell>
    );
  }

  const sections = [
    { id: 'overview', label: 'Overview', icon: MapPin },
    { id: 'history', label: 'History', icon: TrendingUp },
    { id: 'classes', label: 'Classes', icon: Flag },
    { id: 'schedule', label: 'Schedule', icon: Calendar },
  ];

  const displayLevel = series.override_competition_level || series.derived_competition_level;
  const isOverride = !!series.override_competition_level;
  const activeClasses = seriesClasses.filter(c => c.active !== false);

  const upcomingEvents = events.filter(e => e.status === 'upcoming' || e.status === 'in_progress');
  const pastEvents = events.filter(e => e.status === 'completed' || e.status === 'cancelled');

  return (
    <PageShell className="bg-white">
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
            {/* Competition classification strip */}
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

            {/* Socials row */}
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
                    <div className="text-lg font-semibold text-[#232323]">{events.length}</div>
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
            <div className="absolute -top-12 right-0 z-10">
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
                    <div className="text-4xl font-black mb-2">{series.name.substring(0, 3).toUpperCase()}</div>
                    <div className="text-xs">No logo uploaded</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* History section */}
        <div id="section-history" className="space-y-4 mb-4">
          <SeriesNameHistory series={series} />
        </div>

        {/* Classes section */}
        <div id="section-classes" className="space-y-4">
          <section className="bg-white border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-[#232323] mb-6">Racing Classes</h2>
            {seriesClasses.length === 0 ? (
              <p className="text-gray-500 text-sm">No classes defined for this series yet.</p>
            ) : (
              <div className="space-y-3">
                {seriesClasses.map(cls => {
                  const scoreTotal = ['media_score','attendance_score','purse_score','manufacturer_score','geographic_diversity_score','team_budget_score']
                    .reduce((sum, k) => sum + (Number(cls[k]) || 0), 0);
                  return (
                    <div key={cls.id} className="border border-gray-100 rounded-lg p-4">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="font-semibold text-[#232323]">{cls.class_name}</span>
                        {cls.competition_level && <CompetitionLevelBadge level={cls.competition_level} size="sm" />}
                        {cls.geographic_scope && <GeographicScopeTag scope={cls.geographic_scope} size="sm" />}
                        {scoreTotal > 0 && (
                          <span className="text-[11px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-mono">Score: {scoreTotal}</span>
                        )}
                        {!cls.active && (
                          <span className="text-[11px] bg-red-50 text-red-500 px-2 py-0.5 rounded-full">Inactive</span>
                        )}
                      </div>
                      {cls.description_summary && <p className="text-sm text-gray-600">{cls.description_summary}</p>}
                      {cls.vehicle_type && <p className="text-xs text-gray-400 mt-1">Vehicle: {cls.vehicle_type}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Schedule section */}
        <div id="section-schedule" className="space-y-4">
          <section className="bg-white border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-[#232323] mb-6">Full Schedule</h2>
            {events.length === 0 ? (
              <p className="text-gray-500 text-sm">No events scheduled yet.</p>
            ) : (
              <div className="space-y-2">
                {events.map(event => (
                  <div key={event.id} className="border border-gray-200 p-4 flex flex-col md:flex-row md:items-center gap-4 hover:border-gray-400 transition-colors">
                    <div className="w-16 text-center shrink-0">
                      {event.event_date && (
                        <>
                          <div className="font-mono text-[10px] text-gray-400 uppercase">{format(parseISO(event.event_date), 'MMM')}</div>
                          <div className="text-2xl font-black">{format(parseISO(event.event_date), 'd')}</div>
                        </>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-bold">{event.name}</div>
                      {event.location_note && (
                        <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                          <MapPin className="w-3 h-3" /> {event.location_note}
                        </div>
                      )}
                    </div>
                    <span className={`text-[10px] font-mono uppercase px-2 py-1 ${
                      event.status === 'upcoming' ? 'bg-blue-100 text-blue-700' :
                      event.status === 'completed' ? 'bg-gray-100 text-gray-600' :
                      event.status === 'in_progress' ? 'bg-green-100 text-green-700' :
                      'bg-red-100 text-red-600'
                    }`}>
                      {event.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </PageShell>
  );
}