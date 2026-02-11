import React from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { MapPin, Flag } from 'lucide-react';
import { buildProfileUrl } from '@/components/utils/routingContract';

export default function TrackCard({ track, disciplines = [], media }) {
  return (
    <Link
      to={buildProfileUrl('Track', track.slug)}
      className="block bg-white border border-gray-200 hover:border-[#00FFDA] transition-all duration-300 group relative overflow-hidden"
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 pr-2">
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

      {media?.hero_image_url && (
        <div className="absolute bottom-4 right-4 w-20 h-20 rounded-lg overflow-hidden border-2 border-white shadow-lg">
          <img 
            src={media.hero_image_url} 
            alt={track.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}
    </Link>
  );
}