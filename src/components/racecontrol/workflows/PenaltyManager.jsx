/**
 * R9BS Sprint 4 — PenaltyManager
 * Updated: Apply Penalty (Approved → Applied) + Reversal (Applied/Appeal → Overturned).
 * Approval and Application remain separate steps.
 * No result/standing mutations happen in the UI — cascade runs in backend.
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
import { Gavel, CheckCircle, XCircle, Plus, Zap, RotateCcw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const PENALTY_TYPES = [
  'Position', 'Time', 'Points Deduction', 'Warning', 'Fine',
  'Probation', 'Suspension', 'Disqualification', 'Drive-Through',
  'Stop-and-Go', 'Grid Penalty', 'Championship Points Deduction',
];

const STATUS_COLOR = {
  Proposed: 'bg-yellow-900/60 text-yellow-300',
  Approved: 'bg-green-900/60 text-green-300',
  Applied: 'bg-blue-900/60 text-blue-300',
  'Under Appeal': 'bg-purple-900/60 text-purple-300',
  Overturned: 'bg-gray-700 text-gray-400',
  Upheld: 'bg-teal-900/60 text-teal-300',
};

// Disciplinary-only types — no result mutations
const DISCIPLINARY_ONLY = ['Warning', 'Fine', 'Probation', 'Suspension'];
// Types requiring session + result target
const RESULT_TYPES = ['Position', 'Time', 'Points Deduction', 'Disqualification', 'Drive-Through', 'Stop-and-Go', 'Grid Penalty'];

async function logOp(eventId, action, entityId, detail) {
  try {
    await base44.functions.invoke('createActivityFeedItemSafe', {
      event_id: eventId, action,
      entity_type: 'Penalty', entity_id: entityId, detail,
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

// ── Impact preview for Apply confirmation ────────────────────────────────────
function ImpactPreview({ penalty }) {
  const lines = [];
  if (penalty.penalty_type === 'Disqualification') {
    lines.push('• Result.status → DSQ');
    lines.push('• Result.points → 0');
    lines.push('• Session.results_on_hold → true (requires Race Director release)');
    lines.push('• Standings will NOT recalculate until hold released');
  } else if (penalty.penalty_type === 'Position' || RESULT_TYPES.includes(penalty.penalty_type)) {
    if (penalty.position_delta) lines.push(`• Driver moves down ${penalty.position_delta} position(s)`);
    if (penalty.time_seconds) lines.push(`• +${penalty.time_seconds}s added to total time`);
    if (penalty.points_deduction) lines.push(`• −${penalty.points_deduction} points from result`);
    lines.push('• Affected positions recalculated');
    lines.push('• Standings recalculated (if no hold)');
  } else if (penalty.penalty_type === 'Championship Points Deduction') {
    lines.push(`• −${penalty.points_deduction || '?'} championship points from Standings`);
    lines.push('• Result record unchanged');
    lines.push('• Standings updated immediately');
  } else if (DISCIPLINARY_ONLY.includes(penalty.penalty_type)) {
    lines.push('• Disciplinary record only');
    lines.push('• No Result or Standings changes');
  }

  if (!lines.length) return null;
  return (
    <div className="p-3 bg-amber-900/20 border border-amber-800/40 rounded-lg space-y-1">
      <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500">Expected Impact</p>
      {lines.map((l, i) => <p key={i} className="text-xs text-amber-300">{l}</p>)}
    </div>
  );
}

// ── Apply Confirmation Modal ─────────────────────────────────────────────────
function ApplyConfirmModal({ open, onClose, penalty, eventId, onApplied }) {
  const queryClient = useQueryClient();
  const [applying, setApplying] = useState(false);

  const handleApply = async () => {
    setApplying(true);
    try {
      const res = await base44.functions.invoke('applyPenaltyCascade', {
        penalty_id: penalty.id,
      });
      if (!res?.data?.success) {
        throw new Error(res?.data?.error || 'Application failed');
      }
      const { affected_results = [], standings_recalculated, warnings = [] } = res.data;
      await logOp(eventId, 'penalty_applied', penalty.id,
        `${penalty.penalty_number} applied. ${affected_results.length} results affected.`);

      // Invalidate all touched queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['penalties', eventId] }),
        queryClient.invalidateQueries({ queryKey: ['results', eventId] }),
        queryClient.invalidateQueries({ queryKey: ['sessions', eventId] }),
        queryClient.invalidateQueries({ queryKey: ['standings'] }),
      ]);

      // R9CX Phase 8: Auto-trigger public data sync after cascade
      base44.functions.invoke('syncPublicData', {
        event_id: eventId,
        trigger: 'penalty_cascade_applied',
      }).catch(() => {});

      const msg = `Penalty applied. ${affected_results.length} result(s) affected.${standings_recalculated ? ' Standings recalculated.' : ''}`;
      toast.success(msg);
      if (warnings.length) warnings.forEach(w => toast.warning(w));
      onApplied?.();
      onClose();
    } catch (err) {
      toast.error('Failed to apply penalty: ' + (err.message || 'Unknown error'));
    } finally {
      setApplying(false);
    }
  };

  if (!penalty) return null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-950 border-gray-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-400" /> Apply Penalty
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <p className="text-xs text-gray-400">
              <span className="font-semibold text-white">{penalty.penalty_number}</span> — {penalty.penalty_type}
            </p>
            {penalty.reason && <p className="text-xs text-gray-500 mt-1">{penalty.reason}</p>}
          </div>

          <ImpactPreview penalty={penalty} />

          <div className="p-2 bg-gray-900/60 border border-gray-800 rounded-lg">
            <p className="text-[10px] text-gray-500">
              This action will mutate Results and/or Standings. It cannot be automatically undone — use "Reverse Penalty" if the decision is appealed.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={onClose} className="text-gray-400">Cancel</Button>
            <Button onClick={handleApply} disabled={applying}
              className="bg-blue-800 hover:bg-blue-700 text-white gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              {applying ? 'Applying…' : 'Confirm Apply'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Reversal Modal ────────────────────────────────────────────────────────────
function ReversalModal({ open, onClose, penalty, eventId, onReversed }) {
  const queryClient = useQueryClient();
  const [reversing, setReversing] = useState(false);
  const [reason, setReason] = useState('');

  const handleReverse = async () => {
    if (!reason.trim()) return;
    setReversing(true);
    try {
      const res = await base44.functions.invoke('reversePenaltyCascade', {
        penalty_id: penalty.id,
        reversal_reason: reason.trim(),
      });
      if (!res?.data?.success) throw new Error(res?.data?.error || 'Reversal failed');
      const { affected_results = [], standings_recalculated, warnings = [] } = res.data;

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['penalties', eventId] }),
        queryClient.invalidateQueries({ queryKey: ['results', eventId] }),
        queryClient.invalidateQueries({ queryKey: ['sessions', eventId] }),
        queryClient.invalidateQueries({ queryKey: ['standings'] }),
      ]);

      toast.success(`Penalty reversed. ${affected_results.length} result(s) restored.${standings_recalculated ? ' Standings recalculated.' : ''}`);
      if (warnings.length) warnings.forEach(w => toast.warning(w));
      setReason('');
      onReversed?.();
      onClose();
    } catch (err) {
      toast.error('Reversal failed: ' + (err.message || 'Unknown error'));
    } finally {
      setReversing(false);
    }
  };

  if (!penalty) return null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-950 border-gray-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-orange-400" /> Reverse / Overturn Penalty
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <p className="text-xs text-gray-400">
              <span className="font-semibold text-white">{penalty.penalty_number}</span> — {penalty.penalty_type}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Current status: <StatusBadge status={penalty.status} /></p>
          </div>
          <div className="p-3 bg-orange-900/20 border border-orange-800/40 rounded-lg space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-orange-500">Reversal Impact</p>
            <p className="text-xs text-orange-300">• Original Result position/points will be restored where stored</p>
            <p className="text-xs text-orange-300">• Penalty status set to Overturned</p>
            <p className="text-xs text-orange-300">• Standings recalculated (if no hold)</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-gray-400 text-xs">Reversal Reason *</Label>
            <Textarea value={reason} onChange={e => setReason(e.target.value)}
              className="bg-gray-900 border-gray-700 text-white h-20 resize-none"
              placeholder="Reason for reversing / appeal decision…" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={onClose} className="text-gray-400">Cancel</Button>
            <Button onClick={handleReverse} disabled={reversing || !reason.trim()}
              className="bg-orange-800 hover:bg-orange-700 text-white gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" />
              {reversing ? 'Reversing…' : 'Confirm Reversal'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Propose Penalty Modal ────────────────────────────────────────────────────
function ProposePenaltyModal({ open, onClose, eventId, sessions = [] }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    penalty_type: '', driver_id: '', reason: '', rule_reference: '',
    session_id: '', position_delta: '', time_seconds: '', public_note: '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await base44.functions.invoke('proposePenalty', {
        event_id: eventId,
        penalty_type: form.penalty_type,
        driver_id: form.driver_id,
        reason: form.reason,
        rule_reference: form.rule_reference || null,
        session_id: form.session_id || null,
        position_delta: form.position_delta ? parseInt(form.position_delta) : null,
        time_seconds: form.time_seconds ? parseFloat(form.time_seconds) : null,
        public_note: form.public_note || null,
      });
      await logOp(eventId, 'penalty_proposed', res?.data?.id || '', form.reason);
      await queryClient.invalidateQueries({ queryKey: ['penalties', eventId] });
      toast.success('Penalty proposed');
      setForm({ penalty_type: '', driver_id: '', reason: '', rule_reference: '', session_id: '', position_delta: '', time_seconds: '', public_note: '' });
      onClose();
    } catch (err) {
      toast.error('Failed to propose penalty: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-950 border-gray-800 text-white max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Gavel className="w-4 h-4 text-red-400" /> Propose Penalty
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-gray-400 text-xs">Penalty Type *</Label>
            <Select value={form.penalty_type} onValueChange={v => set('penalty_type', v)} required>
              <SelectTrigger className="bg-gray-900 border-gray-700 text-white"><SelectValue placeholder="Select type…" /></SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                {PENALTY_TYPES.map(t => <SelectItem key={t} value={t} className="text-gray-200">{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-gray-400 text-xs">Driver ID *</Label>
            <Input value={form.driver_id} onChange={e => set('driver_id', e.target.value)}
              className="bg-gray-900 border-gray-700 text-white" placeholder="Driver record ID…" required />
          </div>
          {sessions.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-gray-400 text-xs">Session (optional)</Label>
              <Select value={form.session_id} onValueChange={v => set('session_id', v)}>
                <SelectTrigger className="bg-gray-900 border-gray-700 text-white"><SelectValue placeholder="No session" /></SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
                  {sessions.map(s => <SelectItem key={s.id} value={s.id} className="text-gray-200">{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-gray-400 text-xs">Position Delta</Label>
              <Input type="number" value={form.position_delta} onChange={e => set('position_delta', e.target.value)}
                className="bg-gray-900 border-gray-700 text-white" placeholder="e.g. 3" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-400 text-xs">Time (seconds)</Label>
              <Input type="number" step="0.001" value={form.time_seconds} onChange={e => set('time_seconds', e.target.value)}
                className="bg-gray-900 border-gray-700 text-white" placeholder="e.g. 5.0" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-gray-400 text-xs">Rule Reference</Label>
            <Input value={form.rule_reference} onChange={e => set('rule_reference', e.target.value)}
              className="bg-gray-900 border-gray-700 text-white" placeholder="e.g. 10.4.2" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-gray-400 text-xs">Reason *</Label>
            <Textarea required value={form.reason} onChange={e => set('reason', e.target.value)}
              className="bg-gray-900 border-gray-700 text-white h-20 resize-none" placeholder="Reason for penalty…" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-gray-400 text-xs">Public Note (optional)</Label>
            <Input value={form.public_note} onChange={e => set('public_note', e.target.value)}
              className="bg-gray-900 border-gray-700 text-white" placeholder="Optional public-facing note…" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={onClose} className="text-gray-400">Cancel</Button>
            <Button type="submit" disabled={saving || !form.penalty_type || !form.driver_id || !form.reason}
              className="bg-red-800 hover:bg-red-700 text-white">
              {saving ? 'Proposing…' : 'Propose Penalty'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Penalty Row ──────────────────────────────────────────────────────────────
function PenaltyRow({ penalty, eventId, canApprove, canApply, canReverse, onUpdate }) {
  const queryClient = useQueryClient();
  const [acting, setActing] = useState(false);
  const [showApply, setShowApply] = useState(false);
  const [showReverse, setShowReverse] = useState(false);

  const handleApprove = async () => {
    setActing(true);
    try {
      await base44.functions.invoke('approvePenalty', { penalty_id: penalty.id });
      await logOp(eventId, 'penalty_approved', penalty.id, `${penalty.penalty_number}: Approved`);
      await queryClient.invalidateQueries({ queryKey: ['penalties', eventId] });
      toast.success('Penalty approved');
      onUpdate?.();
    } catch (err) {
      toast.error('Failed to approve: ' + (err.message || 'Unknown error'));
    } finally {
      setActing(false);
    }
  };

  const handleReject = async () => {
    setActing(true);
    try {
      await base44.entities.Penalty.update(penalty.id, { status: 'Overturned' });
      await logOp(eventId, 'penalty_rejected', penalty.id, `${penalty.penalty_number}: Rejected`);
      await queryClient.invalidateQueries({ queryKey: ['penalties', eventId] });
      toast.success('Penalty rejected');
      onUpdate?.();
    } catch (err) {
      toast.error('Failed to reject: ' + (err.message || 'Unknown error'));
    } finally {
      setActing(false);
    }
  };

  const isReversible = canReverse && ['Applied', 'Under Appeal', 'Upheld'].includes(penalty.status);

  return (
    <>
      <div className="rounded-lg border border-gray-800 bg-gray-900/40 p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Gavel className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
            <span className="text-xs font-semibold text-gray-200">{penalty.penalty_number || '—'}</span>
            <span className="text-xs text-gray-400 truncate">{penalty.penalty_type}</span>
          </div>
          <StatusBadge status={penalty.status} />
        </div>
        {penalty.reason && <p className="text-xs text-gray-500 line-clamp-2">{penalty.reason}</p>}
        <div className="flex gap-3 text-[10px] text-gray-600">
          {penalty.rule_reference && <span>Rule: {penalty.rule_reference}</span>}
          {penalty.position_delta != null && <span>+{penalty.position_delta} pos</span>}
          {penalty.time_seconds != null && <span>+{penalty.time_seconds}s</span>}
          {penalty.points_deduction != null && <span>−{penalty.points_deduction} pts</span>}
          {penalty.applied_at && <span className="text-gray-700">Applied</span>}
        </div>

        {/* Approval actions */}
        {canApprove && penalty.status === 'Proposed' && (
          <div className="flex gap-2 pt-1 border-t border-gray-800/60">
            <Button size="sm" disabled={acting} onClick={handleApprove}
              className="bg-green-800 hover:bg-green-700 text-white text-xs h-7 gap-1 flex-1">
              <CheckCircle className="w-3 h-3" /> Approve
            </Button>
            <Button size="sm" disabled={acting} onClick={handleReject}
              className="bg-red-900/60 hover:bg-red-900 text-white text-xs h-7 gap-1 flex-1">
              <XCircle className="w-3 h-3" /> Reject
            </Button>
          </div>
        )}

        {/* Apply action — only for Approved penalties */}
        {canApply && penalty.status === 'Approved' && (
          <div className="flex gap-2 pt-1 border-t border-gray-800/60">
            <Button size="sm" disabled={acting} onClick={() => setShowApply(true)}
              className="bg-blue-800 hover:bg-blue-700 text-white text-xs h-7 gap-1 flex-1">
              <Zap className="w-3 h-3" /> Apply Penalty
            </Button>
          </div>
        )}

        {/* Reversal action */}
        {isReversible && (
          <div className="flex gap-2 pt-1 border-t border-gray-800/60">
            <Button size="sm" disabled={acting} onClick={() => setShowReverse(true)}
              className="bg-orange-900/60 hover:bg-orange-800 text-white text-xs h-7 gap-1">
              <RotateCcw className="w-3 h-3" /> Reverse / Overturn
            </Button>
          </div>
        )}
      </div>

      <ApplyConfirmModal
        open={showApply}
        onClose={() => setShowApply(false)}
        penalty={penalty}
        eventId={eventId}
        onApplied={onUpdate}
      />
      <ReversalModal
        open={showReverse}
        onClose={() => setShowReverse(false)}
        penalty={penalty}
        eventId={eventId}
        onReversed={onUpdate}
      />
    </>
  );
}

