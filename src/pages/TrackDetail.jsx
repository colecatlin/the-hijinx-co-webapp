import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { MapPin, Globe, Instagram, Youtube, Mail, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import PageShell from '@/components/shared/PageShell';
import { Skeleton } from '@/components/ui/skeleton';

export default function TrackDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const slug = urlParams.get('slug');

  const { data: tracks = [], isLoading } = useQuery({
    queryKey: ['tracks'],
    queryFn: () => base44.entities.Track.list(),
  });

  const { data: series = [] } = useQuery({
    queryKey: ['series'],
    queryFn: () => base44.entities.Series.list(),
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list(),
  });

  const track = tracks.find(t => t.slug === slug);

  const affiliatedSeries = series.filter(s => 
    s.track_ids?.includes(track?.id) || 
    track?.affiliated_series_ids?.includes(s.id)
  );

  const trackEvents = events.filter(e => e.track_id === track?.id);

  if (isLoading) {
    return (
      <PageShell>
        <div className="max-w-5xl mx-auto px-6 py-12">
          <Skeleton className="h-96 mb-8" />
          <Skeleton className="h-64" />
        </div>
      </PageShell>
    );
  }

  if (!track) {
    return (
      <PageShell>
        <div className="max-w-5xl mx-auto px-6 py-12 text-center">
          <h1 className="text-2xl font-bold mb-4">Track not found</h1>
          <Link to={createPageUrl('Tracks')}>
            <Button>Back to Tracks</Button>
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="mb-12">
          {track.hero_image && (
            <div className="aspect-video rounded-lg overflow-hidden mb-6">
              <img
                src={track.hero_image}
                alt={track.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">{track.name}</h1>
              <p className="text-lg text-gray-600 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                {track.city}, {track.state_region}, {track.country}
              </p>
            </div>
            <Badge className="text-sm">{track.status}</Badge>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            <Badge variant="outline">{track.track_type}</Badge>
            <Badge variant="outline">{track.surface}</Badge>
            {track.primary_disciplines?.map(discipline => (
              <Badge key={discipline} variant="outline">{discipline}</Badge>
            ))}
          </div>

          {/* Social Links */}
          <div className="flex flex-wrap gap-3">
            {track.website_url && (
              <a href={track.website_url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  <Globe className="w-4 h-4 mr-2" />
                  Website
                </Button>
              </a>
            )}
            {track.instagram_url && (
              <a href={track.instagram_url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  <Instagram className="w-4 h-4 mr-2" />
                  Instagram
                </Button>
              </a>
            )}
            {track.youtube_url && (
              <a href={track.youtube_url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  <Youtube className="w-4 h-4 mr-2" />
                  YouTube
                </Button>
              </a>
            )}
            {track.contact_email && (
              <a href={`mailto:${track.contact_email}`}>
                <Button variant="outline" size="sm">
                  <Mail className="w-4 h-4 mr-2" />
                  Contact
                </Button>
              </a>
            )}
          </div>
        </div>

        {/* Overview Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Overview</h2>
          <p className="text-gray-700 leading-relaxed mb-6">{track.summary}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {track.surface && (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Surface</p>
                <p className="font-semibold">{track.surface}</p>
              </div>
            )}
            {track.length && (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Length</p>
                <p className="font-semibold">{track.length}</p>
              </div>
            )}
            {track.capacity && (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Capacity</p>
                <p className="font-semibold">{track.capacity.toLocaleString()}</p>
              </div>
            )}
          </div>
        </section>

        {/* Series Hosted Section */}
        {affiliatedSeries.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Series Hosted</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {affiliatedSeries.map(s => (
                <Link
                  key={s.id}
                  to={createPageUrl('SeriesDetail', { slug: s.slug })}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <h3 className="font-semibold mb-1 hover:text-blue-600">{s.name}</h3>
                  <p className="text-sm text-gray-600">{s.discipline}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Events Section */}
        {trackEvents.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Events</h2>
            <div className="space-y-3">
              {trackEvents.map(event => (
                <Link
                  key={event.id}
                  to={createPageUrl('EventDetail', { slug: event.slug })}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow flex items-center gap-3"
                >
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <h3 className="font-semibold hover:text-blue-600">{event.name}</h3>
                    <p className="text-sm text-gray-600">{event.date_start}</p>
                  </div>
                  <Badge className="ml-auto">{event.status}</Badge>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Get Involved CTA */}
        <section className="bg-gray-50 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold mb-2">Have a Track to Share?</h2>
          <p className="text-gray-600 mb-4">
            Submit your track information to be featured on our platform
          </p>
          <Link to={createPageUrl('GetInvolved')}>
            <Button>Submit a Track</Button>
          </Link>
        </section>
      </div>
    </PageShell>
  );
}