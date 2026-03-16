import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  X, Loader2, FileText, RefreshCw, UserPlus, Archive,
  CheckCircle, Paperclip, ExternalLink, ChevronDown, ChevronRight
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

function Section({ title, content, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  if (!content) return null;
  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left">
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{title}</span>
        {open ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
      </button>
      {open && (
        <div className="px-4 py-3 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
          {content}
        </div>
      )}
    </div>
  );
}

function ListSection({ title, items, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  if (!items?.length) return null;
  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left">
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{title}</span>
        {open ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
      </button>
      {open && (
        <div className="px-4 py-3">
          <ul className="space-y-1.5">
            {items.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-gray-400 mt-0.5 shrink-0">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function TagSection({ title, items }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((t, i) => (
          <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">{t}</span>
        ))}
      </div>
    </div>
  );
}

export default function ResearchPacketDetail({ packet, onClose, onUpdated }) {
  const [saving, setSaving] = useState(null);
  const [showAssign, setShowAssign] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [assignEmail, setAssignEmail] = useState(packet.assigned_to ?? '');
  const [attachStoryId, setAttachStoryId] = useState(packet.linked_draft_story_id ?? '');
  const [editNotes, setEditNotes] = useState(false);
  const [notes, setNotes] = useState(packet.editor_notes ?? '');

  const update = async (data, action) => {
    setSaving(action);
    await base44.entities.StoryResearchPacket.update(packet.id, data);
    toast.success('Updated');
    onUpdated?.();
    setSaving(null);
  };

  const regenerate = async () => {
    setSaving('regenerate');
    try {
      const res = await base44.functions.invoke('generateStoryResearchPacket', {
        source_type: packet.source_type,
        source_id: packet.source_id,
        topic: packet.source_title,
        regenerate: true,
      });
      if (res.data?.success) {
        toast.success('New packet generated');
        onUpdated?.();
      } else {
        toast.error(res.data?.error ?? 'Regeneration failed');
      }
    } catch {
      toast.error('Regeneration failed');
    }
    setSaving(null);
  };

  const attachToDraft = async () => {
    if (!attachStoryId.trim()) return;
    setSaving('attach');
    try {
      const res = await base44.functions.invoke('generateStoryResearchPacket', {
        action: 'attach_to_draft',
        packet_id: packet.id,
        story_id: attachStoryId.trim(),
      });
      if (res.data?.success) {
        toast.success('Attached to draft');
        setShowAttach(false);
        onUpdated?.();
      } else {
        toast.error(res.data?.error ?? 'Failed to attach');
      }
    } catch {
      toast.error('Failed to attach');
    }
    setSaving(null);
  };

  const STATUS_COLORS = {
    generated: 'bg-blue-100 text-blue-700',
    reviewed: 'bg-green-100 text-green-700',
    attached_to_draft: 'bg-teal-100 text-teal-700',
    archived: 'bg-gray-100 text-gray-400',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col max-h-[calc(100vh-240px)]">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-5 border-b border-gray-100 shrink-0">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded capitalize">
              {packet.source_type?.replace(/_/g, ' ')}
            </span>
            <span className={`px-2 py-0.5 text-xs rounded capitalize ${STATUS_COLORS[packet.status] ?? 'bg-gray-100 text-gray-500'}`}>
              {packet.status?.replace(/_/g, ' ')}
            </span>
          </div>
          <h2 className="text-base font-bold text-gray-900 leading-snug">{packet.title}</h2>
          {packet.generated_at && (
            <p className="text-xs text-gray-400 mt-0.5">
              Generated {formatDistanceToNow(new Date(packet.generated_at), { addSuffix: true })}
            </p>
          )}
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg shrink-0">
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" variant="outline" className="h-8 text-xs text-green-700 border-green-200 hover:bg-green-50"
            disabled={!!saving} onClick={() => update({ status: 'reviewed' }, 'reviewed')}>
            {saving === 'reviewed' ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
            Mark Reviewed
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs text-indigo-700 border-indigo-200 hover:bg-indigo-50"
            disabled={!!saving} onClick={() => { setShowAssign(v => !v); setShowAttach(false); }}>
            <UserPlus className="w-3 h-3" /> Assign
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs text-teal-700 border-teal-200 hover:bg-teal-50"
            disabled={!!saving} onClick={() => { setShowAttach(v => !v); setShowAssign(false); }}>
            <Paperclip className="w-3 h-3" /> Attach to Draft
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs text-blue-700 border-blue-200 hover:bg-blue-50"
            disabled={!!saving} onClick={regenerate}>
            {saving === 'regenerate' ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Regenerate
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs text-gray-400 hover:bg-gray-50 col-span-2"
            disabled={!!saving} onClick={() => update({ status: 'archived' }, 'archive')}>
            {saving === 'archive' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Archive className="w-3 h-3" />}
            Archive Packet
          </Button>
        </div>

        {/* Assign form */}
        {showAssign && (
          <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100 space-y-2">
            <p className="text-xs font-semibold text-indigo-700">Assign to writer (email)</p>
            <Input value={assignEmail} onChange={e => setAssignEmail(e.target.value)} placeholder="writer@example.com" className="h-8 text-xs" />
            <div className="flex gap-2">
              <Button size="sm" className="h-7 text-xs" onClick={() => update({ assigned_to: assignEmail, status: 'reviewed' }, 'assign')}
                disabled={saving === 'assign'}>
                {saving === 'assign' ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Assign'}
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowAssign(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Attach form */}
        {showAttach && (
          <div className="p-3 bg-teal-50 rounded-lg border border-teal-100 space-y-2">
            <p className="text-xs font-semibold text-teal-700">Enter draft Story ID to attach</p>
            <Input value={attachStoryId} onChange={e => setAttachStoryId(e.target.value)} placeholder="Story ID…" className="h-8 text-xs font-mono" />
            <div className="flex gap-2">
              <Button size="sm" className="h-7 text-xs bg-teal-600 hover:bg-teal-700" onClick={attachToDraft} disabled={saving === 'attach'}>
                {saving === 'attach' ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Attach'}
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowAttach(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Linked draft */}
        {packet.linked_draft_story_id && (
          <div className="flex items-center gap-2 p-3 bg-teal-50 border border-teal-100 rounded-lg">
            <FileText className="w-4 h-4 text-teal-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-teal-700">Attached to Draft</p>
              <p className="text-xs text-teal-600 font-mono truncate">{packet.linked_draft_story_id}</p>
            </div>
          </div>
        )}

        {/* Core content - open by default */}
        <div className="space-y-2">
          <Section title="Summary" content={packet.summary} defaultOpen />
          <Section title="Editorial Brief" content={packet.editorial_brief} defaultOpen />
          <Section title="Why This Matters" content={packet.why_this_matters} defaultOpen />
          <Section title="Recommended Angle" content={packet.recommended_angle} defaultOpen />
          <ListSection title="Key Talking Points" items={packet.key_talking_points} defaultOpen />
        </div>

        {/* Context blocks */}
        <div className="space-y-2">
          <Section title="Recent Results Context" content={packet.recent_results_context} />
          <Section title="Standings Context" content={packet.standings_context} />
          <Section title="Schedule Context" content={packet.schedule_context} />
          <Section title="Business Context" content={packet.business_context} />
          <Section title="Cultural Context" content={packet.cultural_context} />
          <Section title="Historical Context" content={packet.historical_context} />
          <Section title="Recent Coverage Summary" content={packet.recent_coverage_summary} />
          <Section title="Coverage Gaps" content={packet.coverage_gaps} />
          <Section title="Stats Snapshot" content={packet.stats_snapshot} />
          <Section title="Notable Quotes / Placeholders" content={packet.notable_quotes_or_placeholders} />
        </div>

        {/* Headlines & SEO */}
        <ListSection title="Suggested Headlines" items={packet.suggested_headlines} />
        <ListSection title="Suggested Sections" items={packet.suggested_sections} />
        <TagSection title="SEO Keywords" items={packet.seo_keywords} />
        <TagSection title="Related Entities" items={packet.related_entity_names} />

        {/* Target reader */}
        {packet.target_reader && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Target Reader</p>
            <p className="text-sm text-gray-700">{packet.target_reader}</p>
          </div>
        )}

        {/* Editor notes */}
        <div>
          <button onClick={() => setEditNotes(v => !v)} className="flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-800 mb-2 transition-colors">
            {editNotes ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            Editor Notes
          </button>
          {!editNotes && packet.editor_notes && (
            <p className="text-xs text-gray-500 italic pl-5 line-clamp-2">{packet.editor_notes}</p>
          )}
          {editNotes && (
            <div className="space-y-2">
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} className="text-xs min-h-[80px]" placeholder="Add notes…" />
              <div className="flex gap-2">
                <Button size="sm" className="h-7 text-xs" onClick={() => update({ editor_notes: notes }, 'notes')} disabled={saving === 'notes'}>
                  {saving === 'notes' ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditNotes(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </div>

        {/* Assigned to */}
        {packet.assigned_to && (
          <p className="text-xs text-indigo-500 font-medium">Assigned to: {packet.assigned_to}</p>
        )}

      </div>
    </div>
  );
}