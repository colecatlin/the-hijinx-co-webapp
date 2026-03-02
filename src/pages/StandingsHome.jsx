import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { QueryKeys } from '@/components/utils/queryKeys';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';

const DQ = applyDefaultQueryOptions();
import { useMotorsportsContext } from '@/components/motorsports/useMotorsportsContext';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import PageShell from '@/components/shared/PageShell';
import SectionHeader from '@/components/shared/SectionHeader';
import EmptyState from '@/components/shared/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, ArrowUpDown, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function StandingsHome() {
  const [selectedSeries, setSelectedSeries] = useState('all');
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedSeason, setSelectedSeason] = useState('');
  const [sortField, setSortField] = useState('position');
  const [sortDir, setSortDir] = useState(1);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { seasonYear, isLoading: contextLoading, error: contextError } = useMotorsportsContext();

  const { data: series = [], isLoading: loadingSeries } = useQuery({
    queryKey: ['series'],
    queryFn: () => base44.entities.Series.filter({ status: 'active' }),
  });

  const { data: entries = [], isLoading: loadingEntries } = useQuery({
    queryKey: ['standings'],
    queryFn: () => base44.entities.Standings.list('-total_points', 500),
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list(),
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => base44.entities.Session.list(),
  });

  const isAdmin = user?.role === 'admin';

  const getLatestSessionStatus = (seriesId, seasonYear) => {
    const relatedEvents = events.filter(e => e.series_id === seriesId && e.season === seasonYear);
    const relatedSessions = sessions.filter(s => relatedEvents.some(e => e.id === s.event_id));
    const officialOrLockedSessions = relatedSessions.filter(s => 
      s.status === 'Official' || s.status === 'Locked'
    );
    return officialOrLockedSessions.length > 0;
  };

  const isStandingsPublic = (standing) => {
    return isAdmin || getLatestSessionStatus(standing.series_id, standing.season_year);
  };

  const currentYear = new Date().getFullYear().toString();

  // Derive available seasons and classes
  const availableSeasons = useMemo(() => {
    const s = [...new Set(entries.map(e => e.season_year).filter(Boolean))].sort((a, b) => b.localeCompare(a));
    return s.length > 0 ? s : [currentYear];
  }, [entries]);

  const activeSeason = selectedSeason || availableSeasons[0] || currentYear;

  const availableClasses = useMemo(() => {
    let filtered = entries.filter(e => e.season_year === activeSeason);
    if (selectedSeries !== 'all') filtered = filtered.filter(e => e.series_id === selectedSeries);
    return ['all', ...new Set(filtered.map(e => e.class_name).filter(Boolean))];
  }, [entries, activeSeason, selectedSeries]);

  const filteredEntries = useMemo(() => {
    let data = entries.filter(e => e.season_year === activeSeason && isStandingsPublic(e));
    if (selectedSeries !== 'all') data = data.filter(e => e.series_id === selectedSeries);
    if (selectedClass !== 'all') data = data.filter(e => e.class_name === selectedClass);
    data.sort((a, b) => {
      const aVal = a[sortField] ?? 0;
      const bVal = b[sortField] ?? 0;
      if (typeof aVal === 'string') return aVal.localeCompare(bVal) * sortDir;
      return (aVal - bVal) * sortDir;
    });
    return data;
  }, [entries, activeSeason, selectedSeries, selectedClass, sortField, sortDir, isAdmin, events, sessions]);

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d * -1);
    else { setSortField(field); setSortDir(1); }
  };

  const lastUpdated = filteredEntries.length > 0
    ? filteredEntries.reduce((latest, e) => {
        const d = e.last_calculated || e.updated_date;
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

        {loadingEntries || loadingSeries || contextLoading ? (
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : contextError ? (
          <EmptyState icon={Trophy} title="Error loading standings" message="Please refresh the page or try again." />
        ) : filteredEntries.length === 0 ? (
          <EmptyState icon={Trophy} title="Standings not yet published" message="Standings will appear here once results are finalized." />
        ) : (
          <>
            {isAdmin && (
              <div className="mb-4">
                <Badge className="bg-gray-700 text-white">Internal Preview</Badge>
              </div>
            )}
            <div className="overflow-x-auto border border-gray-200">
              <table className="w-full min-w-[700px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <SortHeader field="position">Pos</SortHeader>
                    <th className="px-4 py-3 text-left text-[10px] font-mono tracking-wider text-gray-400 uppercase">Driver</th>
                    <th className="px-4 py-3 text-left text-[10px] font-mono tracking-wider text-gray-400 uppercase">Bib #</th>
                    {selectedSeries === 'all' && <th className="px-4 py-3 text-left text-[10px] font-mono tracking-wider text-gray-400 uppercase">Series</th>}
                    {selectedClass === 'all' && <th className="px-4 py-3 text-left text-[10px] font-mono tracking-wider text-gray-400 uppercase">Class</th>}
                    <SortHeader field="total_points">Pts</SortHeader>
                    <SortHeader field="wins">Wins</SortHeader>
                    <SortHeader field="podiums">Podiums</SortHeader>
                    <SortHeader field="events_counted">Starts</SortHeader>
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
                        <Link to={createPageUrl('DriverProfile', { first: entry.first_name.toLowerCase(), last: entry.last_name.toLowerCase() })} className="text-sm font-semibold hover:underline">
                          {entry.first_name} {entry.last_name}
                        </Link>
                      ) : (
                        <span className="text-sm font-semibold">{entry.first_name} {entry.last_name}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 font-mono">{entry.bib_number || '—'}</td>
                    {selectedSeries === 'all' && (
                     <td className="px-4 py-3 text-xs text-gray-500">{entry.series_name}</td>
                    )}
                    {selectedClass === 'all' && (
                     <td className="px-4 py-3 text-xs text-gray-500">{entry.class_name}</td>
                    )}
                    <td className="px-4 py-3 text-sm font-bold tabular-nums">{entry.total_points}</td>
                    <td className="px-4 py-3 text-sm tabular-nums">{entry.wins || 0}</td>
                    <td className="px-4 py-3 text-sm tabular-nums">{entry.podiums || 0}</td>
                    <td className="px-4 py-3 text-sm tabular-nums">{entry.events_counted || 0}</td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </PageShell>
  );
}