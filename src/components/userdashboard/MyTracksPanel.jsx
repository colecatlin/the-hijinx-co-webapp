import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import { MapPin, ExternalLink } from 'lucide-react';

export default function MyTracksPanel({ collaborators }) {
  const entityIds = collaborators.map(c => c.entity_id);

  const { data: tracks = [], isLoading } = useQuery({
    queryKey: ['myTracks', entityIds.join(',')],
    queryFn: async () => {
      if (!entityIds.length) return [];
      const all = await base44.entities.Track.list('-updated_date', 500);
      return all.filter(t => entityIds.includes(t.id));
    },
    enabled: entityIds.length > 0,
    staleTime: 30000,
  });

  const collabMap = Object.fromEntries(collaborators.map(c => [c.entity_id, c]));

  return (
    <div className="bg-[#171717] border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-2">
        <MapPin className="w-4 h-4 text-teal-400" />
        <h2 className="text-sm font-semibold text-white">My Tracks</h2>
        <span className="ml-auto text-xs text-gray-500">{collaborators.length}</span>
      </div>

      {collaborators.length === 0 ? (
        <div className="px-5 py-10 text-center text-gray-500 text-sm">No tracks connected to your account.</div>
      ) : isLoading ? (
        <div className="p-5 space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-8 bg-gray-800/50 rounded animate-pulse" />)}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-900/50 border-b border-gray-800">
              <tr>
                <th className="px-4 py-2 text-left text-gray-400 font-medium">Track</th>
                <th className="px-4 py-2 text-left text-gray-400 font-medium">Location</th>
                <th className="px-4 py-2 text-left text-gray-400 font-medium">Type</th>
                <th className="px-4 py-2 text-right text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tracks.map(track => (
                <tr key={track.id} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
                  <td className="px-4 py-2.5 text-white font-medium">{track.name}</td>
                  <td className="px-4 py-2.5 text-gray-400">
                    {[track.location_city, track.location_state, track.location_country].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="px-4 py-2.5 text-gray-400">{track.track_type || '—'}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        to={createPageUrl(`TrackProfile?id=${track.id}`)}
                        className="p-1 text-gray-400 hover:text-white transition-colors"
                        title="View Track"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}