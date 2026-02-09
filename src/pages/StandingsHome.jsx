import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import PageShell from '@/components/shared/PageShell';
import SectionHeader from '@/components/shared/SectionHeader';
import EmptyState from '@/components/shared/EmptyState';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, ArrowUpDown, Clock, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function StandingsHome() {
  const [selectedSeries, setSelectedSeries] = useState('all');
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedSeason, setSelectedSeason] = useState('');
  const [sortField, setSortField] = useState('position');
  const [sortDir, setSortDir] = useState(1);
  const [syncing, setSyncing] = useState(false);
  const queryClient = useQueryClient();

  const { data: series = [], isLoading: loadingSeries } = useQuery({
    queryKey: ['series'],
    queryFn: () => base44.entities.Series.filter({ status: 'active' }),
  });

  const { data: entries = [], isLoading: loadingEntries } = useQuery({
    queryKey: ['standings'],
    queryFn: () => base44.entities.StandingsEntry.list('-position', 200),
  });

  const currentYear = new Date().getFullYear();

  // Derive available seasons and classes
  const availableSeasons = useMemo(() => {
    const s = [...new Set(entries.map(e => e.season).filter(Boolean))].sort((a, b) => b - a);
    return s.length > 0 ? s : [currentYear];
  }, [entries]);

  const activeSeason = selectedSeason || (availableSeasons[0] || currentYear);

  const availableClasses = useMemo(() => {
    let filtered = entries.filter(e => e.season === activeSeason);
    if (selectedSeries !== 'all') filtered = filtered.filter(e => e.series_id === selectedSeries);
    return ['all', ...new Set(filtered.map(e => e.class_name).filter(Boolean))];
  }, [entries, activeSeason, selectedSeries]);

  const filteredEntries = useMemo(() => {
    let data = entries.filter(e => e.season === activeSeason);
    if (selectedSeries !== 'all') data = data.filter(e => e.series_id === selectedSeries);
    if (selectedClass !== 'all') data = data.filter(e => e.class_name === selectedClass);
    data.sort((a, b) => {
      const aVal = a[sortField] ?? 0;
      const bVal = b[sortField] ?? 0;
      return (aVal - bVal) * sortDir;
    });
    return data;
  }, [entries, activeSeason, selectedSeries, selectedClass, sortField, sortDir]);

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d * -1);
    else { setSortField(field); setSortDir(1); }
  };

  const handlePullData = async () => {
    setSyncing(true);
    try {
      const response = await base44.functions.invoke('syncDataFromSheets', {
        spreadsheetId: '1-3zSsjrbilWnofiKD-aGYW48uk-BpK0SJF--pV-xJa0',
        entityType: 'StandingsEntry',
        sheetName: 'Sheet1',
      });
      toast.success(`✓ ${response.data.recordsProcessed} standings synced from Google Sheet`);
      queryClient.invalidateQueries({ queryKey: ['standings'] });
    } catch (error) {
      toast.error('Failed to sync data: ' + error.message);
    } finally {
      setSyncing(false);
    }
  };

  const lastUpdated = filteredEntries.length > 0 
    ? filteredEntries.reduce((latest, e) => {
        const d = e.last_updated || e.updated_date;
        return d && d > latest ? d : latest;
      }, '') 
    : null;

  const SortHeader = ({ field, children }) => (
    <th
      className="px-4 py-3 text-left text-[10px] font-mono tracking-wider text-gray-400 uppercase cursor-pointer hover:text-[#0A0A0A] select-none"
      onClick={() => toggleSort(field)}
    >
      <span className="flex items-center gap-1">
        {children}
        {sortField === field && <ArrowUpDown className="w-3 h-3" />}
      </span>
    </th>
  );

  return (
    <PageShell>
      <div className="max-w-7xl mx-auto px-6 py-12 md:py-20">
        <SectionHeader
          label="Motorsports"
          title="Points Standings"
          subtitle="Championship standings across all series and classes."
        />

        {/* Filters */}
         <div className="flex flex-wrap gap-3 mb-8 items-center">
          <Button
            onClick={handlePullData}
            disabled={syncing}
            size="sm"
            className="bg-[#232323] hover:bg-[#1A3249] text-white gap-2"
          >
            <Download className="w-4 h-4" />
            {syncing ? 'Syncing...' : 'Pull from Google Sheets'}
          </Button>

          <div className="w-px h-6 bg-gray-200" />

          <Select value={String(activeSeason)} onValueChange={(v) => setSelectedSeason(Number(v))}>
             <SelectTrigger className="w-32 rounded-none text-xs"><SelectValue /></SelectTrigger>
             <SelectContent>
               {availableSeasons.map(s => <SelectItem key={s} value={String(s)}>{s} Season</SelectItem>)}
             </SelectContent>
           </Select>

          <Select value={selectedSeries} onValueChange={(v) => { setSelectedSeries(v); setSelectedClass('all'); }}>
            <SelectTrigger className="w-44 rounded-none text-xs"><SelectValue placeholder="All Series" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Series</SelectItem>
              {series.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>

          {availableClasses.length > 1 && (
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-36 rounded-none text-xs"><SelectValue placeholder="All Classes" /></SelectTrigger>
              <SelectContent>
                {availableClasses.map(c => <SelectItem key={c} value={c}>{c === 'all' ? 'All Classes' : c}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Last updated */}
        {lastUpdated && (
          <div className="flex items-center gap-1 mb-4 text-xs text-gray-400 font-mono">
            <Clock className="w-3 h-3" />
            Last updated: {format(new Date(lastUpdated), 'MMM d, yyyy h:mm a')}
          </div>
        )}

        {loadingEntries || loadingSeries ? (
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : filteredEntries.length === 0 ? (
          <EmptyState icon={Trophy} title="No standings data" message="Standings will appear here once entries are added." />
        ) : (
          <div className="overflow-x-auto border border-gray-200">
            <table className="w-full min-w-[700px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <SortHeader field="position">Pos</SortHeader>
                  <th className="px-4 py-3 text-left text-[10px] font-mono tracking-wider text-gray-400 uppercase">Driver</th>
                  {selectedSeries === 'all' && <th className="px-4 py-3 text-left text-[10px] font-mono tracking-wider text-gray-400 uppercase">Series</th>}
                  <th className="px-4 py-3 text-left text-[10px] font-mono tracking-wider text-gray-400 uppercase">Team</th>
                  <SortHeader field="points">Pts</SortHeader>
                  <SortHeader field="wins">Wins</SortHeader>
                  <SortHeader field="podiums">Podiums</SortHeader>
                  <SortHeader field="starts">Starts</SortHeader>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry, i) => (
                  <tr key={entry.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${i < 3 ? 'font-medium' : ''}`}>
                    <td className="px-4 py-3 text-sm tabular-nums">
                      <span className={`inline-flex items-center justify-center w-7 h-7 text-xs font-bold ${
                        i === 0 ? 'bg-[#0A0A0A] text-white' : i < 3 ? 'bg-gray-200' : ''
                      }`}>
                        {entry.position}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {entry.driver_id ? (
                        <Link to={createPageUrl('DriverProfile') + `?id=${entry.driver_id}`} className="text-sm font-semibold hover:underline">
                          {entry.driver_name}
                        </Link>
                      ) : (
                        <span className="text-sm font-semibold">{entry.driver_name}</span>
                      )}
                      {entry.hometown && <span className="text-[10px] text-gray-400 ml-2">{entry.hometown}</span>}
                    </td>
                    {selectedSeries === 'all' && (
                      <td className="px-4 py-3 text-xs text-gray-500">{entry.series_name}</td>
                    )}
                    <td className="px-4 py-3 text-xs text-gray-500">{entry.team_name}</td>
                    <td className="px-4 py-3 text-sm font-bold tabular-nums">{entry.points}</td>
                    <td className="px-4 py-3 text-sm tabular-nums">{entry.wins || 0}</td>
                    <td className="px-4 py-3 text-sm tabular-nums">{entry.podiums || 0}</td>
                    <td className="px-4 py-3 text-sm tabular-nums">{entry.starts || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageShell>
  );
}