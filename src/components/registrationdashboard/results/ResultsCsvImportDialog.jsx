import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertCircle, CheckCircle2, AlertTriangle, Upload } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import {
  splitDriverName,
  resolveDriverMatch,
  buildMinimalDriverPayload,
  isSingleWordName,
} from './pasteDriverUtils';

const VALID_STATUSES = new Set(['Running', 'DNF', 'DNS', 'DSQ', 'DNP']);

function normalizeStatus(status) {
  if (!status) return 'Running';
  const upper = status.toUpperCase().trim();
  if (VALID_STATUSES.has(upper)) return upper;
  return null;
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return { headers: [], rows: [] };

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const rows = lines.slice(1).map((line) => {
    // Simple CSV parsing (handles basic comma-separated, doesn't handle quoted values with commas)
    const parts = line.split(',').map((p) => p.trim());
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = parts[i] || '';
    });
    return obj;
  });

  return { headers, rows };
}

function findHeader(headers, candidates) {
  for (const candidate of candidates) {
    const norm = candidate.toLowerCase().replace(/\s+/g, '');
    const found = headers.find((h) => h.replace(/\s+/g, '') === norm);
    if (found) return found;
  }
  return null;
}

export default function ResultsCsvImportDialog({
  session,
  drivers,
  selectedEvent,
  locked,
  onImport,
  importing,
}) {
  const [csvText, setCsvText] = useState('');
  const [preview, setPreview] = useState(null);
  const [createSelected, setCreateSelected] = useState(new Set());

  // Guard: No session selected
  if (!session) {
    return (
      <div className="bg-red-950/30 border border-red-800/50 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-red-300">Select a session before importing results.</p>
      </div>
    );
  }

  // Guard: Session is locked
  if (locked) {
    return (
      <div className="bg-purple-950/30 border border-purple-800/50 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-purple-300">Locked sessions cannot import new results.</p>
      </div>
    );
  }

  const handleParse = () => {
    if (!csvText.trim()) {
      setPreview(null);
      return;
    }

    const { headers, rows } = parseCSV(csvText);

    // Find columns
    const posCol = findHeader(headers, ['position', 'pos', 'p', 'finishing_position']);
    const driverCol = findHeader(headers, ['driver', 'driver_name', 'driver_full_name', 'name']);
    const statusCol = findHeader(headers, ['status', 'result_status', 'finish_status']);
    const lapsCol = findHeader(headers, ['laps', 'laps_completed', 'completed_laps']);
    const bestLapCol = findHeader(headers, ['best_lap_time_ms', 'best_lap', 'best_lap_time', 'lap_time']);
    const pointsCol = findHeader(headers, ['points', 'point', 'pts']);
    const carNumCol = findHeader(headers, ['car_number', 'car #', 'number', 'num']);
    const notesCol = findHeader(headers, ['notes', 'remarks', 'comment']);

    if (!posCol || !driverCol || !statusCol) {
      setPreview({
        rows: [],
        error: 'Missing required columns. Need: Position, Driver, Status',
      });
      return;
    }

    // Parse rows (limit to 200)
    const parsed = rows.slice(0, 200).map((raw, idx) => {
      const posStr = raw[posCol];
      const driverName = raw[driverCol];
      const statusStr = raw[statusCol];
      const lapsStr = raw[lapsCol];
      const bestLapStr = raw[bestLapCol];
      const pointsStr = raw[pointsCol];
      const carNum = raw[carNumCol];
      const notes = raw[notesCol];

      const errors = [];
      let position = null;
      let status = null;
      let laps = null;
      let bestLapMs = null;
      let points = null;
      let driver = null;
      let driverStatus = 'matched';
      let isValid = true;

      // Validate position
      if (!posStr) {
        errors.push('Missing position');
        isValid = false;
      } else {
        const posNum = parseInt(posStr, 10);
        if (isNaN(posNum) || posNum < 1) {
          errors.push('Invalid position (must be 1+)');
          isValid = false;
        } else {
          position = posNum;
        }
      }

      // Validate status
      if (!statusStr) {
        errors.push('Missing status');
        isValid = false;
      } else {
        const normalized = normalizeStatus(statusStr);
        if (!normalized) {
          errors.push(`Invalid status: ${statusStr}`);
          isValid = false;
        } else {
          status = normalized;
        }
      }

      // Resolve driver
      if (!driverName) {
        errors.push('Missing driver name');
        isValid = false;
        driverStatus = 'invalid';
      } else {
        const match = resolveDriverMatch(
          splitDriverName(driverName).first_name,
          splitDriverName(driverName).last_name,
          drivers
        );
        if (match.status === 'matched') {
          driver = match.driver;
          driverStatus = 'matched';
        } else if (match.status === 'ambiguous') {
          errors.push(`Multiple drivers match "${driverName}" (${match.count} found). Resolve duplicates first.`);
          driverStatus = 'ambiguous';
          isValid = false;
        } else {
          driverStatus = 'unmatched';
        }
      }

      // Validate optional fields
      if (lapsStr) {
        const lapsNum = parseInt(lapsStr, 10);
        if (isNaN(lapsNum) || lapsNum < 0) {
          errors.push('Invalid laps (must be 0+)');
          isValid = false;
        } else {
          laps = lapsNum;
        }
      }

      if (bestLapStr) {
        const bestLapNum = parseInt(bestLapStr, 10);
        if (isNaN(bestLapNum) || bestLapNum < 0) {
          errors.push('Invalid best_lap_time_ms');
          isValid = false;
        } else {
          bestLapMs = bestLapNum;
        }
      }

      if (pointsStr) {
        const pointsNum = parseFloat(pointsStr);
        if (isNaN(pointsNum)) {
          errors.push('Invalid points');
          isValid = false;
        } else {
          points = pointsNum;
        }
      }

      // Check for single-word driver name warning
      if (driverName && driverStatus === 'unmatched' && isSingleWordName(driverName)) {
        errors.push('Single-word name — admin should verify first/last name split');
      }

      return {
        _idx: idx,
        rawDriver: driverName,
        position,
        status,
        laps,
        bestLapMs,
        points,
        carNum,
        notes,
        driver,
        driverStatus,
        errors,
        isValid: isValid && (driverStatus === 'matched' || driverStatus === 'unmatched'),
        canCreate: driverStatus === 'unmatched' && isValid && position && status,
      };
    });

    setCreateSelected(new Set());

    setPreview({
      rows: parsed,
      error: null,
      stats: {
        total: parsed.length,
        matched: parsed.filter((r) => r.driverStatus === 'matched' && r.isValid).length,
        unmatched: parsed.filter((r) => r.driverStatus === 'unmatched').length,
        ambiguous: parsed.filter((r) => r.driverStatus === 'ambiguous').length,
        invalid: parsed.filter((r) => !r.isValid && r.driverStatus !== 'ambiguous').length,
      },
    });
  };

  const handleConfirm = async () => {
    if (!preview || !preview.rows) return;

    const rowsToCreate = preview.rows.filter((r) => r.canCreate && createSelected.has(r._idx));
    if (rowsToCreate.length > 20) {
      toast.error('Maximum 20 new drivers per import. Please reduce selection.');
      return;
    }

    try {
      // Step 1: Create missing drivers
      const driverIdMap = new Map();
      for (const row of rowsToCreate) {
        const { first_name, last_name } = splitDriverName(row.rawDriver);
        const payload = buildMinimalDriverPayload(first_name, last_name);
        // Override data_source for CSV imports
        payload.data_source = 'historical_csv_import';
        try {
          const newDriver = await base44.entities.Driver.create(payload);
          driverIdMap.set(row._idx, newDriver.id);
        } catch (err) {
          toast.error(`Failed to create driver "${row.rawDriver}": ${err.message}`);
          return;
        }
      }

      // Step 2: Build result rows
      const newRows = preview.rows
        .filter((r) => r.isValid && (r.driverStatus === 'matched' || createSelected.has(r._idx)))
        .map((r) => {
          const driverId = driverIdMap.has(r._idx) ? driverIdMap.get(r._idx) : r.driver?.id;
          return {
            event_id: selectedEvent?.id,
            session_id: session?.id,
            session_type: session?.session_type,
            series_id: selectedEvent?.series_id,
            series_class_id: session?.series_class_id,
            driver_id: driverId,
            position: r.position,
            status: r.status,
            laps_completed: r.laps,
            best_lap_time_ms: r.bestLapMs,
            points: r.points,
            notes: r.notes,
            status_state: 'Draft',
          };
        });

      const skippedCount = preview.rows.length - newRows.length;
      const driversCreated = driverIdMap.size;

      // Call onImport with rows and metadata
      onImport(newRows, skippedCount, { driversCreated });

      setCsvText('');
      setPreview(null);
      setCreateSelected(new Set());
    } catch (err) {
      toast.error(`Import failed: ${err.message}`);
    }
  };

  const handleClose = () => {
    setCsvText('');
    setPreview(null);
    setCreateSelected(new Set());
  };

  return (
    <div className="space-y-4">
      {!preview ? (
        <div className="space-y-3">
          <div className="bg-[#171717] border border-gray-800 rounded-lg p-4">
            <p className="text-sm text-gray-400 mb-3">
              Paste CSV data with columns: Position, Driver, Status, Laps (optional)
            </p>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="position,driver,status,laps&#10;1,John Smith,Running,45&#10;2,Jane Doe,Running,45"
              className="w-full h-32 bg-[#1A1A1A] border border-gray-700 rounded-lg p-3 text-xs text-white font-mono resize-none focus:outline-none focus:border-blue-600"
            />
            <div className="flex justify-end gap-2 mt-3">
              <Button
                onClick={handleParse}
                disabled={!csvText.trim()}
                className="bg-blue-700 hover:bg-blue-600 text-xs"
              >
                <Upload className="w-3 h-3 mr-1" /> Parse & Preview
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {preview.error ? (
            <div className="bg-red-950/30 border border-red-800/50 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-300">{preview.error}</p>
            </div>
          ) : (
            <>
              <div className="text-xs text-gray-400 mb-2 space-y-1">
                <div>
                  <span className="text-green-400 font-semibold">{preview.stats.matched} matched</span>
                  {' '} · <span className="text-amber-400 font-semibold">{preview.stats.unmatched} unmatched</span>
                  {' '} · <span className="text-orange-400 font-semibold">{preview.stats.ambiguous} ambiguous</span>
                  {' '} · <span className="text-red-400 font-semibold">{preview.stats.invalid} invalid</span>
                </div>
                <div>
                  <span className="text-gray-500">
                    Will add: {preview.stats.matched + preview.rows.filter((r) => r.canCreate && createSelected.has(r._idx)).length} rows
                    {preview.rows.filter((r) => r.canCreate && createSelected.has(r._idx)).length > 0 && (
                      ` (${preview.rows.filter((r) => r.canCreate && createSelected.has(r._idx)).length} new drivers)`
                    )}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto border border-gray-800 rounded-lg mb-3 max-h-96">
                <Table className="text-xs">
                  <TableHeader className="bg-[#1A1A1A] sticky top-0">
                    <TableRow className="h-8">
                      <TableHead className="text-gray-400 p-2 w-12">Pos</TableHead>
                      <TableHead className="text-gray-400 p-2">Driver (Raw)</TableHead>
                      <TableHead className="text-gray-400 p-2">Status</TableHead>
                      <TableHead className="text-gray-400 p-2 w-20">Result</TableHead>
                      <TableHead className="text-gray-400 p-2 w-12">Laps</TableHead>
                      <TableHead className="text-gray-400 p-2 w-20">Action</TableHead>
                      <TableHead className="text-gray-400 p-2">Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.rows.map((row) => (
                      <TableRow
                        key={row._idx}
                        className={`h-8 ${
                          row.driverStatus === 'ambiguous' ? 'bg-orange-950/20' :
                          row.driverStatus === 'unmatched' ? 'bg-amber-950/20' :
                          row.isValid ? 'hover:bg-[#1A1A1A]' : 'bg-red-950/20'
                        }`}
                      >
                        <TableCell className="p-2 text-gray-300 font-mono">{row.position || '—'}</TableCell>
                        <TableCell className="p-2 text-gray-300 truncate">{row.rawDriver}</TableCell>
                        <TableCell className="p-2 text-gray-300">{row.status || '—'}</TableCell>
                        <TableCell className="p-2">
                          {row.driverStatus === 'matched' ? (
                            <Badge className="text-xs bg-green-500/20 text-green-400 gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              {row.driver.first_name} {row.driver.last_name}
                            </Badge>
                          ) : row.driverStatus === 'unmatched' ? (
                            <Badge className="text-xs bg-amber-500/20 text-amber-300 gap-1">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              Unmatched
                            </Badge>
                          ) : row.driverStatus === 'ambiguous' ? (
                            <Badge className="text-xs bg-orange-500/20 text-orange-300 gap-1">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              Ambiguous
                            </Badge>
                          ) : (
                            <Badge className="text-xs bg-red-500/20 text-red-400 gap-1">
                              <AlertCircle className="w-2.5 h-2.5" />
                              Invalid
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="p-2 text-gray-300">{row.laps || '—'}</TableCell>
                        <TableCell className="p-2">
                          {row.canCreate ? (
                            <div className="flex items-center gap-1">
                              <Checkbox
                                checked={createSelected.has(row._idx)}
                                onCheckedChange={(checked) => {
                                  const newSet = new Set(createSelected);
                                  if (checked) newSet.add(row._idx);
                                  else newSet.delete(row._idx);
                                  setCreateSelected(newSet);
                                }}
                                className="w-4 h-4"
                              />
                              <span className="text-[10px] text-amber-300">Create</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-gray-500">—</span>
                          )}
                        </TableCell>
                        <TableCell className="p-2 text-red-400 text-xs">
                          {row.errors.length > 0 ? (
                            <div className="space-y-0.5">
                              {row.errors.map((e, i) => (
                                <div key={i}>{e}</div>
                              ))}
                            </div>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  onClick={handleClose}
                  variant="outline"
                  className="border-gray-700 text-gray-300 text-xs"
                >
                  Reset
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={preview.stats.matched + preview.rows.filter((r) => r.canCreate && createSelected.has(r._idx)).length === 0 || preview.rows.filter((r) => r.canCreate && createSelected.has(r._idx)).length > 20 || importing}
                  className="bg-blue-700 hover:bg-blue-600 text-xs disabled:opacity-50"
                >
                  {importing ? 'Importing...' : `Import ${preview.stats.matched + preview.rows.filter((r) => r.canCreate && createSelected.has(r._idx)).length} Row${(preview.stats.matched + preview.rows.filter((r) => r.canCreate && createSelected.has(r._idx)).length) !== 1 ? 's' : ''}`}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}