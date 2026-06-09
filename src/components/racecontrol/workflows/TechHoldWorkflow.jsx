/**
 * R9BR Sprint 3 — TechHoldWorkflow
 * Tech hold workflow: impound, fail, release, refer to penalty.
 * Referral creates Penalty(status=Proposed) only. No cascade.
 * Phase 7.
 */
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useEventWorkspace } from '@/components/registrationdashboard/workspace/EventWorkspaceContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Wrench, Plus, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

const HOLD_STATUSES = ['In Progress', 'Failed', 'Recheck Required', 'Impounded'];
const INSPECTION_PHASES = ['Pre-Race', 'Post-Race', 'Impound', 'Reinspection', 'Protest-Ordered'];

const STATUS_COLOR = {
  'In Progress': 'bg-blue-900/60 text-blue-300',
  Passed: 'bg-green-900/60 text-green-300',
  Failed: 'bg-red-900/60 text-red-300',
  'Conditionally Passed': 'bg-yellow-900/60 text-yellow-300',
  'Recheck Required': 'bg-orange-900/60 text-orange-300',
  Impounded: 'bg-purple-900/60 text-purple-300',
  Released: 'bg-gray-700 text-gray-400',
};

async function logOp(eventId, action, entityId, detail) {
  try {
    await base44.functions.invoke('createActivityFeedItemSafe', {
      event_id: eventId, action,
      entity_type: 'TechInspectionRecord', entity_id: entityId, detail,
    });
  } catch (_) { /* non-blocking */ }
}

