import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import PageShell from '../components/shared/PageShell';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, MapPin, Ruler, Globe } from 'lucide-react';

export default function TrackProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  const trackId = urlParams.get('id');

  const { data: track, isLoading } = useQuery({
    queryKey: ['track', trackId],
    queryFn: async () => {
      const all = await base44.entities.Track.list();
      return all.find(t => t.id === trackId);
    },
    enabled: !!trackId,
  });

  if (isLoading) {
    return <PageShell><div className="max-w-4xl mx-auto px-6 py-20"><Skeleton className="h-10 w-1/2 mb-4" /><Skeleton className="h-64 w-full" /></div></PageShell>;
  }

  if (!track) {
    return <PageShell><div className="max-w-4xl mx-auto px-6 py-20 text-center"><p className="text-gray-400">Track not found.</p></div></PageShell>;
  }

  return (
    <PageShell>
      <div className="max-w-4xl mx-auto px-6 py-12 md:py-20">
        <Link to={createPageUrl('TrackDirectory')} className="inline-flex items-center gap-1 text-xs font-mono text-gray-400 hover:text-[#0A0A0A] mb-8 transition-colors">
          <ArrowLeft className="w-3 h-3" /> Tracks
        </Link>

        <h1 className="text-3xl md:text-4xl font-black tracking-tight">{track.name}</h1>
        <div className="flex flex-wrap items-center gap-4 mt-3">
          {track.location && <span className="flex items-center gap-1 text-xs text-gray-400"><MapPin className="w-3 h-3" /> {track.location}</span>}
          {track.length && <span className="flex items-center gap-1 text-xs text-gray-400"><Ruler className="w-3 h-3" /> {track.length}</span>}
          {track.type && <span className="px-3 py-1 text-[10px] font-mono tracking-wider bg-gray-100 text-gray-500 uppercase">{track.type.replace(/_/g, ' ')}</span>}
          {track.website && <a href={track.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#0A0A0A]"><Globe className="w-3 h-3" /> Website</a>}
        </div>

        {track.photo_url && (
          <div className="mt-8"><img src={track.photo_url} alt={track.name} className="w-full" /></div>
        )}

        {track.map_url && (
          <div className="mt-6">
            <p className="font-mono text-xs text-gray-400 uppercase tracking-wider mb-2">Track Layout</p>
            <img src={track.map_url} alt={`${track.name} layout`} className="max-w-md" />
          </div>
        )}

        {track.description && (
          <div className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-600 leading-relaxed">{track.description}</p>
          </div>
        )}
      </div>
    </PageShell>
  );
}