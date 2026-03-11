import React, { useState, useEffect } from 'react';
import SeoMeta, { buildEntityTitle } from '@/components/system/seoMeta';
import Analytics from '@/components/system/analyticsTracker';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { getTrackProfileData } from '@/components/entities/publicPageDataApi';
import PageShell from '@/components/shared/PageShell';
import { EntityNotFound } from '@/components/data/EntityNotFoundState';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  MapPin, ExternalLink, Mail, Phone, Calendar,
  Trophy, Camera, ChevronRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { buildProfileUrl } from '@/components/utils/routingContract';
import { format, parseISO } from 'date-fns';
import ScheduleSection from '@/components/schedule/ScheduleSection';
import PublicMediaGallery from '@/components/media/PublicMediaGallery';
import ResultsPanel from '@/components/results/ResultsPanel';
import TrackEventsPanel from '@/components/tracks/TrackEventsPanel';

const TABS = [
  { id: 'overview', label: 'Overview', icon: MapPin },
  { id: 'events',   label: 'Events',   icon: Calendar },
  { id: 'results',  label: 'Results',  icon: Trophy },
  { id: 'schedule', label: 'Schedule', icon: Calendar },
  { id: 'media',    label: 'Media',    icon: Camera },
];

export default function TrackProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  const trackSlug = (urlParams.get('slug') || urlParams.get('id') || '').trim() || null;
  const [activeTab, setActiveTab] = useState('overview');

  const { data: profileData, isLoading } = useQuery({
    queryKey: ['trackProfileData', trackSlug],
    queryFn: () => getTrackProfileData({ id: trackSlug, slug: trackSlug }),
    enabled: !!trackSlug,
  });

  const track   = profileData?.track  ?? null;
  const events  = profileData?.events  ?? [];
  const series  = profileData?.series  ?? [];

  useEffect(() => {
    if (track) Analytics.profileViewTrack?.(track.id, track.name, track.location_state);
  }, [track?.id]);

  const handleCalendarCreated = async (calendarId) => {
    await base44.functions.invoke('saveEntityCalendarId', {
      entityType: 'Track', entityId: track.id, calendarId,
    });
  };

  if (isLoading) {
    return (
      <PageShell className="bg-white">
        <div className="max-w-7xl mx-auto px-6 py-12 space-y-6">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-80 w-full" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-10 w-80" />
              <Skeleton className="h-40" />
              <Skeleton className="h-40" />
            </div>
            <Skeleton className="h-64" />
          </div>
        </div>
      </PageShell>
    );
  }

  if (!track) return <EntityNotFound entityType="Track" />;

  const location = [track.location_city, track.location_state, track.location_country]
    .filter(Boolean).join(', ');

  const upcomingEvents = events
    .filter(e => new Date(e.event_date) >= new Date())
    .sort((a, b) => new Date(a.event_date) - new Date(b.event_date));

  const pastEvents = events
    .filter(e => new Date(e.event_date) < new Date())
    .sort((a, b) => new Date(b.event_date) - new Date(a.event_date));

  const firstPublicEventId = events.find(
    e => e.published_flag || ['Published', 'Completed', 'Live'].includes(e.status)
  )?.id;

  const heroImage = track.image_url || track.logo_url;

  return (
    <PageShell className="bg-white">
      <SeoMeta
        title={buildEntityTitle(track.name, 'Track Profile')}
        description={track.description || `${track.name} — ${location}`}
        image={heroImage}
      />

      {/* Back nav */}
      <div className="max-w-7xl mx-auto px-6 pt-4">
        <Link
          to={createPageUrl('TrackDirectory')}
          className="text-sm text-gray-500 hover:text-[#232323] transition-colors"
        >
          ← Tracks
        </Link>
      </div>

      {/* Hero */}
      {heroImage ? (
        <div className="w-full h-72 md:h-[380px] relative overflow-hidden mt-3">
          <img src={heroImage} alt={track.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
            <div className="max-w-7xl mx-auto">
              <h1 className="text-4xl md:text-5xl font-black text-white leading-none mb-3">
                {track.name}
              </h1>
              <div className="flex flex-wrap items-center gap-2">
                {location && (
                  <span className="flex items-center gap-1 text-white/80 text-sm">
                    <MapPin className="w-3.5 h-3.5" />
                    {location}
                  </span>
                )}
                {track.track_type && (
                  <Badge className="bg-white/20 text-white border border-white/30 text-xs">
                    {track.track_type}
                  </Badge>
                )}
                {track.surface_type && (
                  <Badge className="bg-white/20 text-white border border-white/30 text-xs">
                    {track.surface_type}
                  </Badge>
                )}
                {track.status && (
                  <Badge
                    className={
                      track.status === 'Active'
                        ? 'bg-[#00FFDA] text-[#232323] text-xs'
                        : 'bg-white/20 text-white border border-white/30 text-xs'
                    }
                  >
                    {track.status}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-6 pt-6 pb-0">
          <h1 className="text-4xl font-black text-[#232323] mb-2">{track.name}</h1>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {location && (
              <span className="flex items-center gap-1 text-gray-600 text-sm">
                <MapPin className="w-3.5 h-3.5" />
                {location}
              </span>
            )}
            {track.track_type && <Badge variant="outline" className="text-xs">{track.track_type}</Badge>}
            {track.surface_type && <Badge variant="outline" className="text-xs">{track.surface_type}</Badge>}
            {track.status && (
              <Badge
                variant="outline"
                className={`text-xs ${track.status === 'Active' ? 'border-green-500 text-green-600' : ''}`}
              >
                {track.status}
              </Badge>
            )}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Tab nav */}
        <div className="flex gap-0 border-b border-gray-200 mb-8 overflow-x-auto scrollbar-hide">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold tracking-wide uppercase whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'text-[#232323] border-b-2 border-[#232323] -mb-px'
                    : 'text-gray-400 hover:text-[#232323]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content + Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2">

            {/* OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Specs grid */}
                <div>
                  <h2 className="text-xl font-bold text-[#232323] mb-4">Track Details</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {track.track_type && (
                      <div className="border border-gray-200 p-4">
                        <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Type</div>
                        <div className="font-semibold text-[#232323]">{track.track_type}</div>
                      </div>
                    )}
                    {track.surface_type && (
                      <div className="border border-gray-200 p-4">
                        <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Surface</div>
                        <div className="font-semibold text-[#232323]">{track.surface_type}</div>
                      </div>
                    )}
                    {track.length && (
                      <div className="border border-gray-200 p-4">
                        <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Length</div>
                        <div className="font-semibold text-[#232323]">{track.length} mi</div>
                      </div>
                    )}
                    {track.banking && (
                      <div className="border border-gray-200 p-4">
                        <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Banking</div>
                        <div className="font-semibold text-[#232323]">{track.banking}</div>
                      </div>
                    )}
                    {track.status && (
                      <div className="border border-gray-200 p-4">
                        <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Status</div>
                        <div className="font-semibold text-[#232323]">{track.status}</div>
                      </div>
                    )}
                    {location && (
                      <div className="border border-gray-200 p-4 col-span-2 md:col-span-1">
                        <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Location</div>
                        <div className="font-semibold text-[#232323] text-sm">{location}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                {track.description && (
                  <div>
                    <h2 className="text-xl font-bold text-[#232323] mb-3">About</h2>
                    <p className="text-gray-700 leading-relaxed">{track.description}</p>
                  </div>
                )}

                {/* Contact */}
                {(track.contact_email || track.phone || track.website_url) && (
                  <div>
                    <h2 className="text-xl font-bold text-[#232323] mb-4">Contact</h2>
                    <div className="space-y-3">
                      {track.website_url && (
                        <a
                          href={track.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-[#232323] hover:text-[#1A3249] transition-colors"
                        >
                          <ExternalLink className="w-4 h-4 text-gray-400" />
                          {track.website_url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                        </a>
                      )}
                      {track.contact_email && (
                        <a
                          href={`mailto:${track.contact_email}`}
                          className="flex items-center gap-2 text-sm text-[#232323] hover:text-[#1A3249] transition-colors"
                        >
                          <Mail className="w-4 h-4 text-gray-400" />
                          {track.contact_email}
                        </a>
                      )}
                      {track.phone && (
                        <a
                          href={`tel:${track.phone}`}
                          className="flex items-center gap-2 text-sm text-[#232323] hover:text-[#1A3249] transition-colors"
                        >
                          <Phone className="w-4 h-4 text-gray-400" />
                          {track.phone}
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Series at this track */}
                {series.length > 0 && (
                  <div>
                    <h2 className="text-xl font-bold text-[#232323] mb-4">Series Hosted</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {series.map(s => (
                        <Link
                          key={s.id}
                          to={buildProfileUrl('Series', s.slug || s.id)}
                          className="flex items-center justify-between border border-gray-200 p-4 hover:border-[#232323] transition-colors group"
                        >
                          <div>
                            <div className="font-medium text-[#232323] group-hover:text-[#1A3249] transition-colors">
                              {s.name}
                            </div>
                            {s.discipline && (
                              <div className="text-xs text-gray-500 mt-0.5">{s.discipline}</div>
                            )}
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#232323] transition-colors" />
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* EVENTS */}
            {activeTab === 'events' && (
              <TrackEventsPanel upcomingEvents={upcomingEvents} pastEvents={pastEvents} />
            )}

            {/* RESULTS */}
            {activeTab === 'results' && (
              <div>
                <h2 className="text-xl font-bold text-[#232323] mb-4">Results</h2>
                {firstPublicEventId ? (
                  <ResultsPanel eventId={firstPublicEventId} />
                ) : (
                  <div className="text-center py-12 border-2 border-dashed border-gray-200">
                    <Trophy className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm text-gray-500">No published results yet.</p>
                  </div>
                )}
              </div>
            )}

            {/* SCHEDULE */}
            {activeTab === 'schedule' && (
              <div>
                <h2 className="text-xl font-bold text-[#232323] mb-4">Race Schedule</h2>
                <ScheduleSection
                  entityType="Track"
                  entityId={track.id}
                  entityName={track.name}
                  calendarId={track.calendar_id}
                  onCalendarCreated={handleCalendarCreated}
                  isOwner={false}
                />
              </div>
            )}

            {/* MEDIA */}
            {activeTab === 'media' && (
              <PublicMediaGallery
                targetType="track_gallery"
                targetEntityId={track.id}
                title="Media Gallery"
              />
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick links */}
            {(track.website_url || track.contact_email || track.phone) && (
              <div className="border border-gray-200 p-5">
                <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-4">Quick Links</h3>
                <div className="space-y-3">
                  {track.website_url && (
                    <a
                      href={track.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm font-medium text-[#232323] hover:text-[#1A3249] transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                      Official Website
                    </a>
                  )}
                  {track.contact_email && (
                    <a
                      href={`mailto:${track.contact_email}`}
                      className="flex items-center gap-2 text-sm text-[#232323] hover:text-[#1A3249] transition-colors"
                    >
                      <Mail className="w-3.5 h-3.5 text-gray-400" />
                      {track.contact_email}
                    </a>
                  )}
                  {track.phone && (
                    <a
                      href={`tel:${track.phone}`}
                      className="flex items-center gap-2 text-sm text-[#232323] hover:text-[#1A3249] transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      {track.phone}
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Upcoming events quick list */}
            {upcomingEvents.length > 0 && (
              <div className="border border-gray-200 p-5">
                <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-4">
                  Upcoming Events
                </h3>
                <div className="space-y-3">
                  {upcomingEvents.slice(0, 3).map(event => (
                    <div key={event.id} className="flex items-start gap-3">
                      <div className="min-w-[40px] text-center bg-[#232323] text-white p-1.5 flex-shrink-0">
                        <div className="text-[9px] font-mono uppercase leading-none">
                          {format(parseISO(event.event_date), 'MMM')}
                        </div>
                        <div className="text-lg font-black leading-none">
                          {format(parseISO(event.event_date), 'd')}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-[#232323] truncate">{event.name}</div>
                        {event.series_name && (
                          <div className="text-xs text-gray-400 truncate">{event.series_name}</div>
                        )}
                      </div>
                    </div>
                  ))}
                  {upcomingEvents.length > 3 && (
                    <button
                      onClick={() => setActiveTab('events')}
                      className="text-xs text-gray-400 hover:text-[#232323] transition-colors"
                    >
                      +{upcomingEvents.length - 3} more →
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Series sidebar */}
            {series.length > 0 && (
              <div className="border border-gray-200 p-5">
                <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-4">
                  Series Here
                </h3>
                <div className="space-y-3">
                  {series.slice(0, 6).map(s => (
                    <Link
                      key={s.id}
                      to={buildProfileUrl('Series', s.slug || s.id)}
                      className="flex items-center justify-between group"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-[#232323] group-hover:text-[#1A3249] transition-colors truncate">
                          {s.name}
                        </div>
                        {s.discipline && (
                          <div className="text-xs text-gray-400">{s.discipline}</div>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#1A3249] flex-shrink-0 transition-colors" />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Stats summary */}
            <div className="border border-gray-200 p-5">
              <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-4">At a Glance</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total Events</span>
                  <span className="font-bold text-[#232323]">{events.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Upcoming</span>
                  <span className="font-bold text-[#232323]">{upcomingEvents.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Series</span>
                  <span className="font-bold text-[#232323]">{series.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}