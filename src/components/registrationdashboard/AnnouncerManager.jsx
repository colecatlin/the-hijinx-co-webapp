/**
 * Announcer Manager
 * Generate announcer packs, run sheets, and quick storylines from live data.
 */
import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { REG_QK } from './queryKeys';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';
import { AlertCircle, Copy, Download, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const DQ = applyDefaultQueryOptions();

// ── Helper Functions ───────────────────────────────────────────────────────

function formatDateRange(startDate, endDate) {
  if (!startDate) return 'TBD';
  const start = new Date(startDate).toLocaleDateString();
  if (!endDate) return start;
  const end = new Date(endDate).toLocaleDateString();
  return `${start} – ${end}`;
}

function groupSessionsByClass(sessions, classMap) {
  const grouped = {};
  sessions.forEach((s) => {
    const classId = s.series_class_id || s.event_class_id;
    const className = classId && classMap[classId] ? classMap[classId].class_name : 'Unassigned';
    if (!grouped[className]) grouped[className] = [];
    grouped[className].push(s);
  });
  return grouped;
}

function computeEventStatsFromResults(results, drivers, teams, classMap) {
  const stats = {
    resultsByClass: {},
    driverWins: {},
    driverBestFinish: {},
    driverTopFives: {},
    driverAvgFinish: {},
  };

  // Results by class
  results.forEach((r) => {
    const classId = r.series_class_id;
    if (!stats.resultsByClass[classId]) stats.resultsByClass[classId] = 0;
    stats.resultsByClass[classId]++;

    // Wins in Finals
    if (r.session_type === 'Final' && r.position === 1) {
      if (!stats.driverWins[r.driver_id]) stats.driverWins[r.driver_id] = 0;
      stats.driverWins[r.driver_id]++;
    }

    // Best finish
    if (!stats.driverBestFinish[r.driver_id] || r.position < stats.driverBestFinish[r.driver_id]) {
      stats.driverBestFinish[r.driver_id] = r.position;
    }

    // Top 5s
    if (r.position <= 5) {
      if (!stats.driverTopFives[r.driver_id]) stats.driverTopFives[r.driver_id] = 0;
      stats.driverTopFives[r.driver_id]++;
    }

    // Avg finish
    if (!stats.driverAvgFinish[r.driver_id]) stats.driverAvgFinish[r.driver_id] = [];
    stats.driverAvgFinish[r.driver_id].push(r.position);
  });

  // Compute avg finishes
  Object.keys(stats.driverAvgFinish).forEach((driverId) => {
    const positions = stats.driverAvgFinish[driverId];
    stats.driverAvgFinish[driverId] = positions.reduce((a, b) => a + b, 0) / positions.length;
  });

  return stats;
}

function buildAnnouncerPackText(event, track, series, sessions, stats, drivers, classMap, standings) {
  const lines = [];

  lines.push('INDEX46 RACE CORE, ANNOUNCER PACK');
  lines.push('');
  lines.push(`Event: ${event.name}`);
  lines.push(`Track: ${track ? track.name : 'TBD'}`);
  lines.push(`Dates: ${formatDateRange(event.event_date, event.end_date)}`);
  if (series) lines.push(`Series: ${series.name}`);
  lines.push('');

  // Run Sheet
  lines.push('RUN SHEET');
  lines.push('─'.repeat(60));
  sessions.forEach((s) => {
    const time = s.scheduled_time ? new Date(s.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
    const className = classMap[s.series_class_id || s.event_class_id]?.class_name || 'Unassigned';
    lines.push(`${time} | ${s.name} | ${className} | ${s.status || 'Draft'}`);
  });
  lines.push('');

  // Class Leaders
  lines.push('CLASS LEADERS SNAPSHOT');
  lines.push('─'.repeat(60));
  const sessionsByClass = groupSessionsByClass(sessions, classMap);
  Object.entries(sessionsByClass).forEach(([className, classSessions]) => {
    lines.push(`${className}:`);
    // Find drivers in this class from results
    const classResults = [];
    Object.entries(stats.driverWins).forEach(([driverId, wins]) => {
      const driver = drivers[driverId];
      if (driver) {
        classResults.push({
          driver,
          wins,
          avgFinish: stats.driverAvgFinish[driverId] || 999,
        });
      }
    });
    classResults.sort((a, b) => b.wins - a.wins || a.avgFinish - b.avgFinish);
    classResults.slice(0, 3).forEach((cr, idx) => {
      lines.push(`  ${idx + 1}. ${cr.driver.first_name} ${cr.driver.last_name} (${cr.wins} wins, avg ${cr.avgFinish.toFixed(1)})`);
    });
  });
  lines.push('');

  // Top Storylines
  lines.push('TOP STORYLINES');
  lines.push('─'.repeat(60));

  // Most active class
  const mostActiveClass = Object.entries(stats.resultsByClass).sort((a, b) => b[1] - a[1])[0];
  if (mostActiveClass) {
    const className = classMap[mostActiveClass[0]]?.class_name || 'Class';
    lines.push(`• Most active: ${className} (${mostActiveClass[1]} results)`);
  }

  // Hot hand
  const topWinner = Object.entries(stats.driverWins)
    .sort((a, b) => b[1] - a[1])[0];
  if (topWinner) {
    const driver = drivers[topWinner[0]];
    if (driver) {
      lines.push(`• Hot hand: ${driver.first_name} ${driver.last_name} (${topWinner[1]} wins)`);
    }
  }

  // Consistency watch
  const mostConsistent = Object.entries(stats.driverTopFives)
    .sort((a, b) => b[1] - a[1])[0];
  if (mostConsistent) {
    const driver = drivers[mostConsistent[0]];
    if (driver) {
      lines.push(`• Consistency watch: ${driver.first_name} ${driver.last_name} (${mostConsistent[1]} top 5s)`);
    }
  }

  // Best average finish
  const bestAvg = Object.entries(stats.driverAvgFinish)
    .sort((a, b) => a[1] - b[1])[0];
  if (bestAvg) {
    const driver = drivers[bestAvg[0]];
    if (driver) {
      lines.push(`• Best average: ${driver.first_name} ${driver.last_name} (${bestAvg[1].toFixed(1)})`);
    }
  }

  lines.push(`• Total sessions: ${sessions.length}`);
  lines.push(`• Total classes: ${Object.keys(sessionsByClass).length}`);
  lines.push('');

  lines.push('QUICK NOTES');
  lines.push('─'.repeat(60));
  lines.push('Add your booth notes here...');
  lines.push('');

  lines.push('─'.repeat(60));
  lines.push(`Generated ${new Date().toLocaleString()}`);

  return lines.join('\n');
}

// ── Component ──────────────────────────────────────────────────────────────

export default function AnnouncerManager({
  selectedEvent,
  selectedTrack,
  selectedSeries,
  dashboardContext,
  dashboardPermissions,
}) {
  const eventId = selectedEvent?.id;
  const [classFilter, setClassFilter] = useState('all');
  const [sessionFilter, setSessionFilter] = useState('all');
  const [includePracticeQualifying, setIncludePracticeQualifying] = useState(false);
  const [generatedPack, setGeneratedPack] = useState('');

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

  const { data: seriesClasses = [] } = useQuery({
    queryKey: ['announcerMgr_seriesClasses'],
    queryFn: () => base44.entities.SeriesClass.list('-created_date', 500),
    staleTime: 60_000,
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

  // ── Derived data ───────────────────────────────────────────────────────────

  const driverMap = useMemo(() => Object.fromEntries(drivers.map((d) => [d.id, d])), [drivers]);
  const teamMap = useMemo(() => Object.fromEntries(teams.map((t) => [t.id, t])), [teams]);
  const classMap = useMemo(
    () => Object.fromEntries(seriesClasses.map((c) => [c.id, c])),
    [seriesClasses]
  );

  // Get unique classes from sessions
  const uniqueClasses = useMemo(() => {
    const classIds = new Set();
    sessions.forEach((s) => {
      if (s.series_class_id || s.event_class_id) {
        classIds.add(s.series_class_id || s.event_class_id);
      }
    });
    return Array.from(classIds);
  }, [sessions]);

  // Filter sessions by class and type
  const filteredSessions = useMemo(() => {
    let result = [...sessions];

    if (classFilter !== 'all') {
      result = result.filter((s) => (s.series_class_id || s.event_class_id) === classFilter);
    }

    if (!includePracticeQualifying) {
      result = result.filter((s) => s.session_type !== 'Practice' && s.session_type !== 'Qualifying');
    }

    if (sessionFilter !== 'all') {
      result = result.filter((s) => s.id === sessionFilter);
    }

    return result.sort((a, b) => (a.session_order || 0) - (b.session_order || 0));
  }, [sessions, classFilter, sessionFilter, includePracticeQualifying]);

  // Compute stats
  const stats = useMemo(
    () => computeEventStatsFromResults(results, driverMap, teamMap, classMap),
    [results, driverMap, teamMap, classMap]
  );

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleGeneratePack = useCallback(() => {
    const packText = buildAnnouncerPackText(
      selectedEvent,
      selectedTrack,
      selectedSeries,
      filteredSessions,
      stats,
      driverMap,
      classMap,
      null
    );
    setGeneratedPack(packText);
    toast.success('Pack generated');
  }, [selectedEvent, selectedTrack, selectedSeries, filteredSessions, stats, driverMap, classMap]);

  const handleCopyPack = useCallback(() => {
    if (!generatedPack) {
      toast.error('Generate pack first');
      return;
    }
    navigator.clipboard.writeText(generatedPack);
    toast.success('Copied to clipboard');
  }, [generatedPack]);

  const handleExportPack = useCallback(() => {
    if (!generatedPack) {
      toast.error('Generate pack first');
      return;
    }
    const blob = new Blob([generatedPack], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `index46_announcer_pack_${selectedEvent.id || 'event'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Pack exported');
  }, [generatedPack, selectedEvent.id]);

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
              <p className="text-sm text-gray-400 mt-1">Run sheet, quick facts, and storylines</p>
            </div>
          </div>
        </CardHeader>

        {/* Controls */}
        <CardContent className="space-y-3 border-t border-gray-700 pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Class</label>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="bg-[#262626] border-gray-700 text-white text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#262626] border-gray-700">
                  <SelectItem value="all" className="text-white">All Classes</SelectItem>
                  {uniqueClasses.map((classId) => (
                    <SelectItem key={classId} value={classId} className="text-white">
                      {classMap[classId]?.class_name || classId.slice(0, 6)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Session</label>
              <Select value={sessionFilter} onValueChange={setSessionFilter}>
                <SelectTrigger className="bg-[#262626] border-gray-700 text-white text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#262626] border-gray-700">
                  <SelectItem value="all" className="text-white">All Sessions</SelectItem>
                  {filteredSessions.map((session) => (
                    <SelectItem key={session.id} value={session.id} className="text-white">
                      {session.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end col-span-2 md:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includePracticeQualifying}
                  onChange={(e) => setIncludePracticeQualifying(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-xs text-gray-400">Include Practice & Qualifying</span>
              </label>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={handleGeneratePack}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9"
            >
              <Sparkles className="w-3 h-3 mr-1" /> Generate Pack
            </Button>
            <Button
              onClick={handleCopyPack}
              disabled={!generatedPack}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs h-9"
            >
              <Copy className="w-3 h-3 mr-1" /> Copy Pack
            </Button>
            <Button
              onClick={handleExportPack}
              disabled={!generatedPack}
              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs h-9"
            >
              <Download className="w-3 h-3 mr-1" /> Export TXT
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Two Column Layout ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Run Sheet */}
          <Card className="bg-[#171717] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white text-lg">Run Sheet</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredSessions.length === 0 ? (
                <p className="text-gray-500 text-sm py-4">No sessions found</p>
              ) : (
                <div className="space-y-2">
                  {filteredSessions.map((session) => {
                    const className = classMap[session.series_class_id || session.event_class_id]?.class_name || '—';
                    const time = session.scheduled_time
                      ? new Date(session.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : '—';
                    return (
                      <div key={session.id} className="bg-[#262626] rounded p-2 text-xs flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-white font-mono font-semibold">{time}</p>
                          <p className="text-gray-300">{session.name}</p>
                          <p className="text-gray-500">{className}</p>
                        </div>
                        <Badge className={`text-xs ${session.status === 'Official' ? 'bg-green-900/50 text-green-300' : 'bg-gray-700 text-gray-200'}`}>
                          {session.status || 'Draft'}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Facts */}
          <Card className="bg-[#171717] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white text-lg">Event Quick Facts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="bg-[#262626] rounded p-3 space-y-1">
                <p className="text-gray-400">Event <span className="text-white float-right">{selectedEvent.name}</span></p>
                <p className="text-gray-400">Track <span className="text-white float-right">{selectedTrack?.name || '—'}</span></p>
                <p className="text-gray-400">Dates <span className="text-white float-right">{formatDateRange(selectedEvent.event_date, selectedEvent.end_date)}</span></p>
                {selectedSeries && <p className="text-gray-400">Series <span className="text-white float-right">{selectedSeries.name}</span></p>}
                <p className="text-gray-400">Sessions <span className="text-white float-right">{filteredSessions.length}</span></p>
                <p className="text-gray-400">Classes <span className="text-white float-right">{uniqueClasses.length}</span></p>
              </div>
            </CardContent>
          </Card>

          {/* Top Storylines */}
          <Card className="bg-[#171717] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white text-lg">Top Storylines</CardTitle>
            </CardHeader>
            <CardContent>
              {results.length === 0 ? (
                <p className="text-gray-500 text-sm py-4">No results yet</p>
              ) : (
                <ul className="space-y-2 text-xs text-gray-300">
                  {Object.entries(stats.resultsByClass).length > 0 && (
                    <li>• Most active: {classMap[Object.entries(stats.resultsByClass).sort((a, b) => b[1] - a[1])[0][0]]?.class_name}</li>
                  )}
                  {Object.entries(stats.driverWins).length > 0 && (
                    <li>• Hot hand: {driverMap[Object.entries(stats.driverWins).sort((a, b) => b[1] - a[1])[0][0]]?.first_name} {driverMap[Object.entries(stats.driverWins).sort((a, b) => b[1] - a[1])[0][0]]?.last_name}</li>
                  )}
                  {Object.entries(stats.driverTopFives).length > 0 && (
                    <li>• Consistency: {driverMap[Object.entries(stats.driverTopFives).sort((a, b) => b[1] - a[1])[0][0]]?.first_name} {driverMap[Object.entries(stats.driverTopFives).sort((a, b) => b[1] - a[1])[0][0]]?.last_name}</li>
                  )}
                  <li>• Total results: {results.length}</li>
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Generated Pack */}
          <Card className="bg-[#171717] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white text-lg">Announcer Pack</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Click 'Generate Pack' to create your announcer briefing..."
                value={generatedPack}
                readOnly
                className="bg-[#262626] border-gray-700 text-white text-xs font-mono min-h-96"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}