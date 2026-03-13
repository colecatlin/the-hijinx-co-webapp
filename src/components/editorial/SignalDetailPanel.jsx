import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import {
  X, Loader2, ExternalLink, RefreshCw, Ban, PlayCircle, ListOrdered, ChevronRight
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { logStoryRadarEvent } from '@/components/editorial/storyRadarLogger';

const STATUS_COLORS = {
  new: 'bg-blue-100 text-blue-700',
  queued: 'bg-indigo-100 text-indigo-700',
  processing: 'bg-yellow-100 text-yellow-700',
  processed: 'bg-green-100 text-green-700',
  dismissed: 'bg-gray-100 text-gray-500',
  errored: 'bg-red-100 text-red-700',
  ignored: 'bg-gray-100 text-gray-400',
};

const IMPORTANCE_COLORS = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-gray-100 text-gray-500',
};

function DetailRow({ label, value }) {
  if (!value && value !== false) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm text-gray-800 leading-relaxed break-words">{String(value)}</p>
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

export default function SignalDetailPanel({ signal, onClose, onUpdated, onOpenRecommendation, onOpenCluster }) {
  const queryClient = useQueryClient();
  const [actionLoading, setActionLoading] = useState(null);

  const doUpdate = async (patch, action) => {
    setActionLoading(action);
    const previousStatus = signal.status;
    await base44.entities.ContentSignal.update(signal.id, patch);
    // Determine event type
    const isRetry = action === 'retry';
    const isProcess = action === 'process' || action === 'queue';
    logStoryRadarEvent({
      event_type: isRetry
        ? 'story_radar_signal_retried'
        : 'story_radar_signal_processed',
      signal_id: signal.id,
      previous_status: previousStatus,
      new_status: patch.status,
    });
    queryClient.invalidateQueries({ queryKey: ['signals'] });
    queryClient.invalidateQueries({ queryKey: ['signal-counts'] });
    onUpdated?.();
    setActionLoading(null);
  };

  const loading = (key) => actionLoading === key
    ? <Loader2 className="w-3 h-3 animate-spin" />
    : null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-5 border-b border-gray-100">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 rounded text-xs font-semibold capitalize ${STATUS_COLORS[signal.status] ?? 'bg-gray-100 text-gray-500'}`}>
              {signal.status}
            </span>
            <span className={`px-2 py-0.5 rounded text-xs font-semibold capitalize ${IMPORTANCE_COLORS[signal.importance_level] ?? 'bg-gray-100 text-gray-500'}`}>
              {signal.importance_level}
            </span>
            {signal.ai_processed && (
              <span className="px-2 py-0.5 bg-violet-100 text-violet-700 text-xs rounded">AI ✓</span>
            )}
          </div>
          <h2 className="text-sm font-bold text-gray-900 leading-snug">
            {signal.source_entity_name ?? signal.signal_type}
          </h2>
          {signal.detected_at && (
            <p className="text-xs text-gray-400 mt-0.5">
              Detected {formatDistanceToNow(new Date(signal.detected_at), { addSuffix: true })}
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
          <Button size="sm" variant="outline" className="h-8 text-xs text-indigo-700 border-indigo-200 hover:bg-indigo-50"
            disabled={!!actionLoading} onClick={() => doUpdate({ status: 'queued' }, 'queue')}>
            {loading('queue') ?? <ListOrdered className="w-3 h-3" />}
            Queue Signal
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs text-green-700 border-green-200 hover:bg-green-50"
            disabled={!!actionLoading} onClick={() => doUpdate({ status: 'processing' }, 'process')}>
            {loading('process') ?? <PlayCircle className="w-3 h-3" />}
            Process Signal
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs text-yellow-700 border-yellow-200 hover:bg-yellow-50"
            disabled={!!actionLoading || signal.status !== 'errored'}
            title={signal.status !== 'errored' ? 'Only available for errored signals' : ''}
            onClick={async () => {
              setActionLoading('retry');
              try {
                await base44.functions.invoke('editorialRecommendationActions', {
                  action: 'retry_signal',
                  signal_id: signal.id,
                });
                logStoryRadarEvent({ event_type: 'story_radar_signal_retried', signal_id: signal.id, previous_status: signal.status, new_status: 'new' });
                queryClient.invalidateQueries({ queryKey: ['signals'] });
                queryClient.invalidateQueries({ queryKey: ['signal-counts'] });
                onUpdated?.();
              } catch (_) {}
              setActionLoading(null);
            }}>
            {loading('retry') ?? <RefreshCw className="w-3 h-3" />}
            Retry Signal
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs text-gray-500 hover:bg-gray-50"
            disabled={!!actionLoading} onClick={() => doUpdate({ status: 'ignored' }, 'ignore')}>
            {loading('ignore') ?? <Ban className="w-3 h-3" />}
            Ignore Signal
          </Button>

          {(signal.linked_recommendation_id || signal.recommendation_ids?.length > 0) && (
            <Button size="sm" variant="outline" className="h-8 text-xs text-violet-700 border-violet-200 hover:bg-violet-50 col-span-2"
              onClick={() => onOpenRecommendation?.(signal.linked_recommendation_id ?? signal.recommendation_ids?.[0])}>
              <ExternalLink className="w-3 h-3" />
              Open Related Recommendation
            </Button>
          )}
          {signal.trend_cluster_id && (
            <Button size="sm" variant="outline" className="h-8 text-xs text-orange-700 border-orange-200 hover:bg-orange-50 col-span-2"
              onClick={() => onOpenCluster?.(signal.trend_cluster_id)}>
              <ExternalLink className="w-3 h-3" />
              Open Related Cluster
            </Button>
          )}
        </div>

        {/* Core details */}
        <div className="space-y-4">
          <DetailRow label="Signal Summary" value={signal.signal_summary} />
          <DetailRow label="Source Entity Name" value={signal.source_entity_name} />
          <DetailRow label="Source Entity Type" value={signal.source_entity_type} />
          <DetailRow label="Source Entity ID" value={signal.source_entity_id} />
          <DetailRow label="Signal Type" value={signal.signal_type?.replace(/_/g, ' ')} />
          <DetailRow label="Trigger Action" value={signal.trigger_action} />
        </div>

        {/* Value change */}
        {(signal.previous_value || signal.new_value) && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Value Change</p>
            <div className="grid grid-cols-2 gap-2">
              {signal.previous_value && (
                <div className="bg-red-50 rounded-lg px-3 py-2 border border-red-100">
                  <p className="text-[10px] text-red-400 font-semibold mb-0.5">BEFORE</p>
                  <p className="text-xs text-red-700 break-words">{signal.previous_value}</p>
                </div>
              )}
              {signal.new_value && (
                <div className="bg-green-50 rounded-lg px-3 py-2 border border-green-100">
                  <p className="text-[10px] text-green-400 font-semibold mb-0.5">AFTER</p>
                  <p className="text-xs text-green-700 break-words">{signal.new_value}</p>
                </div>
              )}
            </div>
          </div>
        )}

        <TagList label="Related Entities" items={signal.related_entity_names} />

        {/* Processing */}
        <div className="space-y-4">
          <DetailRow label="Processing Notes" value={signal.processing_notes} />
          <DetailRow label="Dedupe Key" value={signal.dedupe_key} />
          {signal.ai_processed_at && (
            <DetailRow label="AI Processed At" value={format(new Date(signal.ai_processed_at), 'MMM d, yyyy h:mm a')} />
          )}
          <DetailRow label="AI Notes" value={signal.ai_notes} />
          {signal.error_message && (
            <div className="bg-red-50 rounded-lg px-3 py-2 border border-red-100">
              <p className="text-[10px] text-red-400 font-semibold mb-0.5">ERROR</p>
              <p className="text-xs text-red-700 break-words">{signal.error_message}</p>
            </div>
          )}
        </div>

        {/* Linked records */}
        {signal.recommendation_ids?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
              Recommendation IDs ({signal.recommendation_ids.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {signal.recommendation_ids.map((id, i) => (
                <span key={i} className="px-2 py-0.5 bg-violet-50 border border-violet-100 text-violet-600 text-xs rounded font-mono">{id.slice(-8)}</span>
              ))}
            </div>
          </div>
        )}
        {signal.trend_cluster_id && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Trend Cluster ID</p>
            <span className="px-2 py-0.5 bg-orange-50 border border-orange-100 text-orange-600 text-xs rounded font-mono">{signal.trend_cluster_id.slice(-8)}</span>
          </div>
        )}

        {/* Timestamps */}
        <div className="space-y-2 pt-2 border-t border-gray-100">
          {signal.detected_at && (
            <DetailRow label="Detected At" value={format(new Date(signal.detected_at), 'MMM d, yyyy h:mm a')} />
          )}
        </div>
      </div>
    </div>
  );
}