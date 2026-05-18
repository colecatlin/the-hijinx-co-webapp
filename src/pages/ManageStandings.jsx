/**
 * ManageStandings — READ-ONLY INSPECT MODE
 *
 * R8AI: Direct standings mutations removed. Standings are computed snapshots.
 * R8AJ: Modernized to tactical dark styling using StandingsRecordGrid.
 *
 * To rebuild: EventFile → Standings tab → Recalculate,
 * or trigger recalculateStandings from Race Operations Hub.
 */
import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Info, Search, Download } from 'lucide-react';
import ManagementLayout from '@/components/management/ManagementLayout';
import ManagementShell from '@/components/management/ManagementShell';
import StandingsRecordGrid from '@/components/registrationdashboard/standings/StandingsRecordGrid';

export default function ManageStandings() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: standings = [], isLoading } = useQuery({
    queryKey: ['standings'],
    queryFn: () => base44.entities.Standings.list('-season_year'),
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.list('first_name', 500),
    staleTime: 5 * 60 * 1000,
  });

  const filtered = useMemo(() => {
    if (!searchQuery) return standings;
    const q = searchQuery.toLowerCase();
    return standings.filter(s =>
      s.driver_id?.toLowerCase().includes(q) ||
      s.series_id?.toLowerCase().includes(q) ||
      s.season_year?.toLowerCase().includes(q) ||
      s.series_class_id?.toLowerCase().includes(q) ||
      drivers.find(d => d.id === s.driver_id && (
        `${d.first_name} ${d.last_name}`.toLowerCase().includes(q)
      ))
    );
  }, [standings, drivers, searchQuery]);

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(standings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `standings-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ManagementLayout currentPage="ManageStandings">
      <ManagementShell
        title="Standings"
        subtitle="Championship standings — read-only inspection"
        actions={
          <Button variant="outline" size="sm" onClick={handleExport} disabled={standings.length === 0}>
            <Download className="w-3.5 h-3.5 mr-1.5" />Export JSON
          </Button>
        }
      >
        {/* Soft deprecation notice */}
        <div className="mb-4 flex items-start gap-3 px-4 py-3 rounded-lg border border-amber-800/40 bg-amber-950/15">
          <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-300">Standings management has moved</p>
            <p className="text-xs text-amber-400/80 mt-0.5">
              Use the{' '}
              <a href="/racecore/standings" className="underline text-amber-300 hover:text-amber-200">
                RaceCore Standings
              </a>{' '}
              page for series-scoped standings authority. This page remains for legacy inspection only.
            </p>
          </div>
        </div>

        {/* Authority notice */}
        <div className="mb-5 flex items-start gap-3 px-4 py-3 rounded-lg border border-blue-800/40 bg-blue-950/20">
          <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-300">Standings are computed snapshots</p>
            <p className="text-xs text-blue-400/80 mt-0.5">
              Direct editing is disabled. Rebuild standings from{' '}
              <span className="font-mono text-blue-300">EventFile → Standings → Recalculate</span>.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
          <Input
            placeholder="Search driver, series, season..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 bg-[#111] border-gray-800 text-gray-200 placeholder:text-gray-700 text-sm"
          />
        </div>

        {/* Tactical standings grid */}
        <div className="bg-[#0e0e0e] border border-gray-800 rounded-lg overflow-hidden">
          <StandingsRecordGrid
            standings={filtered}
            drivers={drivers}
            isLoading={isLoading}
            emptyMessage={searchQuery ? 'No standings match your search' : 'No standings calculated yet'}
          />
        </div>
      </ManagementShell>
    </ManagementLayout>
  );
}