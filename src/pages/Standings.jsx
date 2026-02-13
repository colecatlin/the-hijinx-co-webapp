import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageShell from '@/components/shared/PageShell';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trophy, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';

export default function Standings() {
  const [filters, setFilters] = useState({
    series: '',
    season: new Date().getFullYear().toString(),
    class: ''
  });

  const { data: series = [] } = useQuery({
    queryKey: ['series'],
    queryFn: () => base44.entities.Series.filter({ status: 'Published' })
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes', filters.series],
    queryFn: () => base44.entities.Class.filter({ series_id: filters.series, status: 'Published' }),
    enabled: !!filters.series
  });

  const { data: standings = [] } = useQuery({
    queryKey: ['standings', filters.series, filters.season, filters.class],
    queryFn: async () => {
      const filter = {};
      if (filters.series) filter.series_id = filters.series;
      if (filters.season) filter.season_year = parseInt(filters.season);
      if (filters.class) filter.class_id = filters.class;
      const s = await base44.entities.StandingsSnapshot.filter(filter);
      return s.sort((a, b) => a.rank - b.rank);
    },
    enabled: !!filters.series && !!filters.season
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.filter({ status: 'Published' }),
    enabled: standings.length > 0
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
          <h1 className="text-4xl font-black mb-2">Championship Standings</h1>
          <p className="text-lg text-gray-600">Current points standings across all series</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Series</label>
              <Select value={filters.series} onValueChange={(v) => setFilters(prev => ({ ...prev, series: v, class: '' }))}>
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
              <Select value={filters.season} onValueChange={(v) => setFilters(prev => ({ ...prev, season: v }))}>
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
              <label className="block text-sm font-medium mb-2">Class</label>
              <Select value={filters.class} onValueChange={(v) => setFilters(prev => ({ ...prev, class: v }))} disabled={!filters.series}>
                <SelectTrigger>
                  <SelectValue placeholder="All classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>All Classes</SelectItem>
                  {classes.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {standings.length > 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Rank</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Driver</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Points</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Wins</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Podiums</th>
                </tr>
              </thead>
              <tbody>
                {standings.map(standing => {
                  const driver = drivers.find(d => d.id === standing.driver_id);
                  return (
                    <tr key={standing.id} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {standing.rank <= 3 && (
                            <Trophy className={`w-5 h-5 ${
                              standing.rank === 1 ? 'text-yellow-500' :
                              standing.rank === 2 ? 'text-gray-400' :
                              'text-amber-600'
                            }`} />
                          )}
                          <span className="font-bold text-lg">{standing.rank}</span>
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
                      <td className="px-6 py-4">
                        <span className="font-bold text-lg">{standing.points}</span>
                      </td>
                      <td className="px-6 py-4">{standing.wins || 0}</td>
                      <td className="px-6 py-4">{standing.podiums || 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
            <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              {!filters.series ? 'Select a series to view standings' : 'No standings data available'}
            </p>
          </div>
        )}
      </div>
    </PageShell>
  );
}