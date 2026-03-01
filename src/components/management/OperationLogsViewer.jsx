import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { RotateCcw, Download, Eye, Trash2, Loader2, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { formatInTimeZone } from 'date-fns-tz';

const OPERATION_TYPES = ['import', 'export'];
const SOURCE_TYPES = ['csv_upload', 'google_sheets', 'api_function', 'manual'];
const STATUS_ICONS = {
  pending: Clock,
  completed: CheckCircle,
  failed: AlertCircle,
  rolled_back: RotateCcw,
};
const STATUS_COLORS = {
  pending: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  rolled_back: 'bg-yellow-100 text-yellow-800',
};

export default function OperationLogsViewer() {
  const [filters, setFilters] = useState({
    operation_type: 'import',
    source_type: '',
    status: '',
    entity_name: '',
  });
  const [selectedLog, setSelectedLog] = useState(null);
  const [reverseDialogOpen, setReverseDialogOpen] = useState(false);
  const [reversingId, setReversingId] = useState(null);
  const queryClient = useQueryClient();

  const { data: logs, isLoading } = useQuery({
    queryKey: ['operationLogs', filters],
    queryFn: async () => {
      const query = {
        operation_type: filters.operation_type,
        ...(filters.source_type && { source_type: filters.source_type }),
        ...(filters.status && { status: filters.status }),
        ...(filters.entity_name && { entity_name: filters.entity_name }),
      };
      return base44.entities.OperationLog.filter(query, '-created_date', 100);
    },
  });

  const reverseMutation = useMutation({
    mutationFn: async (logId) => {
      const res = await base44.functions.invoke('reverseImport', { operation_log_id: logId });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operationLogs'] });
      setReversingId(null);
      setReverseDialogOpen(false);
    },
  });

  const handleReverse = (logId) => {
    setReversingId(logId);
    setReverseDialogOpen(true);
  };

  const confirmReverse = () => {
    if (reversingId) {
      reverseMutation.mutate(reversingId);
    }
  };

  const entities = [...new Set(logs?.map(l => l.entity_name) || [])].sort();

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Select value={filters.operation_type} onValueChange={(v) => setFilters({ ...filters, operation_type: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OPERATION_TYPES.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.source_type} onValueChange={(v) => setFilters({ ...filters, source_type: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>All Sources</SelectItem>
                {SOURCE_TYPES.map(type => (
                  <SelectItem key={type} value={type}>{type.replace('_', ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>All Status</SelectItem>
                {['completed', 'failed', 'pending', 'rolled_back'].map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.entity_name} onValueChange={(v) => setFilters({ ...filters, entity_name: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Entity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>All Entities</SelectItem>
                {entities.map(e => (
                  <SelectItem key={e} value={e}>{e}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Loading operations...</div>
      ) : logs && logs.length > 0 ? (
        <div className="space-y-2">
          {logs.map((log) => {
            const StatusIcon = STATUS_ICONS[log.status];
            return (
              <Card key={log.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                    <div className="flex items-start gap-3">
                      <StatusIcon className="w-4 h-4 text-gray-400 mt-1 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{log.entity_name}</p>
                        <p className="text-xs text-gray-500">{log.source_type.replace('_', ' ')}</p>
                      </div>
                    </div>

                    <div>
                      <Badge className={STATUS_COLORS[log.status] || 'bg-gray-100'}>
                        {log.status}
                      </Badge>
                    </div>

                    <div className="text-sm">
                      <p className="font-medium">{log.total_records || 0} records</p>
                      <p className="text-xs text-gray-500">
                        Created: {log.created_records?.reduce((sum, g) => sum + (g.ids?.length || 0), 0) || 0}
                      </p>
                    </div>

                    <div className="text-xs text-gray-500">
                      <p>{formatInTimeZone(new Date(log.created_date), 'America/Chicago', 'MMM d, yyyy')}</p>
                      <p>{formatInTimeZone(new Date(log.created_date), 'America/Chicago', 'h:mm a')} CST</p>
                    </div>

                    <div className="flex gap-1 justify-end">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setSelectedLog(log)}
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {log.operation_type === 'import' && log.status === 'completed' && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleReverse(log.id)}
                          disabled={reverseMutation.isPending}
                          title="Reverse import"
                        >
                          {reverseMutation.isPending && reversingId === log.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <RotateCcw className="w-4 h-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">No operations found</div>
      )}

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {selectedLog.entity_name} - {selectedLog.operation_type}
                <Badge className={STATUS_COLORS[selectedLog.status]}>{selectedLog.status}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-gray-600">Source</p>
                  <p>{selectedLog.source_type}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-600">Function</p>
                  <p className="font-mono text-xs">{selectedLog.function_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-600">Total Records</p>
                  <p>{selectedLog.total_records || 0}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-600">Execution Time</p>
                  <p>{selectedLog.execution_time_ms}ms</p>
                </div>
              </div>

              {selectedLog.file_name && (
                <div>
                  <p className="font-medium text-gray-600 text-sm mb-1">File</p>
                  <p className="text-sm text-gray-700">{selectedLog.file_name}</p>
                </div>
              )}

              {selectedLog.created_records && selectedLog.created_records.length > 0 && (
                <div>
                  <p className="font-medium text-gray-600 text-sm mb-2">Created Records</p>
                  <div className="space-y-1 text-sm bg-green-50 p-3 rounded">
                    {selectedLog.created_records.map((group, i) => (
                      <div key={i}>
                        <p className="font-medium">{group.entity}: {group.ids?.length || 0} records</p>
                        {group.ids && group.ids.length <= 5 && (
                          <p className="text-xs text-gray-600">{group.ids.join(', ')}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedLog.skipped_count > 0 && (
                <div className="text-sm bg-yellow-50 p-3 rounded">
                  <p className="font-medium">Skipped: {selectedLog.skipped_count} records</p>
                </div>
              )}

              {selectedLog.error_details && selectedLog.error_details.length > 0 && (
                <div>
                  <p className="font-medium text-gray-600 text-sm mb-2">Errors</p>
                  <div className="text-sm bg-red-50 p-3 rounded max-h-32 overflow-y-auto">
                    {selectedLog.error_details.map((err, i) => (
                      <p key={i} className="text-red-700 text-xs mb-1">{err}</p>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setSelectedLog(null)}>
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Reverse Confirmation Dialog */}
      <AlertDialog open={reverseDialogOpen} onOpenChange={setReverseDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reverse Import?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all records created during this import. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReverse} disabled={reverseMutation.isPending}>
              {reverseMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Reverse
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}