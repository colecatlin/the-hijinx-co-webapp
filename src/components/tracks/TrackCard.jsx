import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { Badge } from '@/components/ui/badge';
import { MapPin, Flag } from 'lucide-react';

export default function TrackCard({ track, disciplines = [] }) {
  return (
    <Link
      to={createPageUrl('TrackProfile', { id: track.slug })}
      className="block bg-white border border-gray-200 hover:border-[#00FFDA] transition-all duration-300 group"
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-lg font-bold text-[#232323] group-hover:text-[#1A3249] transition-colors">
              {track.name}
            </h3>
            <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
              <MapPin className="w-3 h-3" />
              {track.city}, {track.state}
            </div>
          </div>
          {track.status && (
            <Badge
              variant="outline"
              className={`text-xs ${
                track.status === 'Active'
                  ? 'border-[#00FFDA] text-[#00FFDA]'
                  : track.status === 'Seasonal'
                  ? 'border-[#1A3249] text-[#1A3249]'
                  : 'border-gray-400 text-gray-600'
              }`}
            >
              {track.status}
            </Badge>
          )}
        </div>

        {disciplines.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {disciplines.map((disc, idx) => (
              <Badge key={idx} className="bg-[#232323] text-white text-xs">
                {disc.discipline_name}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-3">
          {track.track_type && (
            <Badge variant="outline" className="text-xs border-gray-300">
              {track.track_type}
            </Badge>
          )}
          {track.surfaces?.map((surface, idx) => (
            <Badge key={idx} variant="outline" className="text-xs border-gray-300">
              {surface}
            </Badge>
          ))}
        </div>

        <div className="flex items-center gap-4 text-xs text-gray-600 font-mono">
          {track.length_miles && <span>{track.length_miles} mi</span>}
          {track.turns_count && <span>{track.turns_count} turns</span>}
        </div>
      </div>
    </Link>
  );
}