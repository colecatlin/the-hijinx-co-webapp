import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Upload, Check, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { parseCSV, guessColumnMap, normalizeHeader } from '../shared/csvUtils';
import { writeTechToNotes, createTransponderState } from '../shared/techUtils';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';

const DQ = applyDefaultQueryOptions();

export default function ImportEntriesModal({
  isOpen,
  onClose,
  selectedEvent,
  dashboardPermissions,
  invalidateAfterOperation,
  existingEntries = [],
}) {
  // State
  const [step, setStep] = useState(1); // 1=upload, 2=mapping, 3=preview, 4=execute
  const [csvText, setCSVText] = useState('');
  const [csvData, setCSVData] = useState(null);
  const [columnMap, setColumnMap] = useState({});
  const [savedMappings, setSavedMappings] = useState({});
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [importResult, setImportResult] = useState(null);
  const [errorReport, setErrorReport] = useState('');
  const [previewErrors, setPreviewErrors] = useState({});

  // Queries
  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.list('first_name', 500),
    ...DQ,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list('name', 200),
    ...DQ,
  });

  const { data: seriesClasses = [] } = useQuery({
    queryKey: ['seriesClasses'],
    queryFn: () =>
      selectedEvent?.series_id
        ? base44.entities.SeriesClass.filter({ series_id: selectedEvent.series_id })
        : Promise.resolve([]),
    enabled: !!selectedEvent?.series_id,
    ...DQ,
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    ...DQ,
  });

  if (!isOpen) return null;

  const handleFileSelect = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      setCSVText(text);
      const { headers, rows } = parseCSV(text);
      setCSVData({ headers, rows });
      const guessed = guessColumnMap(headers);
      setColumnMap(guessed);
      setStep(2);
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const getSourceColumn = (targetField) => {
    const idx = columnMap[targetField];
    return idx !== undefined && csvData ? csvData.headers[idx] : null;
  };

  const getRowValue = (row, targetField) => {
    const idx = columnMap[targetField];
    return idx !== undefined ? row[csvData.headers[idx]] || '' : '';
  };

  const validateRow = (row, rowIdx) => {
    const errors = [];
    const driverId = getRowValue(row, 'driver_id');
    const driverFirstName = getRowValue(row, 'driver_first_name');
    const driverLastName = getRowValue(row, 'driver_last_name');

    if (!driverId && (!driverFirstName || !driverLastName)) {
      errors.push('Driver ID or first+last name required');
    }

    const carNumber = getRowValue(row, 'car_number');
    if (!carNumber || !carNumber.trim()) {
      errors.push('Car number required');
    }

    const className = getRowValue(row, 'class_name');
    const seriesClassId = getRowValue(row, 'series_class_id');
    if (className && !seriesClassId && selectedEvent?.series_id) {
      const found = seriesClasses.find(
        (sc) =>
          sc.series_id === selectedEvent.series_id &&
          sc.class_name &&
          sc.class_name.toLowerCase() === className.toLowerCase()
      );
      if (!found) {
        errors.push(`Unknown class: "${className}"`);
      }
    }

    const transponderId = getRowValue(row, 'transponder_id');
    // Warn if duplicate within batch
    if (transponderId) {
      const count = csvData.rows.filter(
        (r, i) => i <= rowIdx && getRowValue(r, 'transponder_id') === transponderId
      ).length;
      if (count > 1) {
        errors.push(`Duplicate transponder in batch`);
      }
    }

    return errors;
  };

  const previewRows = csvData?.rows.slice(0, 50) || [];
  const previewWithErrors = previewRows.map((row, idx) => ({
    row,
    errors: validateRow(row, idx),
  }));

  const handleProceedToPreview = () => {
    const allErrors = {};
    csvData.rows.forEach((row, idx) => {
      const errors = validateRow(row, idx);
      if (errors.length > 0) {
        allErrors[idx] = errors;
      }
    });
    setPreviewErrors(allErrors);
    setStep(3);
  };

  const handleExecuteImport = async () => {
    if (!selectedEvent?.id) {
      toast.error('No event selected');
      return;
    }

    setStep(4);
    setImportProgress({ current: 0, total: csvData.rows.length });

    const results = {
      created: [],
      updated: [],
      skipped: [],
      errors: [],
    };

    for (let rowIdx = 0; rowIdx < csvData.rows.length; rowIdx++) {
      const row = csvData.rows[rowIdx];
      const errors = previewErrors[rowIdx] || [];

      if (errors.length > 0) {
        results.skipped.push({
          rowIdx,
          reason: errors.join('; '),
        });
        setImportProgress((p) => ({ ...p, current: p.current + 1 }));
        continue;
      }

      try {
        // Resolve driver
        let resolvedDriverId = getRowValue(row, 'driver_id');
        if (!resolvedDriverId) {
          const firstName = getRowValue(row, 'driver_first_name');
          const lastName = getRowValue(row, 'driver_last_name');
          const found = drivers.filter(
            (d) =>
              d.first_name?.toLowerCase() === firstName.toLowerCase() &&
              d.last_name?.toLowerCase() === lastName.toLowerCase()
          );
          if (found.length !== 1) {
            results.skipped.push({
              rowIdx,
              reason: found.length === 0 ? 'Driver not found' : 'Multiple drivers match',
            });
            setImportProgress((p) => ({ ...p, current: p.current + 1 }));
            continue;
          }
          resolvedDriverId = found[0].id;
        }

        // Resolve team
        let resolvedTeamId = getRowValue(row, 'team_id');
        if (!resolvedTeamId) {
          const teamName = getRowValue(row, 'team_name');
          if (teamName) {
            const found = teams.filter(
              (t) => t.name?.toLowerCase() === teamName.toLowerCase()
            );
            if (found.length === 1) {
              resolvedTeamId = found[0].id;
            }
          }
        }

        // Resolve series class
        let resolvedSeriesClassId = getRowValue(row, 'series_class_id');
        if (!resolvedSeriesClassId) {
          const className = getRowValue(row, 'class_name');
          if (className && selectedEvent?.series_id) {
            const found = seriesClasses.find(
              (sc) =>
                sc.series_id === selectedEvent.series_id &&
                sc.class_name?.toLowerCase() === className.toLowerCase()
            );
            if (found) {
              resolvedSeriesClassId = found.id;
            }
          }
        }

        // Check for existing entry
        const carNumber = getRowValue(row, 'car_number');
        const existing = existingEntries.find(
          (e) => e.event_id === selectedEvent.id && e.driver_id === resolvedDriverId
        );

        // Build entry payload
        const entryData = {
          event_id: selectedEvent.id,
          driver_id: resolvedDriverId,
        };

        if (selectedEvent.series_id) entryData.series_id = selectedEvent.series_id;
        if (resolvedSeriesClassId) entryData.series_class_id = resolvedSeriesClassId;
        if (resolvedTeamId) entryData.team_id = resolvedTeamId;
        if (carNumber) entryData.car_number = carNumber.trim().toUpperCase();

        const entryStatus = getRowValue(row, 'entry_status');
        if (entryStatus) entryData.entry_status = entryStatus;

        const paymentStatus = getRowValue(row, 'payment_status');
        if (paymentStatus) entryData.payment_status = paymentStatus;

        const notes = getRowValue(row, 'notes');
        const transponderId = getRowValue(row, 'transponder_id');

        let finalNotes = existing?.notes || '';
        if (transponderId) {
          const tech = {
            transponder: createTransponderState(transponderId, 'assigned', currentUser?.id),
          };
          finalNotes = writeTechToNotes(finalNotes, tech);
        }
        if (notes) {
          finalNotes = (finalNotes + ' ' + notes).trim();
        }
        if (finalNotes) entryData.notes = finalNotes;

        // Upsert
        if (existing) {
          await base44.entities.Entry.update(existing.id, entryData);
          results.updated.push(existing.id);
        } else {
          const created = await base44.entities.Entry.create(entryData);
          results.created.push(created.id);
        }
      } catch (err) {
        results.errors.push({
          rowIdx,
          message: err.message || 'Import failed',
        });
      }

      setImportProgress((p) => ({ ...p, current: p.current + 1 }));
    }

    // Log operation if available
    try {
      await base44.asServiceRole.entities.OperationLog.create({
        operation_type: 'entries_csv_import',
        source_type: 'RegistrationDashboard',
        entity_name: 'Entry',
        event_id: selectedEvent.id,
        status: results.errors.length === 0 ? 'success' : 'partial',
        message: `Imported ${results.created.length} new, ${results.updated.length} updated, ${results.skipped.length} skipped`,
        metadata: results,
      });
    } catch (_) {
      // OperationLog may not exist
    }

    // Build error report
    const reportLines = [];
    if (results.errors.length > 0) {
      reportLines.push('ERRORS:');
      results.errors.forEach((e) => {
        reportLines.push(`Row ${e.rowIdx + 1}: ${e.message}`);
      });
    }
    if (results.skipped.length > 0) {
      reportLines.push('SKIPPED:');
      results.skipped.forEach((s) => {
        reportLines.push(`Row ${s.rowIdx + 1}: ${s.reason}`);
      });
    }

    setImportResult(results);
    setErrorReport(reportLines.join('\n'));
    await invalidateAfterOperation('entry_updated', { eventId: selectedEvent.id });
    await invalidateAfterOperation('tech_updated', { eventId: selectedEvent.id });
    toast.success(`Import complete: ${results.created.length} created, ${results.updated.length} updated`);
  };

  const canProceed = {
    1: csvData && csvData.rows.length > 0,
    2: Object.keys(columnMap).length >= 2,
    3: true,
    4: false,
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#262626] border-gray-700 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Import Entries CSV</DialogTitle>
        </DialogHeader>

        {!selectedEvent && (
          <div className="bg-yellow-900/20 border border-yellow-800/50 rounded p-3">
            <p className="text-sm text-yellow-300">Select an event to import entries</p>
          </div>
        )}

        {selectedEvent && (
          <div className="space-y-6">
            {/* Step indicator */}
            <div className="flex gap-2 justify-center">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium ${
                    s === step
                      ? 'bg-blue-600 text-white'
                      : s < step
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  {s < step ? '✓' : s}
                </div>
              ))}
            </div>

            {/* Step 1: Upload */}
            {step === 1 && (
              <div className="space-y-4">
                <p className="text-sm text-gray-400">Upload a CSV file with entry data.</p>
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:bg-gray-800/30 cursor-pointer transition"
                >
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-300 mb-2">Drag and drop a CSV file</p>
                  <label>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleFileSelect(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                    />
                    <span className="text-xs text-blue-400 hover:underline">or click to browse</span>
                  </label>
                </div>
              </div>
            )}

            {/* Step 2: Column Mapping */}
            {step === 2 && csvData && (
              <div className="space-y-4">
                <p className="text-sm text-gray-400">
                  Map CSV columns to entry fields. Required: driver ID/name + car number.
                </p>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {['driver_id', 'driver_first_name', 'driver_last_name', 'car_number', 'transponder_id', 'class_name', 'series_class_id', 'team_name', 'team_id', 'entry_status', 'payment_status', 'notes'].map((target) => (
                    <div key={target}>
                      <label className="text-xs text-gray-400 block mb-1">{target}</label>
                      <Select
                        value={String(columnMap[target] || '')}
                        onValueChange={(val) => {
                          const newMap = { ...columnMap };
                          if (val === '') {
                            delete newMap[target];
                          } else {
                            newMap[target] = parseInt(val);
                          }
                          setColumnMap(newMap);
                        }}
                      >
                        <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white h-8 text-xs">
                          <SelectValue placeholder="— Skip —" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#262626] border-gray-700">
                          <SelectItem value={null}>— Skip —</SelectItem>
                          {csvData.headers.map((header, idx) => (
                            <SelectItem key={idx} value={String(idx)}>
                              {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Validation Preview */}
            {step === 3 && csvData && (
              <div className="space-y-4">
                <p className="text-sm text-gray-400">
                  Preview: Showing first {previewRows.length} of {csvData.rows.length} rows.
                </p>
                <div className="overflow-x-auto max-h-64 overflow-y-auto border border-gray-700 rounded">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-800/50 sticky top-0">
                      <tr>
                        <th className="px-2 py-1 text-left text-gray-400">#</th>
                        <th className="px-2 py-1 text-left text-gray-400">Driver</th>
                        <th className="px-2 py-1 text-left text-gray-400">Car #</th>
                        <th className="px-2 py-1 text-left text-gray-400">Xpndr</th>
                        <th className="px-2 py-1 text-left text-gray-400">Errors</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewWithErrors.map(({ row, errors }, idx) => (
                        <tr key={idx} className={errors.length > 0 ? 'bg-red-900/20' : ''}>
                          <td className="px-2 py-1 text-gray-500">{idx + 1}</td>
                          <td className="px-2 py-1 text-gray-300">
                            {getRowValue(row, 'driver_first_name')} {getRowValue(row, 'driver_last_name')}
                          </td>
                          <td className="px-2 py-1 text-gray-300">{getRowValue(row, 'car_number')}</td>
                          <td className="px-2 py-1 text-gray-300 text-xs">{getRowValue(row, 'transponder_id')}</td>
                          <td className="px-2 py-1">
                            {errors.length > 0 ? (
                              <Badge variant="outline" className="text-xs text-red-400 border-red-600">
                                {errors.length}
                              </Badge>
                            ) : (
                              <Check className="w-3 h-3 text-green-400" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {Object.keys(previewErrors).length > 0 && (
                  <div className="bg-red-900/20 border border-red-800/50 rounded p-3">
                    <p className="text-sm text-red-300">
                      {Object.keys(previewErrors).length} rows with validation errors will be skipped during import.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Progress & Results */}
            {step === 4 && (
              <div className="space-y-4">
                {importProgress.total > 0 && !importResult && (
                  <>
                    <p className="text-sm text-gray-400">
                      Importing: {importProgress.current} / {importProgress.total}
                    </p>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                      />
                    </div>
                  </>
                )}

                {importResult && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-green-900/20 border border-green-800/50 rounded p-3">
                        <p className="text-xs text-green-300">Created</p>
                        <p className="text-2xl font-bold text-green-400">{importResult.created.length}</p>
                      </div>
                      <div className="bg-blue-900/20 border border-blue-800/50 rounded p-3">
                        <p className="text-xs text-blue-300">Updated</p>
                        <p className="text-2xl font-bold text-blue-400">{importResult.updated.length}</p>
                      </div>
                      <div className="bg-yellow-900/20 border border-yellow-800/50 rounded p-3">
                        <p className="text-xs text-yellow-300">Skipped</p>
                        <p className="text-2xl font-bold text-yellow-400">{importResult.skipped.length}</p>
                      </div>
                      <div className="bg-red-900/20 border border-red-800/50 rounded p-3">
                        <p className="text-xs text-red-300">Errors</p>
                        <p className="text-2xl font-bold text-red-400">{importResult.errors.length}</p>
                      </div>
                    </div>

                    {errorReport && (
                      <div className="space-y-2">
                        <label className="text-xs text-gray-400">Error Report</label>
                        <Textarea
                          value={errorReport}
                          readOnly
                          className="bg-[#1A1A1A] border-gray-600 text-white font-mono text-xs h-32"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(errorReport);
                            toast.success('Copied to clipboard');
                          }}
                          className="w-full border-gray-700 text-gray-300"
                        >
                          Copy Report
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex gap-2 justify-between">
          <Button
            variant="outline"
            onClick={() => {
              if (step > 1) {
                setStep(step - 1);
              } else {
                onClose();
              }
            }}
            className="border-gray-700"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>

          {step < 4 && (
            <Button
              onClick={() => {
                if (step === 1) setStep(2);
                else if (step === 2) handleProceedToPreview();
                else if (step === 3) handleExecuteImport();
              }}
              disabled={!canProceed[step]}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {step === 1 ? 'Continue' : step === 2 ? 'Preview' : step === 3 ? 'Import' : 'Done'}
            </Button>
          )}

          {step === 4 && (
            <Button onClick={onClose} className="bg-green-600 hover:bg-green-700">
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}