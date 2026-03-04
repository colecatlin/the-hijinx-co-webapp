/**
 * Exports Manager
 * One-click exports for entries, sessions, results, and standings
 */
import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { REG_QK } from './queryKeys';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';
import { AlertCircle, Download, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { canAction } from '@/components/access/accessControl';

const DQ = applyDefaultQueryOptions();

// ── Helper: Generate timestamp for filename ────────────────────────────────
const getTimestamp = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}${month}${day}_${hours}${minutes}`;
};

// ── Helper: Convert array of objects to CSV string ──────────────────────────
const arrayToCSV = (data, headers) => {
  if (data.length === 0) return headers.join(',');
  const rows = [headers.join(',')];
  data.forEach((item) => {
    const row = headers.map((header) => {
      const value = item[header];
      if (value === undefined || value === null) return '';
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return String(value);
    });
    rows.push(row.join(','));
  });
  return rows.join('\n');
};

// ── Helper: Download CSV file ──────────────────────────────────────────────
const downloadCSV = (csvContent, filename) => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default function ExportsManager({
  selectedEvent,
  selectedTrack,
  selectedSeries,
  dashboardContext,
  dashboardPermissions,
  invalidateAfterOperation,
}) {
  const eventId = selectedEvent?.id;
  const queryClient = useQueryClient();
  const canExport = canAction(dashboardPermissions, 'export');

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: entries = [] } = useQuery({
    queryKey: REG_QK.entries(eventId),
    queryFn: () => (eventId ? base44.entities.Entry.filter({ event_id: eventId }) : Promise.resolve([])),
    enabled: !!eventId && canExport,
    ...DQ,
  });

  const { data: driverPrograms = [] } = useQuery({
    queryKey: ['exports_driverPrograms'],
    queryFn: () => (eventId ? base44.entities.DriverProgram.filter({ event_id: eventId }) : Promise.resolve([])),
    enabled: !!eventId && canExport,
    ...DQ,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: REG_QK.sessions(eventId),
    queryFn: () => (eventId ? base44.entities.Session.filter({ event_id: eventId }) : Promise.resolve([])),
    enabled: !!eventId && canExport,
    ...DQ,
  });

  const { data: results = [] } = useQuery({
    queryKey: REG_QK.results(eventId),
    queryFn: () => (eventId ? base44.entities.Results.filter({ event_id: eventId }) : Promise.resolve([])),
    enabled: !!eventId && canExport,
    ...DQ,
  });

  const { data: standings = [] } = useQuery({
    queryKey: ['exports_standings'],
    queryFn: () => (eventId ? base44.entities.Standings.filter({ event_id: eventId }) : Promise.resolve([])),
    enabled: !!eventId && canExport,
    ...DQ,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['exports_drivers'],
    queryFn: () => base44.entities.Driver.list('-created_date', 1000),
    staleTime: 60_000,
    enabled: canExport,
    ...DQ,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['exports_teams'],
    queryFn: () => base44.entities.Team.list('-created_date', 500),
    staleTime: 60_000,
    enabled: canExport,
    ...DQ,
  });

  const { data: operationLogs = [] } = useQuery({
    queryKey: ['exports_operationLogs'],
    queryFn: () => base44.entities.OperationLog.list('-created_date', 200),
    staleTime: 30_000,
    enabled: !!eventId && canExport,
    ...DQ,
  });

  const { data: eventClasses = [] } = useQuery({
    queryKey: ['exports_eventClasses'],
    queryFn: () => (eventId ? base44.entities.EventClass.filter({ event_id: eventId }) : Promise.resolve([])),
    enabled: !!eventId && canExport,
    ...DQ,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────

  const logExportMutation = useMutation({
    mutationFn: (data) => base44.entities.OperationLog.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exports_operationLogs'] });
      invalidateAfterOperation('operation_logged');
    },
    onError: (err) => {
      console.error('Failed to log export:', err);
    },
  });

  // ── Derived data ───────────────────────────────────────────────────────────

  const driverMap = useMemo(() => Object.fromEntries(drivers.map((d) => [d.id, d])), [drivers]);
  const teamMap = useMemo(() => Object.fromEntries(teams.map((t) => [t.id, t])), [teams]);
  const sessionMap = useMemo(() => Object.fromEntries(sessions.map((s) => [s.id, s])), [sessions]);
  const classMap = useMemo(() => Object.fromEntries(eventClasses.map((c) => [c.id, c])), [eventClasses]);

  // Filter export logs
  const exportLogs = useMemo(() => {
    return operationLogs
      .filter((log) => log.operation_type === 'export' && log.metadata)
      .slice(0, 25);
  }, [operationLogs]);

  // ── Export functions ───────────────────────────────────────────────────────

  const exportEntries = useCallback(() => {
    const timestamp = getTimestamp();
    const filename = `entries_${eventId}_${timestamp}.csv`;

    const primaryData = entries.length > 0 ? entries : driverPrograms;
    const exportData = primaryData.map((item) => {
      const driver = driverMap[item.driver_id];
      const team = teamMap[item.team_id];
      const eventClass = classMap[item.event_class_id];

      return {
        event_id: eventId,
        event_name: selectedEvent?.name || '',
        class_id: item.event_class_id || '',
        class_name: eventClass?.class_name || '',
        car_number: item.car_number || '',
        driver_first_name: driver?.first_name || '',
        driver_last_name: driver?.last_name || '',
        team_name: team?.name || '',
        status: item.entry_status || item.status || '',
      };
    });

    const headers = [
      'event_id',
      'event_name',
      'class_id',
      'class_name',
      'car_number',
      'driver_first_name',
      'driver_last_name',
      'team_name',
      'status',
    ];

    const csv = arrayToCSV(exportData, headers);
    downloadCSV(csv, filename);

    logExportMutation.mutate({
      operation_type: 'export',
      source_type: 'manual',
      entity_name: 'ExportsCenter',
      status: 'success',
      metadata: JSON.stringify({
        event_id: eventId,
        export_type: 'entries',
        row_count: exportData.length,
        filename,
        timestamp_client: new Date().toISOString(),
      }),
    });

    toast.success(`Exported ${exportData.length} entries`);
  }, [eventId, entries, driverPrograms, selectedEvent, driverMap, teamMap, classMap, logExportMutation]);

  const exportResults = useCallback(() => {
    const timestamp = getTimestamp();
    const filename = `results_${eventId}_${timestamp}.csv`;

    const exportData = results.map((result) => {
      const driver = driverMap[result.driver_id];
      const team = teamMap[result.team_id];
      const session = sessionMap[result.session_id];

      return {
        event_id: eventId,
        session_id: result.session_id || '',
        session_name: session?.name || '',
        session_type: session?.session_type || '',
        series_class_id: result.series_class_id || '',
        position: result.position || '',
        driver_first_name: driver?.first_name || '',
        driver_last_name: driver?.last_name || '',
        team_name: team?.name || '',
        laps_completed: result.laps_completed || '',
        best_lap_time_ms: result.best_lap || '',
        status: result.status || '',
        points: result.points || '',
      };
    });

    const headers = [
      'event_id',
      'session_id',
      'session_name',
      'session_type',
      'series_class_id',
      'position',
      'driver_first_name',
      'driver_last_name',
      'team_name',
      'laps_completed',
      'best_lap_time_ms',
      'status',
      'points',
    ];

    const csv = arrayToCSV(exportData, headers);
    downloadCSV(csv, filename);

    logExportMutation.mutate({
      operation_type: 'export',
      source_type: 'manual',
      entity_name: 'ExportsCenter',
      status: 'success',
      metadata: JSON.stringify({
        event_id: eventId,
        export_type: 'results',
        row_count: exportData.length,
        filename,
        timestamp_client: new Date().toISOString(),
      }),
    });

    toast.success(`Exported ${exportData.length} results`);
  }, [eventId, results, driverMap, teamMap, sessionMap, logExportMutation]);

  const exportWeekendSummary = useCallback(() => {
    const timestamp = getTimestamp();
    const filename = `weekend_summary_${eventId}_${timestamp}.csv`;

    const exportData = sessions.map((session) => {
      const sessionResults = results.filter((r) => r.session_id === session.id);
      const uniqueDrivers = new Set(sessionResults.map((r) => r.driver_id));

      return {
        session_id: session.id,
        session_name: session.name,
        session_type: session.session_type,
        status: session.status || '',
        results_count: sessionResults.length,
        unique_drivers_count: uniqueDrivers.size,
      };
    });

    const headers = ['session_id', 'session_name', 'session_type', 'status', 'results_count', 'unique_drivers_count'];
    const csv = arrayToCSV(exportData, headers);
    downloadCSV(csv, filename);

    logExportMutation.mutate({
      operation_type: 'export',
      source_type: 'manual',
      entity_name: 'ExportsCenter',
      status: 'success',
      metadata: JSON.stringify({
        event_id: eventId,
        export_type: 'weekend_summary',
        row_count: exportData.length,
        filename,
        timestamp_client: new Date().toISOString(),
      }),
    });

    toast.success(`Exported ${exportData.length} sessions`);
  }, [eventId, sessions, results, logExportMutation]);

  const exportStandings = useCallback(() => {
    if (standings.length === 0) {
      toast.info('No standings calculated yet');
      return;
    }

    const timestamp = getTimestamp();
    const filename = `standings_${selectedSeries?.id || eventId}_${dashboardContext?.seasonYear || 'unknown'}_${timestamp}.csv`;

    const exportData = standings.map((standing) => {
      const driver = driverMap[standing.driver_id];

      return {
        series_id: standing.series_id || '',
        season: standing.season || dashboardContext?.seasonYear || '',
        series_class_id: standing.series_class_id || '',
        rank: standing.rank || '',
        driver_first_name: driver?.first_name || '',
        driver_last_name: driver?.last_name || '',
        total_points: standing.total_points || '',
      };
    });

    const headers = ['series_id', 'season', 'series_class_id', 'rank', 'driver_first_name', 'driver_last_name', 'total_points'];
    const csv = arrayToCSV(exportData, headers);
    downloadCSV(csv, filename);

    logExportMutation.mutate({
      operation_type: 'export',
      source_type: 'manual',
      entity_name: 'ExportsCenter',
      status: 'success',
      metadata: JSON.stringify({
        event_id: eventId,
        export_type: 'standings',
        row_count: exportData.length,
        filename,
        timestamp_client: new Date().toISOString(),
      }),
    });

    toast.success(`Exported ${exportData.length} standings`);
  }, [eventId, standings, driverMap, selectedSeries, dashboardContext, logExportMutation]);

  const exportPointsLedger = useCallback(() => {
    const timestamp = getTimestamp();
    const filename = `points_ledger_${eventId}_${timestamp}.csv`;

    const exportData = results.map((result) => {
      const driver = driverMap[result.driver_id];

      return {
        event_id: eventId,
        session_id: result.session_id || '',
        series_class_id: result.series_class_id || '',
        driver_first_name: driver?.first_name || '',
        driver_last_name: driver?.last_name || '',
        points: result.points || '',
        position: result.position || '',
        status: result.status || '',
      };
    });

    const headers = ['event_id', 'session_id', 'series_class_id', 'driver_first_name', 'driver_last_name', 'points', 'position', 'status'];
    const csv = arrayToCSV(exportData, headers);
    downloadCSV(csv, filename);

    logExportMutation.mutate({
      operation_type: 'export',
      source_type: 'manual',
      entity_name: 'ExportsCenter',
      status: 'success',
      metadata: JSON.stringify({
        event_id: eventId,
        export_type: 'points_ledger',
        row_count: exportData.length,
        filename,
        timestamp_client: new Date().toISOString(),
      }),
    });

    toast.success(`Exported ${exportData.length} points entries`);
  }, [eventId, results, driverMap, logExportMutation]);

  const exportIncidentLog = useCallback(() => {
    const timestamp = getTimestamp();
    const filename = `incident_log_${eventId}_${timestamp}.csv`;

    const eventLogs = operationLogs.filter((log) => {
      try {
        const metadata = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata;
        return metadata?.event_id === eventId;
      } catch {
        return false;
      }
    });

    const exportData = eventLogs.map((log) => ({
      created_date: log.created_date || '',
      operation_type: log.operation_type || '',
      status: log.status || '',
      entity_name: log.entity_name || '',
      event_id: eventId,
      metadata_json: log.metadata || '',
    }));

    const headers = ['created_date', 'operation_type', 'status', 'entity_name', 'event_id', 'metadata_json'];
    const csv = arrayToCSV(exportData, headers);
    downloadCSV(csv, filename);

    logExportMutation.mutate({
      operation_type: 'export',
      source_type: 'manual',
      entity_name: 'ExportsCenter',
      status: 'success',
      metadata: JSON.stringify({
        event_id: eventId,
        export_type: 'incident_log',
        row_count: exportData.length,
        filename,
        timestamp_client: new Date().toISOString(),
      }),
    });

    toast.success(`Exported ${exportData.length} log entries`);
  }, [eventId, operationLogs, logExportMutation]);

  // ── Empty/No access state ──────────────────────────────────────────────────

  if (!canExport) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center">
          <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-white font-semibold mb-1">Export Access Required</p>
          <p className="text-gray-400 text-sm">You do not have permission to export data for this event.</p>
        </CardContent>
      </Card>
    );
  }

  if (!selectedEvent) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-20 text-center">
          <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-white font-semibold text-lg mb-1">Exports</p>
          <p className="text-gray-400 text-sm">Select an event to access exports.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader>
          <div>
            <CardTitle className="text-white text-2xl">Exports</CardTitle>
            <p className="text-sm text-gray-400 mt-1">One-click exports for entries, sessions, results, and standings</p>
          </div>
        </CardHeader>
      </Card>

      {/* ── Two Column Layout ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Export Buttons */}
        <div className="lg:col-span-2 space-y-3">
          <Card className="bg-[#171717] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white text-sm">Available Exports</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Button
                onClick={exportEntries}
                className="text-xs h-12 bg-blue-600 hover:bg-blue-700 flex flex-col items-center justify-center gap-1"
              >
                <Download className="w-4 h-4" /> Entries List
              </Button>
              <Button
                onClick={exportResults}
                className="text-xs h-12 bg-green-600 hover:bg-green-700 flex flex-col items-center justify-center gap-1"
              >
                <Download className="w-4 h-4" /> Session Results
              </Button>
              <Button
                onClick={exportWeekendSummary}
                className="text-xs h-12 bg-purple-600 hover:bg-purple-700 flex flex-col items-center justify-center gap-1"
              >
                <Download className="w-4 h-4" /> Weekend Summary
              </Button>
              <Button
                onClick={exportStandings}
                className="text-xs h-12 bg-orange-600 hover:bg-orange-700 flex flex-col items-center justify-center gap-1"
              >
                <Download className="w-4 h-4" /> Standings
              </Button>
              <Button
                onClick={exportPointsLedger}
                className="text-xs h-12 bg-indigo-600 hover:bg-indigo-700 flex flex-col items-center justify-center gap-1"
              >
                <Download className="w-4 h-4" /> Points Ledger
              </Button>
              <Button
                onClick={exportIncidentLog}
                className="text-xs h-12 bg-red-600 hover:bg-red-700 flex flex-col items-center justify-center gap-1"
              >
                <Download className="w-4 h-4" /> Incident Log
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right: Export History */}
        <div>
          <Card className="bg-[#171717] border-gray-800 h-full">
            <CardHeader>
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <Clock className="w-4 h-4" /> Export History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {exportLogs.length === 0 ? (
                <p className="text-gray-500 text-xs py-4">No exports yet</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {exportLogs.map((log) => {
                    let metadata = {};
                    try {
                      metadata = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata;
                    } catch {
                      // ignore
                    }

                    const time = new Date(log.created_date).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <div key={log.id} className="bg-[#262626] rounded p-2 text-xs space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-300 font-semibold capitalize">
                            {metadata.export_type?.replace(/_/g, ' ') || 'Unknown'}
                          </span>
                          <span className="text-gray-500">{time}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge className="text-xs bg-green-900/50 text-green-300">
                            {metadata.row_count || 0} rows
                          </Badge>
                          <Badge className="text-xs bg-gray-700">{log.status}</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}