import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { motion } from 'framer-motion';
import { Upload, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';
import { canAction } from '@/components/access/accessControl';
import { toast } from 'sonner';

const DQ = applyDefaultQueryOptions();

export default function TimingSyncManager({
  selectedEvent,
  dashboardContext,
  dashboardPermissions,
  invalidateAfterOperation,
}) {
  const queryClient = useQueryClient();
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [overwriteMode, setOverwriteMode] = useState('overwrite');

  // Load sessions
  const { data: sessions = [] } = useQuery({
    queryKey: ['timingsync_sessions', selectedEvent?.id],
    queryFn: () => (selectedEvent?.id 
      ? base44.entities.Session.filter({ event_id: selectedEvent.id })
      : Promise.resolve([])),
    enabled: !!selectedEvent?.id,
    ...DQ,
  });

  // Load entries
  const { data: entries = [] } = useQuery({
    queryKey: ['timingsync_entries', selectedEvent?.id],
    queryFn: () => (selectedEvent?.id 
      ? base44.entities.Entry.filter({ event_id: selectedEvent.id })
      : Promise.resolve([])),
    enabled: !!selectedEvent?.id,
    ...DQ,
  });

  // Load existing results for session
  const { data: existingResults = [] } = useQuery({
    queryKey: ['timingsync_results', selectedSessionId],
    queryFn: () => (selectedSessionId 
      ? base44.entities.Results.filter({ session_id: selectedSessionId })
      : Promise.resolve([])),
    enabled: !!selectedSessionId,
    ...DQ,
  });

  // Mutations
  const createResultsMutation = useMutation({
    mutationFn: (data) => base44.entities.Results.create(data),
  });

  const updateResultsMutation = useMutation({
    mutationFn: (data) => base44.entities.Results.update(data.id, data.updates),
  });

  const createOpLogMutation = useMutation({
    mutationFn: (data) => base44.entities.OperationLog.create(data),
  });

  // Build class options
  const classOptions = useMemo(() => {
    const classes = new Set();
    sessions.forEach(s => {
      const className = s.series_class_id || s.class_name || 'Unclassified';
      classes.add(className);
    });
    return Array.from(classes).sort();
  }, [sessions]);

  // Filter sessions by class
  const filteredSessions = useMemo(() => {
    if (!selectedClass) return sessions.sort((a, b) => (a.session_order || 0) - (b.session_order || 0));
    return sessions
      .filter(s => {
        const className = s.series_class_id || s.class_name || 'Unclassified';
        return className === selectedClass;
      })
      .sort((a, b) => (a.session_order || 0) - (b.session_order || 0));
  }, [sessions, selectedClass]);

  const selectedSession = useMemo(() => 
    sessions.find(s => s.id === selectedSessionId),
    [sessions, selectedSessionId]
  );

  // Parse timing data
  const parseTimingData = (text) => {
    const lines = text.trim().split('\n').filter(l => l.trim());
    const rows = [];

    for (const line of lines) {
      const parts = line.split(',').map(p => p.trim());
      if (parts.length < 5) continue;

      const position = parseInt(parts[0]);
      const driverNumber = parts[1];
      const laps = parseInt(parts[2]);
      const time = parts[3];
      const bestLap = parts[4];

      if (isNaN(position) || isNaN(laps)) continue;

      // Find matching entry
      const matchedEntry = entries.find(e => e.car_number === driverNumber);

      rows.push({
        position,
        driverNumber,
        laps,
        time,
        bestLap,
        entryId: matchedEntry?.id,
        driverId: matchedEntry?.driver_id,
        matched: !!matchedEntry,
      });
    }

    return rows;
  };

  // Handle manual paste
  const handleManualParse = () => {
    if (!manualInput.trim()) {
      toast.error('Please paste timing data');
      return;
    }

    const parsed = parseTimingData(manualInput);
    if (parsed.length === 0) {
      toast.error('No valid timing data found');
      return;
    }

    setPreviewData(parsed);
  };

  // Handle CSV upload
  const handleCSVUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.trim().split('\n');
      
      // Skip header if present
      let startIdx = 0;
      if (lines[0].toLowerCase().includes('position')) startIdx = 1;

      const dataText = lines.slice(startIdx).join('\n');
      const parsed = parseTimingData(dataText);

      if (parsed.length === 0) {
        toast.error('No valid timing data in CSV');
        return;
      }

      setPreviewData(parsed);
      toast.success(`Parsed ${parsed.length} timing entries`);
    } catch (error) {
      toast.error('CSV parse failed');
    }
  };

  // Handle confirm import
  const handleConfirmImport = async () => {
    if (!selectedSession || !previewData) return;

    if (selectedSession.locked) {
      toast.error('Session is locked and cannot accept timing data');
      setShowConfirm(false);
      return;
    }

    const unmatchedCount = previewData.filter(r => !r.matched).length;
    if (unmatchedCount > 0) {
      toast.error('Cannot import: unmatched drivers exist');
      return;
    }

    try {
      let importedCount = 0;

      for (const row of previewData) {
        const resultData = {
          event_id: selectedEvent.id,
          session_id: selectedSession.id,
          entry_id: row.entryId,
          position: row.position,
          laps_completed: row.laps,
          race_time: row.time,
          best_lap: row.bestLap,
        };

        const existingResult = existingResults.find(r => r.entry_id === row.entryId);

        if (existingResult) {
          if (overwriteMode === 'overwrite') {
            await updateResultsMutation.mutateAsync({
              id: existingResult.id,
              updates: resultData,
            });
          }
        } else {
          await createResultsMutation.mutateAsync(resultData);
        }

        importedCount++;
      }

      // Write operation log
      await createOpLogMutation.mutateAsync({
        event_id: selectedEvent.id,
        operation_type: 'timing_import',
        source_type: 'timing_sync_manager',
        entity_name: 'Session',
        entity_id: selectedSession.id,
        status: 'success',
        metadata: JSON.stringify({
          event_id: selectedEvent.id,
          session_id: selectedSession.id,
          import_rows: importedCount,
        }),
        notes: `Timing import: ${importedCount} results`,
      });

      // Refresh results
      queryClient.invalidateQueries({ queryKey: ['timingsync_results'] });
      invalidateAfterOperation?.('timing_imported', { eventId: selectedEvent?.id });

      toast.success(`Imported ${importedCount} timing results`);
      setPreviewData(null);
      setManualInput('');
      setShowConfirm(false);
    } catch (error) {
      toast.error('Import failed');
    }
  };

  if (!selectedEvent) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center">
          <p className="text-gray-400">Select an event to access Timing Sync</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Session Selection */}
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white text-sm">Session Selection</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-400 mb-2 block">Class</label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="bg-gray-900 border-gray-800 text-white">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-800">
                <SelectItem value={null}>All Classes</SelectItem>
                {classOptions.map(cls => (
                  <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-2 block">Session</label>
            <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
              <SelectTrigger className="bg-gray-900 border-gray-800 text-white">
                <SelectValue placeholder="Select session" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-800">
                {filteredSessions.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedSession && selectedSession.locked && (
        <Alert className="bg-red-900/20 border-red-800">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <AlertDescription className="text-red-400">
            Session is locked. Timing data cannot be imported until session is unlocked.
          </AlertDescription>
        </Alert>
      )}

      {selectedSession && !selectedSession.locked && (
        <Card className="bg-[#171717] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Clock className="w-4 h-4" /> Import Timing Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="manual" className="space-y-4">
              <TabsList className="bg-gray-900 border-gray-800">
                <TabsTrigger value="manual" className="data-[state=active]:bg-indigo-600">
                  Manual Paste
                </TabsTrigger>
                <TabsTrigger value="csv" className="data-[state=active]:bg-indigo-600">
                  CSV Upload
                </TabsTrigger>
              </TabsList>

              <TabsContent value="manual" className="space-y-3">
                <div className="text-xs text-gray-400 bg-gray-900/50 p-3 rounded border border-gray-800">
                  <p className="font-semibold mb-2">Expected format:</p>
                  <code className="text-gray-300">position,driver_number,laps,time,best_lap</code>
                  <p className="mt-2">Example:</p>
                  <code className="text-gray-300 block">1,23,15,10:32.125,41.332</code>
                </div>
                <Textarea
                  placeholder="Paste timing data..."
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  className="bg-gray-900 border-gray-800 text-white font-mono text-xs h-32"
                />
                <Button
                  onClick={handleManualParse}
                  disabled={!manualInput.trim() || !canAction(dashboardPermissions, 'timing_sync')}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Parse & Preview
                </Button>
              </TabsContent>

              <TabsContent value="csv" className="space-y-3">
                <div className="text-xs text-gray-400 bg-gray-900/50 p-3 rounded border border-gray-800">
                  <p className="font-semibold mb-2">CSV headers:</p>
                  <code className="text-gray-300">position, driver_number, laps, time, best_lap</code>
                </div>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-800 border-dashed rounded-lg cursor-pointer bg-gray-900/50 hover:bg-gray-900/70 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <p className="text-xs text-gray-400">Click to upload CSV</p>
                    </div>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleCSVUpload}
                      disabled={!canAction(dashboardPermissions, 'timing_sync')}
                      className="hidden"
                    />
                  </label>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Preview */}
      {previewData && (
        <Card className="bg-[#171717] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white text-sm">Preview ({previewData.length} rows)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {previewData.some(r => !r.matched) && (
              <Alert className="bg-yellow-900/20 border-yellow-800">
                <AlertCircle className="w-4 h-4 text-yellow-500" />
                <AlertDescription className="text-yellow-400 text-xs">
                  {previewData.filter(r => !r.matched).length} driver(s) not found
                </AlertDescription>
              </Alert>
            )}

            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-900/30">
                  <TableRow>
                    <TableHead className="text-gray-400 text-xs">Pos</TableHead>
                    <TableHead className="text-gray-400 text-xs">Number</TableHead>
                    <TableHead className="text-gray-400 text-xs">Laps</TableHead>
                    <TableHead className="text-gray-400 text-xs">Time</TableHead>
                    <TableHead className="text-gray-400 text-xs">Best Lap</TableHead>
                    <TableHead className="text-gray-400 text-xs">Match</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((row, idx) => (
                    <TableRow key={idx} className={row.matched ? '' : 'opacity-50'}>
                      <TableCell className="text-sm text-white">{row.position}</TableCell>
                      <TableCell className="text-sm text-gray-400">{row.driverNumber}</TableCell>
                      <TableCell className="text-sm text-gray-400">{row.laps}</TableCell>
                      <TableCell className="text-sm text-gray-400">{row.time}</TableCell>
                      <TableCell className="text-sm text-gray-400">{row.bestLap}</TableCell>
                      <TableCell>
                        {row.matched ? (
                          <Badge className="bg-green-900/40 text-green-300 text-xs">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Matched
                          </Badge>
                        ) : (
                          <Badge className="bg-red-900/40 text-red-300 text-xs">
                            <AlertCircle className="w-3 h-3 mr-1" /> Not Found
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-2">
              <div>
                <label className="text-xs text-gray-400 block mb-2">
                  If results exist:
                </label>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setOverwriteMode('overwrite')}
                    className={`flex-1 h-8 text-xs ${
                      overwriteMode === 'overwrite'
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-900 border border-gray-800 text-gray-300'
                    }`}
                  >
                    Overwrite
                  </Button>
                  <Button
                    onClick={() => setOverwriteMode('merge')}
                    className={`flex-1 h-8 text-xs ${
                      overwriteMode === 'merge'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-900 border border-gray-800 text-gray-300'
                    }`}
                  >
                    Merge
                  </Button>
                </div>
              </div>

              <Button
                onClick={() => setShowConfirm(true)}
                disabled={
                  previewData.some(r => !r.matched) ||
                  !canAction(dashboardPermissions, 'timing_sync') ||
                  selectedSession.locked
                }
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                Import Timing Results
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirm Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent className="bg-gray-900 border-gray-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Confirm Timing Import</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Import {previewData?.length} timing results to {selectedSession?.name}?
              {overwriteMode === 'overwrite' && existingResults.length > 0 && (
                <p className="mt-2 text-yellow-400 text-xs">
                  Will overwrite {existingResults.length} existing result(s).
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3">
            <AlertDialogCancel className="bg-gray-800 text-white border-gray-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmImport}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Import
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}