import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageShell from '@/components/shared/PageShell';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TrackDashboard from '@/components/tracks/TrackDashboard';
import TrackHistory from '@/components/tracks/TrackHistory';
import TrackSeries from '@/components/tracks/TrackSeries';
import TrackLayouts from '@/components/tracks/TrackLayouts';
import TrackMedia from '@/components/tracks/TrackMedia';
import TrackSocial from '@/components/tracks/TrackSocial';
import TrackMap from '@/components/tracks/TrackMap';
import { MapPin } from 'lucide-react';

export default function TrackHub() {
  const urlParams = new URLSearchParams(window.location.search);
  const slug = urlParams.get('slug');

  const { data: track, isLoading } = useQuery({
    queryKey: ['track', slug],
    queryFn: async () => {
      const tracks = await base44.entities.Track.filter({ slug, status: 'Published' });
      return tracks[0];
    },
    enabled: !!slug
  });

  if (isLoading) {
    return (
      <PageShell className="bg-[#FFF8F5]">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-8"></div>
          </div>
        </div>
      </PageShell>
    );
  }

  if (!track) {
    return (
      <PageShell className="bg-[#FFF8F5]">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <h1 className="text-2xl font-bold">Track not found</h1>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell className="bg-[#FFF8F5]">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-black mb-2">{track.name}</h1>
          <div className="flex items-center gap-2 text-gray-600">
            <MapPin className="w-5 h-5" />
            <span>{track.location_city}, {track.location_state}, {track.location_country}</span>
          </div>
        </div>

        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="mb-8">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="series">Series</TabsTrigger>
            <TabsTrigger value="layouts">Layouts</TabsTrigger>
            <TabsTrigger value="media">Media</TabsTrigger>
            <TabsTrigger value="social">Social</TabsTrigger>
            <TabsTrigger value="map">Map</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <TrackDashboard track={track} />
          </TabsContent>

          <TabsContent value="history">
            <TrackHistory trackId={track.id} />
          </TabsContent>

          <TabsContent value="series">
            <TrackSeries trackId={track.id} />
          </TabsContent>

          <TabsContent value="layouts">
            <TrackLayouts trackId={track.id} />
          </TabsContent>

          <TabsContent value="media">
            <TrackMedia track={track} />
          </TabsContent>

          <TabsContent value="social">
            <TrackSocial track={track} />
          </TabsContent>

          <TabsContent value="map">
            <TrackMap track={track} />
          </TabsContent>
        </Tabs>
      </div>
    </PageShell>
  );
}