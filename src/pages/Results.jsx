import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageShell from '@/components/shared/PageShell';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trophy, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';

export default function Results() {
  const [filters, setFilters] = useState({
    series: '',
    season: new Date().getFullYear().toString(),
    event: '',
    session: ''
  });

  const { data: series = [] } = useQuery({
    queryKey: ['series'],
    queryFn: () => base44.entities.Series.filter({ status: 'Published' })
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events', filters.series, filters.season],
    queryFn: async () => {
      const filter = { status: 'Published' };
      if (filters.series) filter.series_id = filters.series;
      if (filters.season) filter.season_year = parseInt(filters.season);
      return base44.entities.Event.filter(filter);
    },
    enabled: !!filters.series && !!filters.season
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions', filters.event],
    queryFn: () => base44.entities.Session.filter({ event_id: filters.event, status: 'Published' }),
    enabled: !!filters.event
  });

  const { data: results = [] } = useQuery({
    queryKey: ['results', filters.session],
    queryFn: async () => {
      if (!filters.session) return [];
      const r = await base44.entities.Result.filter({ session_id: filters.session });
      return r.sort((a, b) => (a.position || 999) - (b.position || 999));
    },
    enabled: !!filters.session
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.filter({ status: 'Published' }),
    enabled: results.length > 0
  });

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

  React.useEffect(() => {
    if (series.length > 0 && !filters.series) {
      setFilters(prev => ({ ...prev, series: series[0].id }));
    }
  }, [series, filters.series]);

  return (
    <PageShell className="bg-[#FFF8F5]">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-black mb-2">Results</h1>
          <p className="text-lg text-gray-600">Session results and race finishes</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Series</label>
              <Select value={filters.series} onValueChange={(v) => setFilters(prev => ({ ...prev, series: v, event: '', session: '' }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select series" />
                </SelectTrigger>
                <SelectContent>
                  {series.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Season</label>
              <Select value={filters.season} onValueChange={(v) => setFilters(prev => ({ ...prev, season: v, event: '', session: '' }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select season" />
                </SelectTrigger>
                <SelectContent>
                  {years.map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Event</label>
              <Select value={filters.event} onValueChange={(v) => setFilters(prev => ({ ...prev, event: v, session: '' }))} disabled={!filters.series}>
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
              <Select value={filters.session} onValueChange={(v) => setFilters(prev => ({ ...prev, session: v }))} disabled={!filters.event}>
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
          </div>
        </div>

        {results.length > 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Pos</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Driver</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Time</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Laps</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Points</th>
                </tr>
              </thead>
              <tbody>
                {results.map(result => {
                  const driver = drivers.find(d => d.id === result.driver_id);
                  return (
                    <tr key={result.id} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {result.position <= 3 && (
                            <Trophy className={`w-5 h-5 ${
                              result.position === 1 ? 'text-yellow-500' :
                              result.position === 2 ? 'text-gray-400' :
                              'text-amber-600'
                            }`} />
                          )}
                          <span className="font-bold text-lg">{result.position || '-'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {driver && (
                          <Link 
                            to={createPageUrl('DriverProfile', { slug: driver.slug })}
                            className="font-semibold hover:text-[#232323]"
                          >
                            {driver.first_name} {driver.last_name}
                          </Link>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono">{result.total_time || '-'}</td>
                      <td className="px-6 py-4">{result.laps_completed || '-'}</td>
                      <td className="px-6 py-4">
                        {result.status_text && (
                          <span className={`px-2 py-1 text-xs rounded ${
                            result.status_text === 'Finished' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {result.status_text}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">{result.points_awarded || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
            <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              {!filters.session ? 'Select filters to view results' : 'No results available'}
            </p>
          </div>
        )}
      </div>
    </PageShell>
  );
}