import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Zap, ClipboardPaste, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// ── Constants matching Session entity enum ─────────────────────────────────
const SESSION_TYPE_KEYWORDS = [
  { type: 'Practice',   label: 'PRACTICE',   words: ['practice', 'prac', 'warm up', 'warmup'] },
  { type: 'Qualifying', label: 'QUALIFYING', words: ['qualifying', 'qual', 'quals', 'time trials', 'tt'] },
  { type: 'Heat',       label: 'HEAT',       words: ['heat', 'heats'] },
  { type: 'LCQ',        label: 'LCQ',         words: ['lcq', 'last chance', 'b main', 'consolation'] },
  { type: 'Feature',    label: 'FEATURE',    words: ['feature', 'race', 'main', 'a main', 'final'] },
  { type: 'Other',      label: 'OTHER',      words: ['opening ceremonies', 'ceremonies', 'drivers meeting', 'meeting', 'tech', 'check-in', 'check in', 'checkin', 'pit party', 'escort', 'thunder'] },
];

const DAY_HEADERS = ['FRIDAY', 'SATURDAY', 'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY'];

// Normalize a class name string for fuzzy matching against SeriesClass records.
function normalizeClassName(name) {
  return String(name || '')
    .toUpperCase()
    .trim()
    .replace(/[\s\-_/]+/g, ' ')
    .replace(/\bAMSOIL\b/g, '')
    .replace(/\bPRO\b/g, 'PRO')
    .replace(/\s+/g, ' ')
    .trim();
}

// Parse a single time like "9:00 AM", "9:00 AM - 11:30 AM", "10:30 AM", "1:00 PM"
// Returns the start time in "HH:MM" (24h) plus an optional duration in minutes.
function parseTimeToken(token) {
  const t = token.trim();
  // Range form: "9:00 AM - 11:30 AM"
  const rangeMatch = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?\s*[-–to]+\s*(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (rangeMatch) {
    let [, sh, sm, sap, eh, em, eap] = rangeMatch;
    const start = to24h(sh, sm, sap);
    const end = to24h(eh, em, eap || sap);
    let duration = (end.hours * 60 + end.minutes) - (start.hours * 60 + start.minutes);
    if (duration < 0) duration += 24 * 60;
    return { hh: start.hours, mm: start.minutes, duration };
  }
  // Single form: "10:30 AM" or "10:30"
  const singleMatch = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (singleMatch) {
    let [, h, m, ap] = singleMatch;
    const v = to24h(h, m, ap);
    return { hh: v.hours, mm: v.minutes, duration: null };
  }
  return null;
}

function to24h(h, m, ap) {
  let hours = parseInt(h, 10);
  const minutes = parseInt(m, 10);
  const ampm = (ap || '').toUpperCase();
  if (ampm === 'AM' && hours === 12) hours = 0;
  if (ampm === 'PM' && hours !== 12) hours += 12;
  // If no AM/PM, assume 24h already but clamp
  return { hours, minutes };
}

// Parse a full pasted block into structured rows { day, time, className, sessionType }
function parseSchedule(text) {
  const rows = [];
  if (!text || !text.trim()) return rows;
  let currentDay = '';

  // Split by lines
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    const upper = line.toUpperCase();

    // Day header detection (line is just a weekday, or starts with it)
    const dayMatch = DAY_HEADERS.find((d) => upper === d || upper.startsWith(d + ' ') || upper.startsWith(d + ':'));
    if (dayMatch && upper.replace(/[^A-Z]/g, '').length <= dayMatch.length + 2) {
      currentDay = dayMatch;
      continue;
    }

    // Try to find a leading time token
    // Formats: "9:00 AM - 3:00 PM: DRIVER/SPOTTER CHECK-IN"
    //          "11:30 AM: PRO BUGGY - PRACTICE"
    //          "10:30 AM: DRIVERS MEETING (ALL CLASSES)"
    //          "4:15 PM: PRO2 - RACE"
    const timeMatch = line.match(/^(\d{1,2}:\d{2}\s*(?:AM|PM)?\s*(?:[-–to]+\s*\d{1,2}:\d{2}\s*(?:AM|PM)?)?)\s*[:\-–]?\s*(.*)$/i);
    if (!timeMatch) continue;

    const timeToken = timeMatch[1];
    const rest = timeMatch[2];
    const parsed = parseTimeToken(timeToken);
    if (!parsed) continue;

    // Determine session type from the rest of the line
    const restUpper = rest.toUpperCase();
    let sessionType = null;
    for (const kw of SESSION_TYPE_KEYWORDS) {
      if (kw.words.some((w) => restUpper.includes(w.toUpperCase()))) {
        sessionType = kw.type;
        break;
      }
    }

    // Extract class name: remove the session type keyword suffix and separators
    let className = rest.trim();
    if (sessionType) {
      const matchedWord = SESSION_TYPE_KEYWORDS.find((k) => k.type === sessionType)
        .words.find((w) => className.toUpperCase().includes(w.toUpperCase()));
      if (matchedWord) {
        // strip everything from the matched keyword onward, including trailing separators
        const idx = className.toUpperCase().indexOf(matchedWord.toUpperCase());
        if (idx >= 0) className = className.slice(0, idx);
      }
    }
    className = className.replace(/^[\s\-–:,]+|[\s\-–:,]+$/g, '').trim();

    // Skip rows with no class (administrative items like "DRIVERS MEETING", "CHECK-IN", "PIT PARTY", "OPENING CEREMONIES")
    // unless we want to capture them as "Other" — we capture but mark them clearly.
    rows.push({
      day: currentDay || '',
      time: `${String(parsed.hh).padStart(2, '0')}:${String(parsed.mm).padStart(2, '0')}`,
      duration: parsed.duration,
      className,
      sessionType: sessionType || 'Other',
      raw: line,
    });
  }

  return rows;
}

