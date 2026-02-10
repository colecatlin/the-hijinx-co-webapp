import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { createPageUrl } from '@/components/utils';
import TrackCard from '@/components/tracks/TrackCard';

export default function TrackLeaderboards() {
  const { data: tracks = [] } = useQuery({
    queryKey: ['activeTracksForLeaderboards'],
    queryFn: async () => {
      const allTracks = await base44.entities.Track.list();
      return allTracks.filter(t => t.status === 'Active' || t.status === 'Seasonal');
    },
  });

  const topRatedTracks = [...tracks]
    .sort((a, b) => {
      const aRating = a.weighted_rating ?? a.rating_average ?? 0;
      const bRating = b.weighted_rating ?? b.rating_average ?? 0;
      if (bRating !== aRating) return bRating - aRating;
      return (a.name || '').localeCompare(b.name || '');
    })
    .slice(0, 10);

  const trendingTracks = [...tracks]
    .sort((a, b) => {
      const aScore = a.popularity_score ?? 0;
      const bScore = b.popularity_score ?? 0;
      if (bScore !== aScore) return bScore - aScore;
      const aDate = a.updated_date || a.created_date || '';
      const bDate = b.updated_date || b.created_date || '';
      if (bDate !== aDate) return bDate.localeCompare(aDate);
      return (a.name || '').localeCompare(b.name || '');
    })
    .slice(0, 10);

  return (
    <section className="bg-[#FFF8F5] py-16">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-3xl font-black text-[#232323] mb-2">Track Rankings</h2>
        <p className="text-sm text-gray-600 mb-8">Rankings update as the database grows.</p>

        {/* Top 3 Featured Tracks */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {topRatedTracks.slice(0, 3).map((track, idx) => (
            <div key={track.id} className="relative h-96">
              <div className="absolute -top-3 -left-3 z-10 bg-[#232323] text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg">
                {idx + 1}
              </div>
              <TrackCard track={track} />
            </div>
          ))}
        </div>

        {/* Ranks 4 and 5 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
          {topRatedTracks.slice(3, 5).map((track, idx) => (
            <div key={track.id} className="relative h-44">
              <div className="absolute -top-2 -left-2 z-10 bg-[#232323] text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                {idx + 4}
              </div>
              <TrackCard track={track} />
            </div>
          ))}
        </div>

        {/* Top 10 Horizontal Scroll */}
        <div className="relative">
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {topRatedTracks.slice(0, 10).map((track, idx) => (
              <div key={track.id} className="flex-shrink-0 w-64 relative">
                <div className="absolute top-2 left-2 z-10 bg-[#232323] text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                  {idx + 1}
                </div>
                <TrackCard track={track} />
              </div>
            ))}
            <Link
              to={createPageUrl('TrackDirectory')}
              className="flex-shrink-0 w-64 h-full flex items-center justify-center bg-white border-2 border-dashed border-gray-300 hover:border-[#00FFDA] transition-colors group"
            >
              <div className="text-center p-6">
                <p className="text-sm font-bold text-gray-600 group-hover:text-[#00FFDA] transition-colors">
                  See full track ratings
                </p>
                <ArrowRight className="w-5 h-5 mx-auto mt-2 text-gray-400 group-hover:text-[#00FFDA] transition-colors" />
              </div>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}