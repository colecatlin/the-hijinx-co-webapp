import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Gauge, Map } from 'lucide-react';

export default function SurfaceLayoutStatsModule({ track }) {
  const { data: layouts = [] } = useQuery({
    queryKey: ['layouts', track.id],
    queryFn: () => base44.entities.TrackLayout.filter({ track_id: track.id, status: 'Published' })
  });

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4">Track Quick Stats</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="font-semibold mb-2">Surface Types</h3>
          {track.surface_types && track.surface_types.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {track.surface_types.map(surface => (
                <span key={surface} className="px-3 py-1 bg-gray-100 text-sm rounded">
                  {surface}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">Not specified</p>
          )}
        </div>

        <div>
          <h3 className="font-semibold mb-2">Track Length</h3>
          {track.size_length && track.size_unit ? (
            <div className="flex items-center gap-2">
              <Gauge className="w-5 h-5" />
              <span className="text-lg">{track.size_length} {track.size_unit}</span>
            </div>
          ) : (
            <p className="text-gray-600">Not specified</p>
          )}
        </div>

        <div>
          <h3 className="font-semibold mb-2">Layouts</h3>
          <div className="flex items-center gap-2">
            <Map className="w-5 h-5" />
            <span className="text-lg">{layouts.length} layout{layouts.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {layouts.length > 0 && (
          <div>
            <h3 className="font-semibold mb-2">Layout List</h3>
            <ul className="space-y-1">
              {layouts.map(layout => (
                <li key={layout.id} className="text-sm">
                  • {layout.name} {layout.layout_type && `(${layout.layout_type})`}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}