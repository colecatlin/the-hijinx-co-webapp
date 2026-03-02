import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Copy, Check, Mic, ChevronRight, User, AlertCircle } from 'lucide-react';
import { QueryKeys } from '@/components/utils/queryKeys';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';

const DQ = applyDefaultQueryOptions();

const SESSION_TYPE_ORDER = { Practice: 0, Qualifying: 1, Heat: 2, LCQ: 3, Final: 4 };

const statusColors = {
  Draft: 'bg-gray-700/60 text-gray-400',
  Provisional: 'bg-yellow-900/40 text-yellow-300',
  Official: 'bg-green-900/40 text-green-300',
  Locked: 'bg-blue-900/40 text-blue-300',
  scheduled: 'bg-gray-700/60 text-gray-400',
  in_progress: 'bg-blue-900/40 text-blue-300',
  completed: 'bg-green-900/40 text-green-300',
  upcoming: 'bg-gray-700/60 text-gray-400',
  cancelled: 'bg-red-900/40 text-red-300',
};

function CopyButton({ text, label = 'Copy', small = false }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <Button onClick={handle} variant="outline" size={small ? 'sm' : 'default'}
      className="border-gray-700 text-gray-300 hover:text-white">
      {copied ? <><Check className="w-3.5 h-3.5 mr-1 text-green-400" /> Copied!</> : <><Copy className="w-3.5 h-3.5 mr-1" /> {label}</>}
    </Button>
  );
}

