import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { MapPin, TrendingUp, Star } from 'lucide-react';
import { buildProfileUrl } from '@/components/utils/routingContract';

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Top Rated Tracks */}
          <div className="bg-white border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-6">
              <Star className="w-5 h-5 text-[#232323]" />
              <h2 className="text-xl font-bold text-[#232323]">Top Rated Tracks</h2>
            </div>
            <div className="space-y-3">
              {topRatedTracks.map((track, idx) => (
                <Link
                  key={track.id}
                  to={buildProfileUrl('Track', track.slug)}
                  className="flex items-start gap-3 p-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
                >
                  <div className="text-lg font-bold text-gray-400 w-6">{idx + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[#232323] hover:text-[#00FFDA] transition-colors truncate">
                      {track.name}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      <MapPin className="w-3 h-3" />
                      {track.city}, {track.state}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-[#232323]">
                      {track.weighted_rating 
                        ? track.weighted_rating.toFixed(1) 
                        : track.rating_average 
                        ? track.rating_average.toFixed(1) 
                        : 'N/A'}
                    </div>
                    {track.rating_count > 0 && (
                      <div className="text-xs text-gray-500">
                        {track.rating_count} {track.rating_count === 1 ? 'vote' : 'votes'}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Trending Tracks */}
          <div className="bg-white border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-5 h-5 text-[#232323]" />
              <h2 className="text-xl font-bold text-[#232323]">Trending Tracks</h2>
            </div>
            <div className="space-y-3">
              {trendingTracks.map((track, idx) => (
                <Link
                  key={track.id}
                  to={buildProfileUrl('Track', track.slug)}
                  className="flex items-start gap-3 p-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
                >
                  <div className="text-lg font-bold text-gray-400 w-6">{idx + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[#232323] hover:text-[#00FFDA] transition-colors truncate">
                      {track.name}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      <MapPin className="w-3 h-3" />
                      {track.city}, {track.state}
                    </div>
                  </div>
                  <div className="text-right">
                    {track.popularity_score > 0 && (
                      <>
                        <div className="font-bold text-[#232323]">
                          {track.popularity_score}
                        </div>
                        <div className="text-xs text-gray-500">score</div>
                      </>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}