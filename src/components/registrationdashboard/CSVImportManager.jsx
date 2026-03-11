/**
 * CSVImportManager.jsx
 * Bulk CSV import for Entries, Results, and Standings.
 */
import React, { useState, useRef, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { REG_QK } from './queryKeys';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { resolveDriverId } from './resolvers/driverResolver';

const DQ = applyDefaultQueryOptions();

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_ROWS = 5000;
const PREVIEW_ROWS = 20;

// ── Schema definitions ────────────────────────────────────────────────────────

const SCHEMAS = {
  entries: {
    label: 'Entries',
    required: ['car_number', 'driver_first_name', 'driver_last_name'],
    optional: ['class_name', 'team_name', 'transponder_id', 'entry_status'],
    all: ['car_number', 'driver_first_name', 'driver_last_name', 'class_name', 'team_name', 'transponder_id', 'entry_status'],
    description: 'Import driver entries for this event.',
  },
  results: {
    label: 'Results',
    required: ['session_name', 'car_number', 'driver_first_name', 'driver_last_name', 'position'],
    optional: ['status', 'laps_completed', 'best_lap_time_ms'],
    all: ['session_name', 'car_number', 'driver_first_name', 'driver_last_name', 'position', 'status', 'laps_completed', 'best_lap_time_ms'],
    description: 'Import session results for this event.',
  },
  standings: {
    label: 'Standings',
    required: ['driver_first_name', 'driver_last_name', 'rank', 'points_total'],
    optional: ['class_name', 'wins', 'podiums'],
    all: ['driver_first_name', 'driver_last_name', 'class_name', 'rank', 'points_total', 'wins', 'podiums'],
    description: 'Import series standings.',
  },
};

// ── CSV parser ────────────────────────────────────────────────────────────────

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, '').toLowerCase());
  const rows = lines.slice(1).map((line) => {
    // Handle quoted values with commas
    const values = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { inQuote = !inQuote; }
      else if (c === ',' && !inQuote) { values.push(cur.trim()); cur = ''; }
      else { cur += c; }
    }
    values.push(cur.trim());
    const row = {};
    headers.forEach((h, i) => { row[h] = values[i] || ''; });
    return row;
  }).filter((r) => Object.values(r).some((v) => v !== ''));
  return { headers, rows };
}

// ── Summary row ───────────────────────────────────────────────────────────────

