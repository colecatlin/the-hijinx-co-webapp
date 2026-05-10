import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Upload, CheckCircle2, Lock, Info } from 'lucide-react';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';

const DQ = applyDefaultQueryOptions();

const OPERATION_ICONS = {
  results_imported_csv: <Upload className="w-3 h-3" />,
  results_imported_paste: <Upload className="w-3 h-3" />,
  results_saved_draft: <Info className="w-3 h-3" />,
  session_marked_provisional: <CheckCircle2 className="w-3 h-3" />,
  session_published_official: <CheckCircle2 className="w-3 h-3" />,
  session_locked: <Lock className="w-3 h-3" />,
  standings_recalculated: <CheckCircle2 className="w-3 h-3" />,
};

const OPERATION_LABELS = {
  results_imported_csv: 'CSV Import',
  results_imported_paste: 'Paste Import',
  results_saved_draft: 'Draft Saved',
  session_marked_provisional: 'Marked Provisional',
  session_published_official: 'Published Official',
  session_locked: 'Session Locked',
  standings_recalculated: 'Standings Recalculated',
};

export default function SessionActivityLog({ sessionId }) {
  const { data: operationLogs = [], isLoading } = useQuery({
    queryKey: ['operationLogs', sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      const all = await base44.entities.OperationLog.filter({
        metadata: { session_id: sessionId },
      }).catch(() => []);
      return all.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!sessionId,
    ...DQ,
  });

  const recentLogs = useMemo(() => {
    return operationLogs.slice(0, 10);
  }, [operationLogs]);

  if (isLoading) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-4 text-xs text-gray-400">Loading activity...</CardContent>
      </Card>
    );
  }

  if (!sessionId || recentLogs.length === 0) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-4 text-xs text-gray-400">No activity recorded yet.</CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#171717] border-gray-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs text-gray-400 uppercase tracking-wide">Activity Log</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-hide">
          {recentLogs.map((log, idx) => {
            const icon = OPERATION_ICONS[log.operation_type] || <Calendar className="w-3 h-3" />;
            const label = OPERATION_LABELS[log.operation_type] || log.operation_type;
            const timestamp = new Date(log.created_date);
            const timeStr = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const dateStr = timestamp.toLocaleDateString();

            return (
              <div key={idx} className="flex gap-2 text-xs pb-2 border-b border-gray-800 last:border-0">
                <div className="text-gray-500 flex-shrink-0 mt-0.5">{icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-300">{label}</span>
                    <Badge className="text-[10px] bg-gray-700 text-gray-300">
                      {timeStr}
                    </Badge>
                  </div>
                  {log.message && (
                    <p className="text-gray-400 mt-0.5">{log.message}</p>
                  )}
                  {log.metadata?.imported_count !== undefined && (
                    <p className="text-gray-500 mt-1">
                      {log.metadata.imported_count} row(s)
                      {log.metadata.drivers_created ? `, ${log.metadata.drivers_created} driver(s) created` : ''}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}