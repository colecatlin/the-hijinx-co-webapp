import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function SystemAlertsFeed({ operationLogs, importLogs }) {
  const combinedFeed = useMemo(() => {
    const combined = [];

    if (operationLogs) {
      operationLogs.forEach(log => {
        combined.push({
          timestamp: log.created_date,
          type: 'Operation',
          status: log.status,
          summary: `${log.operation_type} - ${log.entity_name}`,
          details: log.error_details?.length > 0 ? log.error_details[0] : '',
        });
      });
    }

    if (importLogs) {
      importLogs.forEach(log => {
        combined.push({
          timestamp: log.created_date,
          type: 'Import',
          status: log.status,
          summary: `${log.entity_name} import`,
          details: log.failed_count > 0 ? `${log.failed_count} failed` : '',
        });
      });
    }

    combined.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return combined.slice(0, 30);
  }, [operationLogs, importLogs]);

  const statusColor = (status) => {
    switch (status) {
      case 'completed':
      case 'success':
        return 'bg-green-500/20 text-green-400';
      case 'failed':
      case 'error':
        return 'bg-red-500/20 text-red-400';
      case 'pending':
      case 'in_progress':
        return 'bg-blue-500/20 text-blue-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <Card className="bg-[#171717] border-gray-800 lg:col-span-3">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> System Alerts Feed
        </CardTitle>
      </CardHeader>
      <CardContent>
        {combinedFeed.length === 0 ? (
          <div className="text-xs text-gray-500 py-4">No alerts from last 30 days</div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {combinedFeed.map((item, idx) => (
              <div key={idx} className="text-xs border-b border-gray-800 pb-2 last:border-0 last:pb-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-gray-300 font-medium truncate">{item.summary}</div>
                    <div className="text-gray-500 text-xs mt-0.5">
                      {new Date(item.timestamp).toLocaleDateString()} {new Date(item.timestamp).toLocaleTimeString()}
                    </div>
                    {item.details && <div className="text-gray-600 mt-1">{item.details}</div>}
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <Badge variant="outline" className="text-xs">{item.type}</Badge>
                    <Badge className={statusColor(item.status)}>{item.status}</Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}