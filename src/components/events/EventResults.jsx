import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trophy } from 'lucide-react';

export default function EventResults({ eventId }) {
  const [selectedSession, setSelectedSession] = useState('');

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions', eventId],
    queryFn: () => base44.entities.Session.filter({ event_id: eventId, status: 'Published' })
  });

  const { data: results = [] } = useQuery({
    queryKey: ['results', selectedSession],
    queryFn: async () => {
      if (!selectedSession) return [];
      const r = await base44.entities.Result.filter({ session_id: selectedSession });
      return r.sort((a, b) => (a.position || 999) - (b.position || 999));
    },
    enabled: !!selectedSession
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.filter({ status: 'Published' }),
    enabled: results.length > 0
  });

  React.useEffect(() => {
    if (sessions.length > 0 && !selectedSession) {
      setSelectedSession(sessions[0].id);
    }
  }, [sessions, selectedSession]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Results</h2>
        {sessions.length > 0 && (
          <Select value={selectedSession} onValueChange={setSelectedSession}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select session" />
            </SelectTrigger>
            <SelectContent>
              {sessions.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {results.length > 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Pos</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Driver</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Time</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Laps</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Points</th>
              </tr>
            </thead>
            <tbody>
              {results.map(result => {
                const driver = drivers.find(d => d.id === result.driver_id);
                return (
                  <tr key={result.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {result.position <= 3 && (
                          <Trophy className={`w-4 h-4 ${
                            result.position === 1 ? 'text-yellow-500' :
                            result.position === 2 ? 'text-gray-400' :
                            'text-amber-600'
                          }`} />
                        )}
                        <span className="font-semibold">{result.position || '-'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {driver && `${driver.first_name} ${driver.last_name}`}
                    </td>
                    <td className="px-4 py-3">{result.total_time || '-'}</td>
                    <td className="px-4 py-3">{result.laps_completed || '-'}</td>
                    <td className="px-4 py-3">
                      {result.status_text && (
                        <span className={`px-2 py-1 text-xs rounded ${
                          result.status_text === 'Finished' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {result.status_text}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">{result.points_awarded || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <p className="text-gray-600">No results available</p>
        </div>
      )}
    </div>
  );
}