import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';

const DQ = applyDefaultQueryOptions();

function statusColor(status) {
  switch (status) {
    case 'success': case 'completed': return 'bg-green-500/20 text-green-400';
    case 'failed': return 'bg-red-500/20 text-red-400';
    case 'pending': return 'bg-yellow-500/20 text-yellow-400';
    default: return 'bg-gray-500/20 text-gray-400';
  }
}

export default function StandingsChangeHistory({ eventId, seriesId, seasonYear, classId }) {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['operationLogs', 'standings', eventId, seriesId, seasonYear, classId],
    queryFn: async () => {
      const filters = eventId ? { event_id: eventId } : {};
      const all = await base44.entities.OperationLog.filter(filters);
      return all
        .filter((l) => {
          const op = l.operation_type || '';
          if (!op.includes('standings') && !op.includes('points')) return false;
          return true;
        })
        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
        .slice(0, 25);
    },
    enabled: !!eventId || !!seriesId,
    ...DQ,
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-gray-800/40 rounded animate-pulse" />)}
      </div>
    );
  }

  if (!logs.length) {
    return <p className="text-gray-500 text-sm py-6 text-center">No standings history yet.</p>;
  }

  return (
    <div className="space-y-2">
      {logs.map((log) => {
        let meta = {};
        try { meta = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : (log.metadata || {}); } catch {}
        return (
          <div key={log.id} className="flex items-start gap-3 p-3 bg-[#111] border border-gray-800 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-gray-600 mt-1.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-white">{log.operation_type?.replace(/_/g, ' ')}</span>
                <Badge className={`text-xs ${statusColor(log.status)}`}>{log.status}</Badge>
                {meta.published && <Badge className="text-xs bg-blue-500/20 text-blue-400">Published</Badge>}
                {meta.class_name && <span className="text-xs text-gray-500">{meta.class_name}</span>}
              </div>
              {log.message && <p className="text-xs text-gray-400 mt-0.5 truncate">{log.message}</p>}
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                {log.initiated_by && <span>{log.initiated_by}</span>}
                {log.created_date && <span>{new Date(log.created_date).toLocaleString()}</span>}
                {meta.driver_count != null && <span>{meta.driver_count} drivers</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}