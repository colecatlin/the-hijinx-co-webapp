import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, FlaskConical, BookOpen, Play, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

const STATUS_COLORS = {
  draft:            'bg-gray-100 text-gray-600',
  in_progress:      'bg-orange-100 text-orange-700',
  ready_for_review: 'bg-blue-100 text-blue-700',
  needs_revision:   'bg-red-100 text-red-700',
  scheduled:        'bg-violet-100 text-violet-700',
  published:        'bg-green-100 text-green-700',
};

export default function DraftsInProgress({ drafts, packets, recs, onUpdated }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState({});

  const inProgressDrafts = drafts.filter(d => ['draft', 'in_progress', 'needs_revision', 'ready_for_review'].includes(d.status));

  const setStatus = async (draftId, newStatus) => {
    setLoading(l => ({ ...l, [draftId]: newStatus }));
    try {
      await base44.entities.OutletStory.update(draftId, { status: newStatus });
      try {
        await base44.entities.OperationLog.create({
          operation_type: newStatus === 'in_progress' ? 'draft_marked_in_progress' : 'draft_marked_ready_for_review',
          entity_name: 'OutletStory',
          entity_id: draftId,
          metadata: { new_status: newStatus },
        });
      } catch (_) {}
      toast.success(`Draft marked "${newStatus.replace(/_/g, ' ')}"`);
      onUpdated?.();
    } catch {
      toast.error('Update failed');
    }
    setLoading(l => ({ ...l, [draftId]: null }));
  };

  if (!inProgressDrafts.length) {
    return (
      <div className="py-16 text-center border border-dashed border-gray-200 rounded-xl bg-gray-50">
        <FileText className="w-8 h-8 mx-auto mb-3 text-gray-300" />
        <p className="text-sm text-gray-400">No drafts in progress.</p>
        <p className="text-xs text-gray-400 mt-1">Convert a recommendation to a draft to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {inProgressDrafts.map(draft => {
        const linkedPacket = packets.find(p => p.linked_draft_story_id === draft.id);
        const linkedRec = recs.find(r => r.linked_story_id === draft.id);

        return (
          <div key={draft.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={`px-2 py-0.5 text-xs rounded capitalize ${STATUS_COLORS[draft.status] ?? 'bg-gray-100 text-gray-500'}`}>
                  {draft.status?.replace(/_/g, ' ')}
                </span>
                {draft.primary_category && (
                  <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">{draft.primary_category}</span>
                )}
              </div>
              {draft.updated_date && (
                <span className="text-[11px] text-gray-400 shrink-0">
                  Updated {formatDistanceToNow(new Date(draft.updated_date), { addSuffix: true })}
                </span>
              )}
            </div>

            <h3 className="text-sm font-bold text-gray-900 leading-snug mb-2">{draft.title}</h3>

            {/* Linked context */}
            <div className="flex flex-wrap gap-2 mb-3">
              {linkedPacket && (
                <span className="flex items-center gap-1 text-[11px] text-blue-600 bg-blue-50 border border-blue-100 rounded px-2 py-0.5">
                  <FlaskConical className="w-2.5 h-2.5" /> Research packet attached
                </span>
              )}
              {linkedRec && (
                <span className="flex items-center gap-1 text-[11px] text-violet-600 bg-violet-50 border border-violet-100 rounded px-2 py-0.5">
                  <BookOpen className="w-2.5 h-2.5" /> From recommendation
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              <Button size="sm" variant="outline" className="h-7 text-xs"
                onClick={() => navigate('/ManageStories')}>
                <FileText className="w-3 h-3" /> Open Draft
              </Button>
              {linkedPacket && (
                <Button size="sm" variant="outline" className="h-7 text-xs text-blue-700 border-blue-200 hover:bg-blue-50"
                  onClick={() => navigate('/management/editorial/research-packets')}>
                  <FlaskConical className="w-3 h-3" /> Research Packet
                </Button>
              )}
              {linkedRec && (
                <Button size="sm" variant="outline" className="h-7 text-xs text-violet-700 border-violet-200 hover:bg-violet-50"
                  onClick={() => navigate('/management/editorial/recommendations')}>
                  <BookOpen className="w-3 h-3" /> Recommendation
                </Button>
              )}
              {draft.status !== 'in_progress' && draft.status !== 'ready_for_review' && (
                <Button size="sm" variant="outline" className="h-7 text-xs text-orange-700 border-orange-200 hover:bg-orange-50"
                  disabled={!!loading[draft.id]}
                  onClick={() => setStatus(draft.id, 'in_progress')}>
                  {loading[draft.id] === 'in_progress' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                  Mark In Progress
                </Button>
              )}
              {draft.status !== 'ready_for_review' && (
                <Button size="sm" variant="outline" className="h-7 text-xs text-green-700 border-green-200 hover:bg-green-50"
                  disabled={!!loading[draft.id]}
                  onClick={() => setStatus(draft.id, 'ready_for_review')}>
                  {loading[draft.id] === 'ready_for_review' ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                  Ready for Review
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}