import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

/**
 * ActivityTab
 * Displays the last 25 OperationLog entries filtered by entity type.
 * 
 * Props:
 *   entityName - string (required) entity type to filter (e.g., 'Announcement', 'Advertisement')
 */
export default function ActivityTab({ entityName }) {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['operationLogs', entityName],
    queryFn: async () => {
      const allLogs = await base44.entities.OperationLog.list('-created_date', 25);
      return allLogs.filter(log => log.entity_name === entityName);
    },
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <p className="text-gray-500">No activity yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {logs.map((log) => (
        <div key={log.id} className="bg-white border border-gray-200 rounded-lg p-4 flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm text-gray-900">{log.operation_type}</span>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(log.status)}`}>
                {log.status}
              </span>
            </div>
            {log.message && (
              <p className="text-sm text-gray-600 mb-2">{log.message}</p>
            )}
            <p className="text-xs text-gray-400">
              {format(new Date(log.created_date), 'MMM d, yyyy h:mm a')}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}