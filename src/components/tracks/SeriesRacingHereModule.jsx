import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Trophy } from 'lucide-react';

export default function SeriesRacingHereModule({ trackId }) {
  const { data: events = [] } = useQuery({
    queryKey: ['trackEvents', trackId],
    queryFn: () => base44.entities.Event.filter({ track_id: trackId, status: 'Published' })
  });

  const seriesIds = [...new Set(events.map(e => e.series_id))];

  const { data: series = [] } = useQuery({
    queryKey: ['seriesForTrack', seriesIds],
    queryFn: async () => {
      if (seriesIds.length === 0) return [];
      const allSeries = await base44.entities.Series.filter({ status: 'Published' });
      return allSeries.filter(s => seriesIds.includes(s.id));
    },
    enabled: seriesIds.length > 0
  });

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4">Series Racing Here</h2>
      
      {series.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {series.map(s => (
            <div key={s.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
              <Trophy className="w-5 h-5 text-gray-600" />
              <div>
                <h3 className="font-semibold">{s.name}</h3>
                {s.discipline && (
                  <p className="text-sm text-gray-600">{s.discipline}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-600">No series information available</p>
      )}
    </div>
  );
}