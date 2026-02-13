import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Calendar } from 'lucide-react';

export default function TrackHistory({ trackId }) {
  const { data: events = [] } = useQuery({
    queryKey: ['trackHistory', trackId],
    queryFn: async () => {
      const allEvents = await base44.entities.Event.filter({ track_id: trackId, status: 'Published' });
      return allEvents.sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
    }
  });

  const { data: series = [] } = useQuery({
    queryKey: ['allSeries'],
    queryFn: () => base44.entities.Series.filter({ status: 'Published' })
  });

  const groupedByYear = events.reduce((acc, event) => {
    const year = new Date(event.start_date).getFullYear();
    if (!acc[year]) acc[year] = [];
    acc[year].push(event);
    return acc;
  }, {});

  const years = Object.keys(groupedByYear).sort((a, b) => b - a);

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Event History</h2>
      
      {years.length > 0 ? (
        <div className="space-y-8">
          {years.map(year => (
            <div key={year}>
              <h3 className="text-xl font-bold mb-4">{year}</h3>
              <div className="space-y-3">
                {groupedByYear[year].map(event => {
                  const eventSeries = series.find(s => s.id === event.series_id);
                  return (
                    <div key={event.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold">{event.name}</h4>
                          {eventSeries && (
                            <p className="text-sm text-gray-600">{eventSeries.name}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(event.start_date).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-600">No event history available</p>
      )}
    </div>
  );
}