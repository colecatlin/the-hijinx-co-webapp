import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import ExportCard from './exports/ExportCard';
import ExportHistory from './exports/ExportHistory';
import {
  generateEntriesExport,
  generateSessionResultsExport,
  generateWeekendSummaryExport,
  generateStandingsExport,
  generatePointsLedgerExport,
} from './exports/exportGenerators';

export default function ExportsManager({
  selectedEvent,
  selectedTrack,
  selectedSeries,
  dashboardContext,
  isAdmin,
  dashboardPermissions,
  onExportCompleted,
  announcerMode,
}) {
  const [orgType, setOrgType] = useState('series');
  const [selectedOrg, setSelectedOrg] = useState('');
  const [selectedSeason, setSelectedSeason] = useState('');
  const [selectedEventLocal, setSelectedEventLocal] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [exportHistory, setExportHistory] = useState([]);

  // Use prop selectedEvent if available, otherwise use local state
  const effectiveEvent = selectedEvent?.id || selectedEventLocal;

  // Data fetching
  const { data: series = [] } = useQuery({
    queryKey: ['series'],
    queryFn: () => base44.entities.Series.list(),
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list(),
  });

  const { data: seriesClasses = [] } = useQuery({
    queryKey: ['seriesClasses', selectedOrg],
    queryFn: () =>
      orgType === 'series' && selectedOrg
        ? base44.entities.SeriesClass.filter({ series_id: selectedOrg })
        : Promise.resolve([]),
    enabled: orgType === 'series' && !!selectedOrg,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions', effectiveEvent],
    queryFn: () =>
      effectiveEvent
        ? base44.entities.Session.filter({ event_id: effectiveEvent })
        : Promise.resolve([]),
    enabled: !!effectiveEvent,
  });

  const { data: results = [] } = useQuery({
    queryKey: ['results'],
    queryFn: () => base44.entities.Results.list(),
  });

  const { data: standings = [] } = useQuery({
    queryKey: ['standings'],
    queryFn: () => base44.entities.Standings.list(),
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.list(),
  });

  const { data: driverPrograms = [] } = useQuery({
    queryKey: ['driverPrograms'],
    queryFn: () => base44.entities.DriverProgram.list(),
  });

  const { data: entries = [] } = useQuery({
    queryKey: ['entries'],
    queryFn: async () => {
      try {
        return await base44.entities.Entry.list();
      } catch {
        return [];
      }
    },
  });

  // Compute available seasons
  const seasons = useMemo(() => {
    if (!selectedOrg) return [];
    const uniqueYears = new Set();
    if (orgType === 'series') {
      events.forEach((e) => {
        if (e.series_id === selectedOrg) {
          const year = new Date(e.event_date).getFullYear();
          uniqueYears.add(year);
        }
      });
    }
    return Array.from(uniqueYears).sort((a, b) => b - a);
  }, [selectedOrg, orgType, events]);

  // Filter events based on selection
  const filteredEvents = useMemo(() => {
    if (!selectedOrg || !selectedSeason) return [];
    const year = parseInt(selectedSeason);
    return events.filter((e) => {
      const eventYear = new Date(e.event_date).getFullYear();
      if (orgType === 'series') {
        return e.series_id === selectedOrg && eventYear === year;
      }
      return eventYear === year;
    });
  }, [selectedOrg, selectedSeason, orgType, events]);

  // Filter sessions
  const filteredSessions = useMemo(() => {
    if (!effectiveEvent) return [];
    return sessions;
  }, [effectiveEvent, sessions]);

  // Get relevant classes
  const relevantClasses = useMemo(() => {
    if (orgType === 'series') {
      return seriesClasses;
    }
    return [];
  }, [orgType, seriesClasses]);

  const handleExport = async (exportType) => {
    try {
      let data = [];
      let fileName = '';
      let requiredFields = [];
      let filterSummary = '';

      switch (exportType) {
        case 'entries':
          requiredFields = ['event'];
          if (requiredFields.some((f) => !{ event: effectiveEvent }[f])) {
            toast.error('Select an event');
            return;
          }
          data = generateEntriesExport(
            effectiveEvent,
            selectedClass,
            entries,
            driverPrograms,
            drivers,
            events,
            seriesClasses
          );
          fileName = `entries-${effectiveEvent}`;
          filterSummary = `Event: ${effectiveEvent}${selectedClass ? `, Class: ${selectedClass}` : ''}`;
          break;

        case 'sessionResults':
          requiredFields = ['event', 'session'];
          if (requiredFields.some((f) => !{ event: effectiveEvent, session: selectedSession }[f])) {
            toast.error('Select an event and session');
            return;
          }
          data = generateSessionResultsExport(
            effectiveEvent,
            selectedSession,
            results,
            drivers,
            events,
            sessions,
            seriesClasses
          );
          fileName = `results-${effectiveEvent}-${selectedSession}`;
          filterSummary = `Event: ${effectiveEvent}, Session: ${selectedSession}`;
          break;

        case 'weekend':
          if (!effectiveEvent) {
            toast.error('Select an event');
            return;
          }
          data = generateWeekendSummaryExport(
            effectiveEvent,
            entries,
            driverPrograms,
            sessions,
            results,
            drivers,
            events,
            seriesClasses
          );
          fileName = `weekend-${effectiveEvent}`;
          filterSummary = `Event: ${effectiveEvent}`;
          break;

        case 'standings':
          requiredFields = ['org', 'season', 'class'];
          if (
            requiredFields.some(
              (f) =>
                !{
                  org: selectedOrg,
                  season: selectedSeason,
                  class: selectedClass,
                }[f]
            )
          ) {
            toast.error('Select series, season, and class');
            return;
          }
          data = generateStandingsExport(
            selectedOrg,
            selectedSeason,
            selectedClass,
            standings,
            drivers,
            series
          );
          fileName = `standings-${selectedOrg}-${selectedSeason}-${selectedClass}`;
          filterSummary = `Series: ${selectedOrg}, Season: ${selectedSeason}, Class: ${selectedClass}`;
          break;

        case 'pointsLedger':
          requiredFields = ['org', 'season', 'class'];
          if (
            requiredFields.some(
              (f) =>
                !{
                  org: selectedOrg,
                  season: selectedSeason,
                  class: selectedClass,
                }[f]
            )
          ) {
            toast.error('Select series, season, and class');
            return;
          }
          data = generatePointsLedgerExport(
            selectedOrg,
            selectedSeason,
            selectedClass,
            results,
            drivers,
            events,
            series
          );
          fileName = `points-ledger-${selectedOrg}-${selectedSeason}-${selectedClass}`;
          filterSummary = `Series: ${selectedOrg}, Season: ${selectedSeason}, Class: ${selectedClass}`;
          break;

        default:
          return;
      }

      // Generate CSV
      const csv = generateCSV(data);
      downloadCSV(csv, `${fileName}.csv`);

      // Add to history
      setExportHistory((prev) => [
        {
          timestamp: new Date().toLocaleString(),
          type: exportType,
          summary: filterSummary,
          rows: data.length - 1, // Subtract header row
          status: 'success',
        },
        ...prev.slice(0, 19),
      ]);

      toast.success(`Exported ${data.length - 1} rows`);
    } catch (error) {
      toast.error(`Export failed: ${error.message}`);
    }
  };

  if (!isAdmin) {
    return (
      <Card className="bg-[#262626] border-gray-700">
        <CardContent className="py-8">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-amber-400 font-medium">Admin only</p>
              <p className="text-xs text-gray-400 mt-1">
                Data exports are available to admins only.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Control Bar */}
      <Card className="bg-[#262626] border-gray-700">
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-xs">
              <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">
                Organization
              </label>
              <Select value={orgType} onValueChange={setOrgType}>
                <SelectTrigger className="bg-[#171717] border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#171717] border-gray-700">
                  <SelectItem value="track" className="text-white">
                    Track
                  </SelectItem>
                  <SelectItem value="series" className="text-white">
                    Series
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {orgType === 'series' && (
              <div className="flex-1 min-w-xs">
                <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">
                  Series *
                </label>
                <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                  <SelectTrigger className="bg-[#171717] border-gray-700 text-white">
                    <SelectValue placeholder="Select series..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#171717] border-gray-700">
                    {series.map((s) => (
                      <SelectItem key={s.id} value={s.id} className="text-white">
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex-1 min-w-xs">
              <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">
                Season
              </label>
              <Select value={selectedSeason} onValueChange={setSelectedSeason}>
                <SelectTrigger className="bg-[#171717] border-gray-700 text-white">
                  <SelectValue placeholder="Select season..." />
                </SelectTrigger>
                <SelectContent className="bg-[#171717] border-gray-700">
                  {seasons.map((year) => (
                    <SelectItem key={year} value={year.toString()} className="text-white">
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-xs">
              <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">
                Event
              </label>
              <Select value={selectedEventLocal} onValueChange={setSelectedEventLocal}>
                <SelectTrigger className="bg-[#171717] border-gray-700 text-white">
                  <SelectValue placeholder="All events" />
                </SelectTrigger>
                <SelectContent className="bg-[#171717] border-gray-700">
                  <SelectItem value={null} className="text-white">
                    All events
                  </SelectItem>
                  {filteredEvents.map((e) => (
                    <SelectItem key={e.id} value={e.id} className="text-white">
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-xs">
              <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">
                Class
              </label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="bg-[#171717] border-gray-700 text-white">
                  <SelectValue placeholder="All classes" />
                </SelectTrigger>
                <SelectContent className="bg-[#171717] border-gray-700">
                  <SelectItem value={null} className="text-white">
                    All classes
                  </SelectItem>
                  {relevantClasses.map((c) => (
                    <SelectItem key={c.id} value={c.class_name} className="text-white">
                      {c.class_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-xs">
              <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">
                Session
              </label>
              <Select value={selectedSession} onValueChange={setSelectedSession}>
                <SelectTrigger className="bg-[#171717] border-gray-700 text-white">
                  <SelectValue placeholder="All sessions" />
                </SelectTrigger>
                <SelectContent className="bg-[#171717] border-gray-700">
                  <SelectItem value={null} className="text-white">
                    All sessions
                  </SelectItem>
                  {filteredSessions.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-white">
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <ExportCard
          title="Entries by Class"
          description="Export registered entries for selected event and class"
          onExport={() => handleExport('entries')}
          requirementsMet={!!effectiveEvent}
          warning={!effectiveEvent ? 'Select an event' : ''}
        />

        <ExportCard
          title="Session Results"
          description="Export race results for specific session"
          onExport={() => handleExport('sessionResults')}
          requirementsMet={!!effectiveEvent && !!selectedSession}
          warning={
            !effectiveEvent ? 'Select an event' : !selectedSession ? 'Select a session' : ''
          }
        />

        <ExportCard
          title="Full Weekend Summary"
          description="Comprehensive summary of event with all sessions"
          onExport={() => handleExport('weekend')}
          requirementsMet={!!effectiveEvent}
          warning={!effectiveEvent ? 'Select an event' : ''}
        />

        <ExportCard
          title="Season Standings"
          description="Championship standings for selected season and class"
          onExport={() => handleExport('standings')}
          requirementsMet={
            orgType === 'series' &&
            !!selectedOrg &&
            !!selectedSeason &&
            !!selectedClass
          }
          warning={
            orgType !== 'series'
              ? 'Use Series organization'
              : !selectedOrg
                ? 'Select series'
                : !selectedSeason
                  ? 'Select season'
                  : !selectedClass
                    ? 'Select class'
                    : ''
          }
        />

        <ExportCard
          title="Points Ledger"
          description="Points awarded per driver per event"
          onExport={() => handleExport('pointsLedger')}
          requirementsMet={
            orgType === 'series' &&
            !!selectedOrg &&
            !!selectedSeason &&
            !!selectedClass
          }
          warning={
            orgType !== 'series'
              ? 'Use Series organization'
              : !selectedOrg
                ? 'Select series'
                : !selectedSeason
                  ? 'Select season'
                  : !selectedClass
                    ? 'Select class'
                    : ''
          }
        />

        <ExportCard
          title="Incident Log"
          description="Track incidents and penalties"
          onExport={() => {}}
          requirementsMet={false}
          disabled
          warning="Incident entity not enabled"
        />
      </div>

      {/* Export History */}
      {exportHistory.length > 0 && (
        <ExportHistory
          history={exportHistory}
          onClear={() => setExportHistory([])}
        />
      )}
    </div>
  );
}

function generateCSV(rows) {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const headerRow = headers.map((h) => `"${h}"`).join(',');
  const dataRows = rows.map((row) =>
    headers
      .map((h) => {
        const val = row[h];
        if (val === null || val === undefined) return '""';
        const str = String(val);
        return `"${str.replace(/"/g, '""')}"`;
      })
      .join(',')
  );
  return [headerRow, ...dataRows].join('\n') + '\n';
}

function downloadCSV(csv, filename) {
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  a.remove();
}