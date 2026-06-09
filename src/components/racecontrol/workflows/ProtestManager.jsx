/**
 * R9BR Sprint 3 — ProtestManager
 * Protest workflow: file, assign, accept/reject, hearing, decision.
 * When filed → session hold. When resolved → release hold.
 * No penalty cascade. Phase 3.
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
import { MessageSquareWarning, Plus, ChevronRight, Scale } from 'lucide-react';
import { toast } from 'sonner';

const PROTEST_TYPES = ['Race Result', 'Penalty Decision', 'Technical Infraction', 'Rules Interpretation', 'Eligibility', 'Conduct'];
const DECISION_TYPES = ['Upheld', 'Dismissed', 'Partially Upheld', 'No Action'];

const ACTIVE_STATUSES = ['Filed', 'Accepted', 'Under Review', 'Hearing Scheduled', 'Appealed'];

const STATUS_COLOR = {
  Filed: 'bg-yellow-900/60 text-yellow-300',
  Accepted: 'bg-blue-900/60 text-blue-300',
  'Under Review': 'bg-orange-900/60 text-orange-300',
  'Hearing Scheduled': 'bg-purple-900/60 text-purple-300',
  Appealed: 'bg-red-900/60 text-red-300',
  'Decision Issued': 'bg-green-900/60 text-green-300',
  Closed: 'bg-gray-700 text-gray-400',
  Rejected: 'bg-gray-700 text-gray-400',
};

async function logOp(eventId, action, entityId, detail) {
  try {
    await base44.functions.invoke('createActivityFeedItemSafe', {
      event_id: eventId, action,
      entity_type: 'Protest', entity_id: entityId, detail,
    });
  } catch (_) { /* non-blocking */ }
}

// Set session hold/release
async function setSessionHold(sessionId, hold, reason) {
  if (!sessionId) return;
  if (hold) {
    await base44.entities.Session.update(sessionId, {
      results_on_hold: true,
      standings_hold: true,
      hold_reason: reason || 'Protest filed',
      hold_started_at: new Date().toISOString(),
    });
  } else {
    await base44.entities.Session.update(sessionId, {
      results_on_hold: false,
      standings_hold: false,
      hold_released_at: new Date().toISOString(),
    });
  }
}

