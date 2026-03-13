import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  CheckCircle, XCircle, Bookmark, ShieldCheck, FileText, UserPlus,
  X, ChevronRight, Loader2, StickyNote, ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';

const STATUS_COLORS = {
  suggested: 'bg-blue-100 text-blue-700',
  saved: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  assigned: 'bg-indigo-100 text-indigo-700',
  drafted: 'bg-teal-100 text-teal-700',
  published: 'bg-gray-800 text-white',
  dismissed: 'bg-gray-100 text-gray-500',
  covered: 'bg-purple-100 text-purple-700',
};

function ScoreBar({ label, value, color = 'bg-blue-500' }) {
  if (value == null) return null;
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{label}</span>
        <span className="font-semibold text-gray-800">{Math.round(value)}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm text-gray-800 leading-relaxed">{value}</p>
    </div>
  );
}

function TagList({ label, items }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">{item}</span>
        ))}
      </div>
    </div>
  );
}

export default function RecommendationDetailPanel({ rec, onClose, onUpdated }) {
  const queryClient = useQueryClient();
  const [showNotes, setShowNotes] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [notesValue, setNotesValue] = useState(rec.editor_notes ?? '');
  const [assignValue, setAssignValue] = useState(rec.assigned_to ?? '');
  const [actionLoading, setActionLoading] = useState(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['recommendations'] });
    queryClient.invalidateQueries({ queryKey: ['rec-counts'] });
    queryClient.invalidateQueries({ queryKey: ['high-priority-recs'] });
    queryClient.invalidateQueries({ queryKey: ['coverage-gaps'] });
    onUpdated?.();
  };

  const doUpdate = async (patch, action) => {
    setActionLoading(action);
    await base44.entities.StoryRecommendation.update(rec.id, patch);
    invalidate();
    setActionLoading(null);
  };

  const saveNotes = () => doUpdate({ editor_notes: notesValue }, 'notes').then(() => setShowNotes(false));
  const saveAssign = () => doUpdate({ assigned_to: assignValue, status: rec.status === 'approved' ? 'assigned' : rec.status }, 'assign').then(() => setShowAssign(false));

  const canConvertToDraft = rec.status === 'approved' && !rec.linked_story_id;
  const alreadyConverted = !!rec.linked_story_id || rec.status === 'drafted';

  const handleConvertToDraft = async () => {
    setActionLoading('draft');
    try {
      const res = await base44.functions.invoke('convertRecommendationToDraft', { recommendationId: rec.id });
      if (res.data?.success) {
        toast.success('Draft created successfully');
        invalidate();
      } else {
        toast.error(res.data?.error ?? 'Failed to create draft');
      }
    } catch (e) {
      toast.error(e?.response?.data?.error ?? 'Failed to create draft');
    }
    setActionLoading(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-5 border-b border-gray-100">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`px-2 py-0.5 rounded text-xs font-semibold capitalize ${STATUS_COLORS[rec.status] ?? 'bg-gray-100 text-gray-600'}`}>
              {rec.status}
            </span>
            {rec.story_type && (
              <span className="px-2 py-0.5 bg-violet-100 text-violet-700 text-xs rounded capitalize">
                {rec.story_type.replace(/_/g, ' ')}
              </span>
            )}
            {rec.recommended_format && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded capitalize">
                {rec.recommended_format.replace(/_/g, ' ')}
              </span>
            )}
          </div>
          <h2 className="text-base font-bold text-gray-900 leading-snug">{rec.title_suggestion}</h2>
          {rec.generated_at && (
            <p className="text-xs text-gray-400 mt-0.5">
              Generated {formatDistanceToNow(new Date(rec.generated_at), { addSuffix: true })}
            </p>
          )}
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors shrink-0">
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white text-xs h-8"
            disabled={!!actionLoading} onClick={() => doUpdate({ status: 'approved', approved_at: new Date().toISOString() }, 'approve')}>
            {actionLoading === 'approve' ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
            Approve
          </Button>
          <Button size="sm" variant="outline" className="text-amber-700 border-amber-200 hover:bg-amber-50 text-xs h-8"
            disabled={!!actionLoading} onClick={() => doUpdate({ status: 'saved' }, 'save')}>
            {actionLoading === 'save' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bookmark className="w-3 h-3" />}
            Save For Later
          </Button>
          <Button size="sm" variant="outline" className="text-purple-700 border-purple-200 hover:bg-purple-50 text-xs h-8"
            disabled={!!actionLoading} onClick={() => doUpdate({ status: 'covered' }, 'covered')}>
            {actionLoading === 'covered' ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
            Mark Covered
          </Button>
          <Button size="sm" variant="outline" className="text-gray-500 hover:bg-gray-50 text-xs h-8"
            disabled={!!actionLoading} onClick={() => doUpdate({ status: 'dismissed' }, 'dismiss')}>
            {actionLoading === 'dismiss' ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
            Dismiss
          </Button>
          {alreadyConverted ? (
            <Button size="sm" variant="outline"
              className="text-xs h-8 col-span-1 text-teal-700 border-teal-200 hover:bg-teal-50"
              disabled>
              <CheckCircle className="w-3 h-3" />
              Draft Created
            </Button>
          ) : (
            <Button size="sm" variant="outline"
              className={`text-xs h-8 col-span-1 ${canConvertToDraft ? 'text-teal-700 border-teal-200 hover:bg-teal-50' : 'opacity-40 cursor-not-allowed'}`}
              disabled={!!actionLoading || !canConvertToDraft}
              title={!canConvertToDraft ? 'Must be Approved to convert to draft' : ''}
              onClick={handleConvertToDraft}>
              {actionLoading === 'draft' ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
              Convert To Draft
            </Button>
          )}
          <Button size="sm" variant="outline" className="text-indigo-700 border-indigo-200 hover:bg-indigo-50 text-xs h-8"
            onClick={() => { setShowAssign(v => !v); setShowNotes(false); }}>
            <UserPlus className="w-3 h-3" />
            Assign To Editor
          </Button>
        </div>

        {/* Assign */}
        {showAssign && (
          <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100 space-y-2">
            <p className="text-xs font-semibold text-indigo-700">Assign to editor (email)</p>
            <Input value={assignValue} onChange={e => setAssignValue(e.target.value)}
              placeholder="editor@example.com" className="h-8 text-xs" />
            <div className="flex gap-2">
              <Button size="sm" className="h-7 text-xs" onClick={saveAssign} disabled={actionLoading === 'assign'}>
                {actionLoading === 'assign' ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowAssign(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Editor Notes */}
        <div>
          <button onClick={() => { setShowNotes(v => !v); setShowAssign(false); }}
            className="flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors mb-2">
            <StickyNote className="w-3.5 h-3.5" />
            Editor Notes
            <ChevronRight className={`w-3 h-3 transition-transform ${showNotes ? 'rotate-90' : ''}`} />
          </button>
          {!showNotes && rec.editor_notes && (
            <p className="text-xs text-gray-500 italic pl-5 line-clamp-2">{rec.editor_notes}</p>
          )}
          {showNotes && (
            <div className="space-y-2 pl-1">
              <Textarea value={notesValue} onChange={e => setNotesValue(e.target.value)}
                placeholder="Add internal editorial notes…" className="text-xs min-h-[80px] resize-none" />
              <div className="flex gap-2">
                <Button size="sm" className="h-7 text-xs" onClick={saveNotes} disabled={actionLoading === 'notes'}>
                  {actionLoading === 'notes' ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save Notes'}
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowNotes(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </div>

        {/* Scores */}
        <div className="space-y-2.5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Scores</p>
          <ScoreBar label="Priority" value={rec.priority_score} color="bg-red-400" />
          <ScoreBar label="Urgency" value={rec.urgency_score} color="bg-orange-400" />
          <ScoreBar label="Confidence" value={rec.confidence_score} color="bg-blue-400" />
          <ScoreBar label="Newsworthiness" value={rec.newsworthiness_score} color="bg-violet-400" />
          <ScoreBar label="Coverage Gap" value={rec.coverage_gap_score} color="bg-amber-400" />
        </div>

        {/* Core fields */}
        <div className="space-y-4">
          <DetailRow label="Summary" value={rec.summary} />
          <DetailRow label="Angle" value={rec.angle} />
          <DetailRow label="Why Now" value={rec.why_now} />
          <DetailRow label="Target Reader" value={rec.target_reader} />
          <DetailRow label="Publish Timing" value={rec.publish_timing} />
        </div>

        {/* Category */}
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Category</p>
          <div className="flex flex-wrap gap-2">
            {rec.recommended_category && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">{rec.recommended_category}</span>
            )}
            {rec.recommended_subcategory && (
              <span className="px-2 py-0.5 bg-gray-50 border border-gray-200 text-gray-500 text-xs rounded">{rec.recommended_subcategory}</span>
            )}
          </div>
        </div>

        {/* Headlines */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Headline Alternatives</p>
          {rec.suggested_headline_alt_1 && (
            <p className="text-sm text-gray-700 bg-gray-50 rounded px-3 py-2 border border-gray-100">{rec.suggested_headline_alt_1}</p>
          )}
          {rec.suggested_headline_alt_2 && (
            <p className="text-sm text-gray-700 bg-gray-50 rounded px-3 py-2 border border-gray-100">{rec.suggested_headline_alt_2}</p>
          )}
          {!rec.suggested_headline_alt_1 && !rec.suggested_headline_alt_2 && (
            <p className="text-xs text-gray-400 italic">No alternatives generated.</p>
          )}
        </div>

        {/* Excerpt */}
        <DetailRow label="Suggested Excerpt" value={rec.suggested_excerpt} />

        {/* Draft Intro */}
        {rec.draft_intro && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Draft Intro</p>
            <p className="text-sm text-gray-700 bg-gray-50 rounded px-3 py-2 border border-gray-100 leading-relaxed">{rec.draft_intro}</p>
          </div>
        )}

        {/* Draft Outline */}
        {rec.draft_outline && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Draft Outline</p>
            <pre className="text-xs text-gray-700 bg-gray-50 rounded px-3 py-2 border border-gray-100 whitespace-pre-wrap font-sans leading-relaxed">{rec.draft_outline}</pre>
          </div>
        )}

        {/* Slug */}
        <DetailRow label="Slug Suggestion" value={rec.slug_suggestion} />

        {/* Tags & Keywords */}
        <TagList label="Recommended Tags" items={rec.recommended_tags} />
        <TagList label="SEO Keywords" items={rec.seo_keywords} />

        {/* Entities */}
        <TagList label="Related Entities" items={rec.related_entity_names} />

        {/* Source Signals */}
        {rec.source_signal_ids?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Source Signals ({rec.source_signal_ids.length})</p>
            <div className="flex flex-wrap gap-1.5">
              {rec.source_signal_ids.map((id, i) => (
                <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded font-mono">{id.slice(-8)}</span>
              ))}
            </div>
          </div>
        )}

        {/* Meta */}
        <div className="space-y-1.5 pt-2 border-t border-gray-100">
          {rec.assigned_to && <DetailRow label="Assigned To" value={rec.assigned_to} />}
          {rec.approved_by && <DetailRow label="Approved By" value={rec.approved_by} />}
          {rec.approved_at && <DetailRow label="Approved At" value={format(new Date(rec.approved_at), 'MMM d, yyyy h:mm a')} />}
          {rec.converted_to_draft_at && <DetailRow label="Converted To Draft" value={format(new Date(rec.converted_to_draft_at), 'MMM d, yyyy h:mm a')} />}
          {rec.linked_story_id && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Linked Story ID</p>
              <p className="text-xs text-teal-700 font-mono">{rec.linked_story_id}</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}