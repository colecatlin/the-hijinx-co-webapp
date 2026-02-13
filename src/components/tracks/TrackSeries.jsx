import React from 'react';
import { useQuery } from '@tantml:react-query';
import { base44 } from '@/api/base44Client';
import { Trophy } from 'lucide-react';

export default function TrackSeries({ trackId }) {
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
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Series</h2>
      
      {series.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {series.map(s => {
            const seriesEvents = events.filter(e => e.series_id === s.id);
            return (
              <div key={s.id} className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-start gap-3 mb-3">
                  <Trophy className="w-6 h-6 text-gray-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-bold text-lg">{s.name}</h3>
                    {s.discipline && (
                      <p className="text-sm text-gray-600">{s.discipline}</p>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  {seriesEvents.length} event{seriesEvents.length !== 1 ? 's' : ''} held
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-gray-600">No series information available</p>
      )}
    </div>
  );
}