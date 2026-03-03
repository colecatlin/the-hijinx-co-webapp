import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';

const DQ = applyDefaultQueryOptions();

function statusColor(status) {
  switch (status) {
    case 'success':
    case 'completed': return 'bg-green-500/20 text-green-400';
    case 'failed': return 'bg-red-500/20 text-red-400';
    case 'pending': return 'bg-yellow-500/20 text-yellow-400';
    default: return 'bg-gray-500/20 text-gray-400';
  }
}

export default function ResultsVersionHistory({ selectedEvent, selectedSession }) {
  const eventId = selectedEvent?.id;
  const sessionId = selectedSession?.id;

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['operationLogs', 'results', eventId, sessionId],
    queryFn: async () => {
      const all = await base44.entities.OperationLog.filter({ event_id: eventId });
      return all
        .filter((l) => {
          const isRelevantEntity = ['Results', 'Session'].includes(l.entity_name);
          const isRelevantOp = l.operation_type?.includes('result') || l.operation_type?.includes('session');
          if (!isRelevantEntity && !isRelevantOp) return false;
          if (sessionId && l.metadata) {
            try {
              const meta = typeof l.metadata === 'string' ? JSON.parse(l.metadata) : l.metadata;
              if (meta.session_id && meta.session_id !== sessionId) return false;
            } catch {}
          }
          return true;
        })
        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
        .slice(0, 50);
    },
    enabled: !!eventId,
    ...DQ,
  });

  if (!eventId) {
    return <p className="text-gray-500 text-sm py-4 text-center">Select an event to view history</p>;
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-800/40 rounded animate-pulse" />)}
      </div>
    );
  }

  if (!logs.length) {
    return <p className="text-gray-500 text-sm py-8 text-center">No history yet for this event.</p>;
  }

  return (
    <div className="space-y-2">
      {logs.map((log) => (
        <div key={log.id} className="flex items-start gap-3 p-3 bg-[#111] border border-gray-800 rounded-lg">
          {/* Timeline dot */}
          <div className="w-2 h-2 rounded-full bg-gray-600 mt-1.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-white">{log.operation_type?.replace(/_/g, ' ')}</span>
              <Badge className={`text-xs ${statusColor(log.status)}`}>{log.status}</Badge>
              {log.entity_name && (
                <Badge variant="outline" className="text-xs text-gray-400 border-gray-700">{log.entity_name}</Badge>
              )}
            </div>
            {log.message && (
              <p className="text-xs text-gray-400 mt-0.5 truncate">{log.message}</p>
            )}
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
              {log.initiated_by && <span>{log.initiated_by}</span>}
              {log.created_date && <span>{new Date(log.created_date).toLocaleString()}</span>}
              {log.total_records != null && <span>{log.total_records} records</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}