import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import PageShell from '@/components/shared/PageShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { MapPin, ExternalLink, Globe, Home, BarChart, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import CountryFlag from '@/components/shared/CountryFlag';

export default function TrackProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  const trackId = urlParams.get('id');

  if (!trackId) {
    return (
      <PageShell className="bg-[#FFF8F5]">
        <div className="max-w-7xl mx-auto px-6 py-12 text-center">
          <p className="text-gray-600 mb-4">Track not found</p>
          <Link to={createPageUrl('TrackDirectory')}>
            <Button>Back to Tracks</Button>
          </Link>
        </div>
      </PageShell>
    );
  }

  const { data: track, isLoading } = useQuery({
    queryKey: ['track', trackId],
    queryFn: () => base44.entities.Track.get(trackId),
  });

  if (isLoading) {
    return (
      <PageShell className="bg-white">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <Skeleton className="h-12 w-64 mb-4" />
          <Skeleton className="h-96" />
        </div>
      </PageShell>
    );
  }

  if (!track) {
    return (
      <PageShell className="bg-white">
        <div className="max-w-7xl mx-auto px-6 py-12 text-center">
          <p className="text-gray-600 mb-4">Track not found</p>
          <Link to={createPageUrl('TrackDirectory')}>
            <Button>Back to Tracks</Button>
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell className="bg-white">
      {track.hero_image_url && (
        <div className="w-full h-[400px] relative overflow-hidden">
          <img 
            src={track.hero_image_url} 
            alt={track.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-12">
        <Link to={createPageUrl('TrackDirectory')} className="text-sm text-gray-600 hover:text-[#00FFDA] mb-4 inline-block">
          ← Back to Tracks
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6 items-start">
          <div className="lg:col-span-2">
            <Separator className="mb-3" />
            <div className="flex items-center gap-3 mb-2">
              <CountryFlag country={track.country} />
              <h1 className="text-4xl font-black text-[#232323] leading-none">{track.name}</h1>
            </div>

            <Separator className="mb-3" />
            <div className="bg-white p-8 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-sm text-gray-600 mb-1">Location</div>
                  <div className="text-lg font-semibold text-[#232323] mb-4">
                    {track.city}, {track.state} {track.country}
                  </div>
                  <div className="mb-4">
                    <div className="text-sm text-gray-600 mb-1">Track Type</div>
                    <div className="text-lg font-semibold text-[#232323]">{track.track_type}</div>
                  </div>
                  {track.founded_year && (
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Founded</div>
                      <div className="text-lg font-semibold text-[#232323]">{track.founded_year}</div>
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1 text-sm text-gray-600 mb-1">
                    <BarChart className="w-4 h-4" />
                    Length
                  </div>
                  <div className="text-lg font-semibold text-[#232323] mb-4">
                    {track.length_miles ? `${track.length_miles} miles` : 'N/A'}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-600 mb-1">
                    <Globe className="w-4 h-4" />
                    Surface
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {track.surfaces?.map((surface, idx) => (
                      <Badge key={idx} className="bg-[#00FFDA] text-[#232323]">{surface}</Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-600 mb-1">
                    <Users className="w-4 h-4" />
                    Capacity
                  </div>
                  <div className="text-lg font-semibold text-[#232323]">
                    {track.capacity_est ? `${track.capacity_est.toLocaleString()} est.` : 'N/A'}
                  </div>
                </div>
              </div>
              {track.description_summary && (
                <div className="mt-6">
                  <div className="text-sm text-gray-600 mb-1">Description</div>
                  <p className="text-base text-[#232323]">{track.description_summary}</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6 relative -mt-1">
            {track.operator_name && (
              <div className="bg-white p-6">
                <h3 className="text-sm font-bold text-[#232323] mb-4">Operator</h3>
                <div className="space-y-2">
                  <div className="text-sm text-gray-700">{track.operator_name}</div>
                  {track.contact_email && (
                    <div className="text-sm text-gray-700">
                      Email: <a href={`mailto:${track.contact_email}`} className="text-blue-600 hover:underline">{track.contact_email}</a>
                    </div>
                  )}
                  {track.contact_phone && (
                    <div className="text-sm text-gray-700">
                      Phone: <a href={`tel:${track.contact_phone}`} className="text-blue-600 hover:underline">{track.contact_phone}</a>
                    </div>
                  )}
                </div>
              </div>
            )}
            {track.ticketing_url && (
              <div className="bg-white p-6">
                <h3 className="text-sm font-bold text-[#232323] mb-4">Tickets</h3>
                <a href={track.ticketing_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                  Purchase Tickets <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}