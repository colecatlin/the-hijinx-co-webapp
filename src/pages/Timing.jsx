import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageShell from '@/components/shared/PageShell';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock } from 'lucide-react';

export default function Timing() {
  const [filters, setFilters] = useState({
    event: '',
    session: '',
    driver: ''
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.filter({ status: 'Published' })
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions', filters.event],
    queryFn: () => base44.entities.Session.filter({ event_id: filters.event, status: 'Published' }),
    enabled: !!filters.event
  });

  const { data: timing = [] } = useQuery({
    queryKey: ['timing', filters.session],
    queryFn: async () => {
      if (!filters.session) return [];
      return base44.entities.Timing.filter({ session_id: filters.session });
    },
    enabled: !!filters.session
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.filter({ status: 'Published' }),
    enabled: timing.length > 0
  });

  const filteredTiming = filters.driver 
    ? timing.filter(t => t.driver_id === filters.driver)
    : timing;

  const sortedTiming = [...filteredTiming].sort((a, b) => {
    if (a.driver_id !== b.driver_id) return a.driver_id.localeCompare(b.driver_id);
    return a.lap_number - b.lap_number;
  });

  const uniqueDrivers = [...new Set(timing.map(t => t.driver_id))];

  const formatTime = (ms) => {
    if (!ms) return '-';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = ms % 1000;
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  };

  return (
    <PageShell className="bg-[#FFF8F5]">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-black mb-2">Timing Data</h1>
          <p className="text-lg text-gray-600">Lap times and sector analysis</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Event</label>
              <Select value={filters.event} onValueChange={(v) => setFilters(prev => ({ ...prev, event: v, session: '', driver: '' }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select event" />
                </SelectTrigger>
                <SelectContent>
                  {events.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Session</label>
              <Select value={filters.session} onValueChange={(v) => setFilters(prev => ({ ...prev, session: v, driver: '' }))} disabled={!filters.event}>
                <SelectTrigger>
                  <SelectValue placeholder="Select session" />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Driver</label>
              <Select value={filters.driver} onValueChange={(v) => setFilters(prev => ({ ...prev, driver: v }))} disabled={!filters.session}>
                <SelectTrigger>
                  <SelectValue placeholder="All drivers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>All Drivers</SelectItem>
                  {uniqueDrivers.map(driverId => {
                    const driver = drivers.find(d => d.id === driverId);
                    return driver ? (
                      <SelectItem key={driver.id} value={driver.id}>
                        {driver.first_name} {driver.last_name}
                      </SelectItem>
                    ) : null;
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {sortedTiming.length > 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Driver</th>
                  <th className="px-4 py-3 text-left font-semibold">Lap</th>
                  <th className="px-4 py-3 text-left font-semibold">Lap Time</th>
                  <th className="px-4 py-3 text-left font-semibold">Sector 1</th>
                  <th className="px-4 py-3 text-left font-semibold">Sector 2</th>
                  <th className="px-4 py-3 text-left font-semibold">Sector 3</th>
                </tr>
              </thead>
              <tbody>
                {sortedTiming.map(t => {
                  const driver = drivers.find(d => d.id === t.driver_id);
                  return (
                    <tr key={t.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">
                        {driver && `${driver.first_name} ${driver.last_name}`}
                      </td>
                      <td className="px-4 py-3">{t.lap_number}</td>
                      <td className="px-4 py-3 font-mono font-semibold">{formatTime(t.lap_time_ms)}</td>
                      <td className="px-4 py-3 font-mono text-gray-600">{formatTime(t.sector_1_ms)}</td>
                      <td className="px-4 py-3 font-mono text-gray-600">{formatTime(t.sector_2_ms)}</td>
                      <td className="px-4 py-3 font-mono text-gray-600">{formatTime(t.sector_3_ms)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              {!filters.session ? 'Select filters to view timing data' : 'No timing data available'}
            </p>
          </div>
        )}
      </div>
    </PageShell>
  );
}