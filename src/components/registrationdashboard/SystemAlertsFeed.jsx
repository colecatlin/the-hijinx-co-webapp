import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

export default function SystemAlertsFeed({ selectedEvent, dashboardContext }) {
  const { data: operationLogs = [], isLoading } = useQuery({
    queryKey: ['operationLogs', selectedEvent?.id],
    queryFn: async () => {
      const logs = await base44.entities.OperationLog.list('-created_date', 25);
      if (!selectedEvent?.id) return logs;
      return logs.filter((log) => {
        const metadata = log.metadata || {};
        return metadata.event_id === selectedEvent.id || log.entity_id === selectedEvent.id;
      });
    },
    enabled: !!selectedEvent?.id,
  });

  const statusColor = (status) => {
    switch (status) {
      case 'success': return 'bg-green-700/50 text-green-100';
      case 'error': return 'bg-red-700/50 text-red-100';
      case 'warning': return 'bg-yellow-700/50 text-yellow-100';
      default: return 'bg-gray-700/50 text-gray-100';
    }
  };

  return (
    <Card className="bg-[#171717] border-gray-800 lg:col-span-1">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Activity className="w-4 h-4" /> System Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-xs text-gray-400">Loading...</p>
        ) : operationLogs.length === 0 ? (
          <p className="text-xs text-gray-400">No system activity yet</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {operationLogs.map((log) => (
              <div key={log.id} className="text-xs border-b border-gray-800 pb-2 last:border-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-gray-300 font-medium">{log.operation_type}</span>
                  <Badge className={`${statusColor(log.status)} text-xs`}>
                    {log.status || 'pending'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">{log.entity_name}</span>
                  <span className="text-gray-600">
                    {log.created_date ? format(new Date(log.created_date), 'MMM d, HH:mm') : '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}