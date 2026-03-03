import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertCircle, Lock, CheckCircle2, Download } from 'lucide-react';
import { toast } from 'sonner';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';
import { buildInvalidateAfterOperation } from './invalidationHelper';
import useDashboardMutation from './useDashboardMutation';
import ResultsEditorTable from './ResultsEditorTable';
import ResultsImportPanel from './ResultsImportPanel';
import ResultsVersionHistory from './ResultsVersionHistory';

const DQ = applyDefaultQueryOptions();

const STATUS_ORDER = ['Draft', 'Provisional', 'Official', 'Locked'];

function statusBadgeClass(status) {
  switch (status) {
    case 'Draft': return 'bg-gray-500/20 text-gray-400';
    case 'Provisional': return 'bg-blue-500/20 text-blue-400';
    case 'Official': return 'bg-green-500/20 text-green-400';
    case 'Locked': return 'bg-purple-500/20 text-purple-400';
    default: return 'bg-gray-500/20 text-gray-400';
  }
}

function downloadCSV(rows, filename) {
  const headers = ['position', 'driver_id', 'car_number', 'status', 'laps_completed', 'best_lap_time_ms', 'points', 'notes'];
  const csv = [headers, ...rows.map((r) => headers.map((h) => `"${String(r[h] ?? '').replace(/"/g, '""')}"`))].map((r) => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); URL.revokeObjectURL(url); a.remove();
}

