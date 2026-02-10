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
    .sort((a, b) => (b.weighted_rating || 0) - (a.weighted_rating || 0))
    .slice(0, 10);

  const trendingTracks = [...tracks]
    .sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0))
    .slice(0, 10);

  return (
    <section className="bg-[#FFF8F5] py-16">
      <div className="max-w-7xl mx-auto px-6">
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
                      {track.weighted_rating > 0 ? track.weighted_rating.toFixed(1) : 'N/A'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {track.rating_count || 0} {track.rating_count === 1 ? 'vote' : 'votes'}
                    </div>
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
                    <div className="font-bold text-[#232323]">
                      {track.popularity_score || 0}
                    </div>
                    <div className="text-xs text-gray-500">score</div>
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