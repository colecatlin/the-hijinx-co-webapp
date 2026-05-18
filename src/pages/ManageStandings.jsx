/**
 * ManageStandings — READ-ONLY INSPECT MODE
 *
 * R8AI: Direct standings mutations (create, edit, delete, import, bulk delete)
 * have been removed. Standings are computed snapshots derived from Results via
 * recalculateStandings. Direct editing bypasses the authority chain and breaks
 * the determinism guarantee.
 *
 * To rebuild standings: use EventFile → Standings tab → Recalculate,
 * or trigger recalculateStandings from the Race Operations Hub.
 */
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { AlertCircle, Search, Download, Info } from 'lucide-react';
import ManagementLayout from '@/components/management/ManagementLayout';
import ManagementShell from '@/components/management/ManagementShell';
import { Button } from '@/components/ui/button';

export default function ManageStandings() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['standings'],
    queryFn: () => base44.entities.Standings.list('-season_year'),
  });

  const filteredEntries = entries.filter(entry =>
    entry.driver_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.series_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.season_year?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.series_class_id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleExport = () => {
    const dataStr = JSON.stringify(entries, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `standings-export-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ManagementLayout currentPage="ManageStandings">
      <ManagementShell
        title="Standings"
        subtitle="Championship standings — read-only inspect view"
        actions={
          <Button variant="outline" onClick={handleExport} disabled={entries.length === 0}>
            <Download className="w-4 h-4 mr-2" />Export JSON
          </Button>
        }
      >
        {/* Authority notice */}
        <div className="mb-6 flex items-start gap-3 px-4 py-3 rounded-lg border border-blue-800/50 bg-blue-950/20">
          <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-300">Standings are computed snapshots</p>
            <p className="text-xs text-blue-400/80 mt-0.5">
              Direct editing is disabled. Standings are rebuilt automatically from official Results
              via <span className="font-mono text-blue-300">recalculateStandings</span>.
              To rebuild: open an Event in Race Control → Standings tab → Recalculate.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by driver ID, series ID, season, or class..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="p-6 space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : filteredEntries.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Rank</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Driver ID</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Series / Class</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Season</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600">Points</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600">Wins</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600">Starts</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Last Calculated</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry) => (
                    <tr key={entry.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-6 py-4 font-bold text-lg">{entry.rank || entry.position || '—'}</td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-sm truncate max-w-[140px]" title={entry.driver_id}>{entry.driver_id || '—'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-700 truncate max-w-[140px]" title={entry.series_id}>{entry.series_id || '—'}</div>
                        {entry.series_class_id && (
                          <div className="text-xs text-gray-500 truncate max-w-[140px]" title={entry.series_class_id}>{entry.series_class_id}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{entry.season_year || '—'}</td>
                      <td className="px-6 py-4 text-right font-semibold">{entry.points_total ?? 0}</td>
                      <td className="px-6 py-4 text-right text-sm text-gray-600">{entry.wins ?? 0}</td>
                      <td className="px-6 py-4 text-right text-sm text-gray-600">{entry.starts ?? 0}</td>
                      <td className="px-6 py-4 text-xs text-gray-500">
                        {entry.last_calculated
                          ? new Date(entry.last_calculated).toLocaleString()
                          : entry.updated_date
                            ? new Date(entry.updated_date).toLocaleDateString()
                            : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500">
              {searchQuery ? (
                <p>No standings match your search</p>
              ) : (
                <div className="space-y-2">
                  <AlertCircle className="w-8 h-8 text-gray-300 mx-auto" />
                  <p className="font-medium">No standings calculated yet</p>
                  <p className="text-sm text-gray-400">Open an event in Race Control and run Recalculate from the Standings tab.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </ManagementShell>
    </ManagementLayout>
  );
}