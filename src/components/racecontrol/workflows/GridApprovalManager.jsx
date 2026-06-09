/**
 * R9BR Sprint 3 — GridApprovalManager
 * Grid workflow: Generate → Draft → Pending Approval → Approved → Published.
 * Does NOT change session results. Phase 5.
 */
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useEventWorkspace } from '@/components/registrationdashboard/workspace/EventWorkspaceContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LayoutList, CheckCircle, Globe, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const GENERATION_METHODS = [
  'Qualifying Order', 'Inverted Qualifying', 'Random Draw',
  'Championship Points', 'Manual', 'Advancement from Heat', 'Previous Session Result',
];

const STATUS_COLOR = {
  Draft: 'bg-gray-700 text-gray-300',
  'Pending Approval': 'bg-yellow-900/60 text-yellow-300',
  Approved: 'bg-green-900/60 text-green-300',
  Published: 'bg-blue-900/60 text-blue-300',
  Superseded: 'bg-gray-700 text-gray-500',
};

async function logOp(eventId, action, entityId, detail) {
  try {
    await base44.functions.invoke('createActivityFeedItemSafe', {
      event_id: eventId, action,
      entity_type: 'GridLineup', entity_id: entityId, detail,
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

// ── Generate Lineup Modal ────────────────────────────────────────────────────
function GenerateLineupModal({ open, onClose, eventId, sessions = [] }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    session_id: '',
    source_session_id: '',
    generation_method: 'Manual',
    inversion_count: '0',
    notes: '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await base44.functions.invoke('generateGridLineup', {
        event_id: eventId,
        session_id: form.session_id,
        source_session_id: form.source_session_id || null,
        generation_method: form.generation_method,
        inversion_count: parseInt(form.inversion_count) || 0,
        notes: form.notes || null,
      });
      await queryClient.invalidateQueries({ queryKey: ['gridLineups', eventId] });
      toast.success('Lineup generated');
      setForm({ session_id: '', source_session_id: '', generation_method: 'Manual', inversion_count: '0', notes: '' });
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
            <LayoutList className="w-4 h-4 text-teal-400" /> Generate Grid Lineup
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-gray-400 text-xs">Session *</Label>
            <Select value={form.session_id} onValueChange={v => set('session_id', v)} required>
              <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                <SelectValue placeholder="Select session…" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                {sessions.map(s => <SelectItem key={s.id} value={s.id} className="text-gray-200">{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-gray-400 text-xs">Generation Method *</Label>
            <Select value={form.generation_method} onValueChange={v => set('generation_method', v)}>
              <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                {GENERATION_METHODS.map(m => <SelectItem key={m} value={m} className="text-gray-200">{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {['Qualifying Order', 'Inverted Qualifying', 'Previous Session Result', 'Advancement from Heat'].includes(form.generation_method) && (
            <div className="space-y-1.5">
              <Label className="text-gray-400 text-xs">Source Session (optional)</Label>
              <Select value={form.source_session_id} onValueChange={v => set('source_session_id', v)}>
                <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                  <SelectValue placeholder="Source session…" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
                  {sessions.map(s => <SelectItem key={s.id} value={s.id} className="text-gray-200">{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {form.generation_method === 'Inverted Qualifying' && (
            <div className="space-y-1.5">
              <Label className="text-gray-400 text-xs">Inversion Count</Label>
              <Select value={form.inversion_count} onValueChange={v => set('inversion_count', v)}>
                <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
                  {['0','1','2','3','4','5','6','8','10'].map(n => (
                    <SelectItem key={n} value={n} className="text-gray-200">Top {n} inverted</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-gray-400 text-xs">Notes (optional)</Label>
            <Textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              className="bg-gray-900 border-gray-700 text-white h-16 resize-none" placeholder="Grid notes…" />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={onClose} className="text-gray-400">Cancel</Button>
            <Button type="submit" disabled={saving || !form.session_id}
              className="bg-teal-800 hover:bg-teal-700 text-white">
              {saving ? 'Generating…' : 'Generate'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Lineup Row ───────────────────────────────────────────────────────────────
function LineupRow({ lineup, eventId, canApprove, onUpdate }) {
  const queryClient = useQueryClient();
  const [acting, setActing] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleSubmitForApproval = async () => {
    setActing(true);
    try {
      await base44.entities.GridLineup.update(lineup.id, { status: 'Pending Approval' });
      await queryClient.invalidateQueries({ queryKey: ['gridLineups', eventId] });
      toast.success('Submitted for approval');
      onUpdate?.();
    } catch (err) {
      toast.error('Failed: ' + (err.message || 'Unknown error'));
    } finally {
      setActing(false);
    }
  };

  const handleApprove = async () => {
    setActing(true);
    try {
      await base44.functions.invoke('approveGridLineup', { lineup_id: lineup.id });
      await logOp(eventId, 'grid_approved', lineup.id,
        `${lineup.generation_method} grid approved`);
      await queryClient.invalidateQueries({ queryKey: ['gridLineups', eventId] });
      toast.success('Lineup approved');
      onUpdate?.();
    } catch (err) {
      toast.error('Failed: ' + (err.message || 'Unknown error'));
    } finally {
      setActing(false);
    }
  };

  const handlePublish = async () => {
    setActing(true);
    try {
      await base44.entities.GridLineup.update(lineup.id, {
        status: 'Published',
        published_at: new Date().toISOString(),
      });
      await logOp(eventId, 'grid_published', lineup.id,
        `${lineup.generation_method} grid published`);
      await queryClient.invalidateQueries({ queryKey: ['gridLineups', eventId] });
      toast.success('Lineup published');
      onUpdate?.();
    } catch (err) {
      toast.error('Failed: ' + (err.message || 'Unknown error'));
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/40 p-3 space-y-2">
      <button onClick={() => setExpanded(v => !v)} className="w-full text-left">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <LayoutList className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
            <span className="text-xs font-semibold text-gray-200">{lineup.generation_method}</span>
            <span className="text-xs text-gray-500">{lineup.rows?.length ?? 0} positions</span>
          </div>
          <StatusBadge status={lineup.status} />
        </div>
      </button>

      {expanded && lineup.rows?.length > 0 && (
        <div className="pt-2 border-t border-gray-800/60 max-h-32 overflow-y-auto">
          <div className="space-y-0.5">
            {lineup.rows.slice(0, 20).map((row, i) => (
              <div key={i} className="flex items-center gap-3 text-[10px] text-gray-400">
                <span className="w-5 font-mono text-right text-gray-600">{row.position}</span>
                <span className="font-mono">{row.car_number || '—'}</span>
                <span className="text-gray-600">{row.driver_id ? `…${row.driver_id.slice(-6)}` : ''}</span>
                {row.status && row.status !== 'confirmed' && (
                  <span className="text-amber-400">{row.status}</span>
                )}
              </div>
            ))}
            {lineup.rows.length > 20 && (
              <p className="text-[10px] text-gray-600">+{lineup.rows.length - 20} more…</p>
            )}
          </div>
        </div>
      )}

      {lineup.notes && <p className="text-xs text-gray-500">{lineup.notes}</p>}

      {lineup.approved_at && (
        <p className="text-[10px] text-gray-600">
          Approved: {format(new Date(lineup.approved_at), 'MMM d HH:mm')}
        </p>
      )}

      {canApprove && (
        <div className="flex gap-2 pt-1 border-t border-gray-800/60">
          {lineup.status === 'Draft' && (
            <Button size="sm" disabled={acting} onClick={handleSubmitForApproval}
              className="bg-yellow-800/60 hover:bg-yellow-800 text-white text-xs h-7 gap-1">
              Submit for Approval
            </Button>
          )}
          {lineup.status === 'Pending Approval' && (
            <Button size="sm" disabled={acting} onClick={handleApprove}
              className="bg-green-800 hover:bg-green-700 text-white text-xs h-7 gap-1">
              <CheckCircle className="w-3 h-3" /> Approve
            </Button>
          )}
          {lineup.status === 'Approved' && (
            <Button size="sm" disabled={acting} onClick={handlePublish}
              className="bg-blue-800 hover:bg-blue-700 text-white text-xs h-7 gap-1">
              <Globe className="w-3 h-3" /> Publish
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main GridApprovalManager ─────────────────────────────────────────────────
export default function GridApprovalManager({ eventId, sessions = [] }) {
  const { isAdmin, eventPermissions } = useEventWorkspace();
  const canView = isAdmin || !!eventPermissions?.canViewRaceControl;
  const canGenerate = isAdmin || !!eventPermissions?.canGenerateLineup;
  const canApprove = isAdmin || !!eventPermissions?.canApproveGrid;

  const [showGenerate, setShowGenerate] = useState(false);

  const { data: lineups = [], isLoading, refetch } = useQuery({
    queryKey: ['gridLineups', eventId],
    queryFn: () => base44.entities.GridLineup.filter({ event_id: eventId }, '-created_date', 50),
    enabled: !!eventId && canView,
  });

  const active = lineups.filter(l => l.status !== 'Superseded');

  if (!canView) return null;
  if (isLoading) return <div className="text-gray-500 text-xs py-4">Loading lineups…</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-600">{active.length} active lineups</span>
        {canGenerate && (
          <Button size="sm" onClick={() => setShowGenerate(true)}
            className="bg-teal-900/60 hover:bg-teal-800 text-white text-xs h-7 gap-1">
            <Plus className="w-3 h-3" /> Generate
          </Button>
        )}
      </div>

      {active.length === 0 && <div className="text-gray-600 text-xs py-3">No lineups generated</div>}

      {active.map(lineup => (
        <LineupRow key={lineup.id} lineup={lineup} eventId={eventId} canApprove={canApprove} onUpdate={refetch} />
      ))}

      <GenerateLineupModal
        open={showGenerate}
        onClose={() => setShowGenerate(false)}
        eventId={eventId}
        sessions={sessions}
      />
    </div>
  );
}