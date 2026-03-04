/**
 * AnnouncerPackManager.jsx
 * Visual, printable Announcer Pack cheat sheet for race day ops.
 */
import React, { useState, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { REG_QK } from './queryKeys';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';
import { fmtLapMs, buildBestResultPerDriver, buildAnnouncerCSV, getRecentPerformance } from './announcerPackHelpers';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Printer, Download, BookOpen, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';

const DQ = applyDefaultQueryOptions();

// ── Local helpers ─────────────────────────────────────────────────────────────

function driverName(d) {
  if (!d) return '—';
  return [d.first_name, d.last_name].filter(Boolean).join(' ') || '—';
}

function driverHometown(d) {
  if (!d) return '—';
  return [d.hometown_city, d.hometown_state].filter(Boolean).join(', ') || '—';
}

function fmtDate(d) {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return d; }
}

function statusColor(status) {
  if (status === 'Live' || status === 'in_progress') return 'bg-green-900/40 text-green-300 border-green-700';
  if (status === 'Completed' || status === 'completed') return 'bg-blue-900/40 text-blue-300 border-blue-700';
  return 'bg-gray-800 text-gray-300 border-gray-700';
}

// ── Section: Event Header ─────────────────────────────────────────────────────

function EventHeaderCard({ selectedEvent, selectedTrack, entryCount, classCount, sessionCount }) {
  return (
    <Card className="bg-[#171717] border-gray-800 print:border print:border-gray-300 print:shadow-none">
      <CardContent className="py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-white print:text-black">{selectedEvent.name}</h2>
            {selectedTrack && (
              <p className="text-gray-400 text-sm print:text-gray-700">
                {selectedTrack.name}
                {[selectedTrack.location_city, selectedTrack.location_state].filter(Boolean).length > 0 &&
                  ` · ${[selectedTrack.location_city, selectedTrack.location_state].filter(Boolean).join(', ')}`}
              </p>
            )}
            <p className="text-gray-500 text-sm print:text-gray-600">
              {fmtDate(selectedEvent.event_date)}
              {selectedEvent.end_date && selectedEvent.end_date !== selectedEvent.event_date
                ? ` – ${fmtDate(selectedEvent.end_date)}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge className={`text-xs border ${statusColor(selectedEvent.status)}`}>
              {selectedEvent.status || 'upcoming'}
            </Badge>
            <div className="flex gap-4 text-center">
              {[
                { label: 'Entries', val: entryCount },
                { label: 'Classes', val: classCount },
                { label: 'Sessions', val: sessionCount },
              ].map(({ label, val }) => (
                <div key={label}>
                  <p className="text-xl font-black text-white print:text-black">{val}</p>
                  <p className="text-xs text-gray-500 print:text-gray-600">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Section: Class Quick Index ────────────────────────────────────────────────

function ClassIndex({ classes, entriesByClass, onScrollTo }) {
  return (
    <Card className="bg-[#171717] border-gray-800 print:border print:border-gray-300">
      <CardHeader className="pb-2">
        <CardTitle className="text-white text-sm font-semibold print:text-black">Class Index</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {classes.map((cls) => (
            <button
              key={cls.id}
              onClick={() => onScrollTo(cls.id)}
              className="px-3 py-1.5 rounded-lg bg-[#262626] border border-gray-700 text-sm text-gray-300 hover:border-gray-500 hover:text-white transition-colors print:hidden"
            >
              {cls.class_name}
              <span className="ml-1.5 text-xs text-gray-500">
                ({(entriesByClass[cls.id] || []).length})
              </span>
            </button>
          ))}
        </div>
        {/* Print version */}
        <div className="hidden print:flex flex-wrap gap-3 text-xs text-gray-700">
          {classes.map((cls) => (
            <span key={cls.id}>{cls.class_name} ({(entriesByClass[cls.id] || []).length})</span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Section: Per-Class Entry Table ────────────────────────────────────────────

function ClassSheet({ cls, entries, driverMap, teamMap, standingsMap, bestResultMap, sortByStanding }) {
  const sorted = useMemo(() => {
    if (sortByStanding && Object.keys(standingsMap).length > 0) {
      return [...entries].sort((a, b) => {
        const ra = standingsMap[a.driver_id]?.rank ?? 9999;
        const rb = standingsMap[b.driver_id]?.rank ?? 9999;
        return ra - rb;
      });
    }
    return [...entries].sort((a, b) => {
      const na = parseInt(a.car_number) || 9999;
      const nb = parseInt(b.car_number) || 9999;
      return na - nb;
    });
  }, [entries, sortByStanding, standingsMap]);

  return (
    <div id={`class-${cls.id}`} className="space-y-2">
      <div className="flex items-center gap-3">
        <h3 className="text-lg font-bold text-white print:text-black">{cls.class_name}</h3>
        <span className="text-xs text-gray-500">{entries.length} entries</span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-800 print:border-gray-300">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 print:border-gray-300 bg-[#171717] print:bg-gray-50">
              {['#', 'Driver', 'Team', 'Hometown', 'Discipline', 'Rank', 'Points', 'Best Lap', 'Finish'].map((h) => (
                <th key={h} className="text-left px-3 py-2 text-xs text-gray-500 font-semibold uppercase tracking-wide print:text-gray-700">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800 print:divide-gray-200">
            {sorted.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-gray-600 text-xs">No entries in this class.</td>
              </tr>
            )}
            {sorted.map((entry) => {
              const driver = driverMap[entry.driver_id];
              const team = teamMap[entry.team_id];
              const standing = standingsMap[entry.driver_id];
              const result = bestResultMap[entry.driver_id];
              return (
                <tr key={entry.id} className="hover:bg-[#1e1e1e] print:hover:bg-transparent">
                  <td className="px-3 py-2 font-bold text-white print:text-black whitespace-nowrap">
                    {entry.car_number ? `#${entry.car_number}` : '—'}
                  </td>
                  <td className="px-3 py-2 text-white print:text-black font-medium">
                    {driverName(driver)}
                  </td>
                  <td className="px-3 py-2 text-gray-400 print:text-gray-700 text-xs">
                    {team?.name || '—'}
                  </td>
                  <td className="px-3 py-2 text-gray-400 print:text-gray-700 text-xs">
                    {driverHometown(driver)}
                  </td>
                  <td className="px-3 py-2 text-gray-500 print:text-gray-600 text-xs">
                    {driver?.primary_discipline || '—'}
                  </td>
                  <td className="px-3 py-2 text-center text-gray-300 print:text-gray-700 text-xs font-semibold">
                    {standing?.rank ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-center text-gray-300 print:text-gray-700 text-xs">
                    {standing?.points ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-gray-400 print:text-gray-700 text-xs font-mono">
                    {fmtLapMs(result?.best_lap_time_ms)}
                  </td>
                  <td className="px-3 py-2 text-center text-gray-300 print:text-gray-700 text-xs font-semibold">
                    {result?.position ?? '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function AnnouncerPackManager({
  selectedEvent,
  selectedTrack,
  selectedSeries,
  dashboardPermissions,
  invalidateAfterOperation,
  isAdmin,
  dashboardContext,
}) {
  const queryClient = useQueryClient();
  const eventId = selectedEvent?.id;
  const seriesId = selectedSeries?.id || selectedEvent?.series_id;
  const seasonYear = dashboardContext?.season;

  const [selectedClassFilter, setSelectedClassFilter] = useState('all');
  const [selectedSession, setSelectedSession] = useState(null);
  const [sortByStanding, setSortByStanding] = useState(false);
  const classRefs = useRef({});

  // ── Data ───────────────────────────────────────────────────────────────────

  const { data: sessions = [] } = useQuery({
    queryKey: REG_QK.sessions(eventId),
    queryFn: () => base44.entities.Session.filter({ event_id: eventId }),
    enabled: !!eventId,
    ...DQ,
  });

  const { data: eventClasses = [], isLoading: classesLoading } = useQuery({
    queryKey: ['eventClasses', eventId],
    queryFn: () => base44.entities.EventClass.filter({ event_id: eventId }),
    enabled: !!eventId,
    ...DQ,
  });

  const { data: entries = [], isLoading: entriesLoading } = useQuery({
    queryKey: REG_QK.entries(eventId),
    queryFn: () => base44.entities.Entry.filter({ event_id: eventId }),
    enabled: !!eventId,
    ...DQ,
  });

  const { data: allResults = [] } = useQuery({
    queryKey: REG_QK.results(eventId),
    queryFn: () => base44.entities.Results.filter({ event_id: eventId }),
    enabled: !!eventId,
    ...DQ,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['ap_drivers_full'],
    queryFn: () => base44.entities.Driver.list('-created_date', 500),
    enabled: !!eventId,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['ap_teams_full'],
    queryFn: () => base44.entities.Team.list('-created_date', 200),
    enabled: !!eventId,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const { data: standingsData = [] } = useQuery({
    queryKey: REG_QK.standings(seriesId, seasonYear),
    queryFn: () => base44.entities.Standings.filter({ series_id: seriesId, season: seasonYear }),
    enabled: !!seriesId,
    ...DQ,
  });

  // ── Derived maps ──────────────────────────────────────────────────────────

  const driverMap = useMemo(() => Object.fromEntries(drivers.map((d) => [d.id, d])), [drivers]);
  const teamMap   = useMemo(() => Object.fromEntries(teams.map((t) => [t.id, t])), [teams]);

  // standings: { [driver_id]: { rank, points } }
  const standingsMap = useMemo(() => {
    const m = {};
    standingsData.forEach((s) => { if (s.driver_id) m[s.driver_id] = s; });
    return m;
  }, [standingsData]);

  // best result per driver
  const bestResultMap = useMemo(() => buildBestResultPerDriver(allResults, sessions), [allResults, sessions]);

  // recent performance per driver
  const performanceMap = useMemo(() => {
    const m = {};
    entries.forEach((e) => {
      const perf = getRecentPerformance(e.driver_id, allResults, sessions, seriesId, seasonYear);
      m[e.driver_id] = perf;
    });
    return m;
  }, [entries, allResults, sessions, seriesId, seasonYear]);

  // entries by class
  const entriesByClass = useMemo(() => {
    const m = {};
    entries.forEach((e) => {
      const key = e.event_class_id || 'unclassified';
      if (!m[key]) m[key] = [];
      m[key].push(e);
    });
    return m;
  }, [entries]);

  // filtered classes
  const filteredClasses = useMemo(() => {
    const list = selectedClassFilter === 'all'
      ? eventClasses
      : eventClasses.filter((c) => c.id === selectedClassFilter);
    return [...list].sort((a, b) => (a.class_order ?? 0) - (b.class_order ?? 0));
  }, [eventClasses, selectedClassFilter]);

  // ── Scroll to class ───────────────────────────────────────────────────────

  function scrollToClass(classId) {
    const el = document.getElementById(`class-${classId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ── Set default session on load ───────────────────────────────────────────
  
  const defaultSession = useMemo(() => {
    if (selectedSession) return selectedSession;
    // Prefer Final, else first session
    const finalSession = sessions.find((s) => s.session_type === 'Final');
    return finalSession || sessions[0] || null;
  }, [sessions, selectedSession]);

  // ── Export CSV ────────────────────────────────────────────────────────────

  function handleExportCSV() {
    const csv = buildAnnouncerCSV(filteredClasses, entriesByClass, driverMap, teamMap, standingsMap, bestResultMap, performanceMap);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedEvent?.name || 'announcer_pack'}_${selectedClassFilter === 'all' ? 'all_classes' : selectedClassFilter}.csv`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
    toast.success('CSV downloaded.');
  }

  // ── Empty state ───────────────────────────────────────────────────────────

  if (!selectedEvent) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-20 text-center">
          <BookOpen className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-white font-semibold text-lg mb-1">Announcer Pack</p>
          <p className="text-gray-400 text-sm">Select an event to generate the announcer cheat sheet.</p>
        </CardContent>
      </Card>
    );
  }

  const isLoading = classesLoading || entriesLoading;

  return (
    <div className="space-y-5 print:space-y-4">

      {/* ── Top action bar ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Class filter */}
          <Select value={selectedClassFilter} onValueChange={setSelectedClassFilter}>
            <SelectTrigger className="w-44 bg-[#262626] border-gray-700 text-white text-sm h-9">
              <SelectValue placeholder="All Classes" />
            </SelectTrigger>
            <SelectContent className="bg-[#262626] border-gray-700 text-white">
              <SelectItem value="all" className="text-white focus:bg-gray-700">All Classes</SelectItem>
              {eventClasses.map((c) => (
                <SelectItem key={c.id} value={c.id} className="text-white focus:bg-gray-700">
                  {c.class_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Session filter */}
          {sessions.length > 0 && (
            <Select value={selectedSession?.id || defaultSession?.id || ''} onValueChange={(sessionId) => {
              const session = sessions.find((s) => s.id === sessionId);
              setSelectedSession(session || null);
            }}>
              <SelectTrigger className="w-40 bg-[#262626] border-gray-700 text-white text-sm h-9">
                <SelectValue placeholder="Select Session" />
              </SelectTrigger>
              <SelectContent className="bg-[#262626] border-gray-700 text-white">
                {sessions.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="text-white focus:bg-gray-700">
                    {s.name} ({s.session_type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Sort toggle */}
          {Object.keys(standingsMap).length > 0 && (
            <Button
              size="sm"
              variant={sortByStanding ? 'default' : 'outline'}
              className={`h-9 text-xs ${sortByStanding ? 'bg-blue-700 hover:bg-blue-600 text-white' : 'border-gray-700 text-gray-300 hover:bg-gray-800'}`}
              onClick={() => setSortByStanding((v) => !v)}
            >
              <ArrowUpDown className="w-3.5 h-3.5 mr-1.5" />
              {sortByStanding ? 'Sort: Standing Rank' : 'Sort: Car #'}
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-9 border-gray-700 text-gray-300 hover:bg-gray-800"
            onClick={handleExportCSV}
          >
            <Download className="w-3.5 h-3.5 mr-1.5" /> Export CSV
          </Button>
          <Button
            size="sm"
            className="h-9 bg-white text-black hover:bg-gray-200"
            onClick={() => window.print()}
          >
            <Printer className="w-3.5 h-3.5 mr-1.5" /> Print
          </Button>
        </div>
      </div>

      {/* ── Section A: Event Header ────────────────────────────── */}
      <EventHeaderCard
        selectedEvent={selectedEvent}
        selectedTrack={selectedTrack}
        entryCount={entries.length}
        classCount={eventClasses.length}
        sessionCount={sessions.length}
      />

      {isLoading && (
        <div className="py-8 text-center text-sm text-gray-500">Loading event data…</div>
      )}

      {!isLoading && eventClasses.length === 0 && (
        <Card className="bg-[#171717] border-gray-800">
          <CardContent className="py-10 text-center">
            <p className="text-gray-400 text-sm">No classes found for this event. Create classes in the Classes &amp; Sessions tab.</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && eventClasses.length > 0 && (
        <>
          {/* ── Section B: Class Index ──────────────────────────── */}
          <ClassIndex
            classes={eventClasses}
            entriesByClass={entriesByClass}
            onScrollTo={scrollToClass}
          />

          <Separator className="border-gray-800 print:border-gray-300" />

          {/* ── Session Meta ────────────────────────────────────── */}
          {defaultSession && (
            <Card className="bg-[#171717] border-gray-800 print:border print:border-gray-300">
              <CardContent className="py-3 text-xs text-gray-400 print:text-gray-700">
                <div className="flex items-center justify-between flex-wrap">
                  <span>Session: <strong className="text-white print:text-black">{defaultSession.name}</strong> ({defaultSession.session_type})</span>
                  <span>Generated: {new Date().toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Section C: Per-Class Sheets ─────────────────────── */}
          <div className="space-y-8 print:space-y-6">
            {filteredClasses.map((cls) => (
              <ClassSheet
                key={cls.id}
                cls={cls}
                entries={entriesByClass[cls.id] || []}
                driverMap={driverMap}
                teamMap={teamMap}
                standingsMap={standingsMap}
                bestResultMap={bestResultMap}
                sortByStanding={sortByStanding}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}