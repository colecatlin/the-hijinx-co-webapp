import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { getTrackProfileData } from '@/components/entities/publicPageDataApi';
import PageShell from '@/components/shared/PageShell';
import { EntityNotFound } from '@/components/data/EntityNotFoundState';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import TrackEventsPanel from '@/components/tracks/TrackEventsPanel';
import { createPageUrl } from '@/components/utils';
import { MapPin, Globe, Phone, Mail, Flag, Ruler, ExternalLink, Calendar } from 'lucide-react';
import ClaimEntityButton from '@/components/onboarding/ClaimEntityButton';
import { isAfter, parseISO } from 'date-fns';

export default function TrackProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  const slug = urlParams.get('slug') || null;
  const id   = urlParams.get('id')   || null;

  const [activeSection, setActiveSection] = useState('overview');

  const { data: profileData, isLoading } = useQuery({
    queryKey: ['trackProfile', slug || id],
    queryFn: () => getTrackProfileData({ id, slug }),
    enabled: !!(slug || id),
    staleTime: 5 * 60 * 1000,
  });

  const track  = profileData?.track  ?? null;
  const events = profileData?.events ?? [];
  const series = profileData?.series ?? [];

  const today = new Date();
  const upcomingEvents = events
    .filter(e => e.event_date && isAfter(parseISO(e.event_date), today))
    .sort((a, b) => a.event_date.localeCompare(b.event_date));
  const pastEvents = events
    .filter(e => e.event_date && !isAfter(parseISO(e.event_date), today))
    .sort((a, b) => b.event_date.localeCompare(a.event_date));

  if (isLoading) {
    return (
      <PageShell className="bg-white">
        <div className="max-w-7xl mx-auto px-6 py-12 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </PageShell>
    );
  }

  if (!track) return <EntityNotFound entityType="Track" />;

  const location = [track.location_city, track.location_state, track.location_country].filter(Boolean).join(', ');

  const sections = [
    { id: 'overview', label: 'Overview' },
    { id: 'events',   label: `Events (${events.length})` },
    { id: 'series',   label: `Series (${series.length})` },
  ];

  return (
    <PageShell className="bg-white">
      {/* Back link */}
      <div className="max-w-7xl mx-auto px-6 pt-4">
        <Link to={createPageUrl('TrackDirectory')} className="text-sm text-gray-500 hover:text-[#232323] transition-colors">
          ← Back to Tracks
        </Link>
      </div>

      {/* Hero image */}
      {track.image_url && (
        <div className="max-w-7xl mx-auto px-6 mt-3">
          <div className="h-[320px] relative overflow-hidden rounded-lg">
            <img src={track.image_url} alt={track.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-6 left-6">
              <h1 className="text-4xl font-black text-white drop-shadow">{track.name}</h1>
              {location && (
                <div className="flex items-center gap-1.5 text-white/80 mt-1 text-sm">
                  <MapPin className="w-3.5 h-3.5" />
                  {location}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-4">
        {/* Title when no hero */}
        {!track.image_url && (
          <div className="mb-4">
            <Separator className="mb-4" />
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-4xl font-black text-[#232323]">{track.name}</h1>
                {location && (
                  <div className="flex items-center gap-1.5 text-gray-500 mt-1 text-sm">
                    <MapPin className="w-3.5 h-3.5" />
                    {location}
                  </div>
                )}
              </div>
              {track.status && (
                <Badge
                  variant="outline"
                  className={`text-sm mt-1 ${
                    track.status === 'Active'
                      ? 'border-[#00FFDA] text-[#00FFDA]'
                      : track.status === 'Seasonal'
                      ? 'border-blue-400 text-blue-600'
                      : 'border-gray-400 text-gray-500'
                  }`}
                >
                  {track.status}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Claim button */}
        <div className="mb-3">
          <ClaimEntityButton entityType="Track" entityId={track?.id} entityName={track.name} />
        </div>

        {/* Section nav */}
        <div className="flex gap-6 border-b border-gray-200 mb-6 mt-2">
          {sections.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`pb-3 text-sm font-semibold transition-colors ${
                activeSection === s.id
                  ? 'text-[#232323] border-b-2 border-[#232323] -mb-px'
                  : 'text-gray-400 hover:text-[#232323]'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2">

            {/* Overview */}
            {activeSection === 'overview' && (
              <div className="space-y-6">
                {track.description && (
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <p className="text-gray-700 leading-relaxed">{track.description}</p>
                  </div>
                )}

                {/* Specs grid */}
                <div>
                  <h2 className="text-lg font-bold text-[#232323] mb-3">Track Specs</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {track.track_type && (
                      <div className="bg-white border border-gray-200 p-4 rounded-lg">
                        <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Type</div>
                        <div className="font-semibold text-[#232323]">{track.track_type}</div>
                      </div>
                    )}
                    {track.surface_type && (
                      <div className="bg-white border border-gray-200 p-4 rounded-lg">
                        <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Surface</div>
                        <div className="font-semibold text-[#232323]">{track.surface_type}</div>
                      </div>
                    )}
                    {track.length && (
                      <div className="bg-white border border-gray-200 p-4 rounded-lg">
                        <div className="text-xs text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                          <Ruler className="w-3 h-3" /> Length
                        </div>
                        <div className="font-semibold text-[#232323]">{track.length} mi</div>
                      </div>
                    )}
                    {track.banking && (
                      <div className="bg-white border border-gray-200 p-4 rounded-lg">
                        <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Banking</div>
                        <div className="font-semibold text-[#232323]">{track.banking}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-[#232323] text-white p-4 rounded-lg text-center">
                    <div className="text-2xl font-black">{events.length}</div>
                    <div className="text-xs text-gray-300 mt-0.5">Total Events</div>
                  </div>
                  <div className="bg-white border border-gray-200 p-4 rounded-lg text-center">
                    <div className="text-2xl font-black text-[#232323]">{upcomingEvents.length}</div>
                    <div className="text-xs text-gray-500 mt-0.5">Upcoming</div>
                  </div>
                  <div className="bg-white border border-gray-200 p-4 rounded-lg text-center">
                    <div className="text-2xl font-black text-[#232323]">{series.length}</div>
                    <div className="text-xs text-gray-500 mt-0.5">Series</div>
                  </div>
                </div>

                {/* Series hosted */}
                {series.length > 0 && (
                  <div>
                    <h2 className="text-lg font-bold text-[#232323] mb-3">Series Hosted</h2>
                    <div className="space-y-2">
                      {series.map(s => (
                        <Link
                          key={s.id}
                          to={`/SeriesDetail?slug=${s.slug || s.id}`}
                          className="flex items-center justify-between p-3 border border-gray-200 hover:border-[#232323] transition-colors rounded-lg group"
                        >
                          <div className="flex items-center gap-3">
                            <Flag className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-[#232323] group-hover:underline">{s.name}</span>
                          </div>
                          <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-[#232323] transition-colors" />
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Events */}
            {activeSection === 'events' && (
              <TrackEventsPanel upcomingEvents={upcomingEvents} pastEvents={pastEvents} />
            )}

            {/* Series */}
            {activeSection === 'series' && (
              <div className="space-y-3">
                {series.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
                    <Flag className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm text-gray-500">No series linked to this track yet.</p>
                  </div>
                ) : (
                  series.map(s => (
                    <Link
                      key={s.id}
                      to={`/SeriesDetail?slug=${s.slug || s.id}`}
                      className="flex items-center justify-between p-4 border border-gray-200 hover:border-[#232323] transition-colors group"
                    >
                      <div>
                        <div className="font-bold text-[#232323] group-hover:underline">{s.name}</div>
                        {s.discipline && <div className="text-sm text-gray-500 mt-0.5">{s.discipline}</div>}
                      </div>
                      <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-[#232323]" />
                    </Link>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status badge (only shown when hero image is present) */}
            {track.image_url && track.status && (
              <Badge
                variant="outline"
                className={`text-sm ${
                  track.status === 'Active'
                    ? 'border-[#00FFDA] text-[#00FFDA]'
                    : track.status === 'Seasonal'
                    ? 'border-blue-400 text-blue-600'
                    : 'border-gray-400 text-gray-500'
                }`}
              >
                {track.status}
              </Badge>
            )}

            {/* Contact / links */}
            <div className="border border-gray-200 p-5 rounded-lg space-y-3">
              <h3 className="font-bold text-[#232323] text-sm uppercase tracking-wide">Contact & Info</h3>
              {track.website_url && (
                <a href={track.website_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#232323] transition-colors">
                  <Globe className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{track.website_url.replace(/^https?:\/\//, '')}</span>
                </a>
              )}
              {track.contact_email && (
                <a href={`mailto:${track.contact_email}`}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#232323] transition-colors">
                  <Mail className="w-4 h-4 flex-shrink-0" />
                  {track.contact_email}
                </a>
              )}
              {track.phone && (
                <a href={`tel:${track.phone}`}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#232323] transition-colors">
                  <Phone className="w-4 h-4 flex-shrink-0" />
                  {track.phone}
                </a>
              )}
              {!track.website_url && !track.contact_email && !track.phone && (
                <p className="text-sm text-gray-400">No contact info available.</p>
              )}
            </div>

            {/* Upcoming events quick view */}
            {upcomingEvents.length > 0 && (
              <div className="border border-gray-200 p-5 rounded-lg">
                <h3 className="font-bold text-[#232323] text-sm uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Next Up
                </h3>
                <div className="space-y-3">
                  {upcomingEvents.slice(0, 3).map(event => (
                    <div key={event.id} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                      <div className="font-semibold text-sm text-[#232323] leading-snug">{event.name}</div>
                      {event.series_name && <div className="text-xs text-gray-500 mt-0.5">{event.series_name}</div>}
                      <div className="text-xs text-gray-400 font-mono mt-0.5">{event.event_date}</div>
                    </div>
                  ))}
                </div>
                {upcomingEvents.length > 3 && (
                  <button
                    onClick={() => setActiveSection('events')}
                    className="mt-3 text-xs text-gray-500 hover:text-[#232323] underline"
                  >
                    +{upcomingEvents.length - 3} more events
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}