function SummaryRow({ label, value, color = 'text-gray-300' }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-gray-400">{label}</span>
      <span className={`text-sm font-semibold ${color}`}>{value}</span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function CSVImportManager({
  selectedEvent,
  selectedSeries,
  dashboardContext,
  dashboardPermissions,
  invalidateAfterOperation,
}) {
  const queryClient = useQueryClient();
  const eventId = selectedEvent?.id;
  const fileRef = useRef(null);

  const [importType, setImportType] = useState('entries');
  const [parsedData, setParsedData] = useState(null); // { headers, rows }
  const [fileName, setFileName] = useState('');
  const [validationWarnings, setValidationWarnings] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState(null); // { processed, skipped, created, updated }

  // ── Data for resolution ────────────────────────────────────────────────────

  const { data: drivers = [] } = useQuery({
    queryKey: ['csvImport_drivers'],
    queryFn: () => base44.entities.Driver.list('-created_date', 1000),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['csvImport_teams'],
    queryFn: () => base44.entities.Team.list('-created_date', 500),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const { data: eventClasses = [] } = useQuery({
    queryKey: ['eventClasses', eventId],
    queryFn: () => base44.entities.EventClass.filter({ event_id: eventId }),
    enabled: !!eventId,
    ...DQ,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: REG_QK.sessions(eventId),
    queryFn: () => base44.entities.Session.filter({ event_id: eventId }),
    enabled: !!eventId,
    ...DQ,
  });

  const { data: seriesClasses = [] } = useQuery({
    queryKey: ['seriesClasses', selectedSeries?.id],
    queryFn: () => base44.entities.SeriesClass.filter({ series_id: selectedSeries?.id }),
    enabled: !!selectedSeries?.id,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  // ── Lookup maps ────────────────────────────────────────────────────────────

  const driverMap = useMemo(() => {
    const m = {};
    drivers.forEach((d) => {
      const key = `${(d.first_name || '').toLowerCase().trim()} ${(d.last_name || '').toLowerCase().trim()}`;
      m[key] = d;
    });
    return m;
  }, [drivers]);

  const teamMap = useMemo(() => {
    const m = {};
    teams.forEach((t) => { m[(t.name || '').toLowerCase().trim()] = t; });
    return m;
  }, [teams]);

  const eventClassMap = useMemo(() => {
    const m = {};
    eventClasses.forEach((c) => { m[(c.class_name || '').toLowerCase().trim()] = c; });
    return m;
  }, [eventClasses]);

  const sessionMap = useMemo(() => {
    const m = {};
    sessions.forEach((s) => { m[(s.name || '').toLowerCase().trim()] = s; });
    return m;
  }, [sessions]);

  const seriesClassMap = useMemo(() => {
    const m = {};
    seriesClasses.forEach((c) => { m[(c.name || '').toLowerCase().trim()] = c; });
    return m;
  }, [seriesClasses]);

  // ── File upload handler ────────────────────────────────────────────────────

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast.error('File exceeds 5 MB limit.');
      return;
    }
    if (!file.name.endsWith('.csv')) {
      toast.error('Only .csv files are supported.');
      return;
    }

    setFileName(file.name);
    setImportSummary(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const { headers, rows } = parseCSV(text);

      if (rows.length > MAX_ROWS) {
        toast.error(`File has ${rows.length} rows. Maximum is ${MAX_ROWS}.`);
        return;
      }

      const schema = SCHEMAS[importType];
      const warnings = [];

      schema.required.forEach((col) => {
        if (!headers.includes(col)) {
          warnings.push(`Missing required column: "${col}"`);
        }
      });

      schema.all.forEach((col) => {
        if (!headers.includes(col) && !schema.required.includes(col)) {
          warnings.push(`Optional column not found: "${col}" — will be skipped`);
        }
      });

      const unknownCols = headers.filter((h) => !schema.all.includes(h));
      if (unknownCols.length > 0) {
        warnings.push(`Unknown columns (will be ignored): ${unknownCols.join(', ')}`);
      }

      setValidationWarnings(warnings);
      setParsedData({ headers, rows });
    };
    reader.readAsText(file);
  }

  // ── Import runners ────────────────────────────────────────────────────────

  // Shared resolver context
  const resolverContext = useMemo(() => ({
    eventId,
    seriesId: selectedSeries?.id,
    drivers: drivers,
    results: [],
  }), [eventId, selectedSeries?.id, drivers]);

  // Safety: This importer only creates Entry, Results, and Standings records.
  // It MUST NOT create new Driver, Team, Track, Series, or Event source entities.
  // Driver resolution uses resolveDriverId which looks up existing records only.
  async function runEntriesImport(rows) {
    let created = 0, updated = 0, skipped = 0;
    const unresolved = [];
    for (const row of rows) {
      const driverId = await resolveDriverId({
        firstName: row.driver_first_name || '',
        lastName: row.driver_last_name || '',
        carNumber: row.car_number,
        ...resolverContext,
      });
      if (!driverId) {
        skipped++;
        unresolved.push({ firstName: row.driver_first_name, lastName: row.driver_last_name, carNumber: row.car_number });
        continue;
      }

      const eventClass = row.class_name ? eventClassMap[(row.class_name || '').toLowerCase().trim()] : null;
      if (!eventClass) { skipped++; continue; }

      const team = row.team_name ? teamMap[(row.team_name || '').toLowerCase().trim()] : null;

      const res = await base44.functions.invoke('upsertOperationalEntry', {
        payload: {
          event_id: eventId,
          driver_id: driverId,
          event_class_id: eventClass.id,
          team_id: team?.id || null,
          car_number: row.car_number || '',
          transponder_id: row.transponder_id || '',
          entry_status: row.entry_status || 'Registered',
        },
        source_path: 'registration_dashboard_csv',
      });
      if (res?.data?.action === 'updated') updated++;
      else created++;
    }
    return { created, updated, skipped, unresolved };
  }

  async function runResultsImport(rows) {
    let created = 0, updated = 0, skipped = 0;
    const unresolved = [];
    for (const row of rows) {
      const session = row.session_name ? sessionMap[(row.session_name || '').toLowerCase().trim()] : null;
      if (!session) { skipped++; continue; }

      const driverId = await resolveDriverId({
        firstName: row.driver_first_name || '',
        lastName: row.driver_last_name || '',
        carNumber: row.car_number,
        ...resolverContext,
      });
      if (!driverId) {
        skipped++;
        unresolved.push({ firstName: row.driver_first_name, lastName: row.driver_last_name, carNumber: row.car_number });
        continue;
      }

      const res = await base44.functions.invoke('upsertOperationalResult', {
        payload: {
          event_id: eventId,
          session_id: session.id,
          driver_id: driverId,
          car_number: row.car_number || '',
          position: row.position ? parseInt(row.position) : null,
          status: row.status || '',
          laps_completed: row.laps_completed ? parseInt(row.laps_completed) : null,
          best_lap_time_ms: row.best_lap_time_ms ? parseInt(row.best_lap_time_ms) : null,
        },
        source_path: 'registration_dashboard_csv',
      });
      if (res?.data?.action === 'updated') updated++;
      else created++;
    }
    return { created, updated, skipped, unresolved };
  }

  async function runStandingsImport(rows) {
    let created = 0, updated = 0, skipped = 0;
    const unresolved = [];
    const season_year = dashboardContext?.season || new Date().getFullYear().toString();
    if (!selectedSeries?.id) {
      toast.error('A series must be selected to import standings.');
      return { created: 0, updated: 0, skipped: rows.length, unresolved: [] };
    }
    for (const row of rows) {
      const driverId = await resolveDriverId({
        firstName: row.driver_first_name || '',
        lastName: row.driver_last_name || '',
        carNumber: row.car_number,
        ...resolverContext,
      });
      if (!driverId) {
        skipped++;
        unresolved.push({ firstName: row.driver_first_name, lastName: row.driver_last_name, carNumber: row.car_number });
        continue;
      }

      const seriesClass = row.class_name ? seriesClassMap[(row.class_name || '').toLowerCase().trim()] : null;

      const res = await base44.functions.invoke('upsertOperationalStanding', {
        payload: {
          driver_id: driverId,
          series_class_id: seriesClass?.id || null,
          season_year,
          rank: row.rank ? parseInt(row.rank) : null,
          points_total: row.points_total ? parseFloat(row.points_total) : null,
          wins: row.wins ? parseInt(row.wins) : 0,
          podiums: row.podiums ? parseInt(row.podiums) : 0,
          series_id: selectedSeries.id,
        },
        source_path: 'registration_dashboard_csv',
      });
      if (res?.data?.action === 'updated') updated++;
      else created++;
    }
    return { created, updated, skipped, unresolved };
  }

  async function handleImport() {
    if (!parsedData || !eventId) return;

    const schema = SCHEMAS[importType];
    const missingRequired = schema.required.filter((col) => !parsedData.headers.includes(col));
    if (missingRequired.length > 0) {
      toast.error(`Cannot import: missing required columns: ${missingRequired.join(', ')}`);
      return;
    }

    setImporting(true);
    setImportSummary(null);

    const rows = parsedData.rows;
    let result = { created: 0, skipped: 0 };

    if (importType === 'entries') result = await runEntriesImport(rows);
    else if (importType === 'results') result = await runResultsImport(rows);
    else if (importType === 'standings') result = await runStandingsImport(rows);

    const summary = {
      processed: rows.length,
      skipped: result.skipped,
      created: result.created,
      updated: result.updated || 0,
      unresolved: result.unresolved || [],
    };
    setImportSummary(summary);

    // Log operation (standardized)
    try {
      await base44.asServiceRole.entities.OperationLog.create({
        operation_type: 'csv_import_completed',
        source_type: 'manual',
        entity_name: importType.charAt(0).toUpperCase() + importType.slice(1),
        status: 'success',
        metadata: {
          importer_name: 'registration_dashboard_csv',
          event_id: eventId,
          import_type: importType,
          imported_count: summary.created,
          updated_count: summary.updated,
          skipped_count: summary.skipped,
          unresolved_count: summary.unresolved.length,
          warning_count: 0,
          error_count: 0,
          total_rows: summary.processed,
        },
      });
    } catch { /* OperationLog may not exist */ }

    // Invalidate caches
    if (importType === 'entries') invalidateAfterOperation('entries_updated', { eventId });
    else if (importType === 'results') invalidateAfterOperation('results_saved', { eventId });
    else if (importType === 'standings') {
      queryClient.invalidateQueries({ queryKey: REG_QK.standings(selectedSeries?.id, dashboardContext?.season) });
    }

    setImporting(false);
    toast.success(`Import complete: ${summary.created} created, ${summary.skipped} skipped.`);
  }

  // ── Empty state ───────────────────────────────────────────────────────────

  if (!selectedEvent) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-20 text-center">
          <Upload className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-white font-semibold text-lg mb-1">Data Imports</p>
          <p className="text-gray-400 text-sm">Select an event to import data.</p>
        </CardContent>
      </Card>
    );
  }

  const schema = SCHEMAS[importType];
  const previewRows = parsedData?.rows.slice(0, PREVIEW_ROWS) || [];
  const previewHeaders = parsedData?.headers || [];
  const hasBlockingWarnings = validationWarnings.some((w) => w.startsWith('Missing required'));

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white">Data Imports</h2>
        <p className="text-gray-400 text-sm mt-1">Upload CSV files to import race weekend data.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left column: controls ─────────────────────────────── */}
        <div className="space-y-5">

          {/* Section A: Import type selector */}
          <Card className="bg-[#171717] border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm">Import Type</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={importType} onValueChange={(v) => { setImportType(v); setParsedData(null); setImportSummary(null); setFileName(''); setValidationWarnings([]); }}>
                <SelectTrigger className="bg-[#262626] border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#262626] border-gray-700 text-white">
                  {Object.entries(SCHEMAS).map(([key, s]) => (
                    <SelectItem key={key} value={key} className="text-white focus:bg-gray-700">{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <p className="text-xs text-gray-500">{schema.description}</p>

              <div className="space-y-2">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Required columns</p>
                <div className="flex flex-wrap gap-1">
                  {schema.required.map((col) => (
                    <Badge key={col} className="text-xs bg-red-900/40 text-red-300 border border-red-800">{col}</Badge>
                  ))}
                </div>
                {schema.optional.length > 0 && (
                  <>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mt-2">Optional columns</p>
                    <div className="flex flex-wrap gap-1">
                      {schema.optional.map((col) => (
                        <Badge key={col} variant="outline" className="text-xs border-gray-700 text-gray-400">{col}</Badge>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Section B: Upload */}
          <Card className="bg-[#171717] border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm">Upload CSV</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                onClick={() => { fileRef.current?.click(); }}
                className="w-full border-2 border-dashed border-gray-700 rounded-lg p-6 flex flex-col items-center gap-2 hover:border-gray-500 transition-colors cursor-pointer"
              >
                <Upload className="w-6 h-6 text-gray-500" />
                <span className="text-sm text-gray-400">
                  {fileName ? fileName : 'Click to select .csv file'}
                </span>
                <span className="text-xs text-gray-600">Max 5 MB · 5,000 rows</span>
              </button>

              {/* Validation warnings */}
              {validationWarnings.length > 0 && (
                <div className="space-y-1">
                  {validationWarnings.map((w, i) => (
                    <div key={i} className={`flex items-start gap-2 text-xs p-2 rounded ${w.startsWith('Missing required') ? 'bg-red-900/30 text-red-300' : 'bg-yellow-900/20 text-yellow-300'}`}>
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      {w}
                    </div>
                  ))}
                </div>
              )}

              {parsedData && (
                <div className="text-xs text-gray-500 text-center">
                  {parsedData.rows.length} rows parsed
                </div>
              )}
            </CardContent>
          </Card>

          {/* Import button */}
          {parsedData && (
            <Button
              className="w-full bg-blue-700 hover:bg-blue-600 text-white h-12 text-base font-semibold"
              onClick={handleImport}
              disabled={importing || hasBlockingWarnings}
            >
              {importing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importing…</>
              ) : (
                <><Upload className="w-4 h-4 mr-2" /> Run Import</>
              )}
            </Button>
          )}

          {/* Import summary */}
          {importSummary && (
          <Card className="bg-[#171717] border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400" /> Import Complete
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <SummaryRow label="Rows processed" value={importSummary.processed} />
            <Separator className="border-gray-800" />
            <SummaryRow label="Created" value={importSummary.created} color="text-green-400" />
            {importSummary.updated > 0 && <SummaryRow label="Updated" value={importSummary.updated} color="text-blue-400" />}
            <SummaryRow label="Skipped" value={importSummary.skipped} color={importSummary.skipped > 0 ? 'text-yellow-400' : 'text-gray-400'} />
            {importSummary.unresolved?.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-800">
                <p className="text-xs text-yellow-400 font-semibold mb-2 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Unresolved Drivers ({importSummary.unresolved.length})
                </p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {importSummary.unresolved.map((u, i) => (
                    <p key={i} className="text-xs text-gray-400 font-mono">
                      {u.firstName} {u.lastName}{u.carNumber ? ` (#${u.carNumber})` : ''} — not found or ambiguous
                    </p>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
          </Card>
          )}
        </div>

        {/* ── Right column: preview table ───────────────────────── */}
        <div className="lg:col-span-2">
          <Card className="bg-[#171717] border-gray-800 h-full">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-white text-sm">
                Preview
                {parsedData && <span className="text-gray-500 font-normal ml-2">(first {Math.min(PREVIEW_ROWS, parsedData.rows.length)} of {parsedData.rows.length} rows)</span>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!parsedData ? (
                <div className="py-16 text-center text-gray-600 text-sm">
                  <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  Upload a CSV to preview data here.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-800">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-800 bg-[#262626]">
                        <th className="px-3 py-2 text-left text-gray-500 font-semibold uppercase">#</th>
                        {previewHeaders.map((h) => (
                          <th key={h} className={`px-3 py-2 text-left font-semibold uppercase tracking-wide ${schema.required.includes(h) ? 'text-red-400' : 'text-gray-500'}`}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {previewRows.map((row, i) => (
                        <tr key={i} className="hover:bg-[#1e1e1e]">
                          <td className="px-3 py-2 text-gray-600">{i + 1}</td>
                          {previewHeaders.map((h) => (
                            <td key={h} className="px-3 py-2 text-gray-300 max-w-[120px] truncate">
                              {row[h] || <span className="text-gray-700">—</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}