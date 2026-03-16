import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, Bookmark, ExternalLink, FlaskConical, Play } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

export default function SavedForLater({ recs, onUpdated }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState({});

  const markInProgress = async (recId) => {
    setLoading(l => ({ ...l, [recId]: true }));
    await base44.entities.StoryRecommendation.update(recId, { status: 'in_progress' });
    toast.success('Marked in progress');
    onUpdated?.();
    setLoading(l => ({ ...l, [recId]: false }));
  };

  if (!recs.length) {
    return (
      <div className="py-16 text-center border border-dashed border-gray-200 rounded-xl bg-gray-50">
        <Bookmark className="w-8 h-8 mx-auto mb-3 text-gray-300" />
        <p className="text-sm text-gray-400">No recommendations saved for later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {recs.map(rec => (
        <div key={rec.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded">Saved</span>
              {rec.story_type && (
                <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded capitalize">
                  {rec.story_type.replace(/_/g, ' ')}
                </span>
              )}
              {rec.priority_score >= 75 && (
                <span className="px-2 py-0.5 text-xs bg-red-50 text-red-600 rounded font-medium">
                  Priority {Math.round(rec.priority_score)}
                </span>
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

          {rec.summary && (
            <p className="text-xs text-gray-500 line-clamp-2 mb-2">{rec.summary}</p>
          )}

          <div className="flex flex-wrap gap-1.5 mt-2">
            <Button size="sm" variant="outline" className="h-7 text-xs text-violet-700 border-violet-200 hover:bg-violet-50"
              onClick={() => navigate('/management/editorial/recommendations')}>
              <ExternalLink className="w-3 h-3" /> Open Rec
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs text-blue-700 border-blue-200 hover:bg-blue-50"
              onClick={() => navigate('/management/editorial/research-packets')}>
              <FlaskConical className="w-3 h-3" /> Research Packet
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs text-orange-700 border-orange-200 hover:bg-orange-50"
              disabled={!!loading[rec.id]}
              onClick={() => markInProgress(rec.id)}>
              {loading[rec.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
              Start Writing
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}