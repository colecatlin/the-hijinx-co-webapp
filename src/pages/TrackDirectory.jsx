import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import PageShell from '@/components/shared/PageShell';
import SectionHeader from '@/components/shared/SectionHeader';
import EmptyState from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Search, ArrowRight } from 'lucide-react';

export default function TrackDirectory() {
  const [search, setSearch] = useState('');

  const { data: tracks = [], isLoading } = useQuery({
    queryKey: ['tracks'],
    queryFn: () => base44.entities.Track.filter({ status: 'active' }, 'name', 100),
  });

  const filtered = tracks.filter(t =>
    !search || t.name?.toLowerCase().includes(search.toLowerCase()) || t.location?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageShell>
      <div className="max-w-7xl mx-auto px-6 py-12 md:py-20">
        <SectionHeader label="Motorsports" title="Track Directory" subtitle="Venues and circuits." />

        <div className="flex items-center gap-2 border-b-2 border-gray-200 focus-within:border-[#0A0A0A] max-w-md mb-10 transition-colors">
          <Search className="w-4 h-4 text-gray-300" />
          <input type="text" placeholder="Search tracks..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="flex-1 py-2 text-sm bg-transparent outline-none placeholder:text-gray-300" />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-36 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={MapPin} title="No tracks found" message="Tracks will appear here once added." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((track) => (
              <Link key={track.id} to={createPageUrl('TrackProfile') + `?id=${track.id}`}
                className="group border border-gray-200 hover:border-[#0A0A0A] transition-colors overflow-hidden">
                <div className="aspect-[2/1] bg-gray-100">
                  {track.photo_url ? (
                    <img src={track.photo_url} alt={track.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><MapPin className="w-6 h-6 text-gray-200" /></div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-sm group-hover:underline">{track.name}</h3>
                  <p className="text-[10px] text-gray-400 mt-1">{track.location} {track.type ? `· ${track.type.replace(/_/g, ' ')}` : ''}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}