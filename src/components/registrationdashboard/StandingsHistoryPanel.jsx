import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronDown, ChevronRight, Clock } from 'lucide-react';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';

const DQ = applyDefaultQueryOptions();

const OP_TYPES = [
  'standings_recalculate',
  'standings_published',
  'points_config_updated',
  'standings_export_csv',
  'standings_calculated',
];

function statusColor(status) {
  if (status === 'success' || status === 'completed') return 'bg-green-500/20 text-green-400';
  if (status === 'failed') return 'bg-red-500/20 text-red-400';
  if (status === 'pending') return 'bg-yellow-500/20 text-yellow-400';
  return 'bg-gray-500/20 text-gray-400';
}

function opLabel(op) {
  const map = {
    standings_recalculate: 'Recalculated',
    standings_published: 'Published',
    points_config_updated: 'Points Config Saved',
    standings_export_csv: 'Exported CSV',
    standings_calculated: 'Calculated (local)',
  };
  return map[op] || op?.replace(/_/g, ' ');
}

function LogRow({ log }) {
  const [expanded, setExpanded] = useState(false);
  let meta = {};
  try { meta = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : (log.metadata || {}); } catch {}

  return (
    <div className="border border-gray-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-start gap-3 p-3 bg-[#111] hover:bg-[#1a1a1a] text-left transition-colors"
      >
        {expanded
          ? <ChevronDown className="w-3 h-3 text-gray-500 mt-0.5 flex-shrink-0" />
          : <ChevronRight className="w-3 h-3 text-gray-500 mt-0.5 flex-shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-white">{opLabel(log.operation_type)}</span>
            <Badge className={`text-xs ${statusColor(log.status)}`}>{log.status}</Badge>
            {meta.class_name && <span className="text-xs text-gray-500">{meta.class_name}</span>}
            {meta.driver_count != null && <span className="text-xs text-gray-600">{meta.driver_count} drivers</span>}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
            {log.created_date && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(log.created_date).toLocaleString()}
              </span>
            )}
            {log.initiated_by && <span>{log.initiated_by}</span>}
          </div>
        </div>
      </button>
      {expanded && (
        <div className="border-t border-gray-800 bg-[#0d0d0d] p-3">
          {log.message && <p className="text-xs text-gray-400 mb-2">{log.message}</p>}
          {Object.keys(meta).length > 0 && (
            <pre className="text-xs text-gray-500 whitespace-pre-wrap font-mono overflow-x-auto">
              {JSON.stringify(meta, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

export default function StandingsHistoryPanel({ eventId, seriesId, seasonYear, classId }) {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['standingsHistory', eventId, seriesId, seasonYear, classId],
    queryFn: async () => {
      const filters = eventId ? { event_id: eventId } : {};
      const all = await base44.entities.OperationLog.filter(filters, '-created_date', 50);
      return all.filter((l) => OP_TYPES.includes(l.operation_type)).slice(0, 50);
    },
    enabled: !!(eventId || seriesId),
    ...DQ,
  });

  return (
    <Card className="bg-[#171717] border-gray-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs text-gray-400 uppercase tracking-wide">Operation History</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-gray-800/40 rounded animate-pulse" />)}
          </div>
        ) : !logs.length ? (
          <p className="text-gray-500 text-sm py-6 text-center">No standings operations logged yet.</p>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => <LogRow key={log.id} log={log} />)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}