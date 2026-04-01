import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';
import { buildEventTimeline } from './timelineBuilder';

const DQ = applyDefaultQueryOptions();

const FILTER_TYPES = [
  { id: 'session_scheduled', label: 'Sessions Scheduled' },
  { id: 'session_started', label: 'Sessions Started' },
  { id: 'session_completed', label: 'Sessions Completed' },
  { id: 'results_published', label: 'Results Published' },
  { id: 'checkin', label: 'Check Ins' },
  { id: 'tech', label: 'Tech Inspections' },
  { id: 'gate', label: 'Gate Actions' },
  { id: 'race_control', label: 'Race Control' },
  { id: 'standings', label: 'Standings' },
  { id: 'results_entry', label: 'Results Entry' },
];

export default function EventTimeline({ selectedEvent }) {
  const [filters, setFilters] = useState(FILTER_TYPES.map((f) => f.id));
  const [refreshing, setRefreshing] = useState(false);

  const eventId = selectedEvent?.id;

  // Load data
  const { data: sessions = [], refetch: refetchSessions } = useQuery({
    queryKey: ['sessions', eventId],
    queryFn: () => base44.entities.Session.filter({ event_id: eventId }),
    enabled: !!eventId,
    ...DQ,
  });

  const { data: results = [], refetch: refetchResults } = useQuery({
    queryKey: ['results', eventId],
    queryFn: () => base44.entities.Results.filter({ event_id: eventId }),
    enabled: !!eventId,
    ...DQ,
  });

  const { data: entries = [], refetch: refetchEntries } = useQuery({
    queryKey: ['entries', eventId],
    queryFn: () => base44.entities.Entry.filter({ event_id: eventId }),
    enabled: !!eventId,
    ...DQ,
  });

  const { data: operationLogs = [], refetch: refetchLogs } = useQuery({
    queryKey: ['operationLogs', eventId],
    queryFn: async () => {
      const logs = await base44.entities.OperationLog.list('created_date', 300).catch(() => []);
      return logs.filter((log) => {
        try {
          const metadata = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata;
          return metadata?.event_id === eventId;
        } catch {
          // Also check if event_id is directly on the log
          return log.event_id === eventId;
        }
      });
    },
    enabled: !!eventId,
    ...DQ,
  });

  // Build timeline
  const timelineItems = useMemo(() => {
    const items = buildEventTimeline({ sessions, results, entries, operationLogs });
    return items.filter((item) => filters.includes(item.type));
  }, [sessions, results, entries, operationLogs, filters]);

  if (!selectedEvent) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-8">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-400">Select an event to view timeline</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchSessions(),
        refetchResults(),
        refetchEntries(),
        refetchLogs(),
      ]);
      toast.success('Timeline refreshed');
    } catch {
      toast.error('Failed to refresh timeline');
    } finally {
      setRefreshing(false);
    }
  };

  const toggleFilter = (filterId) => {
    setFilters((prev) =>
      prev.includes(filterId)
        ? prev.filter((f) => f !== filterId)
        : [...prev, filterId]
    );
  };

  return (
    <div className="space-y-4">
      {/* Filter controls */}
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-white">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {FILTER_TYPES.map((filterType) => (
              <label key={filterType.id} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={filters.includes(filterType.id)}
                  onCheckedChange={() => toggleFilter(filterType.id)}
                />
                <span className="text-xs text-gray-300">{filterType.label}</span>
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-700">
            <Button
              size="sm"
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
              className="border-gray-700 text-gray-300 h-8"
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-white flex items-center gap-2">
            📅 Event Activity
            <Badge className="bg-gray-700 text-gray-300 ml-auto text-xs">
              {timelineItems.length} events
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {timelineItems.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500">No events recorded yet</p>
            </div>
          ) : (
            <div className="space-y-0 divide-y divide-gray-800">
              {timelineItems.map((item, idx) => (
                <div key={idx} className="py-3 flex gap-4 last:pb-0">
                  {/* Icon */}
                  <div className="flex-shrink-0 pt-0.5">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${item.color}`}
                    >
                      {item.icon}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-white">{item.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>
                      </div>
                      <span className="text-xs text-gray-500 flex-shrink-0">
                        {item.timestamp.toLocaleTimeString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}