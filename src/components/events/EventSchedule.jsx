import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Clock } from 'lucide-react';

export default function EventSchedule({ eventId }) {
  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions', eventId],
    queryFn: async () => {
      const s = await base44.entities.Session.filter({ event_id: eventId, status: 'Published' });
      return s.sort((a, b) => {
        if (!a.start_time) return 1;
        if (!b.start_time) return -1;
        return new Date(a.start_time) - new Date(b.start_time);
      });
    }
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Schedule</h2>
      
      {sessions.length > 0 ? (
        <div className="space-y-3">
          {sessions.map(session => (
            <div key={session.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold">{session.name}</h3>
                  <span className="inline-block mt-1 px-2 py-1 bg-gray-100 text-xs rounded">
                    {session.session_type}
                  </span>
                </div>
                {session.start_time && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">
                      {new Date(session.start_time).toLocaleString([], {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <p className="text-gray-600">No schedule available</p>
        </div>
      )}
    </div>
  );
}