function StatusBadge({ status }) {
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${STATUS_COLOR[status] || 'bg-gray-700 text-gray-300'}`}>
      {status}
    </span>
  );
}

// ── Create Impound Modal ─────────────────────────────────────────────────────
function CreateImpoundModal({ open, onClose, eventId, sessions = [] }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    entry_id: '',
    driver_id: '',
    session_id: '',
    inspection_phase: 'Post-Race',
    overall_notes: '',
    failure_reasons: '',
    status: 'Impounded',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await base44.functions.invoke('createTechInspectionRecord', {
        event_id: eventId,
        entry_id: form.entry_id,
        driver_id: form.driver_id || null,
        session_id: form.session_id || null,
        inspection_phase: form.inspection_phase,
        status: form.status,
        overall_notes: form.overall_notes || null,
        failure_reasons: form.failure_reasons
          ? form.failure_reasons.split(',').map(s => s.trim()).filter(Boolean)
          : [],
        started_at: new Date().toISOString(),
      });
      await queryClient.invalidateQueries({ queryKey: ['techInspections', eventId] });
      toast.success('Tech record created');
      setForm({ entry_id: '', driver_id: '', session_id: '', inspection_phase: 'Post-Race', overall_notes: '', failure_reasons: '', status: 'Impounded' });
      onClose();
    } catch (err) {
      toast.error('Failed: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-950 border-gray-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Wrench className="w-4 h-4 text-orange-400" /> Create Tech Hold
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-gray-400 text-xs">Entry ID *</Label>
            <Input value={form.entry_id} onChange={e => set('entry_id', e.target.value)}
              className="bg-gray-900 border-gray-700 text-white" placeholder="Entry ID…" required />
          </div>
          <div className="space-y-1.5">
            <Label className="text-gray-400 text-xs">Driver ID (optional)</Label>
            <Input value={form.driver_id} onChange={e => set('driver_id', e.target.value)}
              className="bg-gray-900 border-gray-700 text-white" placeholder="Driver ID…" />
          </div>
          {sessions.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-gray-400 text-xs">Session (optional)</Label>
              <Select value={form.session_id} onValueChange={v => set('session_id', v)}>
                <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                  <SelectValue placeholder="No session" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
                  {sessions.map(s => <SelectItem key={s.id} value={s.id} className="text-gray-200">{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-gray-400 text-xs">Phase *</Label>
            <Select value={form.inspection_phase} onValueChange={v => set('inspection_phase', v)}>
              <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                {INSPECTION_PHASES.map(p => <SelectItem key={p} value={p} className="text-gray-200">{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-gray-400 text-xs">Initial Status</Label>
            <Select value={form.status} onValueChange={v => set('status', v)}>
              <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                {['In Progress', 'Impounded', 'Failed', 'Recheck Required'].map(s => (
                  <SelectItem key={s} value={s} className="text-gray-200">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-gray-400 text-xs">Failure Reasons (comma-separated)</Label>
            <Input value={form.failure_reasons} onChange={e => set('failure_reasons', e.target.value)}
              className="bg-gray-900 border-gray-700 text-white" placeholder="e.g. Weight, Fuel sample" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-gray-400 text-xs">Notes</Label>
            <Textarea value={form.overall_notes} onChange={e => set('overall_notes', e.target.value)}
              className="bg-gray-900 border-gray-700 text-white h-16 resize-none" placeholder="Inspector notes…" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={onClose} className="text-gray-400">Cancel</Button>
            <Button type="submit" disabled={saving || !form.entry_id}
              className="bg-orange-800 hover:bg-orange-700 text-white">
              {saving ? 'Creating…' : 'Create Hold'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Tech Record Row ──────────────────────────────────────────────────────────
function TechRecordRow({ record, eventId, canManage, onUpdate }) {
  const queryClient = useQueryClient();
  const [acting, setActing] = useState(false);
  const [referReason, setReferReason] = useState('');
  const [showRefer, setShowRefer] = useState(false);

  const handleFail = async () => {
    setActing(true);
    try {
      await base44.entities.TechInspectionRecord.update(record.id, { status: 'Failed' });
      await queryClient.invalidateQueries({ queryKey: ['techInspections', eventId] });
      toast.success('Marked as Failed');
      onUpdate?.();
    } catch (err) {
      toast.error('Failed: ' + (err.message || 'Unknown error'));
    } finally {
      setActing(false);
    }
  };

  const handleRelease = async () => {
    setActing(true);
    try {
      await base44.entities.TechInspectionRecord.update(record.id, {
        status: 'Released',
        completed_at: new Date().toISOString(),
      });
      await logOp(eventId, 'tech_released', record.id, `Entry ${record.entry_id} released from tech`);
      await queryClient.invalidateQueries({ queryKey: ['techInspections', eventId] });
      toast.success('Vehicle released');
      onUpdate?.();
    } catch (err) {
      toast.error('Failed: ' + (err.message || 'Unknown error'));
    } finally {
      setActing(false);
    }
  };

  const handleReferToPenalty = async () => {
    if (!referReason.trim()) return;
    setActing(true);
    try {
      // Create Proposed penalty — no cascade
      const penRes = await base44.functions.invoke('proposePenalty', {
        event_id: eventId,
        penalty_type: 'Disqualification',
        driver_id: record.driver_id || 'unknown',
        entry_id: record.entry_id,
        reason: referReason.trim(),
        internal_note: `Referred from TechInspectionRecord ${record.id}`,
      });
      await base44.entities.TechInspectionRecord.update(record.id, {
        resulted_in_penalty_id: penRes?.data?.id || '',
        status: 'Released',
      });
      await logOp(eventId, 'tech_referred_to_penalty', record.id,
        `Entry ${record.entry_id}: penalty proposed — ${referReason.trim()}`);
      await queryClient.invalidateQueries({ queryKey: ['techInspections', eventId] });
      await queryClient.invalidateQueries({ queryKey: ['penalties', eventId] });
      toast.success('Penalty proposed from tech referral');
      setShowRefer(false);
      setReferReason('');
      onUpdate?.();
    } catch (err) {
      toast.error('Failed: ' + (err.message || 'Unknown error'));
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/40 p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Wrench className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
          <span className="text-xs font-semibold text-gray-200">{record.inspection_phase}</span>
          <span className="text-[10px] text-gray-500 font-mono">
            Entry: {record.entry_id?.slice(-8) || '—'}
          </span>
        </div>
        <StatusBadge status={record.status} />
      </div>

      {record.failure_reasons?.length > 0 && (
        <p className="text-xs text-red-400">{record.failure_reasons.join(' · ')}</p>
      )}
      {record.overall_notes && (
        <p className="text-xs text-gray-500 line-clamp-2">{record.overall_notes}</p>
      )}

      {canManage && HOLD_STATUSES.includes(record.status) && (
        <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-800/60">
          {record.status === 'Impounded' && (
            <Button size="sm" disabled={acting} onClick={handleFail}
              className="bg-red-900/60 hover:bg-red-900 text-white text-xs h-7 gap-1">
              <XCircle className="w-3 h-3" /> Mark Failed
            </Button>
          )}
          <Button size="sm" disabled={acting} onClick={handleRelease}
            className="bg-green-800 hover:bg-green-700 text-white text-xs h-7 gap-1">
            <CheckCircle className="w-3 h-3" /> Release
          </Button>
          {!record.resulted_in_penalty_id && (
            <Button size="sm" disabled={acting} onClick={() => setShowRefer(v => !v)}
              className="bg-amber-800/60 hover:bg-amber-800 text-white text-xs h-7 gap-1">
              <AlertTriangle className="w-3 h-3" /> Refer to Penalty
            </Button>
          )}
          {record.resulted_in_penalty_id && (
            <span className="text-[10px] text-amber-400">Penalty proposed</span>
          )}
        </div>
      )}

      {showRefer && (
        <div className="space-y-2 pt-2 border-t border-gray-800/60">
          <Input value={referReason} onChange={e => setReferReason(e.target.value)}
            className="bg-gray-900 border-gray-700 text-white text-xs h-8"
            placeholder="Reason for penalty referral…" />
          <div className="flex gap-2">
            <Button size="sm" disabled={acting || !referReason.trim()} onClick={handleReferToPenalty}
              className="bg-amber-800 hover:bg-amber-700 text-white text-xs h-7">Confirm Referral</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowRefer(false)}
              className="text-gray-500 text-xs h-7">Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main TechHoldWorkflow ────────────────────────────────────────────────────
export default function TechHoldWorkflow({ eventId, sessions = [] }) {
  const { isAdmin, eventPermissions } = useEventWorkspace();
  const canView = isAdmin || !!eventPermissions?.canViewRaceControl;
  const canManage = isAdmin || !!eventPermissions?.canCreateIncident;

  const [showCreate, setShowCreate] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const { data: records = [], isLoading, refetch } = useQuery({
    queryKey: ['techInspections', eventId],
    queryFn: () => base44.entities.TechInspectionRecord.filter({ event_id: eventId }, '-created_date', 100),
    enabled: !!eventId && canView,
  });

  const holds = records.filter(r => HOLD_STATUSES.includes(r.status));
  const displayed = showAll ? records : holds;

  if (!canView) return null;
  if (isLoading) return <div className="text-gray-500 text-xs py-4">Loading tech records…</div>;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-600">{holds.length} holds</span>
          <button onClick={() => setShowAll(v => !v)}
            className="text-[10px] text-teal-500 hover:text-teal-400 transition-colors">
            {showAll ? 'Show Holds Only' : 'Show All'}
          </button>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setShowCreate(true)}
            className="bg-orange-900/60 hover:bg-orange-800 text-white text-xs h-7 gap-1">
            <Plus className="w-3 h-3" /> Impound
          </Button>
        )}
      </div>

      {displayed.length === 0 && (
        <div className="text-gray-600 text-xs py-3">No {showAll ? '' : 'active '}tech holds</div>
      )}

      {displayed.map(rec => (
        <TechRecordRow key={rec.id} record={rec} eventId={eventId} canManage={canManage} onUpdate={refetch} />
      ))}

      <CreateImpoundModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        eventId={eventId}
        sessions={sessions}
      />
    </div>
  );
}