export default function AnnouncerPanel({ selectedEvent, selectedTrack, selectedSeries, sessions, results }) {
  const [announcerSelectedSessionId, setAnnouncerSelectedSessionId] = useState(null);
  const [driverSearch, setDriverSearch] = useState('');
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [driverNotes, setDriverNotes] = useState({});
  const eventId = selectedEvent?.id;

  // ── Data ──
  const { data: entries = [] } = useQuery({
    queryKey: QueryKeys.entries.listByEvent(eventId),
    queryFn: () => base44.entities.Entry.filter({ event_id: eventId }),
    enabled: !!eventId,
    ...DQ,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.list('first_name', 500),
    ...DQ,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams', {}],
    queryFn: () => base44.entities.Team.list('name', 200),
    ...DQ,
  });

  const { data: seriesClasses = [] } = useQuery({
    queryKey: ['seriesClasses', selectedEvent?.series_id],
    queryFn: () => base44.entities.SeriesClass.filter({ series_id: selectedEvent.series_id }),
    enabled: !!selectedEvent?.series_id,
    ...DQ,
  });

  // ── Helpers ──
  const getDriver = (id) => drivers.find(d => d.id === id);
  const getDriverName = (id) => { const d = getDriver(id); return d ? `${d.first_name} ${d.last_name}` : '—'; };
  const getTeamName = (id) => teams.find(t => t.id === id)?.name || '—';
  const getClassName = (scId, fallback) => seriesClasses.find(c => c.id === scId)?.class_name || fallback || '—';

  // ── Sorted sessions ──
  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => {
      const typeOrder = (SESSION_TYPE_ORDER[a.session_type] ?? 99) - (SESSION_TYPE_ORDER[b.session_type] ?? 99);
      if (typeOrder !== 0) return typeOrder;
      const numOrder = (a.session_number || 0) - (b.session_number || 0);
      if (numOrder !== 0) return numOrder;
      if (a.scheduled_time && b.scheduled_time) return new Date(a.scheduled_time) - new Date(b.scheduled_time);
      return 0;
    });
  }, [sessions]);

  // Group sessions by class
  const sessionsByClass = useMemo(() => {
    const grouped = {};
    sortedSessions.forEach(s => {
      const cls = getClassName(s.series_class_id, s.class_name || 'General');
      if (!grouped[cls]) grouped[cls] = [];
      grouped[cls].push(s);
    });
    return grouped;
  }, [sortedSessions, seriesClasses]);

  // ── Selected session results ──
  const selectedSession = announcerSelectedSessionId
    ? sessions.find(s => s.id === announcerSelectedSessionId)
    : null;

  const sessionResults = useMemo(() => {
    if (!announcerSelectedSessionId) return [];
    return [...results.filter(r => r.session_id === announcerSelectedSessionId)]
      .sort((a, b) => (a.position || 999) - (b.position || 999))
      .slice(0, 12);
  }, [results, announcerSelectedSessionId]);

  // ── Driver search ──
  const filteredDriverEntries = useMemo(() => {
    if (!driverSearch.trim()) return [];
    const q = driverSearch.toLowerCase();
    return entries.filter(e => {
      const name = getDriverName(e.driver_id).toLowerCase();
      const car = (e.car_number || '').toLowerCase();
      return name.includes(q) || car.includes(q);
    }).slice(0, 10);
  }, [entries, driverSearch, drivers]);

  // ── Copy rundown ──
  const buildRundown = () => {
    const lines = [];
    lines.push(`EVENT: ${selectedEvent?.name || ''}`);
    lines.push(`DATE: ${selectedEvent?.event_date || ''}`);
    if (selectedSession) {
      const cls = getClassName(selectedSession.series_class_id, selectedSession.class_name);
      lines.push(`CLASS: ${cls}`);
      lines.push(`SESSION: ${selectedSession.session_type}${selectedSession.session_number ? ` ${selectedSession.session_number}` : ''}`);
      lines.push('');
      if (sessionResults.length > 0) {
        lines.push('RESULTS:');
        sessionResults.slice(0, 10).forEach(r => {
          lines.push(`  P${r.position || '?'} | #${r.car_number || '—'} | ${getDriverName(r.driver_id)} | ${r.status || ''}`);
        });
      } else {
        lines.push('ENTRIES:');
        entries.filter(e => e.series_class_id === selectedSession.series_class_id || !selectedSession.series_class_id)
          .slice(0, 10).forEach(e => {
            lines.push(`  #${e.car_number || '—'} | ${getDriverName(e.driver_id)}`);
          });
      }
    }
    return lines.join('\n');
  };

  const buildDriverCard = (entry) => {
    const d = getDriver(entry?.driver_id);
    if (!d) return '';
    const lines = [
      `#${entry.car_number || '—'} — ${d.first_name} ${d.last_name}`,
      d.hometown_city ? `From: ${d.hometown_city}${d.hometown_state ? `, ${d.hometown_state}` : ''}` : '',
      d.primary_discipline ? `Discipline: ${d.primary_discipline}` : '',
      entry.team_id ? `Team: ${getTeamName(entry.team_id)}` : '',
      driverNotes[entry.driver_id] ? `Notes: ${driverNotes[entry.driver_id]}` : '',
    ].filter(Boolean);
    return lines.join('\n');
  };

  // ── Event stats ──
  const officialCount = sessions.filter(s => s.status === 'Official' || s.status === 'Locked').length;

  if (!selectedEvent) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-10 text-center">
          <AlertCircle className="w-7 h-7 text-gray-600 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">Select an event to use Announcer Mode</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* 1. Event Header */}
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Mic className="w-4 h-4 text-purple-400" /> {selectedEvent.name}
              </CardTitle>
              {selectedTrack && <p className="text-xs text-gray-400 mt-0.5">{selectedTrack.name}{selectedTrack.location_city ? ` — ${selectedTrack.location_city}` : ''}</p>}
            </div>
            <Badge className={`text-xs ${statusColors[selectedEvent.status] || 'bg-gray-700/60 text-gray-400'}`}>
              {selectedEvent.status || 'upcoming'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-300 mb-3">
            {selectedEvent.event_date}{selectedEvent.end_date ? ` – ${selectedEvent.end_date}` : ''}
            {selectedSeries ? ` · ${selectedSeries.name}` : ''}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Sessions', value: sessions.length },
              { label: 'Official', value: officialCount },
              { label: 'Entries', value: entries.length },
            ].map(({ label, value }) => (
              <div key={label} className="bg-[#262626] rounded p-2 text-center">
                <p className="text-lg font-bold text-white">{value}</p>
                <p className="text-xs text-gray-400">{label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 2. Session Rundown */}
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-sm">Session Rundown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.keys(sessionsByClass).length === 0 && (
            <p className="text-gray-500 text-xs">No sessions found for this event.</p>
          )}
          {Object.entries(sessionsByClass).map(([cls, clsSessions]) => (
            <div key={cls}>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{cls}</p>
              <div className="space-y-1">
                {clsSessions.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setAnnouncerSelectedSessionId(s.id === announcerSelectedSessionId ? null : s.id)}
                    className={`w-full flex items-center justify-between text-left px-3 py-2 rounded border transition-colors text-sm ${
                      announcerSelectedSessionId === s.id
                        ? 'bg-purple-900/30 border-purple-700'
                        : 'bg-[#262626] border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <span className="text-white">
                      {s.session_type}{s.session_number ? ` ${s.session_number}` : ''}
                      {s.name && s.name !== `${s.session_type} ${s.session_number}` ? ` — ${s.name}` : ''}
                    </span>
                    <div className="flex items-center gap-2">
                      {s.scheduled_time && (
                        <span className="text-xs text-gray-500">{new Date(s.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      )}
                      <Badge className={`text-xs ${statusColors[s.status] || 'bg-gray-700/60 text-gray-400'}`}>{s.status || 'Draft'}</Badge>
                      <ChevronRight className={`w-3.5 h-3.5 text-gray-500 transition-transform ${announcerSelectedSessionId === s.id ? 'rotate-90' : ''}`} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 3. Live Grid Preview */}
      {announcerSelectedSessionId && selectedSession && (
        <Card className="bg-[#171717] border-gray-800">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-sm">
                {selectedSession.session_type}{selectedSession.session_number ? ` ${selectedSession.session_number}` : ''} — {getClassName(selectedSession.series_class_id, selectedSession.class_name)}
              </CardTitle>
              <CopyButton text={buildRundown()} label="Copy Rundown" small />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Key Storylines for heat/final type sessions */}
            {['Heat', 'LCQ', 'Final'].includes(selectedSession.session_type) && (
              <div>
                <label className="text-xs text-gray-500 block mb-1">Key Storylines (local only)</label>
                <Textarea
                  placeholder="Notes for on-air, not saved..."
                  rows={2}
                  className="bg-[#262626] border-gray-700 text-white text-xs resize-none"
                />
              </div>
            )}

            {sessionResults.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-700">
                      {['P', 'Car', 'Driver', 'Team', 'Status', 'Best Lap'].map(h => (
                        <th key={h} className="text-left text-gray-500 px-1.5 py-1 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sessionResults.map(r => (
                      <tr key={r.id} className="border-b border-gray-800/50">
                        <td className="px-1.5 py-1.5 font-bold text-white">{r.position || '—'}</td>
                        <td className="px-1.5 py-1.5 font-mono text-gray-300">{r.car_number || entries.find(e => e.driver_id === r.driver_id)?.car_number || '—'}</td>
                        <td className="px-1.5 py-1.5 text-white">{getDriverName(r.driver_id)}</td>
                        <td className="px-1.5 py-1.5 text-gray-400">{r.team_id ? getTeamName(r.team_id) : '—'}</td>
                        <td className="px-1.5 py-1.5">
                          <Badge className={`text-xs ${r.status === 'Running' ? 'bg-green-900/40 text-green-300' : r.status === 'DNF' ? 'bg-red-900/40 text-red-300' : 'bg-gray-700/60 text-gray-400'}`}>
                            {r.status || '—'}
                          </Badge>
                        </td>
                        <td className="px-1.5 py-1.5 font-mono text-gray-300">
                          {r.best_lap_time_ms ? `${(r.best_lap_time_ms / 1000).toFixed(3)}s` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-xs py-3 text-center">No results posted yet for this session</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* 4. Driver Notes */}
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <User className="w-4 h-4" /> Driver Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Search driver or car #..."
            value={driverSearch}
            onChange={e => { setDriverSearch(e.target.value); setSelectedDriver(null); }}
            className="bg-[#262626] border-gray-700 text-white text-sm"
          />
          {filteredDriverEntries.length > 0 && !selectedDriver && (
            <div className="space-y-1">
              {filteredDriverEntries.map(entry => {
                const d = getDriver(entry.driver_id);
                return (
                  <button
                    key={entry.id}
                    onClick={() => { setSelectedDriver(entry); setDriverSearch(''); }}
                    className="w-full flex items-center justify-between text-left px-3 py-2 rounded bg-[#262626] border border-gray-700 hover:border-gray-600 transition-colors"
                  >
                    <span className="text-white text-sm">{getDriverName(entry.driver_id)}</span>
                    <span className="text-xs text-gray-500 font-mono">#{entry.car_number || '—'}</span>
                  </button>
                );
              })}
            </div>
          )}

          {selectedDriver && (() => {
            const d = getDriver(selectedDriver.driver_id);
            return (
              <div className="bg-[#262626] border border-gray-700 rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-white">{getDriverName(selectedDriver.driver_id)}</p>
                    <p className="text-xs text-gray-400 font-mono">#{selectedDriver.car_number || '—'}</p>
                  </div>
                  <button onClick={() => setSelectedDriver(null)} className="text-gray-500 hover:text-white text-xs">✕</button>
                </div>
                {d && (
                  <div className="text-xs text-gray-400 space-y-0.5">
                    {d.hometown_city && <p>📍 {d.hometown_city}{d.hometown_state ? `, ${d.hometown_state}` : ''}</p>}
                    {d.primary_discipline && <p>🏁 {d.primary_discipline}</p>}
                    {selectedDriver.team_id && <p>🏎 {getTeamName(selectedDriver.team_id)}</p>}
                  </div>
                )}
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Announcer Notes (local only)</label>
                  <Textarea
                    value={driverNotes[selectedDriver.driver_id] || ''}
                    onChange={e => setDriverNotes(n => ({ ...n, [selectedDriver.driver_id]: e.target.value }))}
                    placeholder="Background, storylines, quotes..."
                    rows={3}
                    className="bg-[#1A1A1A] border-gray-700 text-white text-xs resize-none"
                  />
                </div>
                <CopyButton text={buildDriverCard(selectedDriver)} label="Copy Driver Card" small />
              </div>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
}