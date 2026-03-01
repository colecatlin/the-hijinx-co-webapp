import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Flag } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

export default function ResultsStatusCard({ selectedEvent }) {
  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ['sessions', selectedEvent?.id],
    queryFn: () => selectedEvent?.id ? base44.entities.Session.filter({ event_id: selectedEvent.id }) : [],
    enabled: !!selectedEvent?.id,
  });

  const statusCounts = useMemo(() => {
    const counts = {
      Draft: 0,
      Provisional: 0,
      Official: 0,
      Locked: 0,
    };

    sessions.forEach((session) => {
      const status = session.status || 'Draft';
      if (counts.hasOwnProperty(status)) {
        counts[status]++;
      }
    });

    return counts;
  }, [sessions]);

  const statusColors = {
    Draft: 'bg-gray-700/50 text-gray-100',
    Provisional: 'bg-yellow-700/50 text-yellow-100',
    Official: 'bg-blue-700/50 text-blue-100',
    Locked: 'bg-green-700/50 text-green-100',
  };

  return (
    <Card className="bg-[#171717] border-gray-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Flag className="w-4 h-4" /> Results Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {sessionsLoading ? (
          <p className="text-xs text-gray-400">Loading...</p>
        ) : sessions.length === 0 ? (
          <p className="text-xs text-gray-400">No sessions found for this event</p>
        ) : (
          <>
            <div>
              <p className="text-xs text-gray-400 mb-2">Total Sessions</p>
              <p className="text-2xl font-bold text-white">{sessions.length}</p>
            </div>

            <div className="space-y-2">
              {Object.entries(statusCounts).map(([status, count]) => (
                <div key={status} className="flex justify-between items-center text-xs">
                  <span className="text-gray-300">{status}</span>
                  <Badge className={statusColors[status] || 'bg-gray-700 text-gray-100'}>
                    {count}
                  </Badge>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}