function StatusBadge({ status }) {
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${STATUS_COLOR[status] || 'bg-gray-700 text-gray-300'}`}>
      {status}
    </span>
  );
}

// ── File Protest Modal ───────────────────────────────────────────────────────
function FileProtestModal({ open, onClose, eventId, sessions = [] }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    protest_type: '',
    filing_driver_id: '',
    against_driver_id: '',
    session_id: '',
    rule_reference: '',
    description: '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await base44.functions.invoke('fileProtest', {
        event_id: eventId,
        protest_type: form.protest_type,
        filing_driver_id: form.filing_driver_id,
        against_driver_id: form.against_driver_id || null,
        session_id: form.session_id || null,
        rule_reference: form.rule_reference || null,
        description: form.description,
      });

      // Set session hold if session selected
      if (form.session_id) {
        await setSessionHold(form.session_id, true, `Protest filed: ${res?.data?.protest_number || ''}`);
      }

      await logOp(eventId, 'protest_filed', res?.data?.id || '', `${form.protest_type}: ${form.description.slice(0, 80)}`);
      await queryClient.invalidateQueries({ queryKey: ['protests', eventId] });
      await queryClient.invalidateQueries({ queryKey: ['sessions', eventId] });
      toast.success('Protest filed — session hold activated');
      setForm({ protest_type: '', filing_driver_id: '', against_driver_id: '', session_id: '', rule_reference: '', description: '' });
      onClose();
    } catch (err) {
      toast.error('Failed to file protest: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-950 border-gray-800 text-white max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <MessageSquareWarning className="w-4 h-4 text-yellow-400" /> File Protest
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-gray-400 text-xs">Protest Type *</Label>
            <Select value={form.protest_type} onValueChange={v => set('protest_type', v)} required>
              <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                <SelectValue placeholder="Select type…" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                {PROTEST_TYPES.map(t => <SelectItem key={t} value={t} className="text-gray-200">{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-gray-400 text-xs">Filing Driver ID *</Label>
            <Input value={form.filing_driver_id} onChange={e => set('filing_driver_id', e.target.value)}
              className="bg-gray-900 border-gray-700 text-white" placeholder="Driver ID…" required />
          </div>

          <div className="space-y-1.5">
            <Label className="text-gray-400 text-xs">Against Driver ID (optional)</Label>
            <Input value={form.against_driver_id} onChange={e => set('against_driver_id', e.target.value)}
              className="bg-gray-900 border-gray-700 text-white" placeholder="Driver ID…" />
          </div>

          {sessions.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-gray-400 text-xs">Session (activates hold on select)</Label>
              <Select value={form.session_id} onValueChange={v => set('session_id', v)}>
                <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                  <SelectValue placeholder="No session" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
                  {sessions.map(s => <SelectItem key={s.id} value={s.id} className="text-gray-200">{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {form.session_id && (
                <p className="text-[10px] text-amber-400">⚠ Selecting a session will activate a results hold.</p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-gray-400 text-xs">Rule Reference</Label>
            <Input value={form.rule_reference} onChange={e => set('rule_reference', e.target.value)}
              className="bg-gray-900 border-gray-700 text-white" placeholder="e.g. 8.2.1" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-gray-400 text-xs">Description *</Label>
            <Textarea required value={form.description} onChange={e => set('description', e.target.value)}
              className="bg-gray-900 border-gray-700 text-white h-20 resize-none" placeholder="Grounds for protest…" />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={onClose} className="text-gray-400">Cancel</Button>
            <Button type="submit" disabled={saving || !form.protest_type || !form.filing_driver_id || !form.description}
              className="bg-yellow-800 hover:bg-yellow-700 text-white">
              {saving ? 'Filing…' : 'File Protest'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Protest Detail / Action Drawer ───────────────────────────────────────────
function ProtestDetailDrawer({ protest, open, onClose, eventId, sessions, onRefresh }) {
  const { isAdmin, eventPermissions } = useEventWorkspace();
  const queryClient = useQueryClient();
  const canManage = isAdmin || !!eventPermissions?.canReviewProtest;

  const [acting, setActing] = useState(false);
  const [decisionType, setDecisionType] = useState('');
  const [decisionText, setDecisionText] = useState('');
  const [stewardNotes, setStewardNotes] = useState('');
  const [assigneeId, setAssigneeId] = useState('');

  if (!protest) return null;

  const isActive = ACTIVE_STATUSES.includes(protest.status);

  const transition = async (newStatus, extra = {}) => {
    setActing(true);
    try {
      await base44.entities.Protest.update(protest.id, { status: newStatus, ...extra });
      await logOp(eventId, 'protest_status_changed', protest.id,
        `${protest.protest_number}: → ${newStatus}`);
      await queryClient.invalidateQueries({ queryKey: ['protests', eventId] });
      toast.success(`Protest status: ${newStatus}`);
      onRefresh?.();
      onClose();
    } catch (err) {
      toast.error('Failed: ' + (err.message || 'Unknown error'));
    } finally {
      setActing(false);
    }
  };

  const handleAssign = async () => {
    if (!assigneeId.trim()) return;
    setActing(true);
    try {
      await base44.entities.Protest.update(protest.id, {
        assigned_steward_user_id: assigneeId.trim(),
        status: protest.status === 'Filed' ? 'Accepted' : protest.status,
      });
      await logOp(eventId, 'protest_assigned', protest.id,
        `${protest.protest_number} assigned to ${assigneeId.trim()}`);
      await queryClient.invalidateQueries({ queryKey: ['protests', eventId] });
      toast.success('Steward assigned');
      setAssigneeId('');
    } catch (err) {
      toast.error('Failed: ' + (err.message || 'Unknown error'));
    } finally {
      setActing(false);
    }
  };

  const handleAddStewardNote = async () => {
    if (!stewardNotes.trim()) return;
    setActing(true);
    try {
      await base44.entities.Protest.update(protest.id, { steward_notes: stewardNotes.trim() });
      await queryClient.invalidateQueries({ queryKey: ['protests', eventId] });
      toast.success('Notes saved');
      setStewardNotes('');
    } catch (err) {
      toast.error('Failed: ' + (err.message || 'Unknown error'));
    } finally {
      setActing(false);
    }
  };

  const handleIssueDecision = async () => {
    if (!decisionType || !decisionText.trim()) return;
    setActing(true);
    try {
      await base44.entities.Protest.update(protest.id, {
        status: 'Decision Issued',
        decision_type: decisionType,
        decision: decisionText.trim(),
        decision_issued_at: new Date().toISOString(),
      });

      // Release session hold when protest resolved
      if (protest.session_id) {
        await setSessionHold(protest.session_id, false);
        await queryClient.invalidateQueries({ queryKey: ['sessions', eventId] });
      }

      await logOp(eventId, 'protest_decision_issued', protest.id,
        `${protest.protest_number}: ${decisionType}`);
      await queryClient.invalidateQueries({ queryKey: ['protests', eventId] });
      toast.success('Decision issued — session hold released');
      onRefresh?.();
      onClose();
    } catch (err) {
      toast.error('Failed: ' + (err.message || 'Unknown error'));
    } finally {
      setActing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-950 border-gray-800 text-white max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <MessageSquareWarning className="w-4 h-4 text-yellow-400" />
            {protest.protest_number || 'Protest'} — {protest.protest_type}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-1">
          <div className="flex gap-2 flex-wrap">
            <StatusBadge status={protest.status} />
            {protest.session_id && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/40 text-amber-400">Hold Active</span>
            )}
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-1">Description</p>
            <p className="text-sm text-gray-300 leading-relaxed">{protest.description}</p>
          </div>

          {protest.rule_reference && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-1">Rule Reference</p>
              <p className="text-xs text-gray-400">{protest.rule_reference}</p>
            </div>
          )}

          {protest.steward_notes && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-1">Steward Notes</p>
              <p className="text-xs text-gray-400 whitespace-pre-wrap">{protest.steward_notes}</p>
            </div>
          )}

          {canManage && isActive && (
            <>
              {/* Assign steward */}
              <div className="p-3 bg-gray-900/60 border border-gray-800 rounded-lg space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Assign Steward</p>
                <div className="flex gap-2">
                  <Input value={assigneeId} onChange={e => setAssigneeId(e.target.value)}
                    className="bg-gray-900 border-gray-700 text-white text-xs h-8 flex-1" placeholder="User ID…" />
                  <Button size="sm" disabled={acting || !assigneeId.trim()} onClick={handleAssign}
                    className="bg-teal-800 hover:bg-teal-700 text-white text-xs h-8">Assign</Button>
                </div>
              </div>

              {/* Steward notes */}
              <div className="p-3 bg-gray-900/60 border border-gray-800 rounded-lg space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Steward Notes</p>
                <Textarea value={stewardNotes} onChange={e => setStewardNotes(e.target.value)}
                  className="bg-gray-900 border-gray-700 text-white text-xs h-16 resize-none" placeholder="Notes…" />
                <Button size="sm" disabled={acting || !stewardNotes.trim()} onClick={handleAddStewardNote}
                  className="bg-gray-700 hover:bg-gray-600 text-white text-xs h-8">Save Notes</Button>
              </div>

              {/* Status transitions */}
              <div className="p-3 bg-gray-900/60 border border-gray-800 rounded-lg space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Actions</p>
                <div className="flex flex-wrap gap-2">
                  {protest.status === 'Filed' && (
                    <>
                      <Button size="sm" disabled={acting} onClick={() => transition('Accepted')}
                        className="bg-blue-800 hover:bg-blue-700 text-white text-xs h-8">Accept</Button>
                      <Button size="sm" disabled={acting} onClick={() => transition('Rejected')}
                        className="bg-gray-700 hover:bg-gray-600 text-white text-xs h-8">Reject</Button>
                    </>
                  )}
                  {(protest.status === 'Accepted' || protest.status === 'Under Review') && (
                    <>
                      <Button size="sm" disabled={acting} onClick={() => transition('Hearing Scheduled')}
                        className="bg-purple-800 hover:bg-purple-700 text-white text-xs h-8">Schedule Hearing</Button>
                      <Button size="sm" disabled={acting} onClick={() => transition('Under Review')}
                        className="bg-orange-800 hover:bg-orange-700 text-white text-xs h-8">Under Review</Button>
                    </>
                  )}
                  {protest.status === 'Hearing Scheduled' && (
                    <Button size="sm" disabled={acting} onClick={() => transition('Under Review')}
                      className="bg-orange-800 hover:bg-orange-700 text-white text-xs h-8">Begin Review</Button>
                  )}
                </div>
              </div>

              {/* Issue decision */}
              {['Accepted', 'Under Review', 'Hearing Scheduled'].includes(protest.status) && (
                <div className="p-3 bg-gray-900/60 border border-gray-800 rounded-lg space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 flex items-center gap-1.5">
                    <Scale className="w-3 h-3" /> Issue Decision
                  </p>
                  <Select value={decisionType} onValueChange={setDecisionType}>
                    <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                      <SelectValue placeholder="Decision type…" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700">
                      {DECISION_TYPES.map(d => <SelectItem key={d} value={d} className="text-gray-200">{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Textarea value={decisionText} onChange={e => setDecisionText(e.target.value)}
                    className="bg-gray-900 border-gray-700 text-white text-xs h-20 resize-none"
                    placeholder="Decision rationale…" />
                  {protest.session_id && (
                    <p className="text-[10px] text-amber-400">Issuing decision will release the session hold.</p>
                  )}
                  <Button size="sm" disabled={acting || !decisionType || !decisionText.trim()} onClick={handleIssueDecision}
                    className="bg-green-800 hover:bg-green-700 text-white text-xs h-8 gap-1">
                    <ChevronRight className="w-3 h-3" /> Issue Decision
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main ProtestManager ──────────────────────────────────────────────────────
export default function ProtestManager({ eventId, sessions = [] }) {
  const { isAdmin, eventPermissions } = useEventWorkspace();
  const canView = isAdmin || !!eventPermissions?.canViewRaceControl;
  const canFile = isAdmin || !!eventPermissions?.canCreateIncident;

  const [showFile, setShowFile] = useState(false);
  const [selectedProtest, setSelectedProtest] = useState(null);
  const [showAll, setShowAll] = useState(false);

  const { data: protests = [], isLoading, refetch } = useQuery({
    queryKey: ['protests', eventId],
    queryFn: () => base44.entities.Protest.filter({ event_id: eventId }, '-created_date', 100),
    enabled: !!eventId && canView,
  });

  const displayed = showAll ? protests : protests.filter(p => ACTIVE_STATUSES.includes(p.status));

  if (!canView) return null;
  if (isLoading) return <div className="text-gray-500 text-xs py-4">Loading protests…</div>;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-600">{displayed.length} {showAll ? 'total' : 'active'}</span>
          <button onClick={() => setShowAll(v => !v)}
            className="text-[10px] text-teal-500 hover:text-teal-400 transition-colors">
            {showAll ? 'Show Active' : 'Show All'}
          </button>
        </div>
        {canFile && (
          <Button size="sm" onClick={() => setShowFile(true)}
            className="bg-yellow-800/60 hover:bg-yellow-800 text-white text-xs h-7 gap-1">
            <Plus className="w-3 h-3" /> File
          </Button>
        )}
      </div>

      {displayed.length === 0 && <div className="text-gray-600 text-xs py-3">No protests</div>}

      {displayed.map(pro => (
        <button key={pro.id} onClick={() => setSelectedProtest(pro)}
          className="w-full text-left rounded-lg border border-gray-800 bg-gray-900/40 hover:border-gray-700 hover:bg-gray-900/70 p-3 transition-colors">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <MessageSquareWarning className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
              <span className="text-xs font-semibold text-gray-200">{pro.protest_number || '—'}</span>
              <span className="text-xs text-gray-400 truncate">{pro.protest_type}</span>
            </div>
            <StatusBadge status={pro.status} />
          </div>
          {pro.description && <p className="text-xs text-gray-500 mt-1.5 line-clamp-1">{pro.description}</p>}
        </button>
      ))}

      <FileProtestModal open={showFile} onClose={() => setShowFile(false)} eventId={eventId} sessions={sessions} />

      <ProtestDetailDrawer
        protest={selectedProtest}
        open={!!selectedProtest}
        onClose={() => setSelectedProtest(null)}
        eventId={eventId}
        sessions={sessions}
        onRefresh={refetch}
      />
    </div>
  );
}