/**
 * ResultsCSVUpload.jsx
 * Results-only CSV importer for a session.
 * 
 * Safety:
 *  - Never creates Driver source records.
 *  - Driver resolution is local (from the drivers prop) with full ambiguity detection.
 *  - Rows where driver cannot be resolved are surfaced as unresolved, not silently skipped.
 *  - import summary includes imported_rows, unresolved_rows, error_rows.
 */
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertCircle, Upload, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function ResultsCSVUpload({ session, drivers, driverPrograms }) {
  const [csvText, setCsvText] = useState('');
  const [columnMapping, setColumnMapping] = useState({});
  const [previewData, setPreviewData] = useState([]);
  const [step, setStep] = useState('upload'); // upload | mapping | preview | done
  const [importResult, setImportResult] = useState(null);
  const queryClient = useQueryClient();

  const csvColumns = [
    'Car Number',
    'Driver First Name',
    'Driver Last Name',
    'Team',
    'Finish Position',
    'Status',
    'Laps Completed',
    'Best Lap Time (ms)',
    'Points',
    'Notes',
  ];

  // ── Local driver resolver with ambiguity detection ────────────────────────
  // Never guesses. Returns { status: 'matched'|'ambiguous'|'unresolved', driver?, count? }
  function resolveDriverLocally(firstName, lastName) {
    const normFull = `${(firstName || '').trim()} ${(lastName || '').trim()}`.trim().toLowerCase();
    if (!normFull) return { status: 'unresolved', reason: 'no_name' };

    const matches = (drivers || []).filter(
      (d) =>
        `${(d.first_name || '').trim()} ${(d.last_name || '').trim()}`
          .trim()
          .toLowerCase() === normFull
    );

    if (matches.length === 1) return { status: 'matched', driver: matches[0] };
    if (matches.length > 1)  return { status: 'ambiguous', matches, count: matches.length };
    return { status: 'unresolved', reason: 'not_found' };
  }

  // ── Upload / paste step ───────────────────────────────────────────────────
  const handleCSVPaste = (text) => {
    setCsvText(text);
    const lines = text.trim().split('\n');
    if (lines.length < 2) { toast.error('CSV must have a header row and at least one data row.'); return; }
    const headers = lines[0].split(',').map((h) => h.trim());
    const initialMapping = {};
    csvColumns.forEach((col) => {
      const match = headers.find((h) =>
        h.toLowerCase().includes(col.toLowerCase().split(' ')[0])
      );
      if (match) initialMapping[col] = headers.indexOf(match);
    });
    setColumnMapping(initialMapping);
    setStep('mapping');
  };

  // ── Build preview rows from column mapping ────────────────────────────────
  const parseCSV = () => {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map((h) => h.trim());
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const cells = lines[i].split(',').map((c) => c.trim());
      const row = {};
      csvColumns.forEach((col) => {
        const colIndex = columnMapping[col];
        if (colIndex !== undefined && cells[colIndex]) {
          row[col] = cells[colIndex];
        }
      });
      rows.push(row);
    }
    setPreviewData(rows);
    setStep('preview');
  };

  // ── Import handler ────────────────────────────────────────────────────────
  const handleImport = () => {
    const resolved = [];
    const unresolvedRows = [];

    for (const row of previewData) {
      const firstName = row['Driver First Name'] || '';
      const lastName  = row['Driver Last Name']  || '';
      const resolution = resolveDriverLocally(firstName, lastName);

      if (resolution.status !== 'matched') {
        unresolvedRows.push({
          name: `${firstName} ${lastName}`.trim() || '(blank)',
          car_number: row['Car Number'] || '',
          reason:
            resolution.status === 'ambiguous'
              ? `ambiguous — ${resolution.count} drivers match this name`
              : 'driver not found in system',
        });
        continue;
      }

      resolved.push({
        driver_id:        resolution.driver.id,
        event_id:         session.event_id,
        session_id:       session.id,
        position:         parseInt(row['Finish Position']) || 0,
        status:           row['Status'] || 'Running',
        laps_completed:   parseInt(row['Laps Completed']) || 0,
        best_lap_time_ms: parseInt(row['Best Lap Time (ms)']) || 0,
        points:           parseInt(row['Points']) || 0,
        notes:            row['Notes'] || '',
      });
    }

    importMutation.mutate({ resolved, unresolvedRows });
  };

  // ── Mutation ──────────────────────────────────────────────────────────────
  const importMutation = useMutation({
    mutationFn: async ({ resolved, unresolvedRows }) => {
      const errorRows = [];
      let updatedCount = 0;

      for (const result of resolved) {
        try {
          const res = await base44.functions.invoke('upsertOperationalResult', {
            payload: result,
            source_path: 'results_csv_upload',
          });
          if (res?.data?.error) throw new Error(res.data.error);
          if (res?.data?.action === 'updated') updatedCount++;
        } catch (err) {
          errorRows.push({ driver_id: result.driver_id, error: err.message });
        }
      }

      const importedCount = resolved.length - errorRows.length - updatedCount;

      // Standardized operation log
      await base44.functions.invoke('logOperation', {
        operation_type: 'csv_import_completed',
        source_type: 'csv',
        entity_name: 'Results',
        status: 'completed',
        metadata: {
          importer_name: 'results_csv_upload',
          imported_count: importedCount,
          updated_count: updatedCount,
          skipped_count: 0,
          unresolved_count: unresolvedRows.length,
          warning_count: 0,
          error_count: errorRows.length,
          session_id: session?.id,
          event_id: session?.event_id,
        },
      }).catch(() => {});

      await base44.entities.Session.update(session.id, { status: 'Draft' });

      return { importedCount, updatedCount, unresolvedRows, errorRows, totalRows: previewData.length };
    },
    onSuccess: ({ importedCount, updatedCount, unresolvedRows, errorRows, totalRows }) => {
      queryClient.invalidateQueries({ queryKey: ['results'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      setImportResult({ importedCount, updatedCount, unresolvedRows, errorRows, totalRows });
      setStep('done');
      const msg = updatedCount > 0 ? `${importedCount} created, ${updatedCount} updated` : `${importedCount} imported`;
      toast.success(`${msg} of ${totalRows} results`);
    },
    onError: (error) => {
      toast.error(`Import failed: ${error.message}`);
    },
  });

  const reset = () => {
    setCsvText('');
    setColumnMapping({});
    setPreviewData([]);
    setImportResult(null);
    setStep('upload');
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ── Upload step ────────────────────────────────────────────────────── */}
      {step === 'upload' && (
        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center bg-[#0A0A0A]">
            <Upload className="w-8 h-8 text-gray-500 mx-auto mb-2" />
            <p className="text-gray-400 text-sm mb-4">Paste CSV text or upload a file</p>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="Paste CSV data here (headers required)"
              className="w-full h-32 bg-[#171717] border border-gray-700 rounded p-3 text-white text-sm font-mono"
            />
            <div className="flex gap-2 mt-4 justify-center">
              <Button
                onClick={() => handleCSVPaste(csvText)}
                disabled={!csvText.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Continue
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Mapping step ───────────────────────────────────────────────────── */}
      {step === 'mapping' && (
        <div className="space-y-4">
          <Card className="bg-[#262626] border-gray-700">
            <CardContent className="pt-6">
              <h3 className="text-white text-sm font-semibold mb-4">
                Map CSV columns to Result fields
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {csvColumns.map((csvCol) => (
                  <div key={csvCol}>
                    <label className="text-xs text-gray-400 mb-2 block">{csvCol}</label>
                    <Select
                      value={(columnMapping[csvCol] ?? '').toString()}
                      onValueChange={(val) =>
                        setColumnMapping({ ...columnMapping, [csvCol]: parseInt(val) })
                      }
                    >
                      <SelectTrigger className="bg-[#171717] border-gray-700 text-white text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#171717] border-gray-700">
                        <SelectItem value={null} className="text-white">Skip</SelectItem>
                        {csvText
                          .split('\n')[0]
                          .split(',')
                          .map((col, i) => (
                            <SelectItem key={i} value={i.toString()} className="text-white">
                              {col.trim()}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-6">
                <Button variant="outline" onClick={() => setStep('upload')} className="border-gray-700">
                  Back
                </Button>
                <Button onClick={parseCSV} className="bg-blue-600 hover:bg-blue-700 ml-auto">
                  Preview
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Preview step ───────────────────────────────────────────────────── */}
      {step === 'preview' && (
        <div className="space-y-4">
          <div className="border border-gray-700 rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-[#262626]">
                <TableRow>
                  {csvColumns.map((col) => (
                    <TableHead key={col} className="text-gray-400 text-xs">{col}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.slice(0, 10).map((row, idx) => {
                  const firstName = row['Driver First Name'] || '';
                  const lastName  = row['Driver Last Name']  || '';
                  const resolution = resolveDriverLocally(firstName, lastName);
                  const rowClass = resolution.status === 'ambiguous'
                    ? 'bg-yellow-900/10'
                    : resolution.status === 'unresolved'
                    ? 'bg-red-900/10'
                    : '';
                  return (
                    <TableRow key={idx} className={`hover:bg-[#262626] ${rowClass}`}>
                      {csvColumns.map((col) => (
                        <TableCell key={col} className="text-gray-300 text-xs">
                          {col === 'Driver First Name' || col === 'Driver Last Name' ? (
                            <span className={
                              resolution.status === 'matched' ? 'text-green-400' :
                              resolution.status === 'ambiguous' ? 'text-yellow-400' :
                              'text-red-400'
                            }>
                              {row[col] || '-'}
                            </span>
                          ) : (
                            row[col] || '-'
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Resolution preview counts */}
          {(() => {
            const counts = previewData.reduce((acc, row) => {
              const r = resolveDriverLocally(row['Driver First Name'] || '', row['Driver Last Name'] || '');
              acc[r.status] = (acc[r.status] || 0) + 1;
              return acc;
            }, {});
            return (
              <div className="flex gap-4 text-xs">
                {counts.matched > 0 && <span className="text-green-400">{counts.matched} drivers resolved</span>}
                {counts.ambiguous > 0 && <span className="text-yellow-400">{counts.ambiguous} ambiguous</span>}
                {counts.unresolved > 0 && <span className="text-red-400">{counts.unresolved} not found</span>}
              </div>
            );
          })()}

          {previewData.length > 10 && (
            <p className="text-xs text-gray-400">Showing 10 of {previewData.length} rows</p>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep('mapping')} className="border-gray-700">
              Back
            </Button>
            <Button
              onClick={handleImport}
              disabled={importMutation.isPending}
              className="bg-green-600 hover:bg-green-700 ml-auto"
            >
              {importMutation.isPending ? 'Importing...' : 'Import Results'}
            </Button>
          </div>
        </div>
      )}

      {/* ── Done step ──────────────────────────────────────────────────────── */}
      {step === 'done' && importResult && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            <span className="text-white font-semibold">Import Complete</span>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div className="bg-[#171717] border border-gray-800 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-400">{importResult.importedCount}</p>
              <p className="text-xs text-gray-500 mt-0.5">Created</p>
            </div>
            <div className="bg-[#171717] border border-gray-800 rounded-lg p-3 text-center">
              <p className={`text-2xl font-bold ${importResult.updatedCount > 0 ? 'text-blue-400' : 'text-gray-400'}`}>
                {importResult.updatedCount ?? 0}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Updated</p>
            </div>
            <div className="bg-[#171717] border border-gray-800 rounded-lg p-3 text-center">
              <p className={`text-2xl font-bold ${importResult.unresolvedRows.length > 0 ? 'text-yellow-400' : 'text-gray-400'}`}>
                {importResult.unresolvedRows.length}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Unresolved</p>
            </div>
            <div className="bg-[#171717] border border-gray-800 rounded-lg p-3 text-center">
              <p className={`text-2xl font-bold ${importResult.errorRows.length > 0 ? 'text-red-400' : 'text-gray-400'}`}>
                {importResult.errorRows.length}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Errors</p>
            </div>
          </div>

          {importResult.unresolvedRows.length > 0 && (
            <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-3">
              <p className="text-xs text-yellow-400 font-semibold mb-2 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Unresolved Drivers ({importResult.unresolvedRows.length})
              </p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {importResult.unresolvedRows.map((u, i) => (
                  <p key={i} className="text-xs text-gray-400 font-mono">
                    {u.name}{u.car_number ? ` (#${u.car_number})` : ''} — {u.reason}
                  </p>
                ))}
              </div>
            </div>
          )}

          {importResult.errorRows.length > 0 && (
            <div className="bg-red-900/20 border border-red-800 rounded-lg p-3">
              <p className="text-xs text-red-400 font-semibold mb-2 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                Row Errors ({importResult.errorRows.length})
              </p>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {importResult.errorRows.map((e, i) => (
                  <p key={i} className="text-xs text-gray-400">{e.error}</p>
                ))}
              </div>
            </div>
          )}

          <Button variant="outline" onClick={reset} className="border-gray-700 w-full">
            Import Another File
          </Button>
        </div>
      )}
    </div>
  );
}