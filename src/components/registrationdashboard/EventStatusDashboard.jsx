import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Clock, Users, CheckCircle, BarChart3, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { computeEventMetrics } from './eventMetrics';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';

const DQ = applyDefaultQueryOptions();

export default function EventStatusDashboard({
  selectedEvent,
  dashboardContext,
  dashboardPermissions,
  invalidateAfterOperation,
  onTabChange,
}) {
  // Load sessions
  const { data: sessions = [], refetch: refetchSessions } = useQuery({
    queryKey: ['sessions', selectedEvent?.id],
    queryFn: () => base44.entities.Session.filter({ event_id: selectedEvent.id }),
    enabled: !!selectedEvent?.id,
    ...DQ,
  });

  // Load entries
  const { data: entries = [], refetch: refetchEntries } = useQuery({
    queryKey: ['entries', selectedEvent?.id],
    queryFn: () => base44.entities.Entry.filter({ event_id: selectedEvent.id }),
    enabled: !!selectedEvent?.id,
    ...DQ,
  });

  // Load results
  const { data: results = [], refetch: refetchResults } = useQuery({
    queryKey: ['results', selectedEvent?.id],
    queryFn: () => base44.entities.Results.filter({ event_id: selectedEvent.id }),
    enabled: !!selectedEvent?.id,
    ...DQ,
  });

  // Load standings
  const { data: standings = [], refetch: refetchStandings } = useQuery({
    queryKey: ['standings', selectedEvent.series_id, dashboardContext?.seasonYear],
    queryFn: () => (selectedEvent.series_id
      ? base44.entities.Standings.filter({
          series_id: selectedEvent.series_id,
          season: dashboardContext?.seasonYear,
        })
      : Promise.resolve([])),
    enabled: !!selectedEvent.series_id,
    ...DQ,
  });

  // Load operation logs
  const { data: operationLogs = [], refetch: refetchLogs } = useQuery({
    queryKey: ['operationLogs', selectedEvent?.id],
    queryFn: async () => {
      const logs = await base44.entities.OperationLog.list('-created_date', 200);
      return logs.filter((l) => l.metadata?.event_id === selectedEvent.id);
    },
    enabled: !!selectedEvent?.id,
    ...DQ,
  });

  // Compute metrics
  const metrics = useMemo(
    () => computeEventMetrics({ sessions, entries, results, standings, operationLogs }),
    [sessions, entries, results, standings, operationLogs]
  );

  if (!selectedEvent) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center">
          <p className="text-gray-400">Select an event to view status dashboard</p>
        </CardContent>
      </Card>
    );
  }

  const handleRefresh = async () => {
    try {
      await Promise.all([
        refetchSessions(),
        refetchEntries(),
        refetchResults(),
        refetchStandings(),
        refetchLogs(),
      ]);
      toast.success('Dashboard refreshed');
    } catch (err) {
      toast.error('Failed to refresh');
    }
  };

  const statusColor = (value, total, threshold = 0.8) => {
    if (total === 0) return 'text-gray-400';
    const pct = value / total;
    if (pct >= threshold) return 'text-green-400';
    if (pct > 0) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">{selectedEvent.name}</h2>
          <p className="text-sm text-gray-400 mt-1">
            {new Date(selectedEvent.event_date).toLocaleDateString()} • Operational Dashboard
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          variant="outline"
          size="sm"
          className="border-gray-700 text-gray-300 hover:bg-gray-800"
        >
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
        {/* Sessions */}
        <Card className="bg-[#171717] border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-400">Sessions</p>
              <Clock className="w-4 h-4 text-gray-500" />
            </div>
            <p className={`text-lg font-bold ${statusColor(metrics.sessionsCompleted, metrics.totalSessions)}`}>
              {metrics.sessionsCompleted}/{metrics.totalSessions}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {metrics.sessionsInProgress > 0 && `${metrics.sessionsInProgress} in progress`}
              {metrics.sessionsInProgress === 0 && `${metrics.sessionsRemaining} remaining`}
            </p>
          </CardContent>
        </Card>

        {/* Entries */}
        <Card className="bg-[#171717] border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-400">Check-in</p>
              <Users className="w-4 h-4 text-gray-500" />
            </div>
            <p className={`text-lg font-bold ${statusColor(metrics.checkedInCount, metrics.totalEntries)}`}>
              {metrics.checkedInCount}/{metrics.totalEntries}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {metrics.unpaidCount > 0 && `${metrics.unpaidCount} unpaid`}
            </p>
          </CardContent>
        </Card>

        {/* Tech */}
        <Card className="bg-[#171717] border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-400">Tech Passed</p>
              <CheckCircle className="w-4 h-4 text-gray-500" />
            </div>
            <p className={`text-lg font-bold ${statusColor(metrics.techedCount, metrics.totalEntries)}`}>
              {metrics.techedCount}/{metrics.totalEntries}
            </p>
            <p className="text-xs text-gray-500 mt-1">Inspection progress</p>
          </CardContent>
        </Card>

        {/* Results */}
        <Card className="bg-[#171717] border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-400">Results</p>
              <BarChart3 className="w-4 h-4 text-gray-500" />
            </div>
            <p className={`text-lg font-bold ${statusColor(metrics.resultsPublishedCount, metrics.totalSessions)}`}>
              {metrics.resultsPublishedCount}/{metrics.totalSessions}
            </p>
            <p className="text-xs text-gray-500 mt-1">Official sessions</p>
          </CardContent>
        </Card>

        {/* Standings */}
        <Card className="bg-[#171717] border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-400">Standings</p>
              <Trophy className="w-4 h-4 text-gray-500" />
            </div>
            <p className={`text-lg font-bold ${metrics.standingsCalculated ? 'text-green-400' : 'text-yellow-400'}`}>
              {metrics.standingsCalculated ? 'Calculated' : 'Pending'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {standings.length > 0 ? `${standings.length} classes` : 'Not yet'}
            </p>
          </CardContent>
        </Card>

        {/* Last action */}
        <Card className="bg-[#171717] border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-400">Last Action</p>
              <Clock className="w-4 h-4 text-gray-500" />
            </div>
            <p className="text-xs text-gray-300 font-mono">
              {metrics.lastRaceControlAction
                ? new Date(metrics.lastRaceControlAction).toLocaleTimeString()
                : 'No activity'}
            </p>
            <p className="text-xs text-gray-500 mt-1">Race control</p>
          </CardContent>
        </Card>
      </div>

      {/* Session progress table */}
      {sessions.length > 0 && (
        <Card className="bg-[#171717] border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Session Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b border-gray-800">
                  <tr>
                    <th className="text-left py-2 px-3 text-gray-400 font-semibold">Session</th>
                    <th className="text-left py-2 px-3 text-gray-400 font-semibold">Status</th>
                    <th className="text-left py-2 px-3 text-gray-400 font-semibold">Results</th>
                    <th className="text-left py-2 px-3 text-gray-400 font-semibold">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.slice(0, 8).map((s) => {
                    const sessionResults = results.filter((r) => r.session_id === s.id);
                    const resultStatus = sessionResults.length === 0 ? 'None' : sessionResults[0].status || 'Draft';
                    return (
                      <tr key={s.id} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                        <td className="py-2 px-3 text-white">{s.name}</td>
                        <td className="py-2 px-3">
                          <Badge className={`text-xs ${
                            s.status === 'completed' ? 'bg-green-500/20 text-green-400'
                              : s.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-gray-500/20 text-gray-400'
                          }`}>
                            {s.status}
                          </Badge>
                        </td>
                        <td className="py-2 px-3">
                          <Badge className={`text-xs ${
                            resultStatus === 'Official' || resultStatus === 'Locked' ? 'bg-green-500/20 text-green-400'
                              : resultStatus === 'Provisional' ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-gray-500/20 text-gray-400'
                          }`}>
                            {resultStatus}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 text-gray-400 font-mono">
                          {s.scheduled_time ? new Date(s.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Entry progress */}
      {entries.length > 0 && (
        <Card className="bg-[#171717] border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Entry Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="text-center">
                <p className="text-xs text-gray-400 mb-1">Registered</p>
                <p className="text-2xl font-bold text-blue-400">
                  {entries.filter((e) => e.entry_status === 'Registered').length}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-400 mb-1">Checked In</p>
                <p className="text-2xl font-bold text-green-400">
                  {entries.filter((e) => e.entry_status === 'Checked In').length}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-400 mb-1">Teched</p>
                <p className="text-2xl font-bold text-purple-400">
                  {entries.filter((e) => e.entry_status === 'Teched').length}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-400 mb-1">Withdrawn</p>
                <p className="text-2xl font-bold text-gray-400">
                  {entries.filter((e) => e.entry_status === 'Withdrawn').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick actions */}
      <div className="flex gap-2 flex-wrap justify-end">
        <Button
          onClick={() => onTabChange?.('entries')}
          size="sm"
          className="bg-cyan-700 hover:bg-cyan-600 text-white"
        >
          Manage Entries
        </Button>
        <Button
          onClick={() => onTabChange?.('checkin')}
          size="sm"
          className="bg-green-700 hover:bg-green-600 text-white"
        >
          Check-in
        </Button>
        <Button
          onClick={() => onTabChange?.('tech')}
          size="sm"
          className="bg-purple-700 hover:bg-purple-600 text-white"
        >
          Tech
        </Button>
        <Button
          onClick={() => onTabChange?.('results')}
          size="sm"
          className="bg-orange-700 hover:bg-orange-600 text-white"
        >
          Results
        </Button>
      </div>
    </div>
  );
}