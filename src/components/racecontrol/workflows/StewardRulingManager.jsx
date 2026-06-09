/**
 * R9BR Sprint 3 — StewardRulingManager
 * Ruling workflow: Draft → Issued → Published.
 * Chief Steward may Issue. Race Director may Publish.
 * Phase 4.
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
import { BookOpen, Plus, Globe, Send } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const SOURCE_TYPES = ['Incident', 'Protest', 'Appeal', 'Technical Review', 'Conduct Review', 'Direct'];

const STATUS_COLOR = {
  Draft: 'bg-gray-700 text-gray-400',
  Issued: 'bg-blue-900/60 text-blue-300',
  Published: 'bg-green-900/60 text-green-300',
  Superseded: 'bg-gray-700 text-gray-500',
};

async function logOp(eventId, action, entityId, detail) {
  try {
    await base44.functions.invoke('createActivityFeedItemSafe', {
      event_id: eventId, action,
      entity_type: 'StewardRuling', entity_id: entityId, detail,
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

// ── Create Ruling Modal ──────────────────────────────────────────────────────
function CreateRulingModal({ open, onClose, eventId }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    source_type: 'Direct',
    source_id: '',
    summary: '',
    full_ruling: '',
    rule_references: '',
    is_public: false,
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await base44.functions.invoke('issueStewardRuling', {
        event_id: eventId,
        source_type: form.source_type,
        source_id: form.source_id || null,
        summary: form.summary,
        full_ruling: form.full_ruling,
        rule_references: form.rule_references
          ? form.rule_references.split(',').map(s => s.trim()).filter(Boolean)
          : [],
        is_public: form.is_public,
        status: 'Draft',
      });
      await queryClient.invalidateQueries({ queryKey: ['stewardRulings', eventId] });
      toast.success('Ruling draft created');
      setForm({ source_type: 'Direct', source_id: '', summary: '', full_ruling: '', rule_references: '', is_public: false });
      onClose();
    } catch (err) {
      toast.error('Failed: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-950 border-gray-800 text-white max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-400" /> Create Ruling Draft
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-gray-400 text-xs">Source Type *</Label>
            <Select value={form.source_type} onValueChange={v => set('source_type', v)}>
              <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                {SOURCE_TYPES.map(t => <SelectItem key={t} value={t} className="text-gray-200">{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-gray-400 text-xs">Source ID (optional)</Label>
            <Input value={form.source_id} onChange={e => set('source_id', e.target.value)}
              className="bg-gray-900 border-gray-700 text-white" placeholder="Incident/Protest ID…" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-gray-400 text-xs">Summary * (max 280 chars)</Label>
            <Input value={form.summary} onChange={e => set('summary', e.target.value.slice(0, 280))}
              className="bg-gray-900 border-gray-700 text-white" placeholder="Short public summary…" required />
            <p className="text-[10px] text-gray-600">{form.summary.length}/280</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-gray-400 text-xs">Full Ruling *</Label>
            <Textarea required value={form.full_ruling} onChange={e => set('full_ruling', e.target.value)}
              className="bg-gray-900 border-gray-700 text-white h-28 resize-none" placeholder="Full ruling text…" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-gray-400 text-xs">Rule References (comma-separated)</Label>
            <Input value={form.rule_references} onChange={e => set('rule_references', e.target.value)}
              className="bg-gray-900 border-gray-700 text-white" placeholder="e.g. 10.2, 14.5" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="ruling_public" checked={form.is_public}
              onChange={e => set('is_public', e.target.checked)} className="rounded border-gray-700" />
            <Label htmlFor="ruling_public" className="text-gray-400 text-xs cursor-pointer">Mark as public when issued</Label>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={onClose} className="text-gray-400">Cancel</Button>
            <Button type="submit" disabled={saving || !form.summary || !form.full_ruling}
              className="bg-blue-800 hover:bg-blue-700 text-white">
              {saving ? 'Creating…' : 'Create Draft'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Ruling Row ───────────────────────────────────────────────────────────────
function RulingRow({ ruling, eventId, canIssue, canPublish, onUpdate }) {
  const queryClient = useQueryClient();
  const [acting, setActing] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleIssue = async () => {
    setActing(true);
    try {
      await base44.functions.invoke('issueStewardRuling', { ruling_id: ruling.id });
      await logOp(eventId, 'ruling_issued', ruling.id, ruling.summary);
      await queryClient.invalidateQueries({ queryKey: ['stewardRulings', eventId] });
      toast.success('Ruling issued');
      onUpdate?.();
    } catch (err) {
      toast.error('Failed to issue: ' + (err.message || 'Unknown error'));
    } finally {
      setActing(false);
    }
  };

  const handlePublish = async () => {
    setActing(true);
    try {
      await base44.functions.invoke('publishStewardRuling', { ruling_id: ruling.id });
      await logOp(eventId, 'ruling_published', ruling.id, ruling.summary);
      await queryClient.invalidateQueries({ queryKey: ['stewardRulings', eventId] });
      toast.success('Ruling published');
      onUpdate?.();
    } catch (err) {
      toast.error('Failed to publish: ' + (err.message || 'Unknown error'));
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/40 p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <button onClick={() => setExpanded(v => !v)} className="flex items-center gap-2 min-w-0 text-left flex-1">
          <BookOpen className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
          <span className="text-xs font-semibold text-gray-200">{ruling.ruling_number || '—'}</span>
          <span className="text-xs text-gray-400 truncate">{ruling.summary}</span>
        </button>
        <div className="flex items-center gap-2 flex-shrink-0">
          {ruling.is_public && <Globe className="w-3 h-3 text-green-400" />}
          <StatusBadge status={ruling.status} />
        </div>
      </div>

      {ruling.source_type && (
        <p className="text-[10px] text-gray-600">Source: {ruling.source_type}</p>
      )}

      {expanded && ruling.full_ruling && (
        <div className="pt-2 border-t border-gray-800/60">
          <p className="text-xs text-gray-400 whitespace-pre-wrap leading-relaxed">{ruling.full_ruling}</p>
          {ruling.rule_references?.length > 0 && (
            <p className="text-[10px] text-gray-600 mt-2">Rules: {ruling.rule_references.join(', ')}</p>
          )}
          {ruling.issued_at && (
            <p className="text-[10px] text-gray-600 mt-1">
              Issued: {format(new Date(ruling.issued_at), 'MMM d HH:mm')}
            </p>
          )}
          {ruling.published_at && (
            <p className="text-[10px] text-gray-600">
              Published: {format(new Date(ruling.published_at), 'MMM d HH:mm')}
            </p>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        {canIssue && ruling.status === 'Draft' && (
          <Button size="sm" disabled={acting} onClick={handleIssue}
            className="bg-blue-800 hover:bg-blue-700 text-white text-xs h-7 gap-1">
            <Send className="w-3 h-3" /> Issue
          </Button>
        )}
        {canPublish && ruling.status === 'Issued' && (
          <Button size="sm" disabled={acting} onClick={handlePublish}
            className="bg-green-800 hover:bg-green-700 text-white text-xs h-7 gap-1">
            <Globe className="w-3 h-3" /> Publish
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Main StewardRulingManager ─────────────────────────────────────────────────
export default function StewardRulingManager({ eventId }) {
  const { isAdmin, eventPermissions } = useEventWorkspace();
  const canView = isAdmin || !!eventPermissions?.canViewRaceControl;
  const canIssue = isAdmin || !!eventPermissions?.canIssueRuling;
  const canPublish = isAdmin || !!eventPermissions?.canPublishRuling;

  const [showCreate, setShowCreate] = useState(false);

  const { data: rulings = [], isLoading, refetch } = useQuery({
    queryKey: ['stewardRulings', eventId],
    queryFn: () => base44.entities.StewardRuling.filter({ event_id: eventId }, '-created_date', 50),
    enabled: !!eventId && canView,
  });

  if (!canView) return null;
  if (isLoading) return <div className="text-gray-500 text-xs py-4">Loading rulings…</div>;

  const drafts = rulings.filter(r => r.status === 'Draft');
  const issued = rulings.filter(r => r.status === 'Issued');
  const published = rulings.filter(r => r.status === 'Published');

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-600">
          {drafts.length} Draft · {issued.length} Issued · {published.length} Published
        </span>
        {canIssue && (
          <Button size="sm" onClick={() => setShowCreate(true)}
            className="bg-blue-900/60 hover:bg-blue-800 text-white text-xs h-7 gap-1">
            <Plus className="w-3 h-3" /> New Ruling
          </Button>
        )}
      </div>

      {rulings.length === 0 && <div className="text-gray-600 text-xs py-3">No rulings</div>}

      {/* Drafts */}
      {drafts.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-2">Drafts</p>
          <div className="space-y-2">
            {drafts.map(r => (
              <RulingRow key={r.id} ruling={r} eventId={eventId} canIssue={canIssue} canPublish={canPublish} onUpdate={refetch} />
            ))}
          </div>
        </div>
      )}

      {/* Issued */}
      {issued.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-2">Issued</p>
          <div className="space-y-2">
            {issued.map(r => (
              <RulingRow key={r.id} ruling={r} eventId={eventId} canIssue={canIssue} canPublish={canPublish} onUpdate={refetch} />
            ))}
          </div>
        </div>
      )}

      {/* Published */}
      {published.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-2">Published</p>
          <div className="space-y-2">
            {published.map(r => (
              <RulingRow key={r.id} ruling={r} eventId={eventId} canIssue={false} canPublish={false} onUpdate={refetch} />
            ))}
          </div>
        </div>
      )}

      <CreateRulingModal open={showCreate} onClose={() => setShowCreate(false)} eventId={eventId} />
    </div>
  );
}