import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import {
  CheckCircle, XCircle, Bookmark, FileText, ListOrdered,
  RefreshCw, Loader2, ExternalLink, TrendingDown
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

const ITEM_TYPE_COLORS = {
  recommendation: 'bg-violet-100 text-violet-700',
  signal: 'bg-blue-100 text-blue-700',
  cluster: 'bg-orange-100 text-orange-700',
};

const IMPORTANCE_COLORS = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-gray-100 text-gray-500',
};

const STATUS_COLORS = {
  suggested: 'bg-blue-50 text-blue-600',
  approved: 'bg-green-50 text-green-600',
  saved: 'bg-amber-50 text-amber-600',
  new: 'bg-blue-50 text-blue-600',
  queued: 'bg-indigo-50 text-indigo-600',
  errored: 'bg-red-50 text-red-600',
  active: 'bg-green-50 text-green-600',
  assigned: 'bg-indigo-50 text-indigo-600',
};

export default function QueueItemCard({ item, itemType, onUpdated, onOpenDetail }) {
  const [loading, setLoading] = useState(null);

  const doRecAction = async (action) => {
    setLoading(action);
    try {
      const res = await base44.functions.invoke('editorialRecommendationActions', {
        action,
        recommendation_id: item.id,
      });
      if (res.data?.success) {
        onUpdated?.();
      } else {
        toast.error(res.data?.error ?? `Action "${action}" failed`);
      }
    } catch {
      toast.error('Action failed');
    }
    setLoading(null);
  };

  const doConvertToDraft = async () => {
    setLoading('draft');
    try {
      const res = await base44.functions.invoke('convertRecommendationToDraft', { recommendationId: item.id });
      if (res.data?.success) {
        toast.success('Draft created successfully');
        onUpdated?.();
      } else {
        toast.error(res.data?.error ?? 'Failed to create draft');
      }
    } catch {
      toast.error('Failed to create draft');
    }
    setLoading(null);
  };

  const doSignalAction = async (status) => {
    setLoading(status);
    await base44.entities.ContentSignal.update(item.id, { status, ...(status === 'new' ? { error_message: null } : {}) });
    onUpdated?.();
    setLoading(null);
  };

  const doClusterAction = async (status) => {
    setLoading(status);
    await base44.entities.StoryTrendCluster.update(item.id, { status });
    onUpdated?.();
    setLoading(null);
  };

  const L = (key) => loading === key ? <Loader2 className="w-3 h-3 animate-spin" /> : null;

  const title = item.title_suggestion ?? item.source_entity_name ?? item.trend_name ?? '—';
  const summary = item.why_now ?? item.signal_summary ?? item.trend_summary;
  const timeAgo = item.generated_at ?? item.detected_at ?? item.last_activity_date;

  const isBorderUrgent = item.importance_level === 'critical' || (item.urgency_score ?? 0) >= 80;
  const isBorderHigh = (item.priority_score ?? 0) >= 70 || (item.momentum_score ?? 0) >= 75;

  return (
    <div className={`p-4 rounded-xl border bg-white space-y-2.5 transition-shadow hover:shadow-sm ${
      isBorderUrgent ? 'border-red-200 bg-red-50/20' :
      isBorderHigh ? 'border-orange-200 bg-orange-50/10' :
      'border-gray-200'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wide ${ITEM_TYPE_COLORS[itemType]}`}>
              {itemType}
            </span>
            {item.importance_level && (
              <span className={`px-2 py-0.5 text-xs font-semibold rounded capitalize ${IMPORTANCE_COLORS[item.importance_level]}`}>
                {item.importance_level}
              </span>
            )}
            {item.status && (
              <span className={`px-2 py-0.5 text-xs rounded capitalize ${STATUS_COLORS[item.status] ?? 'bg-gray-50 text-gray-500'}`}>
                {item.status}
              </span>
            )}
            {item.story_type && (
              <span className="px-2 py-0.5 bg-violet-50 text-violet-600 text-xs rounded capitalize">
                {item.story_type.replace(/_/g, ' ')}
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">{title}</p>
        </div>
        {timeAgo && (
          <span className="text-[11px] text-gray-400 shrink-0 whitespace-nowrap">
            {formatDistanceToNow(new Date(timeAgo), { addSuffix: true })}
          </span>
        )}
      </div>

      {/* Scores */}
      {(item.priority_score != null || item.urgency_score != null || item.momentum_score != null || item.coverage_gap_score != null) && (
        <div className="flex flex-wrap gap-1.5">
          {item.priority_score != null && (
            <span className="px-2 py-0.5 bg-red-50 text-red-600 text-xs rounded font-medium">P {Math.round(item.priority_score)}</span>
          )}
          {item.urgency_score != null && (
            <span className="px-2 py-0.5 bg-orange-50 text-orange-600 text-xs rounded font-medium">U {Math.round(item.urgency_score)}</span>
          )}
          {item.confidence_score != null && (
            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded font-medium">C {Math.round(item.confidence_score)}</span>
          )}
          {item.momentum_score != null && (
            <span className="px-2 py-0.5 bg-orange-50 text-orange-700 text-xs rounded font-medium">Momentum {Math.round(item.momentum_score)}</span>
          )}
          {item.coverage_gap_score != null && (
            <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs rounded font-medium">Gap {Math.round(item.coverage_gap_score)}</span>
          )}
        </div>
      )}

      {/* Summary */}
      {summary && (
        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{summary}</p>
      )}

      {/* Related entities */}
      {item.related_entity_names?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {item.related_entity_names.slice(0, 4).map((name, i) => (
            <span key={i} className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">{name}</span>
          ))}
        </div>
      )}

      {/* Signal trigger context */}
      {itemType === 'signal' && item.trigger_action && (
        <p className="text-xs text-gray-400 italic truncate">{item.trigger_action}</p>
      )}

      {/* Cluster extra */}
      {itemType === 'cluster' && item.story_count != null && (
        <p className="text-xs text-gray-400">{item.story_count} linked stories · {item.signal_count ?? 0} signals</p>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-gray-100">
        {itemType === 'recommendation' && (
          <>
            {['suggested', 'saved'].includes(item.status) && (
              <button disabled={!!loading} onClick={() => doRecAction('approve')}
                className="px-2.5 py-1 bg-green-600 text-white text-xs rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-1">
                {L('approve') ?? <CheckCircle className="w-3 h-3" />} Approve
              </button>
            )}
            {['suggested', 'approved'].includes(item.status) && (
              <button disabled={!!loading} onClick={() => doRecAction('save')}
                className="px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-lg font-medium hover:bg-amber-100 disabled:opacity-50 flex items-center gap-1">
                {L('save') ?? <Bookmark className="w-3 h-3" />} Save
              </button>
            )}
            {['approved', 'saved'].includes(item.status) && !item.linked_story_id && (
              <button disabled={!!loading} onClick={doConvertToDraft}
                className="px-2.5 py-1 bg-teal-50 border border-teal-200 text-teal-700 text-xs rounded-lg font-medium hover:bg-teal-100 disabled:opacity-50 flex items-center gap-1">
                {L('draft') ?? <FileText className="w-3 h-3" />} Convert to Draft
              </button>
            )}
            {item.linked_story_id && (
              <span className="px-2.5 py-1 bg-teal-50 border border-teal-200 text-teal-600 text-xs rounded-lg font-medium flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Draft Created
              </span>
            )}
            {!['dismissed', 'covered', 'drafted', 'published'].includes(item.status) && (
              <button disabled={!!loading} onClick={() => doRecAction('dismiss')}
                className="px-2.5 py-1 bg-gray-50 border border-gray-200 text-gray-500 text-xs rounded-lg font-medium hover:bg-gray-100 disabled:opacity-50 flex items-center gap-1">
                {L('dismiss') ?? <XCircle className="w-3 h-3" />} Dismiss
              </button>
            )}
          </>
        )}

        {itemType === 'signal' && (
          <>
            {['new', 'errored'].includes(item.status) && (
              <button disabled={!!loading} onClick={() => doSignalAction('queued')}
                className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs rounded-lg font-medium hover:bg-indigo-100 disabled:opacity-50 flex items-center gap-1">
                {L('queued') ?? <ListOrdered className="w-3 h-3" />} Queue
              </button>
            )}
            {item.status === 'errored' && (
              <button disabled={!!loading} onClick={() => doSignalAction('new')}
                className="px-2.5 py-1 bg-yellow-50 border border-yellow-200 text-yellow-700 text-xs rounded-lg font-medium hover:bg-yellow-100 disabled:opacity-50 flex items-center gap-1">
                {L('new') ?? <RefreshCw className="w-3 h-3" />} Retry
              </button>
            )}
            {!['ignored', 'processed'].includes(item.status) && (
              <button disabled={!!loading} onClick={() => doSignalAction('ignored')}
                className="px-2.5 py-1 bg-gray-50 border border-gray-200 text-gray-500 text-xs rounded-lg font-medium hover:bg-gray-100 disabled:opacity-50 flex items-center gap-1">
                {L('ignored') ?? <XCircle className="w-3 h-3" />} Ignore
              </button>
            )}
          </>
        )}

        {itemType === 'cluster' && (
          <>
            <button disabled={!!loading} onClick={() => doClusterAction('cooling')}
              className="px-2.5 py-1 bg-yellow-50 border border-yellow-200 text-yellow-700 text-xs rounded-lg font-medium hover:bg-yellow-100 disabled:opacity-50 flex items-center gap-1">
              {L('cooling') ?? <TrendingDown className="w-3 h-3" />} Mark Cooling
            </button>
            <button disabled={!!loading} onClick={() => doClusterAction('ignored')}
              className="px-2.5 py-1 bg-gray-50 border border-gray-200 text-gray-500 text-xs rounded-lg font-medium hover:bg-gray-100 disabled:opacity-50 flex items-center gap-1">
              {L('ignored') ?? <XCircle className="w-3 h-3" />} Ignore
            </button>
          </>
        )}

        <button
          onClick={() => onOpenDetail?.(item, itemType)}
          className="px-2.5 py-1 bg-gray-900 text-white text-xs rounded-lg font-medium hover:bg-gray-700 flex items-center gap-1 ml-auto"
        >
          <ExternalLink className="w-3 h-3" /> Open
        </button>
      </div>
    </div>
  );
}