import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Map } from 'lucide-react';

export default function TrackLayouts({ trackId }) {
  const { data: layouts = [] } = useQuery({
    queryKey: ['layouts', trackId],
    queryFn: () => base44.entities.TrackLayout.filter({ track_id: trackId, status: 'Published' })
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Layouts</h2>
      
      {layouts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {layouts.map(layout => (
            <div key={layout.id} className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-start gap-3 mb-4">
                <Map className="w-6 h-6 text-gray-600 flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-lg">{layout.name}</h3>
                  {layout.layout_type && (
                    <span className="inline-block mt-1 px-2 py-1 bg-gray-100 text-xs rounded">
                      {layout.layout_type}
                    </span>
                  )}
                </div>
              </div>
              
              {layout.map_image_url && (
                <img 
                  src={layout.map_image_url} 
                  alt={`${layout.name} map`}
                  className="w-full rounded-lg mb-3"
                />
              )}
              
              {layout.notes && (
                <p className="text-sm text-gray-600">{layout.notes}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-600">No layouts available</p>
      )}
    </div>
  );
}