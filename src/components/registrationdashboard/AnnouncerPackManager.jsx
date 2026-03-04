/**
 * Announcer Pack Manager
 * Generates a clean, printable event briefing with export to CSV and clipboard.
 */
import React, { useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { REG_QK } from './queryKeys';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';
import { Download, Copy, FileText } from 'lucide-react';
import { toast } from 'sonner';

const DQ = applyDefaultQueryOptions();

export default function AnnouncerPackManager({
  selectedEvent,
  selectedTrack,
  dashboardContext,
}) {
  const eventId = selectedEvent?.id;

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: sessions = [] } = useQuery({
    queryKey: REG_QK.sessions(eventId),
    queryFn: () => (eventId ? base44.entities.Session.filter({ event_id: eventId }) : Promise.resolve([])),
    enabled: !!eventId,
    ...DQ,
  });

  const { data: entries = [] } = useQuery({
    queryKey: REG_QK.entries(eventId),
    queryFn: () => (eventId ? base44.entities.Entry.filter({ event_id: eventId }) : Promise.resolve([])),
    enabled: !!eventId,
    ...DQ,
  });

  const { data: driverPrograms = [] } = useQuery({
    queryKey: REG_QK.driverPrograms(eventId),
    queryFn: () => (eventId ? base44.entities.DriverProgram.filter({ event_id: eventId }) : Promise.resolve([])),
    enabled: !!eventId && entries.length === 0,
    ...DQ,
  });

  const { data: results = [] } = useQuery({
    queryKey: REG_QK.results(eventId),
    queryFn: () => (eventId ? base44.entities.Results.filter({ event_id: eventId }) : Promise.resolve([])),
    enabled: !!eventId,
    ...DQ,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['announcerPack_drivers'],
    queryFn: () => base44.entities.Driver.list('-created_date', 500),
    staleTime: 60_000,
    ...DQ,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['announcerPack_teams'],
    queryFn: () => base44.entities.Team.list('-created_date', 200),
    staleTime: 60_000,
    ...DQ,
  });

  const { data: seriesClasses = [] } = useQuery({
    queryKey: ['announcerPack_seriesClasses'],
    queryFn: () => base44.entities.SeriesClass.list('-created_date', 500),
    staleTime: 60_000,
    ...DQ,
  });

  const { data: series = [] } = useQuery({
    queryKey: ['announcerPack_series'],
    queryFn: () => base44.entities.Series.list('-created_date', 100),
    staleTime: 60_000,
    ...DQ,
  });

  // ── Derived data ───────────────────────────────────────────────────────────

  const driverMap = useMemo(() => Object.fromEntries(drivers.map((d) => [d.id, d])), [drivers]);
  const teamMap = useMemo(() => Object.fromEntries(teams.map((t) => [t.id, t])), [teams]);
  const classMap = useMemo(() => Object.fromEntries(seriesClasses.map((c) => [c.id, c])), [seriesClasses]);
  const seriesMap = useMemo(() => Object.fromEntries(series.map((s) => [s.id, s])), [series]);

  // Use entries if available, fallback to DriverProgram
  const listData = useMemo(() => {
    if (entries.length > 0) return entries;
    return driverPrograms.map((dp) => ({
      id: dp.id,
      event_id: dp.event_id,
      driver_id: dp.driver_id,
      series_class_id: dp.series_class_id,
      team_id: dp.team_id,
      car_number: dp.car_number,
      _from_driver_program: true,
    }));
  }, [entries, driverPrograms]);

  // Group entries by class
  const entriesByClass = useMemo(() => {
    const grouped = {};
    listData.forEach((e) => {
      const classId = e.series_class_id || 'unassigned';
      if (!grouped[classId]) grouped[classId] = [];
      grouped[classId].push(e);
    });
    return grouped;
  }, [listData]);

  // Sessions sorted
  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => {
      const orderA = a.session_order || 0;
      const orderB = b.session_order || 0;
      if (orderA !== orderB) return orderA - orderB;
      const timeA = a.scheduled_time ? new Date(a.scheduled_time).getTime() : 0;
      const timeB = b.scheduled_time ? new Date(b.scheduled_time).getTime() : 0;
      return timeA - timeB;
    });
  }, [sessions]);

  // Results by session
  const resultsBySession = useMemo(() => {
    const map = {};
    results.forEach((r) => {
      if (!map[r.session_id]) map[r.session_id] = [];
      map[r.session_id].push(r);
    });
    Object.keys(map).forEach((key) => {
      map[key].sort((a, b) => (a.position || 999) - (b.position || 999));
    });
    return map;
  }, [results]);

  // Compute storylines
  const storylines = useMemo(() => {
    const lines = [];

    // If results exist, add winner storyline
    if (results.length > 0) {
      const latestSession = sortedSessions[sortedSessions.length - 1];
      if (latestSession && resultsBySession[latestSession.id]) {
        const sessionResults = resultsBySession[latestSession.id];
        if (sessionResults.length > 0) {
          const winner = sessionResults[0];
          const driver = driverMap[winner.driver_id];
          if (driver) {
            lines.push(`🏆 Latest winner: ${driver.first_name} ${driver.last_name} in ${latestSession.session_type}`);
          }
        }
      }
    }

    // Podium finishers
    if (Object.keys(resultsBySession).length > 0) {
      const allPodiumDrivers = new Set();
      Object.values(resultsBySession).forEach((sessionResults) => {
        sessionResults.slice(0, 3).forEach((r) => {
          if (driverMap[r.driver_id]) allPodiumDrivers.add(r.driver_id);
        });
      });
      if (allPodiumDrivers.size > 0) {
        lines.push(`🎯 Podium finishers this weekend: ${allPodiumDrivers.size} unique drivers`);
      }
    }

    // Entry count
    if (listData.length > 0) {
      lines.push(`📊 Total entries: ${listData.length} drivers across ${Object.keys(entriesByClass).length} classes`);
    }

    // Session count
    if (sortedSessions.length > 0) {
      lines.push(`⏱️ Schedule: ${sortedSessions.length} sessions planned`);
    }

    // Class battles
    Object.entries(entriesByClass).forEach(([classId, classEntries]) => {
      if (classEntries.length > 10) {
        const className = classMap[classId]?.class_name || 'Unassigned';
        lines.push(`⚔️ Strong competition in ${className}: ${classEntries.length} entries`);
      }
    });

    // Generic placeholders if needed
    while (lines.length < 6) {
      const placeholders = [
        '👀 Watch for unexpected upsets this weekend',
        '🔧 Technical issues could reshape the standings',
        '🌟 Underdogs to watch: check the full entry list',
        '💪 Veteran drivers looking to prove a point',
        '🎪 Event promises exciting action in every session',
      ];
      lines.push(placeholders[lines.length % placeholders.length]);
    }

    return lines.slice(0, 10);
  }, [results, sortedSessions, resultsBySession, driverMap, listData, entriesByClass, classMap]);

  // Last updated
  const lastUpdated = useMemo(() => {
    const times = [
      ...sessions.map((s) => new Date(s.created_date).getTime()),
      ...results.map((r) => new Date(r.created_date).getTime()),
      ...listData.map((e) => new Date(e.created_date).getTime()),
    ];
    if (times.length === 0) return new Date();
    return new Date(Math.max(...times));
  }, [sessions, results, listData]);

  // ── Exports ────────────────────────────────────────────────────────────────

  const handleExportCSV = useCallback(() => {
    const rows = [];
    const headers = [
      'event_id',
      'event_name',
      'track_name',
      'series_name',
      'season',
      'series_class_id',
      'class_name',
      'car_number',
      'driver_id',
      'driver_name',
      'team_name',
      'flags',
    ];
    rows.push(headers);

    listData.forEach((entry) => {
      const driver = driverMap[entry.driver_id];
      const team = teamMap[entry.team_id];
      const cls = classMap[entry.series_class_id];
      const seriesData = seriesMap[selectedEvent.series_id];

      const flags = [];
      if (entry.payment_status === 'Unpaid') flags.push('unpaid');
      if (!entry.waiver_verified) flags.push('waiver_missing');
      if (entry.tech_status && entry.tech_status !== 'Passed') flags.push('tech_pending');
      if (!entry.transponder_id) flags.push('missing_transponder');

      rows.push([
        selectedEvent.id || '',
        selectedEvent.name || '',
        selectedTrack?.name || '',
        seriesData?.name || selectedEvent.series_name || '',
        selectedEvent.season || '',
        entry.series_class_id || '',
        cls?.class_name || entry.class_name || '',
        entry.car_number || driverMap[entry.driver_id]?.primary_number || '',
        entry.driver_id || '',
        driver ? `${driver.first_name} ${driver.last_name}` : '',
        team?.name || '',
        flags.join(', '),
      ]);
    });

    const csv = rows.map((row) => row.map((cell) => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedEvent.name || 'event'}_entries.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  }, [listData, driverMap, teamMap, classMap, seriesMap, selectedEvent, selectedTrack]);

  const handleCopySummary = useCallback(() => {
    const summary = [
      '═════════════════════════════════════════',
      'ANNOUNCER PACK - EVENT BRIEFING',
      '═════════════════════════════════════════',
      '',
      '📌 EVENT OVERVIEW',
      `Event: ${selectedEvent.name}`,
      `Track: ${selectedTrack?.name || 'Not specified'}`,
      `Date: ${selectedEvent.event_date}${selectedEvent.end_date && selectedEvent.end_date !== selectedEvent.event_date ? ` – ${selectedEvent.end_date}` : ''}`,
      `Status: ${selectedEvent.status || 'Upcoming'}`,
      '',
      '⏰ SCHEDULE (Next 5)',
      ...sortedSessions.slice(0, 5).map((s) => {
        const time = s.scheduled_time ? new Date(s.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Time TBD';
        return `  ${time} - ${s.session_type}${s.session_number ? ` ${s.session_number}` : ''} (${s.name || 'Unnamed'})`;
      }),
      '',
      '👥 ENTRIES BY CLASS',
      ...Object.entries(entriesByClass).map(([classId, classEntries]) => {
        const className = classMap[classId]?.class_name || 'Unassigned';
        return `  ${className}: ${classEntries.length} entries`;
      }),
      '',
      '⭐ KEY STORYLINES',
      ...storylines.map((s) => `  ${s}`),
      '',
      '📊 QUICK FACTS',
      `  Total Entries: ${listData.length}`,
      `  Classes: ${Object.keys(entriesByClass).length}`,
      `  Sessions: ${sortedSessions.length}`,
      `  Last Updated: ${lastUpdated.toLocaleString()}`,
      '',
      '═════════════════════════════════════════',
    ].join('\n');

    navigator.clipboard.writeText(summary);
    toast.success('Summary copied to clipboard');
  }, [selectedEvent, selectedTrack, sortedSessions, entriesByClass, classMap, listData, storylines, lastUpdated]);

  if (!selectedEvent) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-20 text-center">
          <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-white font-semibold text-lg mb-1">Announcer Pack</p>
          <p className="text-gray-400 text-sm">Select an event to generate a briefing.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-white text-2xl">{selectedEvent.name}</CardTitle>
              {selectedTrack && <p className="text-sm text-gray-400 mt-1">{selectedTrack.name}</p>}
              <p className="text-xs text-gray-500 mt-1">
                {selectedEvent.event_date}
                {selectedEvent.end_date && selectedEvent.end_date !== selectedEvent.event_date ? ` – ${selectedEvent.end_date}` : ''}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleCopySummary}
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-9"
              >
                <Copy className="w-3 h-3 mr-1" /> Copy Summary
              </Button>
              <Button
                onClick={handleExportCSV}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9"
              >
                <Download className="w-3 h-3 mr-1" /> Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* ── Event Overview ────────────────────────────────────────────────── */}
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white text-sm">Event Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-500 text-xs">Name</p>
              <p className="text-white">{selectedEvent.name}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Track</p>
              <p className="text-white">{selectedTrack?.name || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Series</p>
              <p className="text-white">{seriesMap[selectedEvent.series_id]?.name || selectedEvent.series_name || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Status</p>
              <Badge className="bg-blue-900/40 text-blue-300 text-xs">{selectedEvent.status || 'Upcoming'}</Badge>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Dates</p>
              <p className="text-white">
                {selectedEvent.event_date}
                {selectedEvent.end_date && selectedEvent.end_date !== selectedEvent.event_date ? ` – ${selectedEvent.end_date}` : ''}
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Season</p>
              <p className="text-white">{selectedEvent.season || 'Not specified'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Schedule Snapshot ─────────────────────────────────────────────── */}
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white text-sm">Schedule Snapshot ({sortedSessions.length} sessions)</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedSessions.length === 0 ? (
            <p className="text-gray-500 text-xs py-4">No sessions built yet</p>
          ) : (
            <div className="space-y-2">
              {sortedSessions.map((session) => (
                <div key={session.id} className="bg-[#262626] rounded p-3 border border-gray-700 flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-white font-semibold text-sm">
                      {session.session_type}
                      {session.session_number ? ` ${session.session_number}` : ''}
                      {session.name && session.name !== session.session_type ? ` — ${session.name}` : ''}
                    </p>
                    <p className="text-gray-400 text-xs">{classMap[session.series_class_id]?.class_name || 'Unassigned'}</p>
                    {session.scheduled_time && (
                      <p className="text-gray-500 text-xs">
                        {new Date(session.scheduled_time).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <Badge className="bg-gray-700 text-gray-300 text-xs">{session.status || 'Draft'}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Entry List by Class ───────────────────────────────────────────── */}
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white text-sm">Entry List by Class ({listData.length} entries)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {listData.length === 0 ? (
            <p className="text-gray-500 text-xs py-4">No entries yet</p>
          ) : (
            Object.entries(entriesByClass)
              .sort((a, b) => {
                const nameA = classMap[a[0]]?.class_name || a[0];
                const nameB = classMap[b[0]]?.class_name || b[0];
                return nameA.localeCompare(nameB);
              })
              .map(([classId, classEntries]) => (
                <div key={classId}>
                  <p className="text-white font-semibold text-xs uppercase tracking-wide mb-2">
                    {classMap[classId]?.class_name || 'Unassigned'} ({classEntries.length})
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="text-left text-gray-500 px-2 py-1">Car</th>
                          <th className="text-left text-gray-500 px-2 py-1">Driver</th>
                          <th className="text-left text-gray-500 px-2 py-1">Team</th>
                          <th className="text-left text-gray-500 px-2 py-1">Flags</th>
                        </tr>
                      </thead>
                      <tbody>
                        {classEntries
                          .sort((a, b) => {
                            const driverA = driverMap[a.driver_id];
                            const driverB = driverMap[b.driver_id];
                            const nameA = driverA ? `${driverA.first_name} ${driverA.last_name}` : '';
                            const nameB = driverB ? `${driverB.first_name} ${driverB.last_name}` : '';
                            return nameA.localeCompare(nameB);
                          })
                          .map((entry) => {
                            const driver = driverMap[entry.driver_id];
                            const team = teamMap[entry.team_id];
                            const flags = [];
                            if (entry.payment_status === 'Unpaid') flags.push('unpaid');
                            if (!entry.waiver_verified) flags.push('waiver');
                            if (entry.tech_status && entry.tech_status !== 'Passed') flags.push('tech');
                            if (!entry.transponder_id) flags.push('xpndr');

                            return (
                              <tr key={entry.id} className="border-b border-gray-800">
                                <td className="px-2 py-1 text-gray-300 font-mono">
                                  #{entry.car_number || driver?.primary_number || '—'}
                                </td>
                                <td className="px-2 py-1 text-gray-300">
                                  {driver ? `${driver.first_name} ${driver.last_name}` : 'Driver'}
                                </td>
                                <td className="px-2 py-1 text-gray-500">{team?.name || '—'}</td>
                                <td className="px-2 py-1 text-gray-400">
                                  {flags.length > 0 ? flags.join(', ') : '✓'}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
          )}
        </CardContent>
      </Card>

      {/* ── Storylines ────────────────────────────────────────────────────── */}
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white text-sm">Key Storylines</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {storylines.map((line, idx) => (
              <li key={idx} className="text-gray-300 text-sm">
                {line}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* ── Quick Facts ───────────────────────────────────────────────────── */}
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white text-sm">Quick Facts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-500 text-xs">Total Entries</p>
              <p className="text-white text-lg font-bold">{listData.length}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Classes</p>
              <p className="text-white text-lg font-bold">{Object.keys(entriesByClass).length}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Sessions</p>
              <p className="text-white text-lg font-bold">{sortedSessions.length}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Last Updated</p>
              <p className="text-white text-xs">{lastUpdated.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}