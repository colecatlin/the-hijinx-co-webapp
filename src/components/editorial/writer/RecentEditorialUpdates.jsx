import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, Activity } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const OP_LABELS = {
  story_research_packet_generated:     'Research packet generated',
  story_research_packet_assigned:      'Research packet assigned',
  story_research_packet_attached_to_draft: 'Packet attached to draft',
  story_research_packet_reviewed:      'Packet marked reviewed',
  story_radar_recommendation_created:  'Recommendation created',
  draft_marked_in_progress:            'Draft marked in progress',
  draft_marked_ready_for_review:       'Draft marked ready for review',
  story_research_packet_regenerated:   'Research packet regenerated',
};

const OP_COLORS = {
  story_research_packet_generated:     'bg-blue-100 text-blue-700',
  story_research_packet_assigned:      'bg-indigo-100 text-indigo-700',
  story_research_packet_attached_to_draft: 'bg-teal-100 text-teal-700',
  draft_marked_in_progress:            'bg-orange-100 text-orange-700',
  draft_marked_ready_for_review:       'bg-green-100 text-green-700',
  story_radar_recommendation_created:  'bg-violet-100 text-violet-700',
};

export default function RecentEditorialUpdates({ userEmail }) {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['editorial-ops-log'],
    queryFn: () => base44.entities.OperationLog.list('-created_date', 50),
    staleTime: 30_000,
  });

  const editorialOps = logs.filter(l =>
    Object.keys(OP_LABELS).includes(l.operation_type)
  ).slice(0, 20);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400 py-10 justify-center">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading updates…
      </div>
    );
  }

  if (!editorialOps.length) {
    return (
      <div className="py-16 text-center border border-dashed border-gray-200 rounded-xl bg-gray-50">
        <Activity className="w-8 h-8 mx-auto mb-3 text-gray-300" />
        <p className="text-sm text-gray-400">No recent editorial activity.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Recent Editorial Activity</p>
      {editorialOps.map(log => (
        <div key={log.id} className="flex items-start gap-3 py-2.5 border-b border-gray-100 last:border-0">
          <span className={`px-2 py-0.5 text-[10px] rounded capitalize shrink-0 ${OP_COLORS[log.operation_type] ?? 'bg-gray-100 text-gray-500'}`}>
            {OP_LABELS[log.operation_type] ?? log.operation_type.replace(/_/g, ' ')}
          </span>
          <div className="flex-1 min-w-0">
            {log.metadata?.title_suggestion && (
              <p className="text-xs text-gray-700 font-medium truncate">{log.metadata.title_suggestion}</p>
            )}
            {log.entity_id && (
              <p className="text-[10px] text-gray-400 font-mono truncate">{log.entity_id}</p>
            )}
          </div>
          {log.created_date && (
            <span className="text-[11px] text-gray-400 shrink-0">
              {formatDistanceToNow(new Date(log.created_date), { addSuffix: true })}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}