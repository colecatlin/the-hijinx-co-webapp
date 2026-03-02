/**
 * AnnouncerPackManager.jsx
 * Generates announcer-friendly exports and printable views for a selected event.
 */
import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Copy,
  Download,
  FileText,
  RefreshCw,
  ExternalLink,
  Users,
  Trophy,
  Clock,
  CheckSquare,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── helpers ────────────────────────────────────────────────────────────────

const SESSION_TYPE_ORDER = ['Practice', 'Qualifying', 'Heat', 'LCQ', 'Final'];

function sortSessions(sessions) {
  return [...sessions].sort((a, b) => {
    const ai = SESSION_TYPE_ORDER.indexOf(a.session_type);
    const bi = SESSION_TYPE_ORDER.indexOf(b.session_type);
    if (ai !== bi) return ai - bi;
    if ((a.session_number ?? 0) !== (b.session_number ?? 0))
      return (a.session_number ?? 0) - (b.session_number ?? 0);
    if (a.scheduled_time && b.scheduled_time)
      return new Date(a.scheduled_time) - new Date(b.scheduled_time);
    return 0;
  });
}

function fmtDate(d) {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' }); }
  catch { return d; }
}

function fmtTime(dt) {
  if (!dt) return '';
  try { return new Date(dt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
}

function driverFullName(d) {
  if (!d) return 'Unknown Driver';
  return [d.first_name, d.last_name].filter(Boolean).join(' ') || 'Unknown Driver';
}

function driverHometown(d) {
  if (!d) return '';
  return [d.hometown_city, d.hometown_state].filter(Boolean).join(', ');
}

function pad(str, len = 4) {
  return String(str ?? '').padEnd(len);
}

// Normalize entry rows to a common shape from either Entry or DriverProgram
function normalizeEntryRows(records, source) {
  return records.map((r) => ({
    id: r.id,
    driver_id: r.driver_id,
    team_id: r.team_id || null,
    series_class_id: r.series_class_id || null,
    class_name: r.class_name || null,
    car_number: r.car_number || r.primary_number || null,
    transponder_id: r.transponder_id || null,
    entry_status: r.entry_status || r.status || null,
    _source: source,
  }));
}

const FORMAT_OPTIONS = [
  { value: 'full', label: 'Full Announcer Pack' },
  { value: 'quick', label: 'Quick Brief' },
  { value: 'start_lists', label: 'Start Lists Only' },
  { value: 'rundown', label: 'Session Rundown Only' },
  { value: 'results_recap', label: 'Results Recap Only' },
];

// ─── Pack builder ────────────────────────────────────────────────────────────

function buildPackText({
  format,
  selectedEvent,
  selectedTrack,
  sessions,
  seriesClasses,
  entryRows,
  driverMap,
  teamMap,
  resultsBySession,
  classFilter,
  manualStorylines,
}) {
  const lines = [];
  const HR = '─'.repeat(60);

  const classMap = {};
  seriesClasses.forEach((c) => { classMap[c.id] = c.name; });

  function getClassName(row) {
    if (row.series_class_id && classMap[row.series_class_id]) return classMap[row.series_class_id];
    if (row.class_name) return row.class_name;
    if (row.series_class_id) return row.series_class_id;
    return 'Open';
  }

  function getSessionClassName(s) {
    if (s.series_class_id && classMap[s.series_class_id]) return classMap[s.series_class_id];
    if (s.class_name) return s.class_name;
    return '';
  }

  // Filter entries by class
  const filteredEntries = classFilter === 'all'
    ? entryRows
    : entryRows.filter((e) => e.series_class_id === classFilter || e.class_name === classFilter);

  const filteredSessions = classFilter === 'all'
    ? sessions
    : sessions.filter((s) => s.series_class_id === classFilter || !s.series_class_id);

  // ─── HEADER ───────────────────────────────────────────────────────────────
  if (format !== 'start_lists' && format !== 'results_recap') {
    lines.push(HR);
    lines.push(`EVENT: ${selectedEvent.name || 'Unnamed Event'}`);
    if (selectedTrack) {
      const loc = [selectedTrack.location_city, selectedTrack.location_state].filter(Boolean).join(', ');
      lines.push(`TRACK: ${selectedTrack.name}${loc ? ` — ${loc}` : ''}`);
    }
    const dateStr = [
      selectedEvent.event_date ? fmtDate(selectedEvent.event_date) : null,
      selectedEvent.end_date && selectedEvent.end_date !== selectedEvent.event_date
        ? `– ${fmtDate(selectedEvent.end_date)}`
        : null,
    ].filter(Boolean).join(' ');
    if (dateStr) lines.push(`DATE:  ${dateStr}`);
    lines.push(HR);
    lines.push('');
  }

  // ─── SESSION RUNDOWN ──────────────────────────────────────────────────────
  if (format === 'full' || format === 'quick' || format === 'rundown') {
    lines.push('SCHEDULE RUNDOWN');
    lines.push('─'.repeat(40));
    if (filteredSessions.length === 0) {
      lines.push('  No sessions scheduled.');
    } else {
      filteredSessions.forEach((s, i) => {
        const cls = getSessionClassName(s);
        const time = s.scheduled_time ? fmtTime(s.scheduled_time) : '';
        const num = s.session_number ? ` #${s.session_number}` : '';
        lines.push(
          `  ${String(i + 1).padStart(2)}. ${s.session_type}${num}${cls ? ` — ${cls}` : ''}` +
          `${time ? `   [${time}]` : ''}   (${s.status || 'Draft'})`
        );
      });
    }
    lines.push('');
  }

  // ─── START LISTS ──────────────────────────────────────────────────────────
  if (format === 'full' || format === 'quick' || format === 'start_lists') {
    lines.push('START LISTS');
    lines.push('─'.repeat(40));

    // Group entries by class
    const classGroups = {};
    filteredEntries.forEach((e) => {
      const cn = getClassName(e);
      if (!classGroups[cn]) classGroups[cn] = [];
      classGroups[cn].push(e);
    });

    if (Object.keys(classGroups).length === 0) {
      lines.push('  No entries found.');
    } else {
      Object.entries(classGroups).forEach(([cn, group]) => {
        lines.push('');
        lines.push(`  CLASS: ${cn}  (${group.length} entries)`);
        lines.push('  ' + '─'.repeat(50));
        // Sort by car_number numerically, then driver last name
        const sorted = [...group].sort((a, b) => {
          const na = parseInt(a.car_number) || 9999;
          const nb = parseInt(b.car_number) || 9999;
          if (na !== nb) return na - nb;
          const da = driverMap[a.driver_id];
          const db = driverMap[b.driver_id];
          return (da?.last_name || '').localeCompare(db?.last_name || '');
        });
        sorted.forEach((e) => {
          const driver = driverMap[e.driver_id];
          const team = e.team_id ? teamMap[e.team_id] : null;
          const carNum = e.car_number ? `#${e.car_number}` : '   ';
          const name = driverFullName(driver);
          const hometown = driverHometown(driver);
          const teamName = team?.name || '';
          const transponder = e.transponder_id ? `  T:${e.transponder_id}` : '';
          const parts = [
            `  ${pad(carNum, 6)}${name}`,
            teamName ? `  [${teamName}]` : '',
            hometown ? `  ${hometown}` : '',
            transponder,
          ].filter(Boolean);
          lines.push(parts.join(''));
        });
      });
    }
    lines.push('');
  }

  // ─── STORYLINES ───────────────────────────────────────────────────────────
  if (format === 'full' || format === 'quick') {
    lines.push('STORYLINES');
    lines.push('─'.repeat(40));

    const storylines = [];

    // Most entries by class
    const classCount = {};
    filteredEntries.forEach((e) => {
      const cn = e.series_class_id ? (classMap[e.series_class_id] || e.series_class_id) : (e.class_name || 'Open');
      classCount[cn] = (classCount[cn] || 0) + 1;
    });
    const topClass = Object.entries(classCount).sort((a, b) => b[1] - a[1])[0];
    if (topClass) {
      storylines.push(`• Largest class on the card: ${topClass[0]} with ${topClass[1]} entries.`);
    }

    // Session count
    if (filteredSessions.length > 0) {
      storylines.push(`• ${filteredSessions.length} session${filteredSessions.length > 1 ? 's' : ''} on the schedule today.`);
    }

    // Recent results
    const sessionWithResults = filteredSessions.find((s) => (resultsBySession[s.id] || []).length > 0);
    if (sessionWithResults) {
      const res = (resultsBySession[sessionWithResults.id] || []).sort((a, b) => (a.position ?? 9999) - (b.position ?? 9999));
      const winner = res.find((r) => r.position === 1);
      if (winner) {
        const winDriver = driverMap[winner.driver_id];
        if (winDriver) {
          storylines.push(`• ${getSessionClassName(sessionWithResults) || sessionWithResults.session_type} winner: ${driverFullName(winDriver)}.`);
        }
      }
      const dnfs = res.filter((r) => r.status === 'DNF');
      if (dnfs.length > 0) {
        storylines.push(`• ${dnfs.length} DNF${dnfs.length > 1 ? 's' : ''} in the ${sessionWithResults.session_type}.`);
      }
    }

    // Total entries
    if (filteredEntries.length > 0) {
      storylines.push(`• Total entries on the weekend: ${filteredEntries.length}.`);
    }

    // Rivalry hint — drivers top 3 in same session
    Object.entries(resultsBySession).forEach(([sid, res]) => {
      const top3 = (res || []).filter((r) => r.position && r.position <= 3);
      if (top3.length >= 2) {
        const names = top3.slice(0, 2).map((r) => driverFullName(driverMap[r.driver_id]));
        const s = sessions.find((sx) => sx.id === sid);
        storylines.push(`• Watch for the rivalry between ${names[0]} and ${names[1]}${s ? ` — both inside the top 3 in ${s.session_type}` : ''}.`);
      }
    });

    // Pad with placeholders if not enough
    while (storylines.length < 6) {
      storylines.push('• [Needs manual input]');
    }

    storylines.slice(0, 10).forEach((s) => lines.push(`  ${s}`));

    if (manualStorylines?.trim()) {
      lines.push('');
      lines.push('  — Manual Storylines —');
      manualStorylines.trim().split('\n').forEach((l) => lines.push(`  ${l}`));
    }

    lines.push('');
  }

  // ─── RESULTS RECAP ────────────────────────────────────────────────────────
  if (format === 'full' || format === 'results_recap') {
    lines.push('RESULTS RECAP');
    lines.push('─'.repeat(40));
    const sessionsWithResults = filteredSessions.filter((s) => (resultsBySession[s.id] || []).length > 0);
    if (sessionsWithResults.length === 0) {
      lines.push('  No results available yet.');
    } else {
      sessionsWithResults.forEach((s) => {
        const res = (resultsBySession[s.id] || []).sort((a, b) => (a.position ?? 9999) - (b.position ?? 9999));
        const cls = getSessionClassName(s);
        lines.push('');
        lines.push(`  ${s.session_type}${s.session_number ? ` #${s.session_number}` : ''}${cls ? ` — ${cls}` : ''}`);
        const top3 = res.filter((r) => r.position && r.position <= 3);
        top3.forEach((r) => {
          const d = driverMap[r.driver_id];
          lines.push(`    P${r.position}  ${driverFullName(d)}`);
        });
        const dnfs = res.filter((r) => r.status === 'DNF');
        if (dnfs.length > 0) {
          lines.push(`    DNF: ${dnfs.map((r) => driverFullName(driverMap[r.driver_id])).join(', ')}`);
        }
      });
    }
    lines.push('');
  }

  lines.push(HR);
  lines.push('Generated by HIJINX Race Management');
  lines.push(HR);

  return lines.join('\n');
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function AnnouncerPackManager({
  selectedEvent,
  selectedTrack,
  selectedSeries,
  dashboardPermissions,
  invalidateAfterOperation,
  isAdmin,
}) {
  const queryClient = useQueryClient();
  const eventId = selectedEvent?.id;
  const seriesId = selectedSeries?.id;

  const [format, setFormat] = useState('full');
  const [classFilter, setClassFilter] = useState('all');
  const [manualStorylines, setManualStorylines] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [generated, setGenerated] = useState(false);

  // ── Data loading ───────────────────────────────────────────────────────────

  const sessionsQuery = useQuery({
    queryKey: ['ap_sessions', eventId],
    queryFn: () => base44.entities.Session.filter({ event_id: eventId }),
    enabled: !!eventId,
    staleTime: 30_000,
  });

  const seriesClassesQuery = useQuery({
    queryKey: ['ap_series_classes', seriesId],
    queryFn: () => base44.entities.SeriesClass.filter({ series_id: seriesId }),
    enabled: !!seriesId,
    staleTime: 60_000,
  });

  // Try Entry first, fall back to DriverProgram
  const entriesQuery = useQuery({
    queryKey: ['ap_entries', eventId],
    queryFn: async () => {
      try {
        const rows = await base44.entities.Entry.filter({ event_id: eventId });
        return normalizeEntryRows(rows, 'Entry');
      } catch {
        const rows = await base44.entities.DriverProgram.filter({ event_id: eventId });
        return normalizeEntryRows(rows, 'DriverProgram');
      }
    },
    enabled: !!eventId,
    staleTime: 30_000,
  });

  const resultsQuery = useQuery({
    queryKey: ['ap_results', eventId],
    queryFn: () => base44.entities.Results.filter({ event_id: eventId }),
    enabled: !!eventId,
    staleTime: 30_000,
  });

  const sessions = useMemo(() => sortSessions(sessionsQuery.data || []), [sessionsQuery.data]);
  const seriesClasses = seriesClassesQuery.data || [];
  const entryRows = entriesQuery.data || [];
  const allResults = resultsQuery.data || [];

  // Unique driver IDs
  const driverIds = useMemo(() => [...new Set(entryRows.map((e) => e.driver_id).filter(Boolean))], [entryRows]);
  const teamIds = useMemo(() => [...new Set(entryRows.map((e) => e.team_id).filter(Boolean))], [entryRows]);

  const driversQuery = useQuery({
    queryKey: ['ap_drivers', driverIds.join(',')],
    queryFn: async () => {
      if (driverIds.length === 0) return [];
      // Fetch in batches if needed; for now fetch all for event via results/programs
      return base44.entities.Driver.list('-created_date', 500);
    },
    enabled: driverIds.length > 0,
    staleTime: 60_000,
  });

  const teamsQuery = useQuery({
    queryKey: ['ap_teams', teamIds.join(',')],
    queryFn: () => base44.entities.Team.list('-created_date', 200),
    enabled: teamIds.length > 0,
    staleTime: 60_000,
  });

  const driverMap = useMemo(() => {
    const m = {};
    (driversQuery.data || []).forEach((d) => { m[d.id] = d; });
    return m;
  }, [driversQuery.data]);

  const teamMap = useMemo(() => {
    const m = {};
    (teamsQuery.data || []).forEach((t) => { m[t.id] = t; });
    return m;
  }, [teamsQuery.data]);

  const resultsBySession = useMemo(() => {
    const m = {};
    allResults.forEach((r) => {
      if (!r.session_id) return;
      if (!m[r.session_id]) m[r.session_id] = [];
      m[r.session_id].push(r);
    });
    return m;
  }, [allResults]);

  // ── Class options ──────────────────────────────────────────────────────────

  const classOptions = useMemo(() => {
    const fromClasses = seriesClasses.map((c) => ({ id: c.id, name: c.name }));
    if (fromClasses.length > 0) return fromClasses;
    // Fall back: build from sessions + entries
    const seen = new Set();
    const opts = [];
    [...sessions, ...entryRows].forEach((r) => {
      if (r.series_class_id && !seen.has(r.series_class_id)) {
        seen.add(r.series_class_id);
        opts.push({ id: r.series_class_id, name: r.class_name || r.series_class_id });
      }
    });
    return opts;
  }, [seriesClasses, sessions, entryRows]);

  // ── Data counts ────────────────────────────────────────────────────────────

  const dataStats = useMemo(() => ({
    sessions: sessions.length,
    entries: entryRows.length,
    drivers: driverIds.length,
    results: allResults.length,
  }), [sessions, entryRows, driverIds, allResults]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleGenerate = useCallback(() => {
    const text = buildPackText({
      format,
      selectedEvent,
      selectedTrack,
      sessions,
      seriesClasses,
      entryRows,
      driverMap,
      teamMap,
      resultsBySession,
      classFilter,
      manualStorylines,
    });
    setPreviewText(text);
    setGenerated(true);
  }, [format, selectedEvent, selectedTrack, sessions, seriesClasses, entryRows, driverMap, teamMap, resultsBySession, classFilter, manualStorylines]);

  const handleCopy = useCallback(async () => {
    const text = previewText || buildPackText({
      format, selectedEvent, selectedTrack, sessions, seriesClasses, entryRows,
      driverMap, teamMap, resultsBySession, classFilter, manualStorylines,
    });
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard!');
    } catch {
      toast.error('Copy failed — try selecting and copying manually.');
    }
  }, [previewText, format, selectedEvent, selectedTrack, sessions, seriesClasses, entryRows, driverMap, teamMap, resultsBySession, classFilter, manualStorylines]);

  const handleExportCSV = useCallback(() => {
    const rows = [];
    rows.push(['class_name', 'car_number', 'driver_name', 'team_name', 'hometown', 'transponder_id'].join(','));
    const filtered = classFilter === 'all' ? entryRows : entryRows.filter((e) => e.series_class_id === classFilter || e.class_name === classFilter);
    const classMap2 = {};
    seriesClasses.forEach((c) => { classMap2[c.id] = c.name; });
    filtered.forEach((e) => {
      const cn = (e.series_class_id && classMap2[e.series_class_id]) || e.class_name || 'Open';
      const driver = driverMap[e.driver_id];
      const team = e.team_id ? teamMap[e.team_id] : null;
      const csvRow = [
        cn,
        e.car_number || '',
        driverFullName(driver),
        team?.name || '',
        driverHometown(driver),
        e.transponder_id || '',
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',');
      rows.push(csvRow);
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = format === 'start_lists' ? 'start_lists.csv' : 'announcer_pack.csv';
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
    toast.success('CSV downloaded.');
  }, [entryRows, classFilter, seriesClasses, driverMap, teamMap, format]);

  const handleExportJSON = useCallback(() => {
    const classMap2 = {};
    seriesClasses.forEach((c) => { classMap2[c.id] = c.name; });
    const entriesEnriched = entryRows.map((e) => ({
      ...e,
      driver: driverMap[e.driver_id] || null,
      team: e.team_id ? teamMap[e.team_id] || null : null,
      class_name_resolved: (e.series_class_id && classMap2[e.series_class_id]) || e.class_name || 'Open',
    }));
    const resultsSummary = Object.entries(resultsBySession).map(([sid, res]) => {
      const s = sessions.find((sx) => sx.id === sid);
      return {
        session_id: sid,
        session_type: s?.session_type,
        class_name: (s?.series_class_id && classMap2[s.series_class_id]) || s?.class_name || '',
        top_3: (res || [])
          .filter((r) => r.position && r.position <= 3)
          .sort((a, b) => a.position - b.position)
          .map((r) => ({ position: r.position, driver: driverMap[r.driver_id] || null, status: r.status })),
        dnf_count: (res || []).filter((r) => r.status === 'DNF').length,
      };
    });
    const payload = {
      event: selectedEvent,
      track: selectedTrack || null,
      sessions,
      classes: seriesClasses,
      entries_enriched: entriesEnriched,
      results_summary: resultsSummary,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'announcer_pack.json';
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
    toast.success('JSON downloaded.');
  }, [entryRows, sessions, seriesClasses, driverMap, teamMap, resultsBySession, selectedEvent, selectedTrack]);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['ap_sessions', eventId] });
    queryClient.invalidateQueries({ queryKey: ['ap_entries', eventId] });
    queryClient.invalidateQueries({ queryKey: ['ap_results', eventId] });
    setGenerated(false);
    setPreviewText('');
    toast.success('Refreshed.');
  }, [queryClient, eventId]);

  // ── No event guard ─────────────────────────────────────────────────────────

  if (!selectedEvent) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-3">
        <FileText className="w-10 h-10 opacity-30" />
        <p className="text-sm">Select an event to generate an Announcer Pack.</p>
      </div>
    );
  }

  const isLoading = sessionsQuery.isLoading || entriesQuery.isLoading || resultsQuery.isLoading;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 space-y-4 bg-white min-h-screen">

      {/* Top controls */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        {/* Left: format selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={format} onValueChange={(v) => { setFormat(v); setGenerated(false); }}>
            <SelectTrigger className="w-52 h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FORMAT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Middle: class filter */}
          <Select value={classFilter} onValueChange={(v) => { setClassFilter(v); setGenerated(false); }}>
            <SelectTrigger className="w-44 h-9 text-sm">
              <SelectValue placeholder="All Classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classOptions.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Right: action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="outline" className="h-9" onClick={handleRefresh}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
          </Button>
          <Button size="sm" className="h-9 bg-gray-900 text-white hover:bg-gray-700" onClick={handleGenerate} disabled={isLoading}>
            <FileText className="w-3.5 h-3.5 mr-1.5" /> Generate Preview
          </Button>
          <Button size="sm" variant="outline" className="h-9" onClick={handleCopy} disabled={!generated && !previewText}>
            <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy
          </Button>
          <Button size="sm" variant="outline" className="h-9" onClick={handleExportCSV}>
            <Download className="w-3.5 h-3.5 mr-1.5" /> CSV
          </Button>
          <Button size="sm" variant="outline" className="h-9" onClick={handleExportJSON}>
            <Download className="w-3.5 h-3.5 mr-1.5" /> JSON
          </Button>
        </div>
      </div>

      {/* Main 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Preview panel — 2/3 width */}
        <div className="lg:col-span-2 space-y-3">

          {/* Preview */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Preview — {FORMAT_OPTIONS.find((f) => f.value === format)?.label}
              </span>
              {generated && (
                <Badge variant="outline" className="text-green-700 border-green-300 text-xs">
                  Generated
                </Badge>
              )}
            </div>
            {isLoading ? (
              <div className="p-8 text-center text-gray-400 text-sm">Loading event data…</div>
            ) : !generated ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                Press <strong>Generate Preview</strong> to build the announcer pack.
              </div>
            ) : (
              <pre className="p-4 text-xs font-mono leading-relaxed text-gray-800 whitespace-pre-wrap overflow-x-auto max-h-[600px] overflow-y-auto bg-white">
                {previewText}
              </pre>
            )}
          </div>

          {/* Manual storylines */}
          {(format === 'full' || format === 'quick') && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Manual Storylines</span>
                <span className="ml-2 text-xs text-gray-400">(not saved — included in export when present)</span>
              </div>
              <Textarea
                className="border-0 rounded-none min-h-[100px] text-sm font-mono resize-none focus-visible:ring-0"
                placeholder="Add your own storyline bullets here, one per line…"
                value={manualStorylines}
                onChange={(e) => { setManualStorylines(e.target.value); setGenerated(false); }}
              />
            </div>
          )}
        </div>

        {/* Right sidebar — 1/3 width */}
        <div className="space-y-4">

          {/* Included data checklist */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Included Data</span>
            </div>
            <div className="p-4 space-y-3">
              {[
                { label: 'Sessions', count: dataStats.sessions, icon: Clock },
                { label: 'Entries', count: dataStats.entries, icon: Users },
                { label: 'Drivers', count: dataStats.drivers, icon: Users },
                { label: 'Result rows', count: dataStats.results, icon: Trophy },
              ].map(({ label, count, icon: Icon }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckSquare className={`w-4 h-4 ${count > 0 ? 'text-green-600' : 'text-gray-300'}`} />
                    {label}
                  </div>
                  <Badge variant={count > 0 ? 'outline' : 'secondary'} className="text-xs">
                    {isLoading ? '…' : count}
                  </Badge>
                </div>
              ))}
              {classOptions.length > 0 && (
                <div className="pt-2 border-t border-gray-100">
                  <div className="text-xs text-gray-500 mb-1">Classes</div>
                  <div className="flex flex-wrap gap-1">
                    {classOptions.map((c) => (
                      <Badge key={c.id} variant="secondary" className="text-xs">{c.name}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Linkouts */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Quick Links</span>
            </div>
            <div className="p-3 space-y-2">
              <a
                href={createPageUrl(`EventProfile?id=${selectedEvent.id}`)}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button size="sm" variant="outline" className="w-full justify-start h-8 text-xs">
                  <ExternalLink className="w-3.5 h-3.5 mr-2" /> Event Profile
                </Button>
              </a>
              <a
                href={createPageUrl(`EventResults?id=${selectedEvent.id}`)}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button size="sm" variant="outline" className="w-full justify-start h-8 text-xs">
                  <Trophy className="w-3.5 h-3.5 mr-2" /> Event Results
                </Button>
              </a>
              <a
                href={createPageUrl(`StandingsHome`)}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button size="sm" variant="outline" className="w-full justify-start h-8 text-xs">
                  <FileText className="w-3.5 h-3.5 mr-2" /> Standings
                </Button>
              </a>
            </div>
          </div>

          {/* Event summary */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Event</span>
            </div>
            <div className="p-4 space-y-1 text-sm text-gray-600">
              <div className="font-semibold text-gray-900 text-sm">{selectedEvent.name}</div>
              {selectedTrack && (
                <div className="text-xs text-gray-500">
                  {selectedTrack.name}
                  {[selectedTrack.location_city, selectedTrack.location_state].filter(Boolean).length > 0 &&
                    ` — ${[selectedTrack.location_city, selectedTrack.location_state].filter(Boolean).join(', ')}`}
                </div>
              )}
              {selectedEvent.event_date && (
                <div className="text-xs text-gray-500">{fmtDate(selectedEvent.event_date)}</div>
              )}
              <Badge
                variant="outline"
                className={`text-xs mt-1 ${
                  selectedEvent.status === 'in_progress' ? 'border-green-400 text-green-700' :
                  selectedEvent.status === 'completed' ? 'border-blue-400 text-blue-700' :
                  'border-gray-300 text-gray-500'
                }`}
              >
                {selectedEvent.status || 'upcoming'}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}