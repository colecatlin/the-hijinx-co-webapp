import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Copy, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function OpsTimeline({ selectedEvent }) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLogId, setExpandedLogId] = useState(null);

  const { data: operationLogs = [] } = useQuery({
    queryKey: ['operationLogs', selectedEvent?.id],
    queryFn: async () => {
      const allLogs = await base44.entities.OperationLog.list('-created_date', 75);
      // Filter to event-scoped logs if event_id is present in metadata
      return allLogs.filter(log => {
        if (!log.metadata?.event_id && !selectedEvent?.id) return true;
        if (selectedEvent?.id && log.metadata?.event_id !== selectedEvent.id) return false;
        return true;
      });
    },
    enabled: !!selectedEvent?.id,
  });

  const filteredLogs = useMemo(() => {
    return operationLogs.filter(log => {
      if (statusFilter !== 'all' && log.status !== statusFilter) return false;
      if (entityFilter !== 'all' && log.entity_name !== entityFilter) return false;
      const searchLower = searchQuery.toLowerCase();
      if (searchQuery && !log.operation_type.toLowerCase().includes(searchLower) && 
          !log.entity_name?.toLowerCase().includes(searchLower)) {
        return false;
      }
      return true;
    });
  }, [operationLogs, statusFilter, entityFilter, searchQuery]);

  const handleCopyMetadata = (metadata) => {
    navigator.clipboard.writeText(JSON.stringify(metadata, null, 2));
    toast.success('Metadata copied to clipboard');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getEntityColor = (entity) => {
    switch (entity) {
      case 'Event':
        return 'bg-blue-100 text-blue-800';
      case 'Session':
        return 'bg-purple-100 text-purple-800';
      case 'Results':
        return 'bg-pink-100 text-pink-800';
      case 'Standings':
        return 'bg-orange-100 text-orange-800';
      case 'Entry':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!selectedEvent) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center">
          <p className="text-gray-400">Select an event to view operations timeline</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#171717] border-gray-800 flex flex-col h-full">
      <CardHeader className="border-b border-gray-800">
        <CardTitle className="text-white">Operations Timeline</CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-4 flex flex-col flex-1">
        {/* Filters */}
        <div className="space-y-3">
          <Input
            placeholder="Search operation type, entity..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-[#262626] border-gray-700 text-white placeholder-gray-500"
          />
          <div className="grid grid-cols-2 gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-[#262626] border-gray-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#262626] border-gray-700">
                <SelectItem value="all" className="text-white">All Status</SelectItem>
                <SelectItem value="success" className="text-white">Success</SelectItem>
                <SelectItem value="error" className="text-white">Error</SelectItem>
                <SelectItem value="warning" className="text-white">Warning</SelectItem>
              </SelectContent>
            </Select>

            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="bg-[#262626] border-gray-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#262626] border-gray-700">
                <SelectItem value="all" className="text-white">All Entities</SelectItem>
                <SelectItem value="Event" className="text-white">Event</SelectItem>
                <SelectItem value="Session" className="text-white">Session</SelectItem>
                <SelectItem value="Results" className="text-white">Results</SelectItem>
                <SelectItem value="Standings" className="text-white">Standings</SelectItem>
                <SelectItem value="Entry" className="text-white">Entry</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Timeline */}
        <ScrollArea className="flex-1 pr-4">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>No operations found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredLogs.map((log) => (
                <div key={log.id} className="space-y-1">
                  <button
                    onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                    className="w-full text-left p-3 bg-gray-900/50 hover:bg-gray-900/70 rounded border border-gray-800 transition-colors group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {expandedLogId === log.id ? (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-mono text-xs text-gray-300">{log.operation_type}</span>
                          <Badge className={`text-xs ${getStatusColor(log.status)}`}>
                            {log.status}
                          </Badge>
                          <Badge className={`text-xs ${getEntityColor(log.entity_name)}`}>
                            {log.entity_name}
                          </Badge>
                        </div>
                        {log.message && (
                          <p className="text-xs text-gray-400 line-clamp-1">{log.message}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {format(new Date(log.created_date), 'MMM d, yyyy h:mm:ss a')}
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Expanded Metadata */}
                  {expandedLogId === log.id && log.metadata && (
                    <div className="ml-7 p-3 bg-gray-900 rounded border border-gray-800 space-y-3">
                      <div className="space-y-2">
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Metadata</p>
                        <pre className="text-xs text-gray-300 bg-gray-950 p-2 rounded overflow-x-auto max-h-40 overflow-y-auto font-mono">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyMetadata(log.metadata)}
                        className="w-full border-gray-700 text-gray-300 hover:bg-gray-800"
                      >
                        <Copy className="w-3 h-3 mr-2" /> Copy Metadata
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}