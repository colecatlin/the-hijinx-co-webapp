/**
 * ResultsCsvImportDialog
 * Drag-and-drop CSV import with column mapping, row preview, validation, and import.
 * Writes an OperationLog entry after import.
 */
import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Upload, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { normalizeName } from './resolvers/driverResolver';

const REQUIRED_COLS = ['car_number_or_driver_name', 'finish_position', 'status'];
const OPTIONAL_COLS = ['car_number', 'driver_first_name', 'driver_last_name', 'driver_name', 'laps_completed', 'best_lap', 'points', 'session_type', 'heat_number'];
const ALL_MAPPING_COLS = ['car_number', 'driver_name', 'driver_first_name', 'driver_last_name', 'finish_position', 'status', 'laps_completed', 'best_lap', 'points', 'session_type', 'heat_number'];
const VALID_STATUSES = new Set(['Running', 'DNF', 'DNS', 'DSQ', 'DNP', 'running', 'dnf', 'dns', 'dsq', 'dnp']);

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return { headers: [], rows: [] };
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const rows = lines.slice(1).map((line) => {
    const vals = [];
    let inQuote = false, cur = '';
    for (const ch of line + ',') {
      if (ch === '"') { inQuote = !inQuote; }
      else if (ch === ',' && !inQuote) { vals.push(cur.trim()); cur = ''; }
      else { cur += ch; }
    }
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] ?? ''; });
    return obj;
  });
  return { headers, rows };
}

