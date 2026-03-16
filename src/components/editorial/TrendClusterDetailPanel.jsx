import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { X, Loader2, TrendingUp, TrendingDown, CheckCircle, XCircle, ExternalLink, Activity, Sparkles } from 'lucide-react';
import GenerateResearchPacketButton from '@/components/editorial/GenerateResearchPacketButton';
import { format, formatDistanceToNow } from 'date-fns';
import { logStoryRadarEvent } from '@/components/editorial/storyRadarLogger';

const STATUS_COLORS = {
  forming: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  peaking: 'bg-orange-100 text-orange-700',
  cooling: 'bg-yellow-100 text-yellow-700',
  closed: 'bg-gray-100 text-gray-500',
  ignored: 'bg-gray-100 text-gray-400',
  archived: 'bg-gray-100 text-gray-400',
};

function DetailRow({ label, value }) {
  if (!value && value !== 0) return null;
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

function IdList({ label, ids, color = 'bg-gray-50 border-gray-200 text-gray-500' }) {
  if (!ids?.length) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{label} ({ids.length})</p>
      <div className="flex flex-wrap gap-1.5">
        {ids.map((id, i) => (
          <span key={i} className={`px-2 py-0.5 border text-xs rounded font-mono ${color}`}>{id.slice(-8)}</span>
        ))}
      </div>
    </div>
  );
}

export default function TrendClusterDetailPanel({ cluster, onClose, onUpdated }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [actionLoading, setActionLoading] = useState(null);

  const doUpdate = async (patch, action) => {
    setActionLoading(action);
    const previousStatus = cluster.status;
    await base44.entities.StoryTrendCluster.update(cluster.id, patch);
    if (patch.status) {
      logStoryRadarEvent({
        event_type: 'story_radar_cluster_status_changed',
        cluster_id: cluster.id,
        previous_status: previousStatus,
        new_status: patch.status,
      });
    }
    queryClient.invalidateQueries({ queryKey: ['trend-clusters'] });
    queryClient.invalidateQueries({ queryKey: ['cluster-count'] });
    onUpdated?.();
    setActionLoading(null);
  };

  const L = (key) => actionLoading === key ? <Loader2 className="w-3 h-3 animate-spin" /> : null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-5 border-b border-gray-100">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 rounded text-xs font-semibold capitalize ${STATUS_COLORS[cluster.status] ?? 'bg-gray-100 text-gray-500'}`}>
              {cluster.status}
            </span>
            {cluster.trend_type && (
              <span className="px-2 py-0.5 bg-orange-50 text-orange-600 text-xs rounded capitalize">
                {cluster.trend_type.replace(/_/g, ' ')}
              </span>
            )}
          </div>
          <h2 className="text-sm font-bold text-gray-900 leading-snug">{cluster.trend_name}</h2>
          {cluster.last_activity_date && (
            <p className="text-xs text-gray-400 mt-0.5">
              Last activity {formatDistanceToNow(new Date(cluster.last_activity_date), { addSuffix: true })}
            </p>
          )}
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors shrink-0">
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">

        {/* Momentum */}
        {cluster.momentum_score != null && (
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span className="font-semibold text-gray-400 uppercase tracking-wide">Momentum</span>
              <span className="font-bold text-gray-800">{Math.round(cluster.momentum_score)}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-orange-400 transition-all"
                style={{ width: `${Math.min(cluster.momentum_score, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-100 text-center">
            <p className="text-lg font-bold text-gray-900">{cluster.story_count ?? 0}</p>
            <p className="text-xs text-gray-400">Stories</p>
          </div>
          <div className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-100 text-center">
            <p className="text-lg font-bold text-gray-900">{cluster.signal_count ?? cluster.signal_ids?.length ?? 0}</p>
            <p className="text-xs text-gray-400">Signals</p>
          </div>
        </div>

        {/* Research Packet */}
        <div className="flex justify-end mb-1">
          <GenerateResearchPacketButton
            sourceType="trend_cluster"
            sourceId={cluster.id}
            sourceTitle={cluster.trend_name}
            size="xs"
          />
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" variant="outline" className="h-8 text-xs text-green-700 border-green-200 hover:bg-green-50"
            disabled={!!actionLoading} onClick={() => doUpdate({ status: 'active' }, 'active')}>
            {L('active') ?? <CheckCircle className="w-3 h-3" />} Mark Active
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs text-yellow-700 border-yellow-200 hover:bg-yellow-50"
            disabled={!!actionLoading} onClick={() => doUpdate({ status: 'cooling' }, 'cooling')}>
            {L('cooling') ?? <TrendingDown className="w-3 h-3" />} Mark Cooling
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs text-gray-600 border-gray-200 hover:bg-gray-50"
            disabled={!!actionLoading} onClick={() => doUpdate({ status: 'closed' }, 'closed')}>
            {L('closed') ?? <XCircle className="w-3 h-3" />} Mark Closed
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs text-gray-400 hover:bg-gray-50"
            disabled={!!actionLoading} onClick={() => doUpdate({ status: 'ignored' }, 'ignored')}>
            {L('ignored') ?? <XCircle className="w-3 h-3" />} Ignore Cluster
          </Button>

          {cluster.signal_ids?.length > 0 && (
            <Button size="sm" variant="outline"
              className="h-8 text-xs text-blue-700 border-blue-200 hover:bg-blue-50 col-span-2"
              onClick={() => navigate(`/management/editorial/signals?cluster=${cluster.id}`)}>
              <Activity className="w-3 h-3" /> Open Related Signals
            </Button>
          )}
          {cluster.recommendation_ids?.length > 0 && (
            <Button size="sm" variant="outline"
              className="h-8 text-xs text-violet-700 border-violet-200 hover:bg-violet-50 col-span-2"
              onClick={() => navigate(`/management/editorial/recommendations?cluster=${cluster.id}`)}>
              <Sparkles className="w-3 h-3" /> Open Related Recommendations
            </Button>
          )}
        </div>

        {/* Details */}
        <div className="space-y-4">
          <DetailRow label="Trend Summary" value={cluster.trend_summary} />
          <DetailRow label="Trend Type" value={cluster.trend_type?.replace(/_/g, ' ')} />
          <DetailRow label="Story Count" value={cluster.story_count} />
          <DetailRow label="Momentum Score" value={cluster.momentum_score != null ? Math.round(cluster.momentum_score) : null} />
        </div>

        <TagList label="Related Entities" items={cluster.related_entity_names} />
        <TagList label="Tags" items={cluster.tags} />

        <IdList label="Signal IDs" ids={cluster.signal_ids} color="bg-blue-50 border-blue-100 text-blue-600" />
        <IdList label="Recommendation IDs" ids={cluster.recommendation_ids} color="bg-violet-50 border-violet-100 text-violet-600" />

        {/* Dates */}
        <div className="space-y-3 pt-2 border-t border-gray-100">
          {cluster.start_date && (
            <DetailRow label="Start Date" value={format(new Date(cluster.start_date), 'MMM d, yyyy h:mm a')} />
          )}
          {cluster.first_signal_at && (
            <DetailRow label="First Signal" value={format(new Date(cluster.first_signal_at), 'MMM d, yyyy h:mm a')} />
          )}
          {cluster.last_activity_date && (
            <DetailRow label="Last Activity" value={format(new Date(cluster.last_activity_date), 'MMM d, yyyy h:mm a')} />
          )}
        </div>

        {cluster.notes && (
          <div className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Notes</p>
            <p className="text-xs text-gray-600 leading-relaxed">{cluster.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}