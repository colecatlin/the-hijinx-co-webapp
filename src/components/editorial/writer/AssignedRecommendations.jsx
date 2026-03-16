import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, FlaskConical, FileText, ExternalLink, Play, CheckCircle, BookOpen } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

const STATUS_COLORS = {
  approved:         'bg-green-100 text-green-700',
  saved:            'bg-amber-100 text-amber-700',
  drafted:          'bg-teal-100 text-teal-700',
  in_progress:      'bg-orange-100 text-orange-700',
  ready_for_review: 'bg-blue-100 text-blue-700',
};

const PRIORITY_COLOR = (score) => {
  if (score >= 80) return 'text-red-600 font-bold';
  if (score >= 60) return 'text-orange-600 font-semibold';
  return 'text-gray-500';
};

export default function AssignedRecommendations({ recs, onUpdated }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState({});

  const setStatus = async (recId, newStatus, label) => {
    setLoading(l => ({ ...l, [recId]: newStatus }));
    try {
      await base44.entities.StoryRecommendation.update(recId, { status: newStatus });
      try {
        await base44.entities.OperationLog.create({
          operation_type: newStatus === 'in_progress' ? 'draft_marked_in_progress' : 'draft_marked_ready_for_review',
          entity_name: 'StoryRecommendation',
          entity_id: recId,
          metadata: { new_status: newStatus },
        });
      } catch (_) {}
      toast.success(`Marked "${label}"`);
      onUpdated?.();
    } catch {
      toast.error('Update failed');
    }
    setLoading(l => ({ ...l, [recId]: null }));
  };

  if (!recs.length) {
    return (
      <div className="py-16 text-center border border-dashed border-gray-200 rounded-xl bg-gray-50">
        <BookOpen className="w-8 h-8 mx-auto mb-3 text-gray-300" />
        <p className="text-sm text-gray-400">No recommendations assigned to you.</p>
        <p className="text-xs text-gray-400 mt-1">Editors assign recommendations from the Story Radar system.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {recs.map(rec => (
        <div key={rec.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={`px-2 py-0.5 text-xs rounded capitalize ${STATUS_COLORS[rec.status] ?? 'bg-gray-100 text-gray-500'}`}>
                {rec.status?.replace(/_/g, ' ')}
              </span>
              {rec.story_type && (
                <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded capitalize">
                  {rec.story_type.replace(/_/g, ' ')}
                </span>
              )}
              {rec.priority_score >= 80 && (
                <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded font-semibold">High Priority</span>
              )}
            </div>
            {rec.generated_at && (
              <span className="text-[11px] text-gray-400 shrink-0">
                {formatDistanceToNow(new Date(rec.generated_at), { addSuffix: true })}
              </span>
            )}
          </div>

          <h3 className="text-sm font-bold text-gray-900 leading-snug mb-1">{rec.title_suggestion}</h3>

          {rec.related_entity_names?.length > 0 && (
            <p className="text-xs text-gray-500 mb-1">{rec.related_entity_names.join(', ')}</p>
          )}

          {rec.publish_timing && (
            <p className="text-xs text-indigo-600 mb-2">📅 {rec.publish_timing}</p>
          )}

          {rec.editor_notes && (
            <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-3">
              <p className="text-[11px] font-semibold text-amber-700 mb-0.5">Editor Note</p>
              <p className="text-xs text-amber-800 leading-relaxed">{rec.editor_notes}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-1.5 mt-3">
            <Button size="sm" variant="outline" className="h-7 text-xs text-violet-700 border-violet-200 hover:bg-violet-50"
              onClick={() => navigate('/management/editorial/recommendations')}>
              <ExternalLink className="w-3 h-3" /> Open Rec
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs text-blue-700 border-blue-200 hover:bg-blue-50"
              onClick={() => navigate('/management/editorial/research-packets')}>
              <FlaskConical className="w-3 h-3" /> Research Packet
            </Button>
            {rec.linked_story_id && (
              <Button size="sm" variant="outline" className="h-7 text-xs text-teal-700 border-teal-200 hover:bg-teal-50"
                onClick={() => navigate('/ManageStories')}>
                <FileText className="w-3 h-3" /> Open Draft
              </Button>
            )}
            {rec.status !== 'in_progress' && (
              <Button size="sm" variant="outline" className="h-7 text-xs text-orange-700 border-orange-200 hover:bg-orange-50"
                disabled={!!loading[rec.id]}
                onClick={() => setStatus(rec.id, 'in_progress', 'In Progress')}>
                {loading[rec.id] === 'in_progress' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                Mark In Progress
              </Button>
            )}
            {rec.status !== 'ready_for_review' && (
              <Button size="sm" variant="outline" className="h-7 text-xs text-green-700 border-green-200 hover:bg-green-50"
                disabled={!!loading[rec.id]}
                onClick={() => setStatus(rec.id, 'ready_for_review', 'Ready for Review')}>
                {loading[rec.id] === 'ready_for_review' ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                Ready for Review
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}