export default function ResultsManager({
  selectedEvent,
  isAdmin,
  canAction,
  dashboardContext,
  invalidateAfterOperation: invalidateAfterOperationProp,
  standingsLastCalculatedAt,
  onSetStandingsDirty,
  onResultsProvisional,
  onResultsOfficial,
  onResultsLocked,
}) {
  const queryClient = useQueryClient();
  const invalidateAfterOperation = invalidateAfterOperationProp ?? buildInvalidateAfterOperation(queryClient);
  const eventId = selectedEvent?.id;

  // ── Selection state ──
  const [classFilter, setClassFilter] = useState('all');
  const [sessionId, setSessionId] = useState('');
  const [entryMode, setEntryMode] = useState('manual');
  const [pendingStatus, setPendingStatus] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);

  useEffect(() => {
    setClassFilter('all');
    setSessionId('');
    setEntryMode('manual');
  }, [eventId]);

  // ── Queries ──
  const { data: sessions = [], isLoading: sessionsLoading, isError: sessionsError, refetch: refetchSessions } = useQuery({
    queryKey: ['sessions', eventId],
    queryFn: () => base44.entities.Session.filter({ event_id: eventId }),
    enabled: !!eventId,
    ...DQ,
  });

  const selectedSession = useMemo(() => sessions.find((s) => s.id === sessionId) || null, [sessions, sessionId]);

  const { data: allResults = [], isLoading: resultsLoading, refetch: refetchResults } = useQuery({
    queryKey: ['results', eventId, sessionId],
    queryFn: () =>
      sessionId
        ? base44.entities.Results.filter({ event_id: eventId, session_id: sessionId })
        : base44.entities.Results.filter({ event_id: eventId }),
    enabled: !!eventId,
    ...DQ,
  });

  // Fallback: if session_id missing on some rows, also match by class/type
  const sessionResults = useMemo(() => {
    if (!selectedSession) return [];
    const direct = allResults.filter((r) => r.session_id === selectedSession.id);
    if (direct.length) return direct;
    // Fallback match
    return allResults.filter((r) =>
      r.session_type === selectedSession.session_type &&
      (r.series_class_id === selectedSession.series_class_id ||
        r.class_name === selectedSession.class_name)
    );
  }, [allResults, selectedSession]);

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.list('first_name', 500),
    ...DQ,
  });

  const { data: driverPrograms = [] } = useQuery({
    queryKey: ['driverPrograms', eventId],
    queryFn: () => base44.entities.DriverProgram.filter({ event_id: eventId }),
    enabled: !!eventId,
    ...DQ,
  });

  const { data: seriesClasses = [] } = useQuery({
    queryKey: ['seriesClasses'],
    queryFn: () => base44.entities.SeriesClass.list(),
    ...DQ,
  });

  // ── Derived data ──
  const classesMap = useMemo(() => Object.fromEntries(seriesClasses.map((c) => [c.id, c])), [seriesClasses]);

  const getSessionLabel = (s) => {
    const cls = s.series_class_id ? classesMap[s.series_class_id]?.class_name : s.class_name;
    const num = s.session_number ? ` #${s.session_number}` : '';
    return `${cls ? cls + ' – ' : ''}${s.session_type}${num}${s.name && s.name !== s.session_type ? ': ' + s.name : ''}`;
  };

  // All distinct classes used in sessions
  const classOptions = useMemo(() => {
    const seen = new Set();
    sessions.forEach((s) => {
      const name = s.series_class_id ? classesMap[s.series_class_id]?.class_name : s.class_name;
      if (name) seen.add(name);
    });
    return Array.from(seen).sort();
  }, [sessions, classesMap]);

  const filteredSessions = useMemo(() => {
    if (classFilter === 'all') return sessions;
    return sessions.filter((s) => {
      const name = s.series_class_id ? classesMap[s.series_class_id]?.class_name : s.class_name;
      return name === classFilter;
    });
  }, [sessions, classFilter, classesMap]);

  // ── Lock state ──
  const isLocked = selectedSession?.status === 'Locked' || !!selectedSession?.locked;
  const isOfficial = selectedSession?.status === 'Official';

  // ── Permission helpers ──
  const can = (action) => {
    if (isAdmin) return true;
    if (Array.isArray(canAction)) return canAction.includes(action);
    return false;
  };

  // ── Mutations ──
  const sharedOpts = {
    invalidateAfterOperation,
    dashboardContext: dashboardContext ?? { eventId },
    selectedEvent: selectedEvent ?? null,
  };

  const { mutateAsync: upsertResult, isPending: savingResults } = useDashboardMutation({
    operationType: 'results_updated',
    entityName: 'Results',
    mutationFn: async (rows) => {
      const ops = rows.map((row) => {
        const payload = {
          event_id: row.event_id || eventId,
          session_id: row.session_id || sessionId,
          driver_id: row.driver_id,
          program_id: row.program_id || undefined,
          team_id: row.team_id || undefined,
          series_id: row.series_id || selectedEvent?.series_id || undefined,
          series_class_id: row.series_class_id || selectedSession?.series_class_id || undefined,
          position: row.position !== '' ? parseInt(row.position) : null,
          status: row.status || 'Running',
          laps_completed: row.laps_completed !== '' ? parseInt(row.laps_completed) : null,
          best_lap_time_ms: row.best_lap_time_ms !== '' ? parseInt(row.best_lap_time_ms) : null,
          points: row.points !== '' ? parseFloat(row.points) : null,
          notes: row.notes || undefined,
          session_type: selectedSession?.session_type || undefined,
        };
        if (row.id) return base44.entities.Results.update(row.id, payload);
        return base44.entities.Results.create(payload);
      });
      return Promise.all(ops);
    },
    successMessage: 'Results saved',
    ...sharedOpts,
  });

  const { mutateAsync: importResults, isPending: importing } = useDashboardMutation({
    operationType: 'results_imported',
    entityName: 'Results',
    mutationFn: async (rows) => {
      const ops = rows.map((row) => base44.entities.Results.create(row));
      const created = await Promise.all(ops);
      // Mark session input_source = CSV
      if (selectedSession) {
        await base44.entities.Session.update(selectedSession.id, { input_source: 'CSV' });
      }
      return created;
    },
    successMessage: 'Results imported',
    ...sharedOpts,
  });

  const updateSessionStatus = useMutation({
    mutationFn: async (newStatus) => {
      const payload = { status: newStatus };
      if (newStatus === 'Locked') payload.locked = true;
      if (newStatus === 'Draft' || newStatus === 'Provisional') payload.locked = false;
      await base44.entities.Session.update(selectedSession.id, payload);
      if (newStatus === 'Official' || newStatus === 'Provisional') {
        if (onSetStandingsDirty) onSetStandingsDirty();
      }
      if (newStatus === 'Provisional' && onResultsProvisional) onResultsProvisional();
      if (newStatus === 'Official' && onResultsOfficial) onResultsOfficial();
      if (newStatus === 'Locked' && onResultsLocked) onResultsLocked();
    },
    onSuccess: (_, newStatus) => {
      queryClient.invalidateQueries({ queryKey: ['sessions', eventId] });
      invalidateAfterOperation('session_status_change', { eventId });
      setPendingStatus(null);
      toast.success(`Session marked ${newStatus}`);
    },
    onError: () => toast.error('Failed to update session status'),
  });

  // ── Validation for Official ──
  const validateForOfficial = () => {
    const errs = [];
    if (!sessionResults.length) errs.push('No results entered');
    if (sessionResults.some((r) => !r.driver_id)) errs.push('All rows must have a driver');
    const positions = sessionResults.filter((r) => r.status === 'Running').map((r) => r.position);
    if (new Set(positions).size !== positions.length) errs.push('Duplicate positions found');
    if (new Set(sessionResults.map((r) => r.driver_id)).size !== sessionResults.length)
      errs.push('Duplicate driver in session');
    return errs;
  };

  const handleStatusTransition = (newStatus) => {
    if (newStatus === 'Official') {
      const errs = validateForOfficial();
      if (errs.length) { setValidationErrors(errs); return; }
    }
    setValidationErrors([]);
    setPendingStatus(newStatus);
  };

  const handleSaveDraft = async (rows) => {
    await upsertResult(rows);
    // If Official and rows were edited, revert to Provisional
    if (isOfficial && !isLocked) {
      await base44.entities.Session.update(selectedSession.id, { status: 'Provisional' });
      queryClient.invalidateQueries({ queryKey: ['sessions', eventId] });
      toast.info('Session reverted to Provisional after edits');
    }
    queryClient.invalidateQueries({ queryKey: ['results', eventId, sessionId] });
  };

  const handleImport = async (rows, skippedCount) => {
    await importResults(rows);
    if (skippedCount) toast.warning(`${skippedCount} rows skipped (no driver match)`);
    queryClient.invalidateQueries({ queryKey: ['results', eventId, sessionId] });
  };

  const handleExportCSV = () => {
    if (!sessionResults.length) { toast.error('No results to export'); return; }
    const ts = new Date().toISOString().slice(0, 16).replace('T', '_');
    downloadCSV(sessionResults, `results-${sessionId}-${ts}.csv`);
  };

  // ── Guards ──
  if (!selectedEvent) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center">
          <AlertCircle className="w-8 h-8 text-yellow-500 mx-auto mb-3" />
          <p className="text-gray-400">Select a Track or Series, Season, and Event to manage results</p>
        </CardContent>
      </Card>
    );
  }

  if (sessionsLoading || resultsLoading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-gray-800/40 rounded animate-pulse" />)}
      </div>
    );
  }

  if (sessionsError) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center space-y-3">
          <p className="text-red-400 text-sm">Failed to load sessions</p>
          <Button size="sm" variant="outline" onClick={refetchSessions} className="border-gray-700 text-gray-300">Retry</Button>
        </CardContent>
      </Card>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center">
          <p className="text-gray-400 mb-3">No sessions for this event. Create sessions first.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Top control bar */}
      <div className="bg-[#171717] border border-gray-800 rounded-lg p-4">
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-[160px]">
            <label className="text-xs text-gray-400 block mb-1">Class</label>
            <Select value={classFilter} onValueChange={(v) => { setClassFilter(v); setSessionId(''); }}>
              <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[#262626] border-gray-700">
                <SelectItem value="all">All Classes</SelectItem>
                {classOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-gray-400 block mb-1">Session</label>
            <Select value={sessionId} onValueChange={setSessionId}>
              <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white h-8 text-xs"><SelectValue placeholder="Select session…" /></SelectTrigger>
              <SelectContent className="bg-[#262626] border-gray-700">
                {filteredSessions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{getSessionLabel(s)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 ml-auto">
            <Button size="sm" variant="outline" onClick={handleExportCSV} disabled={!selectedSession} className="border-gray-700 text-gray-300 h-8">
              <Download className="w-4 h-4 mr-1" /> Export CSV
            </Button>
            <Button size="sm" disabled className="bg-gray-800 text-gray-500 h-8 cursor-not-allowed">
              API Sync (Coming Soon)
            </Button>
          </div>
        </div>
      </div>

      {!selectedSession ? (
        <Card className="bg-[#171717] border-gray-800">
          <CardContent className="py-12 text-center">
            <p className="text-gray-400">Select a class and session above to manage results</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          {/* Left sidebar – Session info + actions */}
          <div className="lg:col-span-1 space-y-4">
            {/* Session info card */}
            <Card className="bg-[#171717] border-gray-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-white">{getSessionLabel(selectedSession)}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge className={`text-xs ${statusBadgeClass(selectedSession.status)}`}>
                    {selectedSession.status || 'Draft'}
                  </Badge>
                  {selectedSession.status === 'Locked' && <Lock className="w-3 h-3 text-purple-400" />}
                  {selectedSession.status === 'Official' && <CheckCircle2 className="w-3 h-3 text-green-400" />}
                </div>
                <div className="text-xs text-gray-500 space-y-0.5">
                  <p>Type: <span className="text-gray-300">{selectedSession.session_type}</span></p>
                  {selectedSession.laps && <p>Laps: <span className="text-gray-300">{selectedSession.laps}</span></p>}
                  <p>Results: <span className="text-gray-300">{sessionResults.length} rows</span></p>
                  <p>Updated: <span className="text-gray-300">{selectedSession.updated_date ? new Date(selectedSession.updated_date).toLocaleString() : 'Recently'}</span></p>
                </div>
              </CardContent>
            </Card>

            {/* Validation errors */}
            {validationErrors.length > 0 && (
              <div className="bg-red-950/30 border border-red-800/50 rounded-lg p-3">
                <p className="text-xs font-semibold text-red-300 mb-1">Cannot publish:</p>
                {validationErrors.map((e, i) => <p key={i} className="text-xs text-red-400">• {e}</p>)}
              </div>
            )}

            {/* Actions card */}
            {can('results_save') && (
              <Card className="bg-[#171717] border-gray-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-gray-400 uppercase tracking-wide">Workflow</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {isLocked ? (
                    <>
                      <p className="text-xs text-purple-400 flex items-center gap-1"><Lock className="w-3 h-3" /> Session is locked</p>
                      {can('results_lock') && (
                        <Button size="sm" onClick={() => handleStatusTransition('Official')} disabled={updateSessionStatus.isPending} className="w-full bg-purple-800 hover:bg-purple-700 text-xs">
                          Unlock Session
                        </Button>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Official warning */}
                      {isOfficial && (
                        <div className="bg-amber-950/30 border border-amber-800/50 rounded p-2 text-xs text-amber-300">
                          ⚠ Editing will revert to Provisional
                        </div>
                      )}
                      {/* Step buttons */}
                      {(selectedSession.status === 'Draft' || !selectedSession.status) && can('results_publish_provisional') && (
                        <Button size="sm" onClick={() => handleStatusTransition('Provisional')} disabled={updateSessionStatus.isPending} className="w-full bg-blue-700 hover:bg-blue-600 text-xs">
                          Mark Provisional
                        </Button>
                      )}
                      {selectedSession.status === 'Provisional' && can('results_publish_official') && (
                        <Button size="sm" onClick={() => handleStatusTransition('Official')} disabled={updateSessionStatus.isPending} className="w-full bg-green-700 hover:bg-green-600 text-xs">
                          Publish Official
                        </Button>
                      )}
                      {selectedSession.status === 'Official' && can('results_lock') && (
                        <Button size="sm" onClick={() => handleStatusTransition('Locked')} disabled={updateSessionStatus.isPending} className="w-full bg-purple-800 hover:bg-purple-700 text-xs">
                          <Lock className="w-3 h-3 mr-1" /> Lock Session
                        </Button>
                      )}
                      {selectedSession.status === 'Provisional' && can('results_save') && (
                        <Button size="sm" variant="outline" onClick={() => handleStatusTransition('Draft')} disabled={updateSessionStatus.isPending} className="w-full border-gray-700 text-gray-400 text-xs">
                          Revert to Draft
                        </Button>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Main area */}
          <div className="lg:col-span-3">
            {isLocked && (
              <div className="bg-purple-950/30 border border-purple-800/50 rounded-lg p-3 mb-4 flex items-center gap-2 text-sm text-purple-300">
                <Lock className="w-4 h-4" /> This session is locked. All edits are disabled.
              </div>
            )}

            <Tabs value={entryMode} onValueChange={setEntryMode}>
              <TabsList className="bg-[#262626] border border-gray-700 w-full mb-4">
                <TabsTrigger value="manual" className="data-[state=active]:bg-gray-700 text-gray-300 flex-1 text-xs">Manual Entry</TabsTrigger>
                <TabsTrigger value="csv" className="data-[state=active]:bg-gray-700 text-gray-300 flex-1 text-xs">CSV Import</TabsTrigger>
                <TabsTrigger value="history" className="data-[state=active]:bg-gray-700 text-gray-300 flex-1 text-xs">Version History</TabsTrigger>
              </TabsList>

              <TabsContent value="manual">
                <ResultsEditorTable
                  session={selectedSession}
                  results={sessionResults}
                  drivers={drivers}
                  driverPrograms={driverPrograms}
                  seriesClasses={seriesClasses}
                  selectedEvent={selectedEvent}
                  locked={isLocked}
                  onSave={handleSaveDraft}
                  saving={savingResults}
                />
              </TabsContent>

              <TabsContent value="csv">
                <ResultsImportPanel
                  session={selectedSession}
                  drivers={drivers}
                  driverPrograms={driverPrograms}
                  selectedEvent={selectedEvent}
                  locked={isLocked}
                  onImport={handleImport}
                  importing={importing}
                />
              </TabsContent>

              <TabsContent value="history">
                <ResultsVersionHistory
                  selectedEvent={selectedEvent}
                  selectedSession={selectedSession}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}

      {/* Confirm status dialog */}
      <AlertDialog open={!!pendingStatus} onOpenChange={(open) => !open && setPendingStatus(null)}>
        <AlertDialogContent className="bg-[#262626] border-gray-700">
          <AlertDialogTitle className="text-white">Confirm: {pendingStatus}</AlertDialogTitle>
          <AlertDialogDescription className="text-gray-400">
            {pendingStatus === 'Official'
              ? 'Publishing Official will trigger standings recalculation. Results will still be editable but will revert to Provisional on edit.'
              : pendingStatus === 'Locked'
              ? 'Locking prevents all further edits to this session. Only admins can unlock.'
              : pendingStatus === 'Draft'
              ? 'This will revert the session to Draft and allow editing.'
              : 'Mark this session as Provisional. Results are still editable.'}
          </AlertDialogDescription>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel className="border-gray-700 text-gray-300">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => updateSessionStatus.mutate(pendingStatus)}
              disabled={updateSessionStatus.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Confirm
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}