export default function ResultsCsvImportDialog({
  session, drivers, driverPrograms, selectedEvent, locked, onImport, importing,
}) {
  const fileRef = useRef(null);
  const [csvData, setCsvData] = useState(null);
  const [mapping, setMapping] = useState({});
  const [dragOver, setDragOver] = useState(false);

  const reset = () => { setCsvData(null); setMapping({}); if (fileRef.current) fileRef.current.value = ''; };

  const loadFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const parsed = parseCSV(e.target.result);
      setCsvData(parsed);
      const auto = {};
      ALL_MAPPING_COLS.forEach((col) => {
        const match = parsed.headers.find((h) => {
          const norm = h.toLowerCase().replace(/[\s-]/g, '_');
          return norm === col || norm.includes(col.replace(/_/g, ''));
        });
        if (match) auto[col] = match;
      });
      setMapping(auto);
    };
    reader.readAsText(file);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragOver(false);
    loadFile(e.dataTransfer.files?.[0]);
  }, []);

  const getMapped = (raw, col) => { const src = mapping[col]; return src ? raw[src] || '' : ''; };

  const resolveDriver = (firstName, lastName, carNumber, fullName) => {
    // Try car number first (exact match on primary_number or program car_number)
    if (carNumber) {
      const byNum = drivers.find((d) => normalizeName(d.primary_number) === normalizeName(carNumber));
      if (byNum) return byNum;
      const progByNum = driverPrograms.find((dp) => normalizeName(dp.car_number) === normalizeName(carNumber));
      if (progByNum) return drivers.find((d) => d.id === progByNum.driver_id) || null;
    }
    // Full name — use normalizeName for consistent trimming/casing
    const fn = normalizeName(firstName || (fullName ? fullName.split(' ')[0] : ''));
    const ln = normalizeName(lastName || (fullName ? fullName.split(' ').slice(1).join(' ') : ''));
    if (!fn && !ln) return null;
    const fl = `${fn} ${ln}`.trim();
    // Exact match only — if multiple, return null to avoid random resolution
    const matches = drivers.filter(
      (d) => `${normalizeName(d.first_name)} ${normalizeName(d.last_name)}`.trim() === fl
    );
    if (matches.length === 1) return matches[0];
    // Multiple matches — try to narrow by carNumber
    if (matches.length > 1 && carNumber) {
      const narrowed = matches.filter((d) => normalizeName(d.primary_number) === normalizeName(carNumber));
      if (narrowed.length === 1) return narrowed[0];
    }
    // Ambiguous — return null (never guess)
    return null;
  };

  const preview = csvData
    ? csvData.rows.slice(0, 25).map((raw, idx) => {
        const carNumber = getMapped(raw, 'car_number');
        const driverName = getMapped(raw, 'driver_name');
        const firstName = getMapped(raw, 'driver_first_name');
        const lastName = getMapped(raw, 'driver_last_name');
        const position = getMapped(raw, 'finish_position');
        const status = getMapped(raw, 'status');
        const driver = resolveDriver(firstName, lastName, carNumber, driverName);
        const rowErrs = [];
        if (!carNumber && !driverName && !firstName && !lastName) rowErrs.push('Missing car/driver');
        if (!position || isNaN(parseInt(position))) rowErrs.push('Invalid position');
        if (status && !VALID_STATUSES.has(status)) rowErrs.push(`Unknown status: ${status}`);
        if (!driver) rowErrs.push('No driver match');
        return {
          _idx: idx, raw, driver, carNumber, driverName: driverName || `${firstName} ${lastName}`.trim(),
          position, status, laps: getMapped(raw, 'laps_completed'),
          bestLap: getMapped(raw, 'best_lap'), points: getMapped(raw, 'points'),
          errors: rowErrs,
        };
      })
    : [];

  const hasConflicts = preview.some((r) => r.errors.includes('No driver match') && (r.carNumber || r.driverName));
  const errorCount = preview.filter((r) => r.errors.length).length;
  const validCount = preview.filter((r) => !r.errors.length).length;

  const handleImport = async () => {
    const valid = preview.filter((r) => !r.errors.length);
    if (!valid.length) { toast.error('No valid rows to import'); return; }

    const rows = valid.map((r) => {
      const prog = driverPrograms.find((dp) => dp.driver_id === r.driver.id && dp.event_id === selectedEvent?.id);
      return {
        event_id: selectedEvent?.id,
        session_id: session?.id,
        session_type: session?.session_type,
        series_class_id: session?.series_class_id || '',
        series_id: selectedEvent?.series_id || '',
        driver_id: r.driver.id,
        program_id: prog?.id || '',
        position: parseInt(r.position) || null,
        status: r.status || 'Running',
        laps_completed: parseInt(r.laps) || null,
        best_lap_time_ms: parseInt(r.bestLap) || null,
        points: parseFloat(r.points) || null,
        notes: prog ? '' : 'No program found',
      };
    });

    await onImport(rows, preview.length - valid.length, {
      mapped_columns: Object.keys(mapping),
      row_count: csvData.rows.length,
      error_count: errorCount,
      errors_sample: preview.filter((r) => r.errors.length).slice(0, 5).map((r) => r.errors.join('; ')),
    });
  };

  if (locked) return <div className="py-8 text-center text-gray-500 text-sm">Session is locked. Import disabled.</div>;

  return (
    <div className="space-y-4">
      {!csvData ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${dragOver ? 'border-blue-500 bg-blue-950/20' : 'border-gray-700 hover:border-gray-600'}`}
        >
          <Upload className="w-8 h-8 text-gray-500 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">Drag & drop CSV or click to upload</p>
          <p className="text-gray-600 text-xs mt-1">Required: car_number or driver_name, finish_position, status</p>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => loadFile(e.target.files?.[0])} />
        </div>
      ) : (
        <>
          {/* Column mapping */}
          <div className="bg-[#171717] border border-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-white">Column Mapping</p>
              <Button size="sm" variant="ghost" onClick={reset} className="text-gray-500 text-xs"><X className="w-3 h-3 mr-1" />Reset</Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {ALL_MAPPING_COLS.map((col) => (
                <div key={col}>
                  <label className="text-xs text-gray-400 block mb-1">{col}</label>
                  <Select value={mapping[col] || '__none__'} onValueChange={(v) => setMapping((m) => ({ ...m, [col]: v === '__none__' ? '' : v }))}>
                    <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white h-7 text-xs"><SelectValue placeholder="— skip —" /></SelectTrigger>
                    <SelectContent className="bg-[#262626] border-gray-700">
                      <SelectItem value="__none__">— skip —</SelectItem>
                      {csvData.headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>

          {/* Preview table */}
          <div className="overflow-x-auto rounded-lg border border-gray-800">
            <table className="w-full text-xs min-w-[700px]">
              <thead className="bg-gray-900/60 border-b border-gray-800">
                <tr>
                  <th className="px-2 py-2 text-left text-gray-400">Driver / Car</th>
                  <th className="px-2 py-2 text-left text-gray-400">Pos</th>
                  <th className="px-2 py-2 text-left text-gray-400">Status</th>
                  <th className="px-2 py-2 text-left text-gray-400">Laps</th>
                  <th className="px-2 py-2 text-left text-gray-400">Match</th>
                  <th className="px-2 py-2 text-left text-gray-400">Issues</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row) => (
                  <tr key={row._idx} className={`border-b border-gray-800 ${row.errors.length ? 'bg-red-950/10' : 'hover:bg-gray-800/20'}`}>
                    <td className="px-2 py-1.5 text-white">{row.driverName || row.carNumber || '—'}</td>
                    <td className="px-2 py-1.5 text-gray-300 font-mono">{row.position || '—'}</td>
                    <td className="px-2 py-1.5 text-gray-300">{row.status || '—'}</td>
                    <td className="px-2 py-1.5 text-gray-300">{row.laps || '—'}</td>
                    <td className="px-2 py-1.5">
                      {row.driver ? (
                        <Badge className="text-xs bg-green-500/20 text-green-400"><CheckCircle2 className="w-3 h-3 mr-1" />{row.driver.first_name} {row.driver.last_name}</Badge>
                      ) : (
                        <Badge className="text-xs bg-gray-500/20 text-gray-400">No match</Badge>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-red-400 text-xs">{row.errors.join(', ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary + actions */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="text-xs text-gray-400">
              <span className="text-green-400">{validCount} valid</span> · <span className="text-red-400">{errorCount} errors</span>
              {csvData.rows.length > 25 && <span className="text-gray-500"> (showing 25 of {csvData.rows.length})</span>}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={reset} className="border-gray-700 text-gray-300">Change File</Button>
              <Button size="sm" onClick={handleImport} disabled={importing || !validCount} className="bg-blue-600 hover:bg-blue-700">
                {importing ? 'Importing…' : `Import ${validCount} rows`}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}