import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import PageShell from '@/components/shared/PageShell';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format, parseISO } from 'date-fns';
import { ExternalLink, Globe, Instagram, Twitter, Youtube, Facebook, Calendar, MapPin, TrendingUp, Share2, Flag } from 'lucide-react';
import { createPageUrl } from '@/components/utils';
import SocialShareButtons from '@/components/shared/SocialShareButtons';

export default function SeriesDetail() {
  const [searchParams] = useSearchParams();
  const slug = searchParams.get('slug');
  const [activeTab, setActiveTab] = useState('overview');

  const { data: series, isLoading } = useQuery({
    queryKey: ['series', slug],
    queryFn: async () => {
      const all = await base44.entities.Series.list();
      return all.find(s => s.slug === slug);
    },
    enabled: !!slug,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['seriesEvents', series?.name],
    queryFn: () => base44.entities.Event.filter({ series: series.name }, 'event_date', 100),
    enabled: !!series?.name,
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

  const tabs = ['overview', 'schedule'];

  const upcomingEvents = events.filter(e => e.status === 'upcoming' || e.status === 'in_progress');
  const pastEvents = events.filter(e => e.status === 'completed' || e.status === 'cancelled');

  return (
    <PageShell>
      <div className="bg-white">
        {/* Header */}
        <div className="bg-[#0A0A0A] text-white pt-12 pb-16">
          <div className="max-w-7xl mx-auto px-6">
            <Link to={createPageUrl('SeriesHome')} className="text-xs font-mono text-gray-500 hover:text-white mb-6 inline-block tracking-wider">
              ← SERIES
            </Link>
            <div className="flex items-start gap-6">
              {series.logo_url && (
                <img src={series.logo_url} alt={series.name} className="w-20 h-20 object-contain bg-white rounded-lg p-2 shrink-0" />
              )}
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <span className="font-mono text-[10px] tracking-[0.2em] text-gray-500 uppercase">{series.discipline}</span>
                  <span className={`px-2 py-0.5 text-[10px] font-mono tracking-wider ${series.status === 'Active' ? 'bg-green-900 text-green-300' : 'bg-gray-800 text-gray-400'}`}>
                    {series.status}
                  </span>
                </div>
                <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-2">{series.name}</h1>
                {series.full_name && series.full_name !== series.name && (
                  <p className="text-gray-400 text-sm mb-3">{series.full_name}</p>
                )}
                {series.description && (
                  <p className="text-gray-400 text-sm max-w-2xl leading-relaxed">{series.description}</p>
                )}

                {/* Socials */}
                <div className="flex items-center gap-3 mt-4">
                  {series.website_url && (
                    <a href={series.website_url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                      <Globe className="w-4 h-4" />
                    </a>
                  )}
                  {series.social_instagram && (
                    <a href={`https://instagram.com/${series.social_instagram.replace('@','')}`} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                      <Instagram className="w-4 h-4" />
                    </a>
                  )}
                  {series.social_x && (
                    <a href={`https://x.com/${series.social_x.replace('@','')}`} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                      <Twitter className="w-4 h-4" />
                    </a>
                  )}
                  {series.social_youtube && (
                    <a href={series.social_youtube} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                      <Youtube className="w-4 h-4" />
                    </a>
                  )}
                  {series.social_facebook && (
                    <a href={series.social_facebook} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                      <Facebook className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap gap-8">
            {series.region && (
              <div>
                <div className="text-[10px] font-mono tracking-wider text-gray-400 uppercase">Region</div>
                <div className="text-sm font-semibold mt-0.5">{series.region}</div>
              </div>
            )}
            {series.series_level && (
              <div>
                <div className="text-[10px] font-mono tracking-wider text-gray-400 uppercase">Level</div>
                <div className="text-sm font-semibold mt-0.5">{series.series_level}</div>
              </div>
            )}
            {series.sanctioning_body && (
              <div>
                <div className="text-[10px] font-mono tracking-wider text-gray-400 uppercase">Sanctioning Body</div>
                <div className="text-sm font-semibold mt-0.5">{series.sanctioning_body}</div>
              </div>
            )}
            {series.season_year && (
              <div>
                <div className="text-[10px] font-mono tracking-wider text-gray-400 uppercase">Season</div>
                <div className="text-sm font-semibold mt-0.5">{series.season_year}</div>
              </div>
            )}
            <div>
              <div className="text-[10px] font-mono tracking-wider text-gray-400 uppercase">Events</div>
              <div className="text-sm font-semibold mt-0.5">{events.length}</div>
            </div>
          </div>
        </div>

        {/* Nav tabs */}
        <div className="border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex gap-0">
              {tabs.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-3 text-xs font-medium uppercase tracking-wider transition-colors ${
                    activeTab === tab
                      ? 'text-[#0A0A0A] border-b-2 border-[#0A0A0A]'
                      : 'text-gray-500 hover:text-[#0A0A0A]'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-6 py-10">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {series.description && (
                <div>
                  <h2 className="text-lg font-black tracking-tight mb-3">About</h2>
                  <p className="text-sm text-gray-600 leading-relaxed">{series.description}</p>
                </div>
              )}
              <div className="space-y-4">
                {upcomingEvents.length > 0 && (
                  <div>
                    <h2 className="text-lg font-black tracking-tight mb-3">Upcoming Events</h2>
                    <div className="space-y-2">
                      {upcomingEvents.slice(0, 5).map(event => (
                        <div key={event.id} className="border border-gray-200 p-3 flex items-center gap-3">
                          <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{event.name}</div>
                            <div className="text-xs text-gray-400">{event.event_date ? format(parseISO(event.event_date), 'MMM d, yyyy') : 'TBA'}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {upcomingEvents.length > 5 && (
                      <button onClick={() => setActiveTab('schedule')} className="text-xs text-gray-500 underline mt-2">
                        View all {upcomingEvents.length} events →
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'schedule' && (
            <div>
              <h2 className="text-lg font-black tracking-tight mb-6">Full Schedule</h2>
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
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}