export default function SchedulePasteImport({
  open,
  onOpenChange,
  eventId,
  seriesId,
  eventDays,
  eventClasses,
  seriesClasses,
  selectedEventDate,
  invalidateAfterOperation,
}) {
  const queryClient = useQueryClient();
  const [rawText, setRawText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [dayMapping, setDayMapping] = useState({}); // FRIDAY -> eventDayId

  // Pre-parse into rows
  const parsedRows = useMemo(() => parseSchedule(rawText), [rawText]);
  const detectedDays = useMemo(
    () => [...new Set(parsedRows.map((r) => r.day).filter(Boolean))],
    [parsedRows]
  );

  // Auto-map detected days to event days by weekday when possible.
  const { data: fetchedEventDays = [] } = useQuery({
    queryKey: ['eventDays', eventId],
    queryFn: () => base44.entities.EventDay.filter({ event_id: eventId }, 'sort_order', 50),
    enabled: !!eventId && !eventDays?.length,
  });
  const allEventDays = eventDays?.length ? eventDays : fetchedEventDays;

  useEffect(() => {
    if (!allEventDays.length || !detectedDays.length) return;
    setDayMapping((prev) => {
      const next = { ...prev };
      detectedDays.forEach((dayName) => {
        if (next[dayName]) return;
        // match by label containing the weekday, or by date weekday
        const match = allEventDays.find((d) => {
          const lbl = (d.label || '').toUpperCase();
          if (lbl.includes(dayName)) return true;
          if (d.date) {
            try {
              const wd = new Date(d.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
              return wd.startsWith(dayName);
            } catch {}
          }
          return false;
        });
        if (match) next[dayName] = match.id;
      });
      return next;
    });
  }, [allEventDays, detectedDays]);

  // ── Class verification model ────────────────────────────────────────────
  // Every pasted class name must be verified / mapped to an existing EventClass
  // BEFORE import. We do NOT auto-create EventClasses here — a paste is for
  // sessions only. Each resolved row surfaces a dropdown so the operator can
  // confirm the target class (e.g. "Amsoil Pro SxS" → existing "PRO SxS").
  //
  // `classAssignments` is the operator's explicit choice, keyed by normalized
  // class name → EventClass id (or '' to skip, '__auto' to defer to suggestion).
  const [classAssignments, setClassAssignments] = useState({});

  const resolution = useMemo(() => {
    const ecIndex = new Map(); // normalized -> EventClass
    (eventClasses || []).forEach((ec) => {
      ecIndex.set(normalizeClassName(ec.class_name), ec);
      if (ec.series_class_id) ecIndex.set(`sc:${ec.series_class_id}`, ec);
    });

    const byName = new Map();
    parsedRows.forEach((row) => {
      if (!row.className) return;
      const key = normalizeClassName(row.className);
      if (byName.has(key)) return;
      const exact = ecIndex.get(key);
      // Best-effort suggestion: verbatim name difference is suspicious even when
      // normalized match hits, so classify as 'suggested' instead of silent.
      let near = null;
      if (!exact) {
        for (const [norm, ec] of ecIndex.entries()) {
          if (typeof norm === 'string' && (key.includes(norm) || norm.includes(key))) { near = ec; break; }
        }
      }
      byName.set(key, {
        rawName: row.className,
        exactEC: exact || null,
        suggestedEC: exact ? null : near,
      });
    });
    return byName;
  }, [parsedRows, eventClasses]);

  // Effective target EventClass id for a normalized key:
  // user override > exact auto > suggested auto > none
  const targetFor = useCallback((key) => {
    const info = resolution.get(key);
    const override = classAssignments[key];
    if (override) return override === '__auto' ? (info?.exactEC?.id || info?.suggestedEC?.id || '') : override;
    return info?.exactEC?.id || info?.suggestedEC?.id || '';
  }, [resolution, classAssignments]);

  const unassignedCount = useMemo(() => {
    let n = 0;
    parsedRows.forEach((row) => {
      if (!row.className) return;
      if (!targetFor(normalizeClassName(row.className))) n += 1;
    });
    return n;
  }, [parsedRows, targetFor]);

  const verifyFlags = useMemo(() => {
    // Rows whose normalized match differs from the verbatim raw name → the
    // operator must consciously confirm the routing (these are the "Amsoil Pro
    // SxS" → "PRO SxS" cases).
    let n = 0;
    for (const [key, info] of resolution.entries()) {
      const target = info.exactEC || info.suggestedEC;
      if (target && normalizeClassName(target.class_name) === key && target.class_name !== info.rawName) n += 1;
    }
    return n;
  }, [resolution]);

  const unmappedDays = detectedDays.filter((d) => !dayMapping[d]);
  const allEventClasses = eventClasses || [];

  // Compute the base event date for days without a mapped EventDay (so we can still build scheduled_time).
  // selectedEventDate is YYYY-MM-DD. We map FRIDAY=+0, SATURDAY=+1, SUNDAY=+2 relative to the start.
  const dayOffsets = { FRIDAY: 0, SATURDAY: 1, SUNDAY: 2, THURSDAY: -1, MONDAY: 3, TUESDAY: 4, WEDNESDAY: 5 };
  function dateForDay(dayName) {
    const dayId = dayMapping[dayName];
    if (dayId) {
      const ed = allEventDays.find((d) => d.id === dayId);
      if (ed?.date) return ed.date;
    }
    if (!selectedEventDate) return null;
    const off = dayOffsets[dayName];
    if (off == null) return null;
    const base = new Date(selectedEventDate + 'T12:00:00');
    base.setDate(base.getDate() + off);
    return base.toISOString().slice(0, 10);
  }

  async function handleImport() {
    if (submitting) return;
    if (unmappedDays.length > 0) {
      toast.error(`Map days first: ${unmappedDays.join(', ')}`);
      return;
    }
    if (parsedRows.length === 0) {
      toast.error('No rows detected. Check the pasted format.');
      return;
    }
    if (unassignedCount > 0) {
      toast.error(`Assign a class to every session (${unassignedCount} unassigned).`);
      return;
    }

    setSubmitting(true);
    try {
      // Sessions only — no EventClasses are created during paste import.
      const sessionPayloads = [];
      parsedRows.forEach((row, idx) => {
        if (!row.className) return;
        const norm = normalizeClassName(row.className);
        const eventClassId = targetFor(norm);
        if (!eventClassId) return; // unresolved after verification

        const dateStr = dateForDay(row.day);
        const scheduled_time = dateStr ? `${dateStr}T${row.time}:00` : undefined;
        const isFinal = row.sessionType === 'Feature';
        sessionPayloads.push({
          event_id: eventId,
          event_class_id: eventClassId,
          event_day_id: dayMapping[row.day] || undefined,
          session_type: row.sessionType,
          name: `${row.className} ${row.sessionType}`,
          scheduled_time,
          duration_minutes: row.duration || undefined,
          run_order: idx,
          input_source: 'Manual',
          status: 'Draft',
          points_enabled: isFinal,
          points_type: isFinal ? 'final' : 'none',
        });
      });

      let createdSessions = [];
      if (sessionPayloads.length) {
        createdSessions = await base44.entities.Session.bulkCreate(sessionPayloads);
      }

      await invalidateAfterOperation('session_created', { eventId });
      toast.success(`Imported ${createdSessions?.length || 0} sessions.`);
      setRawText('');
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error(err?.message || 'Import failed');
    } finally {
      setSubmitting(false);
    }
  }

  // Stats for display
  const stats = useMemo(() => ({
    total: parsedRows.length,
    sessions: parsedRows.filter((r) => r.className).length,
    unresolved: unassignedCount,
    verifyFlags,
    mappedDays: detectedDays.length - unmappedDays.length,
    detectedDays: detectedDays.length,
  }), [parsedRows, unassignedCount, verifyFlags, detectedDays, unmappedDays]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#171717] border-gray-800 max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <ClipboardPaste className="w-4 h-4 text-teal-400" />
            Paste Schedule → Sessions
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Instructions */}
          <div className="text-xs text-gray-500 bg-[#0d0d0d] border border-gray-800 rounded-lg p-3">
            Paste the race-day schedule below. The parser detects <span className="text-teal-400">Time</span>,{' '}
            <span className="text-teal-400">Class</span>, <span className="text-teal-400">Session Type</span>, and the{' '}
            <span className="text-teal-400">Day</span> group headers (FRIDAY/SATURDAY/SUNDAY). Rows like drivers
            meetings, check-in, opening ceremonies, and pit parties are captured as <Badge className="text-[9px] bg-gray-700/40 text-gray-300">OTHER</Badge> sessions.
          </div>

          {/* Textarea */}
          <Textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={`FRIDAY\n11:30 AM: PRO BUGGY - PRACTICE\n11:40 AM: PRO SPEC - PRACTICE\n...\nSATURDAY\n4:15 PM: PRO2 - RACE\n...`}
            className="bg-[#0d0d0d] border-gray-700 text-white font-mono text-xs min-h-[200px]"
          />

          {/* Stats strip */}
          {stats.total > 0 && (
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <Badge className="bg-teal-900/30 text-teal-300 border-teal-700/40">
                {stats.sessions} sessions
              </Badge>
              {stats.verifyFlags > 0 && (
                <Badge className="bg-amber-900/30 text-amber-300 border-amber-700/40 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {stats.verifyFlags} need verify
                </Badge>
              )}
              {stats.unresolved > 0 && (
                <Badge className="bg-red-900/30 text-red-300 border-red-700/40 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {stats.unresolved} unassigned
                </Badge>
              )}
              <Badge className="bg-gray-700/40 text-gray-300">
                {stats.mappedDays}/{stats.detectedDays} days mapped
              </Badge>
            </div>
          )}

          {/* Day mapping */}
          {detectedDays.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs text-gray-400 uppercase tracking-wider">Map Days → Event Days</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {detectedDays.map((dayName) => {
                  const ed = dayMapping[dayName] ? allEventDays.find((d) => d.id === dayMapping[dayName]) : null;
                  const fallbackDate = dateForDay(dayName);
                  return (
                    <div key={dayName} className="flex items-center gap-2 p-2 rounded border border-gray-800 bg-[#0d0d0d]">
                      <span className="text-xs font-mono text-gray-300 w-20 shrink-0">{dayName}</span>
                      <Select
                        value={dayMapping[dayName] || '__none'}
                        onValueChange={(v) => setDayMapping((p) => ({ ...p, [dayName]: v === '__none' ? '' : v }))}
                      >
                        <SelectTrigger className="bg-[#1A1A1A] border-gray-700 text-white text-xs h-8 flex-1">
                          <SelectValue placeholder={ed ? `${ed.label} — ${ed.date}` : fallbackDate ? `(auto) ${fallbackDate}` : 'No date'} />
                        </SelectTrigger>
                        <SelectContent className="bg-[#262626] border-gray-700">
                          <SelectItem value="__none">
                            {fallbackDate ? `Auto (${fallbackDate})` : 'Unmapped'}
                          </SelectItem>
                          {allEventDays.map((d) => (
                            <SelectItem key={d.id} value={d.id}>{d.label} — {d.date}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
              {allEventDays.length === 0 && (
                <p className="text-[10px] text-gray-600">
                  No Event Days exist yet. Sessions will use auto-derived dates from the event start date.
                </p>
              )}
            </div>
          )}

          {/* Preview table */}
          {parsedRows.length > 0 && (
            <div className="border border-gray-800 rounded-lg overflow-hidden">
              <div className="max-h-[240px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-[#0d0d0d] border-b border-gray-800">
                    <tr className="text-gray-500 uppercase text-[9px] tracking-wider">
                      <th className="text-left px-2 py-1.5">Day</th>
                      <th className="text-left px-2 py-1.5">Time</th>
                      <th className="text-left px-2 py-1.5">Class</th>
                      <th className="text-left px-2 py-1.5">Type</th>
                      <th className="text-left px-2 py-1.5">Attach To (verify)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.slice(0, 60).map((row, i) => {
                      const key = normalizeClassName(row.className);
                      const info = row.className ? resolution.get(key) : null;
                      const isVerify = !!(info && (info.exactEC || info.suggestedEC) && (info.exactEC || info.suggestedEC).class_name !== info.rawName);
                      const targetId = row.className ? targetFor(key) : '';
                      return (
                        <tr key={i} className="border-b border-gray-900/60 hover:bg-gray-900/30">
                          <td className="px-2 py-1.5 font-mono text-gray-500">{row.day || '—'}</td>
                          <td className="px-2 py-1.5 font-mono text-gray-300">{row.time}</td>
                          <td className="px-2 py-1.5 text-gray-200">{row.className || <span className="text-gray-600 italic">admin item</span>}</td>
                          <td className="px-2 py-1.5">
                            <Badge className="text-[9px] bg-purple-900/30 text-purple-300 border-purple-700/40">{row.sessionType}</Badge>
                          </td>
                          <td className="px-2 py-1.5">
                            {!row.className && <span className="text-gray-600 text-[9px]">—</span>}
                            {row.className && (
                              <div className="flex items-center gap-1.5">
                                {isVerify && <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
                                <Select
                                  value={targetId || '__none'}
                                  onValueChange={(v) => v === '__none'
                                    ? setClassAssignments((p) => ({ ...p, [key]: '' }))
                                    : setClassAssignments((p) => ({ ...p, [key]: v }))}
                                >
                                  <SelectTrigger className={`h-7 text-[10px] w-[200px] ${!targetId ? 'border-red-700/60 text-red-300' : isVerify ? 'border-amber-700/60 text-amber-200' : 'border-emerald-700/60 text-emerald-200'} bg-[#1A1A1A]`}>
                                    <SelectValue placeholder="Assign a class…" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-[#262626] border-gray-700 max-h-60">
                                    <SelectItem value="__none" className="text-gray-400">Unassigned</SelectItem>
                                    {allEventClasses.map((ec) => (
                                      <SelectItem key={ec.id} value={ec.id} className="text-white">{ec.class_name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {targetId && info?.exactEC?.id === targetId && !isVerify && (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {parsedRows.length > 60 && (
                <div className="px-2 py-1.5 text-[10px] text-gray-600 bg-[#0d0d0d] border-t border-gray-800">
                  Showing first 60 of {parsedRows.length} rows
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-gray-800 pt-3 flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end">
          {stats.verifyFlags > 0 && (
            <div className="flex items-center gap-2 text-xs text-amber-300 bg-amber-950/40 border border-amber-800/40 rounded-md px-3 py-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              {stats.verifyFlags} class mapping{stats.verifyFlags === 1 ? '' : 's'} differ from the stored name — confirm each dropdown.
            </div>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-gray-700 text-gray-300">
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={submitting || parsedRows.length === 0 || unassignedCount > 0}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            {submitting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Zap className="w-4 h-4 mr-1" />}
            Import {stats.sessions} Sessions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}