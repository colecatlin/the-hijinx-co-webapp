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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertCircle, CheckCircle2, AlertTriangle, X } from 'lucide-react';

const VALID_STATUSES = new Set(['Running', 'DNF', 'DNS', 'DSQ', 'DNP']);

function normalizeStatus(status) {
  if (!status) return 'Running';
  const upper = status.toUpperCase().trim();
  if (VALID_STATUSES.has(upper)) return upper;
  return null; // invalid
}

function normalizeName(name) {
  return (name || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

function parseTabData(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return { headers: [], rows: [] };

  const headers = lines[0].split('\t').map((h) => h.trim().toLowerCase());
  const rows = lines.slice(1).map((line) => {
    const parts = line.split('\t').map((p) => p.trim());
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

function resolveDriver(driverName, drivers) {
  if (!driverName) return null;
  const normalized = normalizeName(driverName);
  const matches = drivers.filter(
    (d) => normalizeName(`${d.first_name} ${d.last_name}`) === normalized
  );
  if (matches.length === 1) return matches[0];
  return null; // no match or ambiguous
}

export default function ResultsPasteDialog({
  open,
  onOpenChange,
  drivers,
  selectedEvent,
  selectedSession,
  onPaste,
}) {
  const [pasteText, setPasteText] = useState('');
  const [preview, setPreview] = useState(null);

  const handleParse = () => {
    if (!pasteText.trim()) {
      setPreview(null);
      return;
    }

    const { headers, rows } = parseTabData(pasteText);

    // Find columns
    const posCol = findHeader(headers, ['position', 'pos', 'finish_position', 'finishing_position']);
    const driverCol = findHeader(headers, ['driver', 'driver_name', 'driver_full_name', 'name']);
    const statusCol = findHeader(headers, ['status', 'finish_status', 'result_status']);
    const lapsCol = findHeader(headers, ['laps', 'laps_completed', 'laps_led']);

    if (!posCol || !driverCol || !statusCol) {
      setPreview({
        rows: [],
        error: 'Missing required columns. Need: Position, Driver, Status',
      });
      return;
    }

    // Parse rows
    const parsed = rows.slice(0, 100).map((raw, idx) => {
      const posStr = raw[posCol];
      const driverName = raw[driverCol];
      const statusStr = raw[statusCol];
      const lapsStr = raw[lapsCol];

      const errors = [];
      let position = null;
      let status = null;
      let laps = null;
      let driver = null;
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

      // Validate driver
      if (!driverName) {
        errors.push('Missing driver name');
        isValid = false;
      } else {
        driver = resolveDriver(driverName, drivers);
        if (!driver) {
          errors.push(`Driver not found: ${driverName}`);
          isValid = false;
        }
      }

      // Validate laps
      if (lapsStr) {
        const lapsNum = parseInt(lapsStr, 10);
        if (isNaN(lapsNum) || lapsNum < 0) {
          errors.push('Invalid laps (must be 0+)');
          isValid = false;
        } else {
          laps = lapsNum;
        }
      }

      return {
        _idx: idx,
        rawDriver: driverName,
        position,
        status,
        laps,
        driver,
        errors,
        isValid: isValid && driver,
      };
    });

    setPreview({
      rows: parsed,
      error: null,
      stats: {
        total: parsed.length,
        valid: parsed.filter((r) => r.isValid).length,
        invalid: parsed.filter((r) => !r.isValid).length,
      },
    });
  };

  const handleConfirm = () => {
    if (!preview || !preview.rows) return;

    const validRows = preview.rows.filter((r) => r.isValid);
    const newRows = validRows.map((r) => ({
      event_id: selectedEvent?.id,
      session_id: selectedSession?.id,
      session_type: selectedSession?.session_type,
      series_id: selectedEvent?.series_id,
      series_class_id: selectedSession?.series_class_id,
      driver_id: r.driver.id,
      position: r.position,
      status: r.status,
      laps_completed: r.laps,
      status_state: 'Draft',
    }));

    onPaste(newRows, preview.stats.invalid);
    setPasteText('');
    setPreview(null);
    onOpenChange(false);
  };

  const handleClose = () => {
    setPasteText('');
    setPreview(null);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-[#262626] border-gray-700 max-w-4xl max-h-[90vh] overflow-y-auto">
        <AlertDialogTitle className="text-white">Paste Results</AlertDialogTitle>

        {!preview ? (
          <>
            <AlertDialogDescription className="text-gray-400">
              Paste tab-separated data with columns: Position, Driver, Status, Laps (optional).
              <br />
              <span className="text-xs text-gray-500 mt-2 block">
                Example: Copy from Excel or Google Sheets and paste here.
              </span>
            </AlertDialogDescription>

            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Position	Driver	Status	Laps&#10;1	John Smith	Running	45&#10;2	Jane Doe	Running	45"
              className="w-full h-32 bg-[#171717] border border-gray-700 rounded-lg p-3 text-xs text-white font-mono resize-none focus:outline-none focus:border-blue-600"
            />

            <div className="flex justify-end gap-2">
              <AlertDialogCancel className="border-gray-700 text-gray-300">Cancel</AlertDialogCancel>
              <Button
                onClick={handleParse}
                disabled={!pasteText.trim()}
                className="bg-blue-700 hover:bg-blue-600 text-xs"
              >
                Parse & Preview
              </Button>
            </div>
          </>
        ) : (
          <>
            {preview.error ? (
              <div className="bg-red-950/30 border border-red-800/50 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-300">{preview.error}</p>
              </div>
            ) : (
              <>
                <div className="text-xs text-gray-400 mb-2">
                  <span className="text-green-400 font-semibold">{preview.stats.valid} valid</span>
                  {' '}
                  · <span className="text-red-400 font-semibold">{preview.stats.invalid} invalid</span>
                  {' '}
                  · <span className="text-gray-500">{preview.stats.total} total</span>
                </div>

                <div className="overflow-x-auto border border-gray-800 rounded-lg mb-3">
                  <Table className="text-xs">
                    <TableHeader className="bg-[#1A1A1A]">
                      <TableRow className="h-8">
                        <TableHead className="text-gray-400 p-2 w-12">Pos</TableHead>
                        <TableHead className="text-gray-400 p-2">Driver (Raw)</TableHead>
                        <TableHead className="text-gray-400 p-2">Matched</TableHead>
                        <TableHead className="text-gray-400 p-2 w-20">Status</TableHead>
                        <TableHead className="text-gray-400 p-2 w-12">Laps</TableHead>
                        <TableHead className="text-gray-400 p-2">Issues</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.rows.map((row) => (
                        <TableRow
                          key={row._idx}
                          className={`h-8 ${row.isValid ? 'hover:bg-[#1A1A1A]' : 'bg-red-950/20'}`}
                        >
                          <TableCell className="p-2 text-gray-300 font-mono">{row.position || '—'}</TableCell>
                          <TableCell className="p-2 text-gray-300 truncate">{row.rawDriver}</TableCell>
                          <TableCell className="p-2">
                            {row.driver ? (
                              <Badge className="text-xs bg-green-500/20 text-green-400 gap-1">
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                {row.driver.first_name} {row.driver.last_name}
                              </Badge>
                            ) : (
                              <Badge className="text-xs bg-red-500/20 text-red-400 gap-1">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                No match
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="p-2 text-gray-300">{row.status || '—'}</TableCell>
                          <TableCell className="p-2 text-gray-300">{row.laps || '—'}</TableCell>
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
                  <AlertDialogCancel className="border-gray-700 text-gray-300">Cancel</AlertDialogCancel>
                  <Button
                    onClick={() => {
                      setPasteText('');
                      setPreview(null);
                    }}
                    variant="outline"
                    className="border-gray-700 text-gray-300 text-xs"
                  >
                    Change Paste
                  </Button>
                  <AlertDialogAction
                    onClick={handleConfirm}
                    disabled={preview.stats.valid === 0}
                    className="bg-blue-700 hover:bg-blue-600 text-xs"
                  >
                    Add {preview.stats.valid} Row{preview.stats.valid !== 1 ? 's' : ''}
                  </AlertDialogAction>
                </div>
              </>
            )}
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}