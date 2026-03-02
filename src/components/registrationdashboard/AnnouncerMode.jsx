import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mic, Search, User, MapPin, Car, Trophy, Copy, Check, ChevronRight, AlertCircle } from 'lucide-react';

// ─── Session type sort order ─────────────────────────────────────────────────
const SESSION_ORDER = { Practice: 0, Qualifying: 1, Heat: 2, LCQ: 3, Final: 4 };

function sessionSortKey(s) {
  const typeOrder = SESSION_ORDER[s.session_type] ?? 99;
  const timeMs = s.scheduled_time ? new Date(s.scheduled_time).getTime() : Infinity;
  const num = s.session_number ?? 0;
  return [timeMs === Infinity ? typeOrder * 1e12 : timeMs, typeOrder, num];
}

function compareSessions(a, b) {
  const ka = sessionSortKey(a);
  const kb = sessionSortKey(b);
  for (let i = 0; i < ka.length; i++) {
    if (ka[i] !== kb[i]) return ka[i] - kb[i];
  }
  return 0;
}

// ─── Status badge ─────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  Draft: 'bg-gray-800 text-gray-300 border-gray-700',
  Provisional: 'bg-yellow-900/50 text-yellow-300 border-yellow-700',
  Official: 'bg-green-900/50 text-green-300 border-green-700',
  Locked: 'bg-blue-900/50 text-blue-300 border-blue-700',
  scheduled: 'bg-gray-800 text-gray-300 border-gray-700',
  in_progress: 'bg-red-900/50 text-red-300 border-red-700 animate-pulse',
  completed: 'bg-green-900/50 text-green-300 border-green-700',
  cancelled: 'bg-gray-900 text-gray-500 border-gray-800',
};

