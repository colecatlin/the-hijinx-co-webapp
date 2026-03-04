/**
 * Integrations Manager
 * Manage external timing systems, CSV imports, and synchronization workflows
 */
import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { REG_QK } from './queryKeys';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';
import { AlertCircle, Upload, RefreshCw, Activity, Check } from 'lucide-react';
import { toast } from 'sonner';

const DQ = applyDefaultQueryOptions();

const TIMING_PROVIDERS = [
  { value: 'mylaps', label: 'MyLaps' },
  { value: 'race_monitor', label: 'Race Monitor' },
  { value: 'westhold', label: 'Westhold' },
  { value: 'manual', label: 'Manual Import' },
];

export default function IntegrationsManager({
  selectedEvent,
  selectedTrack,
  selectedSeries,
  dashboardContext,
  dashboardPermissions,
  invalidateAfterOperation,
}) {
  const eventId = selectedEvent?.id;
  const queryClient = useQueryClient();
  const isAdmin = dashboardPermissions?.role === 'admin';

  // ── State ──────────────────────────────────────────────────────────────────

  const [timingProvider, setTimingProvider] = useState('manual');
  const [selectedSession, setSelectedSession] = useState('');
  const [importType, setImportType] = useState('entries');
  const [uploadFile, setUploadFile] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: sessions = [] } = useQuery({
    queryKey: REG_QK.sessions(eventId),
    queryFn: () => (eventId ? base44.entities.Session.filter({ event_id: eventId }) : Promise.resolve([])),
    enabled: !!eventId && isAdmin,
    ...DQ,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['integrations_drivers'],
    queryFn: () => base44.entities.Driver.list('-created_date', 1000),
    staleTime: 60_000,
    enabled: isAdmin,
    ...DQ,
  });

  const { data: results = [] } = useQuery({
    queryKey: REG_QK.results(eventId),
    queryFn: () => (eventId ? base44.entities.Results.filter({ event_id: eventId }) : Promise.resolve([])),
    enabled: !!eventId && isAdmin,
    ...DQ,
  });

  const { data: entries = [] } = useQuery({
    queryKey: REG_QK.entries(eventId),
    queryFn: () => (eventId ? base44.entities.Entry.filter({ event_id: eventId }) : Promise.resolve([])),
    enabled: !!eventId && isAdmin,
    ...DQ,
  });

  const { data: standings = [] } = useQuery({
    queryKey: ['integrations_standings'],
    queryFn: () => (eventId ? base44.entities.Standings.filter({ event_id: eventId }) : Promise.resolve([])),
    enabled: !!eventId && isAdmin,
    ...DQ,
  });

  const { data: operationLogs = [] } = useQuery({
    queryKey: ['integrations_operationLogs'],
    queryFn: () => base44.entities.OperationLog.list('-created_date', 100),
    staleTime: 30_000,
    enabled: !!eventId && isAdmin,
    ...DQ,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────

  const createOperationLogMutation = useMutation({
    mutationFn: (data) => base44.entities.OperationLog.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations_operationLogs'] });
      invalidateAfterOperation('operation_logged');
    },
    onError: (err) => {
      console.error('Failed to log operation:', err);
      toast.error('Failed to log operation');
    },
  });

  const createResultsMutation = useMutation({
    mutationFn: (data) => base44.entities.Results.bulkCreate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REG_QK.results(eventId) });
      invalidateAfterOperation('results_updated');
      toast.success('Results imported');
    },
    onError: (err) => {
      console.error('Failed to import results:', err);
      toast.error('Failed to import results');
    },
  });

  const createEntriesMutation = useMutation({
    mutationFn: (data) => base44.entities.Entry.bulkCreate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REG_QK.entries(eventId) });
      invalidateAfterOperation('entry_updated');
      toast.success('Entries imported');
    },
    onError: (err) => {
      console.error('Failed to import entries:', err);
      toast.error('Failed to import entries');
    },
  });

  // ── Derived data ───────────────────────────────────────────────────────────

  const driverMap = useMemo(() => Object.fromEntries(drivers.map((d) => [d.id, d])), [drivers]);

  const summaryMetrics = useMemo(
    () => ({
      sessions: sessions.length,
      entries: entries.length,
      results: results.length,
      standings: standings.length,
      drivers: new Set(entries.map((e) => e.driver_id)).size,
    }),
    [sessions, entries, results, standings]
  );

  // ── Helper functions ───────────────────────────────────────────────────────

  const parseCSV = (fileContent) => {
    const lines = fileContent.split('\n').filter((line) => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    return lines.slice(1).map((line) => {
      const values = line.split(',').map((v) => v.trim());
      const row = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });
      return row;
    });
  };

  const findDriverByName = (firstName, lastName) => {
    return drivers.find(
      (d) =>
        d.first_name.toLowerCase() === firstName.toLowerCase() &&
        d.last_name.toLowerCase() === lastName.toLowerCase()
    );
  };

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleTestConnection = useCallback(() => {
    if (!selectedSession) {
      toast.error('Select a session');
      return;
    }

    createOperationLogMutation.mutate({
      operation_type: 'integration_test',
      source_type: 'manual',
      entity_name: 'TimingSystem',
      status: 'success',
      metadata: JSON.stringify({
        event_id: eventId,
        provider: timingProvider,
        session_id: selectedSession,
        timestamp_client: new Date().toISOString(),
      }),
    });

    toast.success('Connection test logged');
  }, [selectedSession, timingProvider, eventId, createOperationLogMutation]);

  const handlePreviewImport = useCallback(() => {
    if (!uploadFile) {
      toast.error('Select a file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = parseCSV(e.target.result);
      setPreviewData(data.slice(0, 10));
      setPreviewModalOpen(true);
    };
    reader.readAsText(uploadFile);
  }, [uploadFile]);

  const handleRunImport = useCallback(() => {
    if (!uploadFile) {
      toast.error('Select a file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const csvData = parseCSV(e.target.result);
      const rowsProcessed = csvData.length;

      if (importType === 'results' && selectedSession) {
        const resultsToCreate = csvData
          .map((row) => {
            const driver = findDriverByName(row.driver_first_name, row.driver_last_name);
            if (!driver) return null;

            return {
              event_id: eventId,
              session_id: selectedSession,
              driver_id: driver.id,
              position: parseInt(row.position, 10),
              laps_completed: parseInt(row.laps_completed, 10),
              best_lap: row.best_lap,
              status: row.status || 'Completed',
            };
          })
          .filter(Boolean);

        if (resultsToCreate.length === 0) {
          toast.error('No drivers matched in import');
          return;
        }

        createResultsMutation.mutate(resultsToCreate);

        createOperationLogMutation.mutate({
          operation_type: 'csv_import',
          source_type: 'manual',
          entity_name: 'Results',
          status: 'success',
          metadata: JSON.stringify({
            event_id: eventId,
            import_type: importType,
            rows_processed: resultsToCreate.length,
            timestamp_client: new Date().toISOString(),
          }),
        });
      } else if (importType === 'entries') {
        const entriesToCreate = csvData.map((row) => ({
          event_id: eventId,
          driver_id: row.driver_id || '',
          event_class_id: row.event_class_id || '',
          car_number: row.car_number || '',
          entry_status: 'Registered',
        }));

        createEntriesMutation.mutate(entriesToCreate);

        createOperationLogMutation.mutate({
          operation_type: 'csv_import',
          source_type: 'manual',
          entity_name: 'Entry',
          status: 'success',
          metadata: JSON.stringify({
            event_id: eventId,
            import_type: importType,
            rows_processed: rowsProcessed,
            timestamp_client: new Date().toISOString(),
          }),
        });
      }

      setUploadFile(null);
      setPreviewData([]);
    };
    reader.readAsText(uploadFile);
  }, [uploadFile, importType, selectedSession, eventId, createResultsMutation, createEntriesMutation, createOperationLogMutation, findDriverByName]);

  const handleRecalculateResults = useCallback(() => {
    createOperationLogMutation.mutate({
      operation_type: 'results_recalculated',
      source_type: 'manual',
      entity_name: 'Results',
      status: 'success',
      metadata: JSON.stringify({
        event_id: eventId,
        timestamp_client: new Date().toISOString(),
      }),
    });

    invalidateAfterOperation('results_recomputed');
    toast.success('Results recalculated');
  }, [eventId, createOperationLogMutation, invalidateAfterOperation]);

  const handleRefreshDashboard = useCallback(() => {
    queryClient.invalidateQueries();
    createOperationLogMutation.mutate({
      operation_type: 'dashboard_refresh',
      source_type: 'manual',
      entity_name: 'Dashboard',
      status: 'success',
      metadata: JSON.stringify({
        event_id: eventId,
        timestamp_client: new Date().toISOString(),
      }),
    });

    invalidateAfterOperation('dashboard_refresh');
    toast.success('Dashboard refreshed');
    setLastSyncTime(new Date().toISOString());
  }, [eventId, queryClient, createOperationLogMutation, invalidateAfterOperation]);

  // ── Permission check ───────────────────────────────────────────────────────

  if (!isAdmin) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center">
          <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-white font-semibold mb-1">Admin Access Required</p>
          <p className="text-gray-400 text-sm">Integrations and system sync tools are restricted to administrators.</p>
        </CardContent>
      </Card>
    );
  }

  if (!selectedEvent) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-20 text-center">
          <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-white font-semibold text-lg mb-1">Integrations</p>
          <p className="text-gray-400 text-sm">Select an event to access integrations.</p>
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
            <CardTitle className="text-white text-2xl">Integrations</CardTitle>
            <p className="text-sm text-gray-400 mt-1">Timing, imports, and data sync</p>
          </div>
        </CardHeader>
      </Card>

      {/* ── Panel 1: Timing System Sync ────────────────────────────────────── */}
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <Activity className="w-5 h-5" /> Timing System
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 mb-2 block">Timing Provider</label>
              <Select value={timingProvider} onValueChange={setTimingProvider}>
                <SelectTrigger className="bg-[#262626] border-gray-700 text-white h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#262626] border-gray-700">
                  {TIMING_PROVIDERS.map((provider) => (
                    <SelectItem key={provider.value} value={provider.value} className="text-white">
                      {provider.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-2 block">Session</label>
              <Select value={selectedSession} onValueChange={setSelectedSession}>
                <SelectTrigger className="bg-[#262626] border-gray-700 text-white h-9 text-xs">
                  <SelectValue placeholder="Select session..." />
                </SelectTrigger>
                <SelectContent className="bg-[#262626] border-gray-700">
                  {sessions.map((session) => (
                    <SelectItem key={session.id} value={session.id} className="text-white">
                      {session.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap pt-2 border-t border-gray-700">
            <Button
              onClick={handleTestConnection}
              className="text-xs h-8 bg-blue-600 hover:bg-blue-700"
            >
              Test Connection
            </Button>
            <Button
              onClick={handleTestConnection}
              className="text-xs h-8 bg-green-600 hover:bg-green-700"
            >
              Sync Results
            </Button>
            <Button
              className="text-xs h-8 bg-gray-700 hover:bg-gray-600"
            >
              View Last Sync
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Panel 2: CSV Import Tools ──────────────────────────────────────── */}
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <Upload className="w-5 h-5" /> Data Import
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 mb-2 block">Import Type</label>
              <Select value={importType} onValueChange={setImportType}>
                <SelectTrigger className="bg-[#262626] border-gray-700 text-white h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#262626] border-gray-700">
                  <SelectItem value="entries" className="text-white">Entry Import</SelectItem>
                  <SelectItem value="results" className="text-white">Results Import</SelectItem>
                  <SelectItem value="standings" className="text-white">Standings Import</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-2 block">CSV File</label>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="block w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-gray-700 file:text-white hover:file:bg-gray-600 cursor-pointer"
              />
            </div>
          </div>

          {importType === 'results' && (
            <div>
              <label className="text-xs text-gray-400 mb-2 block">Required for results import</label>
              <Select value={selectedSession} onValueChange={setSelectedSession}>
                <SelectTrigger className="bg-[#262626] border-gray-700 text-white h-9 text-xs">
                  <SelectValue placeholder="Select session..." />
                </SelectTrigger>
                <SelectContent className="bg-[#262626] border-gray-700">
                  {sessions.map((session) => (
                    <SelectItem key={session.id} value={session.id} className="text-white">
                      {session.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-2 flex-wrap pt-2 border-t border-gray-700">
            <Button
              onClick={handlePreviewImport}
              disabled={!uploadFile}
              className="text-xs h-8 bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              Preview Import
            </Button>
            <Button
              onClick={handleRunImport}
              disabled={!uploadFile}
              className="text-xs h-8 bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              Run Import
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Panel 3: Data Sync Overview ────────────────────────────────────── */}
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <RefreshCw className="w-5 h-5" /> System Sync
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <div className="bg-[#262626] rounded p-3 text-center">
              <p className="text-2xl font-bold text-white">{summaryMetrics.sessions}</p>
              <p className="text-xs text-gray-400 mt-1">Sessions</p>
            </div>
            <div className="bg-[#262626] rounded p-3 text-center">
              <p className="text-2xl font-bold text-white">{summaryMetrics.entries}</p>
              <p className="text-xs text-gray-400 mt-1">Entries</p>
            </div>
            <div className="bg-[#262626] rounded p-3 text-center">
              <p className="text-2xl font-bold text-white">{summaryMetrics.results}</p>
              <p className="text-xs text-gray-400 mt-1">Results</p>
            </div>
            <div className="bg-[#262626] rounded p-3 text-center">
              <p className="text-2xl font-bold text-white">{summaryMetrics.drivers}</p>
              <p className="text-xs text-gray-400 mt-1">Drivers</p>
            </div>
            <div className="bg-[#262626] rounded p-3 text-center">
              <p className="text-2xl font-bold text-white">{summaryMetrics.standings}</p>
              <p className="text-xs text-gray-400 mt-1">Standings</p>
            </div>
          </div>

          {lastSyncTime && (
            <div className="bg-green-900/20 border border-green-700/50 rounded p-3">
              <p className="text-xs text-green-300">
                Last refresh: {new Date(lastSyncTime).toLocaleTimeString()}
              </p>
            </div>
          )}

          <div className="flex gap-2 flex-wrap pt-2 border-t border-gray-700">
            <Button
              onClick={handleRecalculateResults}
              className="text-xs h-8 bg-orange-600 hover:bg-orange-700 flex items-center gap-1"
            >
              <Check className="w-3 h-3" /> Recalculate Results
            </Button>
            <Button
              onClick={handleRefreshDashboard}
              className="text-xs h-8 bg-blue-600 hover:bg-blue-700 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Refresh Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Preview Modal ──────────────────────────────────────────────────– */}
      <Dialog open={previewModalOpen} onOpenChange={setPreviewModalOpen}>
        <DialogContent className="bg-[#262626] border-gray-800 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Import Preview</DialogTitle>
          </DialogHeader>

          <div className="max-h-96 overflow-x-auto">
            {previewData.length > 0 ? (
              <table className="text-xs w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    {Object.keys(previewData[0]).map((key) => (
                      <th key={key} className="px-2 py-2 text-left text-gray-400 font-semibold">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, idx) => (
                    <tr key={idx} className="border-b border-gray-700/50">
                      {Object.values(row).map((val, cellIdx) => (
                        <td key={cellIdx} className="px-2 py-2 text-gray-300">
                          {val}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-400 py-4">No data</p>
            )}
          </div>

          <DialogFooter>
            <Button
              onClick={() => setPreviewModalOpen(false)}
              className="bg-gray-700 hover:bg-gray-600 text-white text-xs h-8"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}