// ── Main PenaltyManager ──────────────────────────────────────────────────────
export default function PenaltyManager({ eventId, sessions = [] }) {
  const { isAdmin, eventPermissions } = useEventWorkspace();
  const canView = isAdmin || !!eventPermissions?.canViewRaceControl;
  const canPropose = isAdmin || !!eventPermissions?.canProposePenalty;
  const canApprove = isAdmin || !!eventPermissions?.canApprovePenalty;
  const canApply = isAdmin || !!eventPermissions?.canApplyPenalty;
  const canReverse = isAdmin || !!eventPermissions?.canApprovePenalty; // Race Director / Chief Steward

  const [showPropose, setShowPropose] = useState(false);
  const [activeTab, setActiveTab] = useState('Proposed');

  const { data: penalties = [], isLoading, refetch } = useQuery({
    queryKey: ['penalties', eventId],
    queryFn: () => base44.entities.Penalty.filter({ event_id: eventId }, '-created_date', 100),
    enabled: !!eventId && canView,
  });

  const proposed = penalties.filter(p => p.status === 'Proposed');
  const approved = penalties.filter(p => p.status === 'Approved');
  const applied = penalties.filter(p => p.status === 'Applied');
  const appealed = penalties.filter(p => p.status === 'Under Appeal');

  const TABS = [
    { key: 'Proposed', label: `Proposed (${proposed.length})` },
    { key: 'Approved', label: `Approved (${approved.length})` },
    { key: 'Applied', label: `Applied (${applied.length})` },
    { key: 'Under Appeal', label: `Appeals (${appealed.length})` },
  ];

  const displayList = activeTab === 'Proposed' ? proposed
    : activeTab === 'Approved' ? approved
    : activeTab === 'Applied' ? applied
    : appealed;

  if (!canView) return null;
  if (isLoading) return <div className="text-gray-500 text-xs py-4">Loading penalties…</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 flex-wrap">
          {TABS.map(tab => (
            <button key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`text-[10px] px-2.5 py-1 rounded font-semibold transition-colors ${
                activeTab === tab.key ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>
        {canPropose && (
          <Button size="sm" onClick={() => setShowPropose(true)}
            className="bg-red-900/60 hover:bg-red-800 text-white text-xs h-7 gap-1">
            <Plus className="w-3 h-3" /> Propose
          </Button>
        )}
      </div>

      {/* Warning if Approved penalties are awaiting application */}
      {approved.length > 0 && canApply && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-blue-800/40 bg-blue-900/20">
          <AlertTriangle className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
          <p className="text-xs text-blue-300">
            {approved.length} approved {approved.length === 1 ? 'penalty' : 'penalties'} awaiting application.
          </p>
        </div>
      )}

      {displayList.length === 0 && (
        <div className="text-gray-600 text-xs py-3">No {activeTab.toLowerCase()} penalties</div>
      )}

      {displayList.map(pen => (
        <PenaltyRow
          key={pen.id}
          penalty={pen}
          eventId={eventId}
          canApprove={canApprove}
          canApply={canApply}
          canReverse={canReverse}
          onUpdate={refetch}
        />
      ))}

      <ProposePenaltyModal
        open={showPropose}
        onClose={() => setShowPropose(false)}
        eventId={eventId}
        sessions={sessions}
      />
    </div>
  );
}