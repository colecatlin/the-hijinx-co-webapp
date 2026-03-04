/**
 * Announcer Manager
 * Generate announcer packs with storylines, grids, and quick facts.
 */
import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { REG_QK } from './queryKeys';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';
import {
  formatDriverName,
  formatDateTime,
  buildClassOptionsFromSessions,
  computeStorylines,
  buildAnnouncerPackText,
} from './announcerPackUtils';
import { AlertCircle, Copy, Download } from 'lucide-react';
import { toast } from 'sonner';

const DQ = applyDefaultQueryOptions();

function hasEntryEntity() {
  try {
    return !!base44?.entities?.Entry;
  } catch {
    return false;
  }
}

export default function AnnouncerManager({
  selectedEvent,
  selectedTrack,
  selectedSeries,
  dashboardContext,
  dashboardPermissions,
}) {
  const eventId = selectedEvent?.id;
  const useEntry = hasEntryEntity();

  // ── State ──────────────────────────────────────────────────────────────────

  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [finalsOnly, setFinalsOnly] = useState(true);

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: sessions = [] } = useQuery({
    queryKey: REG_QK.sessions(eventId),
    queryFn: () => (eventId ? base44.entities.Session.filter({ event_id: eventId }) : Promise.resolve([])),
    enabled: !!eventId,
    ...DQ,
  });

  const { data: results = [] } = useQuery({
    queryKey: REG_QK.results(eventId),
    queryFn: () => (eventId ? base44.entities.Results.filter({ event_id: eventId }) : Promise.resolve([])),
    enabled: !!eventId,
    ...DQ,
  });

  const { data: entries = [] } = useQuery({
    queryKey: REG_QK.entries(eventId),
    queryFn: () => (useEntry && eventId ? base44.entities.Entry.filter({ event_id: eventId }) : Promise.resolve([])),
    enabled: !!eventId && useEntry,
    ...DQ,
  });

  const { data: driverPrograms = [] } = useQuery({
    queryKey: ['announcerMgr_driverPrograms'],
    queryFn: () => (!useEntry && eventId ? base44.entities.DriverProgram.filter({ event_id: eventId }) : Promise.resolve([])),
    enabled: !!eventId && !useEntry,
    ...DQ,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['announcerMgr_drivers'],
    queryFn: () => base44.entities.Driver.list('-created_date', 500),
    staleTime: 60_000,
    ...DQ,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['announcerMgr_teams'],
    queryFn: () => base44.entities.Team.list('-created_date', 200),
    staleTime: 60_000,
    ...DQ,
  });

  const { data: seriesClasses = [] } = useQuery({
    queryKey: ['announcerMgr_seriesClasses'],
    queryFn: () => base44.entities.SeriesClass.list('-created_date', 500),
    staleTime: 60_000,
    ...DQ,
  });

  // ── Derived data ───────────────────────────────────────────────────────────

  const driverMap = useMemo(() => Object.fromEntries(drivers.map((d) => [d.id, d])), [drivers]);
  const teamMap = useMemo(() => Object.fromEntries(teams.map((t) => [t.id, t])), [teams]);
  const classMap = useMemo(
    () => Object.fromEntries(seriesClasses.map((c) => [c.id, c])),
    [seriesClasses]
  );

  // Filter sessions
  const filteredSessions = useMemo(() => {
    let result = [...sessions];
    if (finalsOnly) {
      result = result.filter((s) => s.session_type === 'Final');
    }
    return result.sort((a, b) => (a.session_order || 0) - (b.session_order || 0));
  }, [sessions, finalsOnly]);

  // Auto-select first session
  const selectedSession = useMemo(() => {
    if (!selectedSessionId && filteredSessions.length > 0) {
      return filteredSessions[0];
    }
    return sessions.find((s) => s.id === selectedSessionId);
  }, [sessions, filteredSessions, selectedSessionId]);

  // Class options
  const classOptions = useMemo(
    () => buildClassOptionsFromSessions(sessions, seriesClasses),
    [sessions, seriesClasses]
  );

  // Grid drivers (entries or driver programs)
  const gridDrivers = useMemo(() => {
    const raw = useEntry ? entries : driverPrograms;
    let result = raw.map((item) => ({
      ...item,
      driver_id: item.driver_id,
      car_number: item.car_number,
      team_name: item.team_id ? teamMap[item.team_id]?.name : null,
    }));

    // Filter by class if not all
    if (classFilter !== 'all') {
      result = result.filter((item) => {
        const itemClassId = item.event_class_id || item.series_class_id;
        return itemClassId === classFilter;
      });
    }

    return result;
  }, [entries, driverPrograms, useEntry, teamMap, classFilter]);

  // Top results for selected session
  const topResults = useMemo(() => {
    if (!selectedSession) return [];
    let sessionResults = results.filter((r) => r.session_id === selectedSession.id);
    sessionResults = sessionResults.filter((r) => r.position && r.position <= 10);
    return sessionResults.sort((a, b) => (a.position || 999) - (b.position || 999));
  }, [results, selectedSession]);

  // Storylines
  const storylines = useMemo(
    () =>
      computeStorylines({
        drivers: Object.values(driverMap),
        results,
        sessions: filteredSessions,
        track: selectedTrack,
        driverMap,
        classMap,
      }),
    [driverMap, classMap, results, filteredSessions, selectedTrack]
  );

  // Generate pack text
  const packText = useMemo(
    () =>
      buildAnnouncerPackText({
        selectedEvent,
        selectedTrack,
        selectedSession,
        classFilter,
        drivers: driverMap,
        topResults,
        gridDrivers,
        storylines,
      }),
    [selectedEvent, selectedTrack, selectedSession, classFilter, driverMap, topResults, gridDrivers, storylines]
  );

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleCopyPack = useCallback(() => {
    navigator.clipboard.writeText(packText);
    toast.success('Pack copied to clipboard');
  }, [packText]);

  // ── Empty state ────────────────────────────────────────────────────────────

  if (!selectedEvent) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-20 text-center">
          <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-white font-semibold text-lg mb-1">Announcer</p>
          <p className="text-gray-400 text-sm">Select an event to access announcer tools.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-white text-2xl">Announcer</CardTitle>
              <p className="text-sm text-gray-400 mt-1">Storylines, grids, stats, quick facts</p>
            </div>
          </div>
        </CardHeader>

        {/* Controls */}
        <CardContent className="space-y-3 border-t border-gray-700 pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Session</label>
              <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
                <SelectTrigger className="bg-[#262626] border-gray-700 text-white text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#262626] border-gray-700">
                  {filteredSessions.map((session) => (
                    <SelectItem key={session.id} value={session.id} className="text-white">
                      {session.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Class</label>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="bg-[#262626] border-gray-700 text-white text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#262626] border-gray-700">
                  <SelectItem value="all" className="text-white">All Classes</SelectItem>
                  {classOptions.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id} className="text-white">
                      {opt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end col-span-2 md:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={finalsOnly}
                  onChange={(e) => setFinalsOnly(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-xs text-gray-400">Finals only</span>
              </label>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={handleCopyPack}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9"
            >
              <Copy className="w-3 h-3 mr-1" /> Copy Pack
            </Button>
            <Button
              disabled
              className="bg-gray-700 text-gray-400 text-xs h-9 cursor-not-allowed"
            >
              <Download className="w-3 h-3 mr-1" /> Export PDF (Coming soon)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      {filteredSessions.length === 0 ? (
        <Card className="bg-[#171717] border-gray-800">
          <CardContent className="py-12 text-center text-gray-500 text-sm">
            No sessions yet. Add sessions in Classes & Sessions.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left pane: selectors and snapshot */}
          <div className="space-y-4">
            {/* Event Snapshot */}
            <Card className="bg-[#171717] border-gray-800">
              <CardHeader>
                <CardTitle className="text-white text-sm">Event Snapshot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-gray-400">Event</span><span className="text-white">{selectedEvent.name}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Track</span><span className="text-white">{selectedTrack?.name || '—'}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Date</span><span className="text-white">{selectedEvent.event_date ? new Date(selectedEvent.event_date).toLocaleDateString() : '—'}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Sessions</span><span className="text-white">{sessions.length}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Classes</span><span className="text-white">{classOptions.length}</span></div>
              </CardContent>
            </Card>

            {/* Session Snapshot */}
            {selectedSession && (
              <Card className="bg-[#171717] border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white text-sm">Session Snapshot</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-gray-400">Session</span><span className="text-white">{selectedSession.name}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Type</span><span className="text-white">{selectedSession.session_type}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Scheduled</span><span className="text-white">{formatDateTime(selectedSession.scheduled_time)}</span></div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Status</span>
                    <div className="flex items-center gap-2">
                      <Badge className="text-xs bg-gray-700">{selectedSession.status || 'Draft'}</Badge>
                      {selectedSession.locked && <Badge className="text-xs bg-red-900">Locked</Badge>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right pane: top 3, grid, storylines */}
          <div className="space-y-4">
            {/* Top 3 Preview */}
            {topResults.length > 0 && (
              <Card className="bg-[#171717] border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white text-sm">Top 3 Preview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  {topResults.slice(0, 3).map((r, idx) => {
                    const driver = driverMap[r.driver_id];
                    return (
                      <div key={r.id} className="flex items-center gap-2">
                        <span className="text-gray-500 font-semibold">{idx + 1}.</span>
                        <span className="text-white flex-1">{formatDriverName(driver)}</span>
                        <span className="text-gray-500">#{r.car_number || driver?.primary_number || '—'}</span>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Starting Grid / Entry List */}
            {gridDrivers.length > 0 && (
              <Card className="bg-[#171717] border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white text-sm">Starting Grid</CardTitle>
                </CardHeader>
                <CardContent className="max-h-64 overflow-y-auto">
                  <div className="space-y-1 text-xs font-mono">
                    {gridDrivers.slice(0, 15).map((item, idx) => {
                      const driver = driverMap[item.driver_id];
                      return (
                        <div key={item.id || idx} className="flex gap-2 text-gray-300">
                          <span className="w-2 text-gray-600">#{item.car_number || driver?.primary_number || '—'}</span>
                          <span className="flex-1 truncate">{formatDriverName(driver)}</span>
                          {item.team_name && <span className="text-gray-500 text-xs">{item.team_name.slice(0, 12)}</span>}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Storylines */}
            {storylines.length > 0 && (
              <Card className="bg-[#171717] border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white text-sm">Storylines</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-xs text-gray-300">
                    {storylines.slice(0, 6).map((line, idx) => (
                      <li key={idx} className="flex gap-2">
                        <span className="text-purple-400">•</span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ── Pack preview ──────────────────────────────────────────────────── */}
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white text-sm">Full Pack (Text)</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-[#262626] border border-gray-700 rounded p-3 text-xs text-gray-300 overflow-x-auto max-h-96 overflow-y-auto font-mono whitespace-pre-wrap break-words">
            {packText}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}