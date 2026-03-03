import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Upload, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const EXPECTED_COLS = [
  'car_number', 'driver_first_name', 'driver_last_name',
  'position', 'status', 'laps_completed', 'best_lap_time_ms', 'points', 'notes',
];

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return { headers: [], rows: [] };
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const rows = lines.slice(1).map((line) => {
    const vals = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
    return obj;
  });
  return { headers, rows };
}

export default function ResultsImportPanel({
  session,
  drivers,
  driverPrograms,
  selectedEvent,
  locked,
  onImport,
  importing,
}) {
  const fileRef = useRef(null);
  const [csvData, setCsvData] = useState(null); // { headers, rows }
  const [mapping, setMapping] = useState({});
  const [dragOver, setDragOver] = useState(false);

  const resetAll = () => {
    setCsvData(null);
    setMapping({});
    if (fileRef.current) fileRef.current.value = '';
  };

  const loadFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const parsed = parseCSV(e.target.result);
      setCsvData(parsed);
      // Auto-map exact matches
      const autoMap = {};
      EXPECTED_COLS.forEach((col) => {
        const match = parsed.headers.find((h) => h.toLowerCase().replace(/[^a-z0-9]/g, '_') === col);
        if (match) autoMap[col] = match;
      });
      setMapping(autoMap);
    };
    reader.readAsText(file);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) loadFile(file);
  }, []);

  const handleFileChange = (e) => loadFile(e.target.files?.[0]);

  // Build preview rows using mapping
  const previewRows = csvData
    ? csvData.rows.slice(0, 20).map((raw) => {
        const out = {};
        EXPECTED_COLS.forEach((col) => {
          const src = mapping[col];
          out[col] = src ? raw[src] : '';
        });
        return out;
      })
    : [];

  // Resolve drivers for preview
  const resolveDriver = (firstName, lastName) => {
    if (!firstName && !lastName) return null;
    const fl = `${firstName} ${lastName}`.toLowerCase().trim();
    const exact = drivers.find(
      (d) => `${d.first_name} ${d.last_name}`.toLowerCase() === fl
    );
    if (exact) return exact;
    const partial = drivers.filter(
      (d) =>
        d.first_name.toLowerCase().includes(firstName.toLowerCase()) &&
        d.last_name.toLowerCase().includes(lastName.toLowerCase())
    );
    if (partial.length === 1) return partial[0];
    return null;
  };

  const previewWithResolution = previewRows.map((row) => {
    const driver = resolveDriver(row.driver_first_name, row.driver_last_name);
    const multiMatch =
      !driver &&
      row.driver_first_name &&
      row.driver_last_name &&
      drivers.filter(
        (d) =>
          d.first_name.toLowerCase().includes(row.driver_first_name.toLowerCase()) &&
          d.last_name.toLowerCase().includes(row.driver_last_name.toLowerCase())
      ).length > 1;
    return { ...row, _driver: driver, _error: !driver ? (multiMatch ? 'Multiple matches' : 'No match') : null };
  });

  const hasConflicts = previewWithResolution.some((r) => r._error === 'Multiple matches');
  const unresolved = previewWithResolution.filter((r) => r._error);

  const handleImport = () => {
    if (hasConflicts) {
      toast.error('Resolve multiple-match conflicts before importing');
      return;
    }
    const resolved = previewWithResolution.filter((r) => r._driver);
    const skipped = previewWithResolution.filter((r) => !r._driver);
    if (!resolved.length) {
      toast.error('No rows could be resolved to drivers');
      return;
    }
    const rows = resolved.map((row) => {
      const driver = row._driver;
      const prog = driverPrograms.find(
        (dp) => dp.driver_id === driver.id && dp.event_id === selectedEvent?.id
      );
      return {
        event_id: selectedEvent?.id,
        session_id: session?.id,
        series_class_id: session?.series_class_id || '',
        series_id: selectedEvent?.series_id || '',
        driver_id: driver.id,
        program_id: prog?.id || '',
        position: parseInt(row.position) || null,
        status: row.status || 'Running',
        laps_completed: parseInt(row.laps_completed) || null,
        best_lap_time_ms: parseInt(row.best_lap_time_ms) || null,
        points: parseFloat(row.points) || null,
        notes: row.notes || (prog ? '' : 'No program found for event'),
      };
    });
    onImport(rows, skipped.length);
  };

  if (locked) {
    return (
      <div className="py-8 text-center text-gray-500 text-sm">
        Session is locked. Import disabled.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      {!csvData ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${
            dragOver ? 'border-blue-500 bg-blue-950/20' : 'border-gray-700 hover:border-gray-600'
          }`}
        >
          <Upload className="w-8 h-8 text-gray-500 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">Drag & drop a CSV file or click to upload</p>
          <p className="text-gray-600 text-xs mt-1">car_number, driver_first_name, driver_last_name, position, status…</p>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
        </div>
      ) : (
        <>
          {/* Column mapping */}
          <div className="bg-[#171717] border border-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-white">Column Mapping</p>
              <Button size="sm" variant="ghost" onClick={resetAll} className="text-gray-500 text-xs">Reset</Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {EXPECTED_COLS.map((col) => (
                <div key={col}>
                  <label className="text-xs text-gray-400 block mb-1">{col}</label>
                  <Select
                    value={mapping[col] || '__none__'}
                    onValueChange={(v) => setMapping((m) => ({ ...m, [col]: v === '__none__' ? '' : v }))}
                  >
                    <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white h-7 text-xs">
                      <SelectValue placeholder="— skip —" />
                    </SelectTrigger>
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
                  <th className="px-2 py-2 text-left text-gray-400">Driver</th>
                  <th className="px-2 py-2 text-left text-gray-400">Car #</th>
                  <th className="px-2 py-2 text-left text-gray-400">Pos</th>
                  <th className="px-2 py-2 text-left text-gray-400">Status</th>
                  <th className="px-2 py-2 text-left text-gray-400">Laps</th>
                  <th className="px-2 py-2 text-left text-gray-400">Best Lap (ms)</th>
                  <th className="px-2 py-2 text-left text-gray-400">Points</th>
                  <th className="px-2 py-2 text-left text-gray-400">Match</th>
                </tr>
              </thead>
              <tbody>
                {previewWithResolution.map((row, idx) => (
                  <tr key={idx} className={`border-b border-gray-800 ${row._error ? 'bg-red-950/10' : 'hover:bg-gray-800/20'}`}>
                    <td className="px-2 py-1.5 text-white">{row.driver_first_name} {row.driver_last_name}</td>
                    <td className="px-2 py-1.5 text-gray-300 font-mono">{row.car_number || '—'}</td>
                    <td className="px-2 py-1.5 text-gray-300 font-mono">{row.position || '—'}</td>
                    <td className="px-2 py-1.5 text-gray-300">{row.status || '—'}</td>
                    <td className="px-2 py-1.5 text-gray-300">{row.laps_completed || '—'}</td>
                    <td className="px-2 py-1.5 text-gray-300">{row.best_lap_time_ms || '—'}</td>
                    <td className="px-2 py-1.5 text-gray-300">{row.points || '—'}</td>
                    <td className="px-2 py-1.5">
                      {row._driver ? (
                        <Badge className="text-xs bg-green-500/20 text-green-400">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          {row._driver.first_name} {row._driver.last_name}
                        </Badge>
                      ) : (
                        <Badge className="text-xs bg-red-500/20 text-red-400">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          {row._error}
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary + import */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="text-xs text-gray-400 space-y-0.5">
              <p>
                <span className="text-green-400">{previewWithResolution.filter((r) => r._driver).length} matched</span>
                {' · '}
                <span className="text-red-400">{unresolved.length} unresolved</span>
                {csvData.rows.length > 20 && <span className="text-gray-500"> (showing first 20 of {csvData.rows.length})</span>}
              </p>
              {hasConflicts && (
                <p className="text-amber-400">⚠ Multiple driver matches found — resolve before importing</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={resetAll} className="border-gray-700 text-gray-300">Change File</Button>
              <Button
                size="sm"
                onClick={handleImport}
                disabled={importing || hasConflicts || !previewWithResolution.some((r) => r._driver)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {importing ? 'Importing…' : `Import ${previewWithResolution.filter((r) => r._driver).length} rows`}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}