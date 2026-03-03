import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_OPTIONS = ['Running', 'DNF', 'DNS', 'DSQ', 'DNP'];

function newLocalRow(eventId, sessionId, seriesClassId) {
  return {
    _localId: `local_${Date.now()}_${Math.random()}`,
    id: null,
    event_id: eventId,
    session_id: sessionId,
    series_class_id: seriesClassId || '',
    driver_id: '',
    program_id: '',
    team_id: '',
    series_id: '',
    position: '',
    status: 'Running',
    laps_completed: '',
    best_lap_time_ms: '',
    total_time_ms: '',
    penalties: '',
    bonus_flags: '',
    points: '',
    notes: '',
  };
}

function rowKey(row) {
  return row.id || row._localId;
}

export default function ResultsEditorTable({
  session,
  results,
  drivers,
  driverPrograms,
  seriesClasses,
  selectedEvent,
  locked,
  onSave,
  saving,
}) {
  const [rows, setRows] = useState([]);
  const [dirty, setDirty] = useState(false);

  // Sync rows from results prop
  useEffect(() => {
    const mapped = (results || []).map((r) => ({
      _localId: r.id,
      id: r.id,
      event_id: r.event_id,
      session_id: r.session_id,
      series_class_id: r.series_class_id || '',
      driver_id: r.driver_id || '',
      program_id: r.program_id || '',
      team_id: r.team_id || '',
      series_id: r.series_id || '',
      position: r.position ?? '',
      status: r.status || 'Running',
      laps_completed: r.laps_completed ?? '',
      best_lap_time_ms: r.best_lap_time_ms ?? '',
      total_time_ms: r.total_time_ms ?? '',
      penalties: '',
      bonus_flags: '',
      points: r.points ?? '',
      notes: r.notes || '',
    }));
    setRows(mapped);
    setDirty(false);
  }, [results]);

  const driversMap = useMemo(() => Object.fromEntries(drivers.map((d) => [d.id, d])), [drivers]);

  // Validation
  const errors = useMemo(() => {
    const errs = {};
    const usedDrivers = new Set();
    const usedPositions = new Set();
    rows.forEach((row) => {
      const key = rowKey(row);
      const rowErrs = [];
      if (!row.driver_id) rowErrs.push('Driver required');
      if (row.driver_id && usedDrivers.has(row.driver_id)) rowErrs.push('Duplicate driver');
      if (row.driver_id) usedDrivers.add(row.driver_id);
      if (row.position !== '' && row.status === 'Running') {
        const pos = parseInt(row.position);
        if (isNaN(pos) || pos < 1) {
          rowErrs.push('Position must be a positive integer');
        } else if (usedPositions.has(pos)) {
          rowErrs.push('Duplicate position');
        } else {
          usedPositions.add(pos);
        }
      }
      if (rowErrs.length) errs[key] = rowErrs;
    });
    return errs;
  }, [rows]);

  const hasErrors = Object.keys(errors).length > 0;

  const updateRow = (key, field, value) => {
    setRows((prev) =>
      prev.map((r) => {
        if (rowKey(r) !== key) return r;
        const updated = { ...r, [field]: value };
        // Auto-link program_id when driver changes
        if (field === 'driver_id' && value && selectedEvent) {
          const prog = driverPrograms.find(
            (dp) => dp.driver_id === value && dp.event_id === selectedEvent.id
          );
          updated.program_id = prog?.id || '';
        }
        return updated;
      })
    );
    setDirty(true);
  };

  const addRow = () => {
    const row = newLocalRow(selectedEvent?.id, session?.id, session?.series_class_id);
    setRows((prev) => [...prev, row]);
    setDirty(true);
  };

  const removeRow = (key) => {
    setRows((prev) => prev.filter((r) => rowKey(r) !== key));
    setDirty(true);
  };

  const handleSave = () => {
    if (hasErrors) {
      toast.error('Fix validation errors before saving');
      return;
    }
    onSave(rows);
    setDirty(false);
  };

  const driverOptions = useMemo(() => {
    return drivers
      .slice()
      .sort((a, b) => `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`));
  }, [drivers]);

  return (
    <div className="space-y-3">
      {/* Errors summary */}
      {hasErrors && (
        <div className="bg-red-950/30 border border-red-800/50 rounded-lg p-3 text-xs text-red-300 space-y-0.5">
          <div className="flex items-center gap-1 font-semibold mb-1"><AlertCircle className="w-3 h-3" /> Validation issues</div>
          {Object.values(errors).flat().slice(0, 5).map((e, i) => <div key={i}>• {e}</div>)}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-800">
        <table className="w-full text-xs min-w-[900px]">
          <thead className="bg-gray-900/60 border-b border-gray-800">
            <tr>
              <th className="px-2 py-2 text-left text-gray-400">Pos</th>
              <th className="px-2 py-2 text-left text-gray-400">Driver</th>
              <th className="px-2 py-2 text-left text-gray-400">Car #</th>
              <th className="px-2 py-2 text-left text-gray-400">Status</th>
              <th className="px-2 py-2 text-left text-gray-400">Laps</th>
              <th className="px-2 py-2 text-left text-gray-400">Best Lap (ms)</th>
              <th className="px-2 py-2 text-left text-gray-400">Total Time (ms)</th>
              <th className="px-2 py-2 text-left text-gray-400">Points</th>
              <th className="px-2 py-2 text-left text-gray-400">Notes</th>
              {!locked && <th className="px-2 py-2 w-8"></th>}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-gray-500">
                  No results yet. {!locked && 'Click Add Row to start.'}
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const key = rowKey(row);
                const rowErrors = errors[key] || [];
                const driver = driversMap[row.driver_id];
                const hasProgramWarning = row.driver_id && !row.program_id;
                return (
                  <tr key={key} className={`border-b border-gray-800 ${rowErrors.length ? 'bg-red-950/10' : 'hover:bg-gray-800/20'}`}>
                    <td className="px-2 py-1.5">
                      {locked ? (
                        <span className="text-white font-mono">{row.position || '—'}</span>
                      ) : (
                        <Input
                          value={row.position}
                          onChange={(e) => updateRow(key, 'position', e.target.value)}
                          className="bg-[#111] border-gray-700 text-white h-7 w-14 text-xs font-mono"
                          placeholder="1"
                        />
                      )}
                    </td>
                    <td className="px-2 py-1.5 min-w-[160px]">
                      {locked ? (
                        <span className="text-white">{driver ? `${driver.first_name} ${driver.last_name}` : row.driver_id || '—'}</span>
                      ) : (
                        <div>
                          <Select value={row.driver_id} onValueChange={(v) => updateRow(key, 'driver_id', v)}>
                            <SelectTrigger className="bg-[#111] border-gray-700 text-white h-7 text-xs">
                              <SelectValue placeholder="Select driver…" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#262626] border-gray-700 max-h-56">
                              {driverOptions.map((d) => (
                                <SelectItem key={d.id} value={d.id} className="text-xs">
                                  {d.first_name} {d.last_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {hasProgramWarning && (
                            <p className="text-amber-400 text-xs mt-0.5">No program for this event</p>
                          )}
                          {rowErrors.length > 0 && rowErrors.map((e, i) => (
                            <p key={i} className="text-red-400 text-xs mt-0.5">{e}</p>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      <span className="text-gray-300 font-mono">{driver?.primary_number || '—'}</span>
                    </td>
                    <td className="px-2 py-1.5">
                      {locked ? (
                        <Badge className="text-xs">{row.status}</Badge>
                      ) : (
                        <Select value={row.status} onValueChange={(v) => updateRow(key, 'status', v)}>
                          <SelectTrigger className="bg-[#111] border-gray-700 text-white h-7 text-xs w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#262626] border-gray-700">
                            {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      {locked ? (
                        <span className="text-gray-300">{row.laps_completed || '—'}</span>
                      ) : (
                        <Input value={row.laps_completed} onChange={(e) => updateRow(key, 'laps_completed', e.target.value)} className="bg-[#111] border-gray-700 text-white h-7 w-16 text-xs font-mono" placeholder="0" />
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      {locked ? (
                        <span className="text-gray-300">{row.best_lap_time_ms || '—'}</span>
                      ) : (
                        <Input value={row.best_lap_time_ms} onChange={(e) => updateRow(key, 'best_lap_time_ms', e.target.value)} className="bg-[#111] border-gray-700 text-white h-7 w-24 text-xs font-mono" placeholder="ms" />
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      {locked ? (
                        <span className="text-gray-300">{row.total_time_ms || '—'}</span>
                      ) : (
                        <Input value={row.total_time_ms} onChange={(e) => updateRow(key, 'total_time_ms', e.target.value)} className="bg-[#111] border-gray-700 text-white h-7 w-24 text-xs font-mono" placeholder="ms" />
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      {locked ? (
                        <span className="text-gray-300">{row.points || '—'}</span>
                      ) : (
                        <Input value={row.points} onChange={(e) => updateRow(key, 'points', e.target.value)} className="bg-[#111] border-gray-700 text-white h-7 w-16 text-xs font-mono" placeholder="0" />
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      {locked ? (
                        <span className="text-gray-400 truncate max-w-[100px] block">{row.notes || '—'}</span>
                      ) : (
                        <Input value={row.notes} onChange={(e) => updateRow(key, 'notes', e.target.value)} className="bg-[#111] border-gray-700 text-white h-7 text-xs" placeholder="Notes…" />
                      )}
                    </td>
                    {!locked && (
                      <td className="px-2 py-1.5">
                        <Button size="sm" variant="ghost" onClick={() => removeRow(key)} className="text-gray-500 hover:text-red-400 h-7 w-7 p-0">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer actions */}
      {!locked && (
        <div className="flex items-center justify-between">
          <Button size="sm" variant="outline" onClick={addRow} className="border-gray-700 text-gray-300 hover:bg-gray-800">
            <Plus className="w-4 h-4 mr-1" /> Add Row
          </Button>
          {dirty && (
            <Button size="sm" onClick={handleSave} disabled={saving || hasErrors} className="bg-blue-600 hover:bg-blue-700">
              {saving ? 'Saving…' : `Save Draft (${rows.length} rows)`}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}