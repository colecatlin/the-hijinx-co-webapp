import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function EventTiming({ eventId }) {
  const [selectedSession, setSelectedSession] = useState('');

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions', eventId],
    queryFn: () => base44.entities.Session.filter({ event_id: eventId, status: 'Published' })
  });

  const { data: timing = [] } = useQuery({
    queryKey: ['timing', selectedSession],
    queryFn: async () => {
      if (!selectedSession) return [];
      const t = await base44.entities.Timing.filter({ session_id: selectedSession });
      return t.sort((a, b) => {
        if (a.driver_id !== b.driver_id) return a.driver_id.localeCompare(b.driver_id);
        return a.lap_number - b.lap_number;
      });
    },
    enabled: !!selectedSession
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.filter({ status: 'Published' }),
    enabled: timing.length > 0
  });

  React.useEffect(() => {
    if (sessions.length > 0 && !selectedSession) {
      setSelectedSession(sessions[0].id);
    }
  }, [sessions, selectedSession]);

  const formatTime = (ms) => {
    if (!ms) return '-';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = ms % 1000;
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Timing</h2>
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

      {timing.length > 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Driver</th>
                <th className="px-4 py-3 text-left font-semibold">Lap</th>
                <th className="px-4 py-3 text-left font-semibold">Lap Time</th>
                <th className="px-4 py-3 text-left font-semibold">S1</th>
                <th className="px-4 py-3 text-left font-semibold">S2</th>
                <th className="px-4 py-3 text-left font-semibold">S3</th>
              </tr>
            </thead>
            <tbody>
              {timing.map(t => {
                const driver = drivers.find(d => d.id === t.driver_id);
                return (
                  <tr key={t.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2">
                      {driver && `${driver.first_name} ${driver.last_name}`}
                    </td>
                    <td className="px-4 py-2">{t.lap_number}</td>
                    <td className="px-4 py-2 font-mono">{formatTime(t.lap_time_ms)}</td>
                    <td className="px-4 py-2 font-mono text-gray-600">{formatTime(t.sector_1_ms)}</td>
                    <td className="px-4 py-2 font-mono text-gray-600">{formatTime(t.sector_2_ms)}</td>
                    <td className="px-4 py-2 font-mono text-gray-600">{formatTime(t.sector_3_ms)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <p className="text-gray-600">No timing data available</p>
        </div>
      )}
    </div>
  );
}