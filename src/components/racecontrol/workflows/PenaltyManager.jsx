/**
 * R9BR Sprint 3 — PenaltyManager
 * Penalty workflow: propose, view, approve, reject.
 * Applied state deferred to Sprint 4. No result/standing mutations.
 * Phase 2.
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
import { Gavel, CheckCircle, XCircle, Plus } from 'lucide-react';
import { toast } from 'sonner';

const PENALTY_TYPES = [
  'Position', 'Time', 'Points Deduction', 'Warning', 'Fine',
  'Probation', 'Suspension', 'Disqualification', 'Drive-Through',
  'Stop-and-Go', 'Grid Penalty', 'Championship Points Deduction',
];

const STATUS_COLOR = {
  Proposed: 'bg-yellow-900/60 text-yellow-300',
  Approved: 'bg-green-900/60 text-green-300',
  'Under Appeal': 'bg-purple-900/60 text-purple-300',
  Overturned: 'bg-gray-700 text-gray-400',
  Upheld: 'bg-blue-900/60 text-blue-300',
};

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

// ── Propose Penalty Modal ────────────────────────────────────────────────────
function ProposePenaltyModal({ open, onClose, eventId, sessions = [] }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    penalty_type: '',
    driver_id: '',
    reason: '',
    rule_reference: '',
    session_id: '',
    position_delta: '',
    time_seconds: '',
    public_note: '',
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
              <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                <SelectValue placeholder="Select type…" />
              </SelectTrigger>
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
                <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                  <SelectValue placeholder="No session" />
                </SelectTrigger>
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
function PenaltyRow({ penalty, eventId, canApprove, onUpdate }) {
  const queryClient = useQueryClient();
  const [acting, setActing] = useState(false);

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
      await logOp(eventId, 'penalty_rejected', penalty.id, `${penalty.penalty_number}: Rejected/Overturned`);
      await queryClient.invalidateQueries({ queryKey: ['penalties', eventId] });
      toast.success('Penalty rejected');
      onUpdate?.();
    } catch (err) {
      toast.error('Failed to reject: ' + (err.message || 'Unknown error'));
    } finally {
      setActing(false);
    }
  };

  return (
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
      </div>

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
    </div>
  );
}

// ── Main PenaltyManager ──────────────────────────────────────────────────────
export default function PenaltyManager({ eventId, sessions = [] }) {
  const { isAdmin, eventPermissions } = useEventWorkspace();
  const canView = isAdmin || !!eventPermissions?.canViewRaceControl;
  const canPropose = isAdmin || !!eventPermissions?.canProposePenalty;
  const canApprove = isAdmin || !!eventPermissions?.canApprovePenalty;

  const [showPropose, setShowPropose] = useState(false);
  const [activeTab, setActiveTab] = useState('Proposed');

  const { data: penalties = [], isLoading, refetch } = useQuery({
    queryKey: ['penalties', eventId],
    queryFn: () => base44.entities.Penalty.filter({ event_id: eventId }, '-created_date', 100),
    enabled: !!eventId && canView,
  });

  const proposed = penalties.filter(p => p.status === 'Proposed');
  const approved = penalties.filter(p => p.status === 'Approved');
  const appealed = penalties.filter(p => p.status === 'Under Appeal');

  const TABS = [
    { key: 'Proposed', label: `Proposed (${proposed.length})` },
    { key: 'Approved', label: `Approved (${approved.length})` },
    { key: 'Under Appeal', label: `Under Appeal (${appealed.length})` },
  ];

  const displayList = activeTab === 'Proposed' ? proposed
    : activeTab === 'Approved' ? approved
    : appealed;

  if (!canView) return null;
  if (isLoading) return <div className="text-gray-500 text-xs py-4">Loading penalties…</div>;

  return (
    <div className="space-y-3">
      {/* Actions bar */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {TABS.map(tab => (
            <button key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`text-[10px] px-2.5 py-1 rounded font-semibold transition-colors ${
                activeTab === tab.key
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-500 hover:text-gray-300'
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

      {displayList.length === 0 && (
        <div className="text-gray-600 text-xs py-3">No {activeTab.toLowerCase()} penalties</div>
      )}

      {displayList.map(pen => (
        <PenaltyRow key={pen.id} penalty={pen} eventId={eventId} canApprove={canApprove} onUpdate={refetch} />
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