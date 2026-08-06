import React, { useState, useMemo, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const ResultRow = ({
  result,
  drivers,
  driverPrograms,
  onUpdate,
  allResults,
  sessionId,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(result);
  const driver = drivers.find((d) => d.id === formData.driver_id);

  // Validation
  const positionDuplicate = allResults.filter(
    (r) => r.position === formData.position && r.id !== result.id
  ).length > 0;
  const carNumberDuplicate =
    driverPrograms.filter(
      (dp) =>
        dp.car_number === formData.car_number &&
        dp.id !== driverPrograms.find((dp2) => dp2.id === result.program_id)?.id
    ).length > 0;
  const missingDriver = !formData.driver_id;
  const invalidLaps =
    formData.laps_completed !== '' &&
    (isNaN(formData.laps_completed) || formData.laps_completed < 0);

  return (
    <>
      <TableRow className="hover:bg-[#262626]">
        <TableCell className="text-foreground-secondary text-sm">
          {formData.car_number || '-'}
        </TableCell>
        <TableCell className="text-foreground-secondary text-sm">
          {driver ? `${driver.first_name} ${driver.last_name}` : '-'}
        </TableCell>
        <TableCell className="text-foreground-secondary text-sm">
          {result.team_id ? 'Team' : '-'}
        </TableCell>
        <TableCell
          className={`text-sm ${positionDuplicate ? 'bg-red-900/30 text-red-400' : 'text-foreground-secondary'}`}
        >
          {formData.position || '-'}
        </TableCell>
        <TableCell className="text-foreground-secondary text-sm">
          {formData.status || '-'}
        </TableCell>
        <TableCell
          className={`text-sm ${invalidLaps ? 'bg-red-900/30 text-red-400' : 'text-foreground-secondary'}`}
        >
          {formData.laps_completed || '-'}
        </TableCell>
        <TableCell className="text-foreground-secondary text-sm">
          {formData.best_lap_time_ms
            ? `${(formData.best_lap_time_ms / 1000).toFixed(3)}s`
            : '-'}
        </TableCell>
        <TableCell className="text-foreground-secondary text-sm">
          {formData.points || '-'}
        </TableCell>
        <TableCell className="text-foreground-secondary text-sm truncate max-w-xs">
          {formData.notes || '-'}
        </TableCell>
        <TableCell className="text-right">
          <Button
            size="sm"
            variant="ghost"
            className="text-blue-400 hover:bg-blue-900/30"
            onClick={() => setIsEditing(true)}
          >
            Edit
          </Button>
        </TableCell>
      </TableRow>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="bg-[#262626] border-divider text-white">
          <DialogHeader>
            <DialogTitle>Edit Result</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-foreground-quiet uppercase tracking-wide">
                Driver
              </label>
              <Select
                value={formData.driver_id || ''}
                onValueChange={(value) =>
                  setFormData({ ...formData, driver_id: value })
                }
              >
                <SelectTrigger className="bg-surface-elevated border-divider text-white mt-1">
                  <SelectValue placeholder="Select driver..." />
                </SelectTrigger>
                <SelectContent className="bg-surface-elevated border-divider">
                  {drivers.map((d) => (
                    <SelectItem key={d.id} value={d.id} className="text-white">
                      {d.first_name} {d.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-foreground-quiet uppercase tracking-wide">
                Position
              </label>
              <Input
                type="number"
                min="0"
                value={formData.position || ''}
                onChange={(e) =>
                  setFormData({ ...formData, position: parseInt(e.target.value) || 0 })
                }
                className="bg-surface-elevated border-divider text-white mt-1"
              />
            </div>

            <div>
              <label className="text-xs text-foreground-quiet uppercase tracking-wide">
                Status
              </label>
              <Select
                value={formData.status || ''}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger className="bg-surface-elevated border-divider text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-surface-elevated border-divider">
                  <SelectItem value="Running" className="text-white">
                    Running
                  </SelectItem>
                  <SelectItem value="DNF" className="text-white">
                    DNF
                  </SelectItem>
                  <SelectItem value="DNS" className="text-white">
                    DNS
                  </SelectItem>
                  <SelectItem value="DSQ" className="text-white">
                    DSQ
                  </SelectItem>
                  <SelectItem value="DNP" className="text-white">
                    DNP
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-foreground-quiet uppercase tracking-wide">
                Laps Completed
              </label>
              <Input
                type="number"
                min="0"
                value={formData.laps_completed || ''}
                onChange={(e) =>
                  setFormData({ ...formData, laps_completed: parseInt(e.target.value) || 0 })
                }
                className="bg-surface-elevated border-divider text-white mt-1"
              />
            </div>

            <div>
              <label className="text-xs text-foreground-quiet uppercase tracking-wide">
                Best Lap Time (ms)
              </label>
              <Input
                type="number"
                min="0"
                value={formData.best_lap_time_ms || ''}
                onChange={(e) =>
                  setFormData({ ...formData, best_lap_time_ms: parseInt(e.target.value) || 0 })
                }
                className="bg-surface-elevated border-divider text-white mt-1"
              />
            </div>

            <div>
              <label className="text-xs text-foreground-quiet uppercase tracking-wide">
                Points
              </label>
              <Input
                type="number"
                min="0"
                value={formData.points || ''}
                onChange={(e) =>
                  setFormData({ ...formData, points: parseInt(e.target.value) || 0 })
                }
                className="bg-surface-elevated border-divider text-white mt-1"
              />
            </div>

            <div>
              <label className="text-xs text-foreground-quiet uppercase tracking-wide">
                Notes
              </label>
              <Input
                type="text"
                value={formData.notes || ''}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                className="bg-surface-elevated border-divider text-white mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                onUpdate(formData);
                setIsEditing(false);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default function ResultsManualEntry({
  session,
  results,
  drivers,
  driverPrograms,
  classId,
}) {
  const [sessionResults, setSessionResults] = useState(results);
  const [scrollTop, setScrollTop] = useState(0);
  const tableScrollRef = useRef(null);
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async (resultData) => {
      const res = await base44.functions.invoke('upsertOperationalResult', {
        payload: resultData,
        source_path: 'results_manual_entry',
      });
      if (!res?.data?.record) {
        throw new Error(res?.data?.errors?.[0]?.message || 'Failed to save result');
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['results'] });
    },
  });

  const updateSessionMutation = useMutation({
    mutationFn: (data) =>
      base44.entities.Session.update(session.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });

  const handleUpdate = (resultData) => {
    updateMutation.mutate(resultData);
  };

  const handleSaveDraft = () => {
    updateSessionMutation.mutate({ status: 'Draft' });
    toast.success('Results saved as Draft');
  };

  const handleMarkProvisional = () => {
    updateSessionMutation.mutate({ status: 'Provisional' });
    toast.success('Results marked as Provisional');
  };

  const handlePublishOfficial = () => {
    updateSessionMutation.mutate({ status: 'Official' });
    toast.success('Results published as Official');
  };

  const handleLockSession = () => {
    updateSessionMutation.mutate({ status: 'Locked', locked: true });
    toast.success('Session locked');
  };

  const statusColors = {
    Draft: 'bg-surface-elevated/40 text-foreground-secondary',
    Provisional: 'bg-yellow-900/40 text-yellow-300',
    Official: 'bg-green-900/40 text-green-300',
    Locked: 'bg-red-900/40 text-red-300',
  };

  // Table windowing: only render rows in visible range when dataset is large
  const ROW_HEIGHT = 40; // approximate height in pixels
  const WINDOW_HEIGHT = 600;
  const BUFFER = 10; // render 10 rows above/below visible area
  const shouldWindow = sessionResults.length > 75;
  
  let visibleStartIdx = 0;
  let visibleEndIdx = sessionResults.length;
  
  if (shouldWindow) {
    visibleStartIdx = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER);
    visibleEndIdx = Math.min(sessionResults.length, Math.ceil((scrollTop + WINDOW_HEIGHT) / ROW_HEIGHT) + BUFFER);
  }
  
  const windowedResults = sessionResults.slice(visibleStartIdx, visibleEndIdx);
  const topSpacerHeight = visibleStartIdx * ROW_HEIGHT;
  const bottomSpacerHeight = (sessionResults.length - visibleEndIdx) * ROW_HEIGHT;

  return (
    <div className="space-y-4">
      {/* Status and Session Info */}
      <div className="flex items-center justify-between p-3 bg-[#262626] rounded-lg border border-divider">
        <div className="flex items-center gap-4">
          <span className="text-xs text-foreground-quiet">Status:</span>
          <span
            className={`px-2 py-1 rounded text-xs font-medium ${
              statusColors[session.status] || statusColors['Draft']
            }`}
          >
            {session.status || 'Draft'}
          </span>
        </div>
        {session.locked && (
          <div className="flex items-center gap-2 text-amber-500 text-xs">
            <AlertCircle className="w-3 h-3" /> Session is locked
          </div>
        )}
      </div>

      {/* Results Table */}
      <div 
        className="border border-divider rounded-lg overflow-hidden"
        ref={tableScrollRef}
        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
        style={shouldWindow ? { height: `${WINDOW_HEIGHT}px`, overflowY: 'auto' } : {}}
      >
        <Table>
          <TableHeader className={`bg-[#262626] ${shouldWindow ? 'sticky top-0 z-10' : ''}`}>
            <TableRow>
              <TableHead className="text-foreground-quiet">Car #</TableHead>
              <TableHead className="text-foreground-quiet">Driver</TableHead>
              <TableHead className="text-foreground-quiet">Team</TableHead>
              <TableHead className="text-foreground-quiet">Position</TableHead>
              <TableHead className="text-foreground-quiet">Status</TableHead>
              <TableHead className="text-foreground-quiet">Laps</TableHead>
              <TableHead className="text-foreground-quiet">Best Lap</TableHead>
              <TableHead className="text-foreground-quiet">Points</TableHead>
              <TableHead className="text-foreground-quiet">Notes</TableHead>
              <TableHead className="text-foreground-quiet">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessionResults.length === 0 ? (
              <TableRow>
                <TableCell colSpan="10" className="text-center py-8 text-foreground-quiet">
                  No results entered yet
                </TableCell>
              </TableRow>
            ) : (
              <>
                {shouldWindow && topSpacerHeight > 0 && (
                  <TableRow style={{ height: `${topSpacerHeight}px` }}>
                    <TableCell colSpan="10" />
                  </TableRow>
                )}
                {windowedResults.map((result) => (
                  <ResultRow
                    key={result.id}
                    result={result}
                    drivers={drivers}
                    driverPrograms={driverPrograms}
                    onUpdate={handleUpdate}
                    allResults={sessionResults}
                    sessionId={session.id}
                  />
                ))}
                {shouldWindow && bottomSpacerHeight > 0 && (
                  <TableRow style={{ height: `${bottomSpacerHeight}px` }}>
                    <TableCell colSpan="10" />
                  </TableRow>
                )}
              </>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 justify-end">
        <Button
          variant="outline"
          onClick={handleSaveDraft}
          disabled={session.locked}
          className="border-divider text-foreground-secondary hover:bg-surface-interactive"
        >
          Save Draft
        </Button>
        <Button
          variant="outline"
          onClick={handleMarkProvisional}
          disabled={session.locked}
          className="border-yellow-700 text-yellow-400 hover:bg-yellow-900/20"
        >
          Mark Provisional
        </Button>
        <Button
          onClick={handlePublishOfficial}
          disabled={session.locked}
          className="bg-green-600 hover:bg-green-700"
        >
          Publish Official
        </Button>
        <Button
          onClick={handleLockSession}
          disabled={session.locked}
          className="bg-red-600 hover:bg-red-700"
        >
          Lock Session
        </Button>
      </div>
    </div>
  );
}