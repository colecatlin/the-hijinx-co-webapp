import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import PageShell from '@/components/shared/PageShell';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Trophy } from 'lucide-react';

export default function ResultsDirectory() {
  const [searchQuery, setSearchQuery] = useState('');
  const [seriesFilter, setSeriesFilter] = useState('all');

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['results'],
    queryFn: () => base44.entities.Results.list('-created_date', 500),
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.list(),
  });

  const getDriverName = (driverId) => {
    const driver = drivers.find(d => d.id === driverId);
    return driver ? `${driver.first_name} ${driver.last_name}` : 'Unknown';
  };

  const filteredResults = results.filter(result => {
    const driverName = getDriverName(result.driver_id);
    const matchesSearch = driverName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeries = seriesFilter === 'all' || result.series === seriesFilter;
    return matchesSearch && matchesSeries;
  });

  const uniqueSeries = [...new Set(results.map(r => r.series).filter(Boolean))];

  return (
    <PageShell>
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-black mb-2">Results</h1>
          <p className="text-gray-600">Browse race results and standings</p>
        </div>

        <div className="flex gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by driver..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={seriesFilter} onValueChange={setSeriesFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Series" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Series</SelectItem>
              {uniqueSeries.map(series => (
                <SelectItem key={series} value={series}>{series}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Loading...</div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase">Position</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase">Driver</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase">Team</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase">Series</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase">Class</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredResults.map(result => (
                  <tr key={result.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {result.position === 1 && <Trophy className="w-4 h-4 text-yellow-500" />}
                        <span className="font-bold">{result.position || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium">{getDriverName(result.driver_id)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{result.team_name || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{result.series || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{result.class || 'N/A'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded ${
                        result.status_text === 'Running' ? 'bg-green-100 text-green-800' :
                        result.status_text === 'DNF' ? 'bg-red-100 text-red-800' :
                        result.status_text === 'DSQ' ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {result.status_text || 'N/A'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && filteredResults.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No results found
          </div>
        )}
      </div>
    </PageShell>
  );
}