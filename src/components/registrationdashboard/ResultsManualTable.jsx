/**
 * ResultsManualTable
 * Entry-driven: rows are seeded from Entry records for the selected session's class.
 * Extra fields (total_time_ms, penalties, bonus_flags) are stored in Results.notes as JSON.
 */
import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { AlertCircle, Save, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_OPTIONS = ['Running', 'DNF', 'DNS', 'DSQ', 'DNP'];

// ── Notes helpers ──────────────────────────────────────────────
function parseNotesExtras(notes) {
  if (!notes) return { total_time_ms: '', penalties: '', bonus_flags: '', base: '' };
  try {
    const obj = JSON.parse(notes);
    if (obj && typeof obj === 'object' && obj.__extras) {
      return {
        total_time_ms: obj.__extras.total_time_ms || '',
        penalties: obj.__extras.penalties || '',
        bonus_flags: obj.__extras.bonus_flags || '',
        base: obj.note || '',
      };
    }
  } catch {}
  return { total_time_ms: '', penalties: '', bonus_flags: '', base: notes };
}

function buildNotes(base, total_time_ms, penalties, bonus_flags) {
  if (!total_time_ms && !penalties && !bonus_flags) return base || undefined;
  return JSON.stringify({ note: base || '', __extras: { total_time_ms, penalties, bonus_flags } });
}

// ── Build a blank result row from an Entry ────────────────────
function rowFromEntry(entry, existingResult) {
  const extras = parseNotesExtras(existingResult?.notes);
  return {
    _entryId: entry.id,
    id: existingResult?.id || null,
    event_id: entry.event_id,
    session_id: existingResult?.session_id || '',
    series_class_id: entry.series_class_id || existingResult?.series_class_id || '',
    driver_id: entry.driver_id,
    program_id: existingResult?.program_id || entry.program_id || '',
    team_id: entry.team_id || existingResult?.team_id || '',
    car_number: entry.car_number || '',
    transponder_id: entry.transponder_id || '',
    position: existingResult?.position ?? '',
    status: existingResult?.status || 'Running',
    laps_completed: existingResult?.laps_completed ?? '',
    best_lap_time_ms: existingResult?.best_lap_time_ms ?? '',
    total_time_ms: extras.total_time_ms,
    penalties: extras.penalties,
    bonus_flags: extras.bonus_flags,
    points: existingResult?.points ?? '',
    notes: extras.base,
  };
}

export default function ResultsManualTable({
  session,
  results,
  entries,        // Entry[] for the selected class/event (already filtered, no Withdrawn)
  drivers,
  selectedEvent,
  locked,
  onSave,
  saving,
  rowErrors,      // { [entryId]: string[] } — inline errors from parent
}) {
  const [rows, setRows] = useState([]);
  const [dirty, setDirty] = useState(false);

  // ── Seed rows from entries whenever session/entries/results change ──
  useEffect(() => {
    if (!session) { setRows([]); setDirty(false); return; }

    // Build a map from driver_id → existing result for this session
    const resultsByDriver = {};
    (results || []).forEach((r) => {
      if (r.session_id === session.id) resultsByDriver[r.driver_id] = r;
    });

    const seeded = (entries || []).map((entry) =>
      rowFromEntry(entry, resultsByDriver[entry.driver_id] || null)
    );

    // Assign session_id to each row
    setRows(seeded.map((r) => ({ ...r, session_id: session.id })));
    setDirty(false);
  }, [session?.id, entries, results]);

  const driversMap = useMemo(() => Object.fromEntries(drivers.map((d) => [d.id, d])), [drivers]);

  // ── Inline validation (positions unique among Running rows) ──
  const localErrors = useMemo(() => {
    const errs = {};
    const usedPositions = new Set();
    rows.forEach((row) => {
      const rowErrs = [];
      if (row.status === 'Running' && row.position !== '') {
        const pos = parseInt(row.position);
        if (isNaN(pos) || pos < 1) {
          rowErrs.push('Invalid position');
        } else if (usedPositions.has(pos)) {
          rowErrs.push('Duplicate position');
        } else {
          usedPositions.add(pos);
        }
      }
      if (rowErrs.length) errs[row._entryId] = rowErrs;
    });
    return errs;
  }, [rows]);

  const allErrors = useMemo(() => {
    const merged = { ...localErrors };
    if (rowErrors) {
      Object.entries(rowErrors).forEach(([k, v]) => {
        merged[k] = [...(merged[k] || []), ...v];
      });
    }
    return merged;
  }, [localErrors, rowErrors]);

  const hasErrors = Object.keys(allErrors).length > 0;

  const updateRow = (entryId, field, value) => {
    setRows((prev) => prev.map((r) => r._entryId === entryId ? { ...r, [field]: value } : r));
    setDirty(true);
  };

  const handleSave = () => {
    if (hasErrors) { toast.error('Fix validation errors before saving'); return; }
    const serialized = rows.map((r) => ({
      ...r,
      notes: buildNotes(r.notes, r.total_time_ms, r.penalties, r.bonus_flags),
    }));
    onSave(serialized);
    setDirty(false);
  };

  if (!session) {
    return <p className="text-gray-500 text-sm py-4 text-center">Select a session to enter results.</p>;
  }

  if ((entries || []).length === 0) {
    return (
      <div className="bg-[#171717] border border-gray-800 rounded-lg p-8 text-center">
        <p className="text-gray-400 text-sm mb-1">No entries found for this class.</p>
        <p className="text-gray-500 text-xs">Add entries in the Check-In or Entries tab first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {hasErrors && (
        <div className="bg-red-950/30 border border-red-800/50 rounded-lg p-3 text-xs text-red-300 space-y-0.5">
          <div className="flex items-center gap-1 font-semibold mb-1"><AlertCircle className="w-3 h-3" /> Validation issues</div>
          {Object.values(allErrors).flat().slice(0, 6).map((e, i) => <div key={i}>• {e}</div>)}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-gray-800">
        <table className="w-full text-xs min-w-[980px]">
          <thead className="bg-gray-900/60 border-b border-gray-800">
            <tr>
              <th className="px-2 py-2 text-left text-gray-400 w-10">Pos</th>
              <th className="px-2 py-2 text-left text-gray-400">Driver</th>
              <th className="px-2 py-2 text-left text-gray-400 w-14">Car #</th>
              <th className="px-2 py-2 text-left text-gray-400 w-24">Status</th>
              <th className="px-2 py-2 text-left text-gray-400 w-14">Laps</th>
              <th className="px-2 py-2 text-left text-gray-400 w-24">Best Lap (ms)</th>
              <th className="px-2 py-2 text-left text-gray-400 w-24">Total Time (ms)</th>
              <th className="px-2 py-2 text-left text-gray-400 w-20">Penalties</th>
              <th className="px-2 py-2 text-left text-gray-400 w-24">Bonus Flags</th>
              <th className="px-2 py-2 text-left text-gray-400 w-14">Points</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const driver = driversMap[row.driver_id];
              const rowErrs = allErrors[row._entryId] || [];
              const hasRowError = rowErrs.length > 0;
              return (
                <tr key={row._entryId} className={`border-b border-gray-800 transition-colors ${hasRowError ? 'bg-red-950/10' : 'hover:bg-gray-800/20'}`}>
                  <td className="px-2 py-1.5">
                    {locked
                      ? <span className="text-white font-mono">{row.position || '—'}</span>
                      : <Input value={row.position} onChange={(e) => updateRow(row._entryId, 'position', e.target.value)} className="bg-[#111] border-gray-700 text-white h-7 w-12 text-xs font-mono" placeholder="1" />
                    }
                  </td>
                  <td className="px-2 py-1.5 min-w-[140px]">
                    <span className="text-white">{driver ? `${driver.first_name} ${driver.last_name}` : row.driver_id || '—'}</span>
                    {!row.program_id && <span className="text-amber-400 text-xs block">No program</span>}
                    {rowErrs.map((e, i) => <span key={i} className="text-red-400 text-xs block">{e}</span>)}
                  </td>
                  <td className="px-2 py-1.5"><span className="text-gray-300 font-mono">{row.car_number || '—'}</span></td>
                  <td className="px-2 py-1.5">
                    {locked
                      ? <Badge className="text-xs">{row.status}</Badge>
                      : (
                        <Select value={row.status} onValueChange={(v) => updateRow(row._entryId, 'status', v)}>
                          <SelectTrigger className="bg-[#111] border-gray-700 text-white h-7 text-xs w-24"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-[#262626] border-gray-700">{STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                        </Select>
                      )
                    }
                  </td>
                  {['laps_completed', 'best_lap_time_ms', 'total_time_ms', 'penalties', 'bonus_flags', 'points'].map((field) => (
                    <td key={field} className="px-2 py-1.5">
                      {locked
                        ? <span className="text-gray-300">{row[field] || '—'}</span>
                        : <Input value={row[field]} onChange={(e) => updateRow(row._entryId, field, e.target.value)} className="bg-[#111] border-gray-700 text-white h-7 text-xs font-mono" />
                      }
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!locked && (
        <div className="flex items-center justify-end gap-2">
          <span className="text-xs text-gray-500">{rows.length} entries</span>
          <Button size="sm" onClick={handleSave} disabled={saving || hasErrors || !dirty} className="bg-blue-600 hover:bg-blue-700">
            <Save className="w-4 h-4 mr-1" />{saving ? 'Saving…' : `Save Draft (${rows.length})`}
          </Button>
        </div>
      )}
    </div>
  );
}