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
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Download, FileText, Users, CheckSquare, Wrench, Flag, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';

const DQ = applyDefaultQueryOptions();
const ROW_LIMIT = 10_000;

// ── CSV helpers ──────────────────────────────────────────────────────────────

function generateCSV(dataRows, columns) {
  if (!dataRows || dataRows.length === 0) return '';
  const headerRow = columns.map((c) => `"${c.label}"`).join(',');
  const bodyRows = dataRows.map((row) =>
    columns.map(({ key }) => {
      const val = row[key];
      if (val === null || val === undefined) return '""';
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(',')
  );
  return [headerRow, ...bodyRows].join('\n') + '\n';
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

function slugify(str) {
  return (str || 'unknown').toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

async function logExport(eventId, exportType, rowCount) {
  try {
    await base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'export_generated',
      source_type: 'ExportsManager',
      entity_name: 'Export',
      status: 'success',
      metadata: { event_id: eventId, export_type: exportType, row_count: rowCount },
    });
  } catch (_) {
    // non-blocking
  }
}

// ── Export type definitions ──────────────────────────────────────────────────

const EXPORT_TYPES = [
  {
    id: 'entry_list',
    label: 'Entry List',
    description: 'All entries for the event with car #, driver, class, and status.',
    icon: Users,
    buttonLabel: 'Export Entry List CSV',
    requiresEvent: true,
    requiresSession: false,
    requiresStandingsFilters: false,
  },
  {
    id: 'checkin_report',
    label: 'Check-In Report',
    description: 'Check-in status, waiver, payment, and transponder verification.',
    icon: CheckSquare,
    buttonLabel: 'Export Check-In Report CSV',
    requiresEvent: true,
    requiresSession: false,
    requiresStandingsFilters: false,
  },
  {
    id: 'tech_report',
    label: 'Tech Inspection Report',
    description: 'Tech status, inspection times, and notes for each entry.',
    icon: Wrench,
    buttonLabel: 'Export Tech Report CSV',
    requiresEvent: true,
    requiresSession: false,
    requiresStandingsFilters: false,
  },
  {
    id: 'session_results',
    label: 'Session Results',
    description: 'Race results for a specific session (position, laps, points).',
    icon: Flag,
    buttonLabel: 'Export Session Results CSV',
    requiresEvent: true,
    requiresSession: true,
    requiresStandingsFilters: false,
  },
  {
    id: 'standings',
    label: 'Standings Export',
    description: 'Championship standings filtered by series, season, and class.',
    icon: Trophy,
    buttonLabel: 'Export Standings CSV',
    requiresEvent: false,
    requiresSession: false,
    requiresStandingsFilters: true,
  },
];

// ── Main component ───────────────────────────────────────────────────────────

export default function ExportsManager({
  selectedEvent,
  selectedSeries,
  dashboardContext,
  isAdmin,
  dashboardPermissions,
  onExportCompleted,
}) {
  const eventId = selectedEvent?.id || '';
  const eventName = selectedEvent?.name || '';

  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [standingsSeriesId, setStandingsSeriesId] = useState(selectedSeries?.id || '');
  const [standingsSeason, setStandingsSeason] = useState(dashboardContext?.season || '');
  const [standingsClassId, setStandingsClassId] = useState('');
  const [exportHistory, setExportHistory] = useState([]);
  const [exporting, setExporting] = useState('');

  // ── Data ──────────────────────────────────────────────────────────────────

  const { data: entries = [], isLoading: entriesLoading } = useQuery({
    queryKey: ['entries', eventId],
    queryFn: () => eventId ? base44.entities.Entry.filter({ event_id: eventId }) : Promise.resolve([]),
    enabled: !!eventId,
    ...DQ,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions', eventId],
    queryFn: () => eventId ? base44.entities.Session.filter({ event_id: eventId }) : Promise.resolve([]),
    enabled: !!eventId,
    ...DQ,
  });

  const { data: sessionResults = [] } = useQuery({
    queryKey: ['results', eventId, selectedSessionId],
    queryFn: () => selectedSessionId
      ? base44.entities.Results.filter({ session_id: selectedSessionId })
      : Promise.resolve([]),
    enabled: !!selectedSessionId,
    ...DQ,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.list(),
    ...DQ,
  });

  const { data: eventClasses = [] } = useQuery({
    queryKey: ['eventClasses', eventId],
    queryFn: () => eventId ? base44.entities.EventClass.filter({ event_id: eventId }) : Promise.resolve([]),
    enabled: !!eventId,
    ...DQ,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list(),
    ...DQ,
  });

  const { data: seriesList = [] } = useQuery({
    queryKey: ['series'],
    queryFn: () => base44.entities.Series.list(),
    ...DQ,
  });

  const { data: seriesClasses = [] } = useQuery({
    queryKey: ['seriesClasses', standingsSeriesId],
    queryFn: () => standingsSeriesId
      ? base44.entities.SeriesClass.filter({ series_id: standingsSeriesId })
      : Promise.resolve([]),
    enabled: !!standingsSeriesId,
    ...DQ,
  });

  const { data: standings = [] } = useQuery({
    queryKey: ['standings', standingsSeriesId, standingsSeason, standingsClassId],
    queryFn: () => {
      const filter = {};
      if (standingsSeriesId) filter.series_id = standingsSeriesId;
      if (standingsSeason) filter.season = standingsSeason;
      if (standingsClassId) filter.series_class_id = standingsClassId;
      return Object.keys(filter).length
        ? base44.entities.Standings.filter(filter)
        : base44.entities.Standings.list();
    },
    enabled: !!(standingsSeriesId && standingsSeason),
    ...DQ,
  });

  // ── Lookup maps ───────────────────────────────────────────────────────────

  const driverMap = useMemo(() => Object.fromEntries(drivers.map((d) => [d.id, d])), [drivers]);
  const teamMap = useMemo(() => Object.fromEntries(teams.map((t) => [t.id, t])), [teams]);
  const classMap = useMemo(() => Object.fromEntries(eventClasses.map((c) => [c.id, c])), [eventClasses]);

  const driverName = (id) => {
    const d = driverMap[id];
    return d ? `${d.first_name} ${d.last_name}`.trim() : id || '';
  };
  const teamName = (id) => teamMap[id]?.name || '';
  const className = (ecId) => classMap[ecId]?.class_name || ecId || '';

  // ── Entry-based exports ───────────────────────────────────────────────────

  function buildEntryListRows() {
    const sorted = [...entries].sort((a, b) => {
      const cn = className(a.event_class_id).localeCompare(className(b.event_class_id));
      if (cn !== 0) return cn;
      return (a.car_number || '').localeCompare(b.car_number || '', undefined, { numeric: true });
    });
    return sorted.map((e) => ({
      car_number: e.car_number,
      driver_name: driverName(e.driver_id),
      team_name: teamName(e.team_id),
      class_name: className(e.event_class_id),
      entry_status: e.entry_status || '',
      payment_status: e.payment_status || '',
      tech_status: e.tech_status || '',
      transponder_id: e.transponder_id || '',
    }));
  }

  function buildCheckinRows() {
    return entries.map((e) => ({
      car_number: e.car_number,
      driver_name: driverName(e.driver_id),
      checkin_status: e.entry_status || '',
      waiver_verified: e.waiver_verified ? 'Yes' : 'No',
      payment_status: e.payment_status || '',
      transponder_verified: e.transponder_verified ? 'Yes' : 'No',
      tech_status: e.tech_status || '',
    }));
  }

  function buildTechRows() {
    return entries.map((e) => ({
      car_number: e.car_number,
      driver_name: driverName(e.driver_id),
      class_name: className(e.event_class_id),
      tech_status: e.tech_status || '',
      tech_time: e.tech_time || '',
      tech_inspector_user_id: e.tech_inspector_user_id || '',
      notes: e.tech_notes || e.notes || '',
    }));
  }

  function buildSessionResultRows() {
    const session = sessions.find((s) => s.id === selectedSessionId);
    const sorted = [...sessionResults].sort((a, b) => (a.position || 9999) - (b.position || 9999));
    const entryMap = Object.fromEntries(entries.map((e) => [e.id, e]));
    return sorted.map((r) => {
      const entry = entryMap[r.entry_id] || {};
      return {
        position: r.position ?? '',
        car_number: entry.car_number || r.car_number || '',
        driver_name: driverName(r.driver_id),
        status: r.status || '',
        laps_completed: r.laps_completed ?? '',
        best_lap_time_ms: r.best_lap_time_ms ?? '',
        points: r.points ?? '',
        notes: r.notes || '',
      };
    });
  }

  function buildStandingsRows() {
    const filtered = standingsClassId
      ? standings.filter((s) => s.series_class_id === standingsClassId)
      : standings;
    const sorted = [...filtered].sort((a, b) => (a.rank || 9999) - (b.rank || 9999));
    return sorted.map((s) => ({
      rank: s.rank ?? '',
      driver_name: driverName(s.driver_id) || s.driver_name || '',
      points_total: s.points_total ?? '',
      wins: s.wins ?? '',
      podiums: s.podiums ?? '',
    }));
  }

  // ── Column definitions ────────────────────────────────────────────────────

  const COLUMNS = {
    entry_list: [
      { key: 'car_number', label: 'Car #' },
      { key: 'driver_name', label: 'Driver' },
      { key: 'team_name', label: 'Team' },
      { key: 'class_name', label: 'Class' },
      { key: 'entry_status', label: 'Entry Status' },
      { key: 'payment_status', label: 'Payment Status' },
      { key: 'tech_status', label: 'Tech Status' },
      { key: 'transponder_id', label: 'Transponder ID' },
    ],
    checkin_report: [
      { key: 'car_number', label: 'Car #' },
      { key: 'driver_name', label: 'Driver' },
      { key: 'checkin_status', label: 'Check-In Status' },
      { key: 'waiver_verified', label: 'Waiver Verified' },
      { key: 'payment_status', label: 'Payment Status' },
      { key: 'transponder_verified', label: 'Transponder Verified' },
      { key: 'tech_status', label: 'Tech Status' },
    ],
    tech_report: [
      { key: 'car_number', label: 'Car #' },
      { key: 'driver_name', label: 'Driver' },
      { key: 'class_name', label: 'Class' },
      { key: 'tech_status', label: 'Tech Status' },
      { key: 'tech_time', label: 'Tech Time' },
      { key: 'tech_inspector_user_id', label: 'Inspector ID' },
      { key: 'notes', label: 'Notes' },
    ],
    session_results: [
      { key: 'position', label: 'Position' },
      { key: 'car_number', label: 'Car #' },
      { key: 'driver_name', label: 'Driver' },
      { key: 'status', label: 'Status' },
      { key: 'laps_completed', label: 'Laps' },
      { key: 'best_lap_time_ms', label: 'Best Lap (ms)' },
      { key: 'points', label: 'Points' },
      { key: 'notes', label: 'Notes' },
    ],
    standings: [
      { key: 'rank', label: 'Rank' },
      { key: 'driver_name', label: 'Driver' },
      { key: 'points_total', label: 'Points' },
      { key: 'wins', label: 'Wins' },
      { key: 'podiums', label: 'Podiums' },
    ],
  };

  // ── Export handler ────────────────────────────────────────────────────────

  const handleExport = async (typeId) => {
    setExporting(typeId);
    try {
      let rows = [];
      let filename = '';
      const eventSlug = slugify(eventName);

      switch (typeId) {
        case 'entry_list':
          rows = buildEntryListRows();
          filename = `entries_${eventSlug}.csv`;
          break;
        case 'checkin_report':
          rows = buildCheckinRows();
          filename = `checkin_${eventSlug}.csv`;
          break;
        case 'tech_report':
          rows = buildTechRows();
          filename = `tech_${eventSlug}.csv`;
          break;
        case 'session_results': {
          const session = sessions.find((s) => s.id === selectedSessionId);
          rows = buildSessionResultRows();
          filename = `results_${slugify(session?.name || selectedSessionId)}.csv`;
          break;
        }
        case 'standings': {
          const sc = seriesClasses.find((c) => c.id === standingsClassId);
          rows = buildStandingsRows();
          filename = `standings_${slugify(sc?.class_name || 'all')}_${standingsSeason || 'all'}.csv`;
          break;
        }
        default:
          return;
      }

      if (rows.length === 0) {
        toast.warning('No data to export for the current selection.');
        setExporting('');
        return;
      }

      const capped = rows.slice(0, ROW_LIMIT);
      if (rows.length > ROW_LIMIT) {
        toast.warning(`Export capped at ${ROW_LIMIT.toLocaleString()} rows.`);
      }

      const csv = generateCSV(capped, COLUMNS[typeId]);
      downloadCSV(csv, filename);

      await logExport(eventId, typeId, capped.length);
      if (onExportCompleted) onExportCompleted();

      setExportHistory((prev) => [
        { id: Date.now(), typeId, filename, rows: capped.length, ts: new Date().toLocaleTimeString() },
        ...prev.slice(0, 9),
      ]);

      toast.success(`Exported ${capped.length} rows → ${filename}`);
    } catch (err) {
      toast.error(`Export failed: ${err.message}`);
    } finally {
      setExporting('');
    }
  };

  // ── Guard: no event selected ───────────────────────────────────────────────

  if (!selectedEvent) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-16 text-center">
          <FileText className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">Select an event to generate exports</p>
          <p className="text-xs text-gray-600 mt-1">Choose Track / Series → Season → Event above.</p>
        </CardContent>
      </Card>
    );
  }

  // ── Available seasons for standings ───────────────────────────────────────
  const standingsSeasons = useMemo(() => {
    const years = new Set();
    standings.forEach((s) => { if (s.season) years.add(s.season); });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [standings]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Exports Center</h2>
          <p className="text-xs text-gray-400 mt-0.5">{eventName}</p>
        </div>
        <Badge variant="outline" className="border-gray-600 text-gray-400 text-xs">
          {entries.length} entries loaded
        </Badge>
      </div>

      {/* Export Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {EXPORT_TYPES.map((type) => {
          const Icon = type.icon;
          const isActive = exporting === type.id;

          // Per-type readiness check
          const ready =
            (!type.requiresEvent || !!eventId) &&
            (!type.requiresSession || !!selectedSessionId) &&
            (!type.requiresStandingsFilters || (!!standingsSeriesId && !!standingsSeason));

          let warningMsg = '';
          if (type.requiresSession && !selectedSessionId) warningMsg = 'Select a session below';
          if (type.requiresStandingsFilters && !standingsSeriesId) warningMsg = 'Select series below';
          if (type.requiresStandingsFilters && standingsSeriesId && !standingsSeason) warningMsg = 'Select season below';

          return (
            <Card key={type.id} className={`bg-[#1e1e1e] border-gray-800 flex flex-col ${!ready ? 'opacity-60' : ''}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-gray-800 rounded">
                    <Icon className="w-4 h-4 text-gray-300" />
                  </div>
                  <CardTitle className="text-sm font-semibold text-white">{type.label}</CardTitle>
                </div>
                <p className="text-xs text-gray-400 mt-1">{type.description}</p>
              </CardHeader>
              <CardContent className="pt-0 mt-auto">
                {warningMsg && (
                  <p className="text-xs text-amber-400 flex items-center gap-1 mb-2">
                    <AlertCircle className="w-3 h-3" /> {warningMsg}
                  </p>
                )}
                <Button
                  size="sm"
                  disabled={!ready || isActive}
                  onClick={() => handleExport(type.id)}
                  className="w-full bg-gray-700 hover:bg-gray-600 text-white text-xs disabled:opacity-50"
                >
                  <Download className="w-3 h-3 mr-1.5" />
                  {isActive ? 'Exporting…' : type.buttonLabel}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Session selector (for Session Results export) */}
      <Card className="bg-[#1e1e1e] border-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-gray-300">Session Results — Select Session</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
            <SelectTrigger className="bg-[#171717] border-gray-700 text-white w-full max-w-xs">
              <SelectValue placeholder="Select a session…" />
            </SelectTrigger>
            <SelectContent className="bg-[#262626] border-gray-700">
              {sessions.map((s) => (
                <SelectItem key={s.id} value={s.id} className="text-white">
                  {s.name} {s.session_type ? `(${s.session_type})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {sessions.length === 0 && (
            <p className="text-xs text-gray-500 mt-1">No sessions found for this event.</p>
          )}
        </CardContent>
      </Card>

      {/* Standings filters */}
      <Card className="bg-[#1e1e1e] border-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-gray-300">Standings Export — Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <div className="min-w-[180px]">
              <label className="text-xs text-gray-500 uppercase tracking-wide block mb-1">Series</label>
              <Select value={standingsSeriesId} onValueChange={(v) => { setStandingsSeriesId(v); setStandingsClassId(''); }}>
                <SelectTrigger className="bg-[#171717] border-gray-700 text-white">
                  <SelectValue placeholder="Select series…" />
                </SelectTrigger>
                <SelectContent className="bg-[#262626] border-gray-700">
                  {seriesList.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-white">{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-[140px]">
              <label className="text-xs text-gray-500 uppercase tracking-wide block mb-1">Season</label>
              <Select value={standingsSeason} onValueChange={setStandingsSeason}>
                <SelectTrigger className="bg-[#171717] border-gray-700 text-white">
                  <SelectValue placeholder="Season…" />
                </SelectTrigger>
                <SelectContent className="bg-[#262626] border-gray-700">
                  {['2026','2025','2024','2023'].map((y) => (
                    <SelectItem key={y} value={y} className="text-white">{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-[180px]">
              <label className="text-xs text-gray-500 uppercase tracking-wide block mb-1">Class (optional)</label>
              <Select value={standingsClassId} onValueChange={setStandingsClassId}>
                <SelectTrigger className="bg-[#171717] border-gray-700 text-white">
                  <SelectValue placeholder="All classes" />
                </SelectTrigger>
                <SelectContent className="bg-[#262626] border-gray-700">
                  <SelectItem value={null} className="text-white">All classes</SelectItem>
                  {seriesClasses.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-white">{c.class_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export history */}
      {exportHistory.length > 0 && (
        <Card className="bg-[#1e1e1e] border-gray-800">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-gray-300">Recent Exports</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => setExportHistory([])} className="text-xs text-gray-500 h-6 px-2">
                Clear
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {exportHistory.map((h) => (
                <div key={h.id} className="flex items-center justify-between text-xs text-gray-400 py-1 border-b border-gray-800 last:border-0">
                  <span className="font-mono text-gray-300">{h.filename}</span>
                  <span className="text-gray-500">{h.rows} rows · {h.ts}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}