function StatusBadge({ status }) {
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${STATUS_STYLES[status] || 'bg-gray-800 text-gray-400 border-gray-700'}`}>
      {status}
    </span>
  );
}

// ─── Results table ────────────────────────────────────────────────────────────
function ResultsTable({ results, driversMap }) {
  if (!results || results.length === 0) {
    return (
      <div className="py-8 text-center text-gray-500 text-sm">
        No results loaded for this session yet
      </div>
    );
  }

  const sorted = [...results].sort((a, b) => (a.position ?? 999) - (b.position ?? 999));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wide">
            <th className="text-left py-2 pr-3 font-medium">Pos</th>
            <th className="text-left py-2 pr-3 font-medium">Car</th>
            <th className="text-left py-2 pr-3 font-medium">Driver</th>
            <th className="text-left py-2 pr-3 font-medium hidden sm:table-cell">Status</th>
            <th className="text-right py-2 pr-3 font-medium hidden md:table-cell">Laps</th>
            <th className="text-right py-2 font-medium hidden lg:table-cell">Best Lap</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, idx) => {
            const driver = driversMap[r.driver_id];
            const driverName = driver
              ? `${driver.first_name} ${driver.last_name}`
              : r.driver_id?.slice(0, 8) || '—';
            return (
              <tr key={r.id || idx} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                <td className="py-2.5 pr-3">
                  <span className={`text-lg font-black ${idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-gray-300' : idx === 2 ? 'text-amber-600' : 'text-white'}`}>
                    {r.position ?? '—'}
                  </span>
                </td>
                <td className="py-2.5 pr-3 font-mono font-bold text-white">{r.car_number || '—'}</td>
                <td className="py-2.5 pr-3 font-semibold text-white">{driverName}</td>
                <td className="py-2.5 pr-3 hidden sm:table-cell">
                  <StatusBadge status={r.status || 'Running'} />
                </td>
                <td className="py-2.5 pr-3 text-right text-gray-300 hidden md:table-cell">{r.laps_completed ?? '—'}</td>
                <td className="py-2.5 text-right text-gray-300 font-mono hidden lg:table-cell">
                  {r.best_lap_time_ms ? `${(r.best_lap_time_ms / 1000).toFixed(3)}s` : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Driver Spotlight ─────────────────────────────────────────────────────────
function DriverSpotlight({ driver, driverMedia, programs, seriesClasses }) {
  const [notes, setNotes] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(notes);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Find primary program
  const primaryProgram = programs?.find(p => p.driver_id === driver?.id);
  const seriesClass = primaryProgram?.series_class_id
    ? seriesClasses?.find(sc => sc.id === primaryProgram.series_class_id)
    : null;

  if (!driver) {
    return (
      <Card className="bg-[#171717] border-gray-800 h-full">
        <CardContent className="py-12 text-center space-y-2">
          <Mic className="w-8 h-8 text-gray-700 mx-auto" />
          <p className="text-gray-500 text-sm">Select a driver to load spotlight</p>
        </CardContent>
      </Card>
    );
  }

  const hometown = [driver.hometown_city, driver.hometown_state, driver.hometown_country]
    .filter(Boolean).join(', ');

  return (
    <Card className="bg-[#171717] border-gray-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center gap-2 text-base">
          <Mic className="w-4 h-4 text-purple-400" /> Driver Spotlight
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Hero row */}
        <div className="flex gap-4">
          {driverMedia?.headshot_url ? (
            <img
              src={driverMedia.headshot_url}
              alt={`${driver.first_name} ${driver.last_name}`}
              className="w-20 h-20 rounded-lg object-cover border border-gray-700 flex-shrink-0"
            />
          ) : (
            <div className="w-20 h-20 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center flex-shrink-0">
              <User className="w-8 h-8 text-gray-600" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-2xl font-black text-white leading-tight">
              {driver.first_name} {driver.last_name}
            </p>
            {primaryProgram?.car_number && (
              <p className="text-3xl font-black text-yellow-400 leading-tight">#{primaryProgram.car_number}</p>
            )}
            {seriesClass && (
              <Badge className="bg-purple-900/50 text-purple-300 border-purple-700 text-xs mt-1">{seriesClass.name}</Badge>
            )}
          </div>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {hometown && (
            <div className="flex items-start gap-2">
              <MapPin className="w-3.5 h-3.5 text-gray-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Hometown</p>
                <p className="text-white font-medium">{hometown}</p>
              </div>
            </div>
          )}
          {driver.manufacturer && (
            <div className="flex items-start gap-2">
              <Car className="w-3.5 h-3.5 text-gray-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Manufacturer</p>
                <p className="text-white font-medium">{driver.manufacturer}</p>
              </div>
            </div>
          )}
          {driver.career_status && (
            <div className="flex items-start gap-2">
              <Trophy className="w-3.5 h-3.5 text-gray-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Career Level</p>
                <p className="text-white font-medium">{driver.career_status}</p>
              </div>
            </div>
          )}
          {driver.primary_discipline && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Discipline</p>
              <p className="text-white font-medium">{driver.primary_discipline}</p>
            </div>
          )}
        </div>

        {/* Story Notes */}
        <div className="border-t border-gray-800 pt-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Story Notes</p>
            <button
              onClick={handleCopy}
              disabled={!notes.trim()}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-white disabled:opacity-40 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy Notes'}
            </button>
          </div>
          <Textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Jot down talking points, story angles, background info…"
            className="bg-[#262626] border-gray-700 text-white text-sm resize-none h-28 placeholder:text-gray-600"
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AnnouncerMode({ selectedEvent, sessions: propSessions, results: propResults }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [selectedDriver, setSelectedDriver] = useState(null);
  const resultsRef = useRef(null);

  const eventId = selectedEvent?.id;

  // Sessions (prefer prop, fallback to own query)
  const { data: fetchedSessions = [] } = useQuery({
    queryKey: ['announcer_sessions', eventId],
    queryFn: () => base44.entities.Session.filter({ event_id: eventId }),
    enabled: !!eventId && !propSessions?.length,
    staleTime: 15000,
  });
  const sessions = (propSessions?.length ? propSessions : fetchedSessions)
    .filter(s => s.event_id === eventId)
    .sort(compareSessions);

  // Results (prefer prop, fallback to own query)
  const { data: fetchedResults = [] } = useQuery({
    queryKey: ['announcer_results', eventId],
    queryFn: () => base44.entities.Results.filter({ event_id: eventId }),
    enabled: !!eventId && !propResults?.length,
    staleTime: 15000,
  });
  const allResults = propResults?.length ? propResults : fetchedResults;

  // Driver programs for entry list
  const { data: driverPrograms = [] } = useQuery({
    queryKey: ['announcer_programs', eventId],
    queryFn: () => base44.entities.DriverProgram.filter({ event_id: eventId }),
    enabled: !!eventId,
    staleTime: 30000,
  });

  // Collect driver IDs from programs + results
  const driverIds = useMemo(() => {
    const ids = new Set();
    driverPrograms.forEach(p => p.driver_id && ids.add(p.driver_id));
    allResults.forEach(r => r.driver_id && ids.add(r.driver_id));
    return Array.from(ids);
  }, [driverPrograms, allResults]);

  // Batch fetch drivers
  const { data: drivers = [] } = useQuery({
    queryKey: ['announcer_drivers', driverIds.join(',')],
    queryFn: async () => {
      if (!driverIds.length) return [];
      return base44.entities.Driver.filter({ id: { $in: driverIds } });
    },
    enabled: driverIds.length > 0,
    staleTime: 60000,
  });

  // Driver media (headshotss)
  const { data: driverMediaList = [] } = useQuery({
    queryKey: ['announcer_media', driverIds.join(',')],
    queryFn: async () => {
      if (!driverIds.length) return [];
      return base44.entities.DriverMedia.filter({ driver_id: { $in: driverIds } });
    },
    enabled: driverIds.length > 0,
    staleTime: 60000,
  });

  // Series classes
  const { data: seriesClasses = [] } = useQuery({
    queryKey: ['announcer_classes', selectedEvent?.series_id],
    queryFn: () => base44.entities.SeriesClass.filter({ series_id: selectedEvent.series_id }),
    enabled: !!selectedEvent?.series_id,
    staleTime: 60000,
  });

  const driversMap = useMemo(() => Object.fromEntries(drivers.map(d => [d.id, d])), [drivers]);
  const mediaMap = useMemo(() => Object.fromEntries(driverMediaList.map(m => [m.driver_id, m])), [driverMediaList]);

  // Filtered driver list for search
  const filteredDrivers = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return drivers.filter(d => {
      const name = `${d.first_name} ${d.last_name}`.toLowerCase();
      const prog = driverPrograms.find(p => p.driver_id === d.id);
      const carNum = (prog?.car_number || d.primary_number || '').toLowerCase();
      return name.includes(q) || carNum.includes(q);
    }).slice(0, 10);
  }, [searchQuery, drivers, driverPrograms]);

  // Selected session results
  const sessionResults = useMemo(() => {
    if (!selectedSessionId) return [];
    return allResults.filter(r => r.session_id === selectedSessionId);
  }, [selectedSessionId, allResults]);

  // Auto-select first session
  useEffect(() => {
    if (sessions.length && !selectedSessionId) {
      setSelectedSessionId(sessions[0].id);
    }
  }, [sessions, selectedSessionId]);

  // ── No event ──────────────────────────────────────────────────────────────
  if (!selectedEvent) {
    return (
      <div className="py-16 text-center space-y-3">
        <Mic className="w-10 h-10 text-gray-700 mx-auto" />
        <p className="text-gray-400 font-medium">No event selected</p>
        <p className="text-gray-600 text-sm max-w-xs mx-auto">
          Pick a Track or Series, select a season, and choose an event using the selectors above.
        </p>
      </div>
    );
  }

  // ── No sessions ───────────────────────────────────────────────────────────
  if (sessions.length === 0) {
    return (
      <div className="py-16 text-center space-y-3">
        <AlertCircle className="w-10 h-10 text-gray-700 mx-auto" />
        <p className="text-gray-400 font-medium">No sessions created yet</p>
        <p className="text-gray-600 text-sm max-w-sm mx-auto">
          Ask race ops to build sessions in the Classes &amp; Sessions tab.
        </p>
      </div>
    );
  }

  const selectedSession = sessions.find(s => s.id === selectedSessionId);
  const selectedDriverMedia = selectedDriver ? mediaMap[selectedDriver.id] : null;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {/* ── Left: Live Tools ── */}
      <div className="space-y-5">

        {/* Quick Search */}
        <Card className="bg-[#171717] border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-300 flex items-center gap-2">
              <Search className="w-4 h-4 text-purple-400" /> Quick Driver Search
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by name or car number…"
              className="bg-[#262626] border-gray-700 text-white placeholder:text-gray-600 text-base"
            />
            {searchQuery.trim() && (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {filteredDrivers.length === 0 ? (
                  <p className="text-gray-500 text-sm py-2">No drivers match "{searchQuery}"</p>
                ) : filteredDrivers.map(d => {
                  const prog = driverPrograms.find(p => p.driver_id === d.id);
                  const sc = prog?.series_class_id
                    ? seriesClasses.find(c => c.id === prog.series_class_id)
                    : null;
                  const hometown = [d.hometown_city, d.hometown_state].filter(Boolean).join(', ');
                  return (
                    <button
                      key={d.id}
                      onClick={() => { setSelectedDriver(d); setSearchQuery(''); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#262626] hover:bg-gray-700 transition-colors text-left"
                    >
                      <span className="font-mono font-bold text-yellow-400 text-lg w-10 flex-shrink-0">
                        {prog?.car_number || d.primary_number || '—'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-white truncate">{d.first_name} {d.last_name}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {[sc?.name, hometown, d.manufacturer].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-600 flex-shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Session Picker */}
        <Card className="bg-[#171717] border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-300">Session Picker</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
              <SelectTrigger className="bg-[#262626] border-gray-700 text-white">
                <SelectValue placeholder="Select session…" />
              </SelectTrigger>
              <SelectContent className="bg-[#262626] border-gray-700">
                {sessions.map(s => {
                  const sc = s.series_class_id
                    ? seriesClasses.find(c => c.id === s.series_class_id)
                    : null;
                  const label = [
                    s.session_type,
                    s.session_number ? `#${s.session_number}` : null,
                    sc?.name || s.class_name,
                  ].filter(Boolean).join(' · ');
                  return (
                    <SelectItem key={s.id} value={s.id} className="text-white">
                      <div className="flex items-center gap-2">
                        <span>{label || s.name}</span>
                        <StatusBadge status={s.status || 'Draft'} />
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            {selectedSession && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusBadge status={selectedSession.status || 'Draft'} />
                  {selectedSession.scheduled_time && (
                    <span className="text-xs text-gray-500">
                      {new Date(selectedSession.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                  {selectedSession.laps && (
                    <span className="text-xs text-gray-500">{selectedSession.laps} laps</span>
                  )}
                </div>
                <button
                  onClick={() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' })}
                  className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                >
                  Jump to results ↓
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Table */}
        <Card className="bg-[#171717] border-gray-800" ref={resultsRef}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-300 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-400" />
              {selectedSession
                ? `${selectedSession.session_type} ${selectedSession.session_number ? `#${selectedSession.session_number}` : ''} — Results`
                : 'Running Order / Results'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResultsTable results={sessionResults} driversMap={driversMap} />
          </CardContent>
        </Card>
      </div>

      {/* ── Right: Driver Spotlight ── */}
      <div>
        <DriverSpotlight
          driver={selectedDriver}
          driverMedia={selectedDriverMedia}
          programs={driverPrograms}
          seriesClasses={seriesClasses}
        />
      </div>
    </div>
  );
}