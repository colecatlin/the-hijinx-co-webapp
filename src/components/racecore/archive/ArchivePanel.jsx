/**
 * R9CS — ArchivePanel
 * Central archive browser. Lists archived records across entity types.
 * Supports restore and audit history viewing.
 */
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Archive, RotateCcw, Clock, Search, Filter, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import RecordHistoryDrawer from '@/components/racecore/history/RecordHistoryDrawer';

const ENTITY_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'Driver', label: 'Drivers' },
  { value: 'Team', label: 'Teams' },
  { value: 'Track', label: 'Tracks' },
  { value: 'Series', label: 'Series' },
  { value: 'Event', label: 'Events' },
  { value: 'Session', label: 'Sessions' },
  { value: 'Entry', label: 'Entries' },
  { value: 'Results', label: 'Results' },
  { value: 'EventOfficial', label: 'Officials' },
  { value: 'Incident', label: 'Incidents' },
  { value: 'Penalty', label: 'Penalties' },
  { value: 'Protest', label: 'Protests' },
];

const FETCHABLE_TYPES = [
  'Driver', 'Team', 'Track', 'Series', 'Event', 'Session',
  'Entry', 'Results', 'EventOfficial', 'Incident', 'Penalty', 'Protest',
];

function getLabel(record, entityType) {
  if (entityType === 'Driver') return `${record.first_name || ''} ${record.last_name || ''}`.trim();
  if (entityType === 'Entry') return `Entry #${record.car_number || record.id}`;
  if (entityType === 'Results') return `Result — ${record.id}`;
  if (entityType === 'EventOfficial') return `Official: ${record.role || record.id}`;
  if (entityType === 'Incident') return record.incident_number || record.id;
  if (entityType === 'Penalty') return record.penalty_number || record.id;
  if (entityType === 'Protest') return record.protest_number || record.id;
  return record.name || record.id;
}

export default function ArchivePanel() {
  const queryClient = useQueryClient();
  const [entityType, setEntityType] = useState('all');
  const [search, setSearch] = useState('');
  const [historyRecord, setHistoryRecord] = useState(null);

  const typesToFetch = entityType === 'all' ? FETCHABLE_TYPES : [entityType];

  const queries = useQuery({
    queryKey: ['archive', entityType],
    queryFn: async () => {
      const results = await Promise.all(
        typesToFetch.map(async (type) => {
          const records = await base44.entities[type]?.filter({ is_archived: true }, '-archived_at', 50).catch(() => []);
          return (records || []).map(r => ({ ...r, _entityType: type }));
        })
      );
      return results.flat();
    },
    staleTime: 30_000,
  });

  const restoreMutation = useMutation({
    mutationFn: ({ entity_type, entity_id }) =>
      base44.functions.invoke('restoreRecord', { entity_type, entity_id }),
    onSuccess: (_, vars) => {
      toast.success(`Restored ${vars.entity_type} record`);
      queryClient.invalidateQueries({ queryKey: ['archive'] });
    },
    onError: (e) => toast.error('Restore failed: ' + (e.response?.data?.error || e.message)),
  });

  const allRecords = queries.data || [];
  const filtered = allRecords.filter(r => {
    if (!search) return true;
    const label = getLabel(r, r._entityType).toLowerCase();
    const reason = (r.archive_reason || '').toLowerCase();
    return label.includes(search.toLowerCase()) || reason.includes(search.toLowerCase());
  });

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Archive className="w-5 h-5 text-amber-400" />
        <div>
          <h2 className="text-white font-bold text-base">Archive Browser</h2>
          <p className="text-gray-500 text-xs">All archived records — browse, restore, or review history</p>
        </div>
        <div className="ml-auto">
          <Badge variant="outline" className="text-amber-400 border-amber-800/50 bg-amber-900/20 font-mono text-[10px]">
            {allRecords.length} archived
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search archived records…"
            className="pl-8 bg-white/[0.04] border-white/[0.08] text-gray-200 text-xs h-8"
          />
        </div>
        <Select value={entityType} onValueChange={setEntityType}>
          <SelectTrigger className="w-40 h-8 bg-white/[0.04] border-white/[0.08] text-gray-300 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ENTITY_TYPES.map(e => (
              <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Records list */}
      {queries.isLoading ? (
        <div className="flex items-center justify-center py-16 text-gray-600 gap-2 text-sm">
          <div className="w-4 h-4 border border-gray-700 border-t-gray-500 rounded-full animate-spin" />
          Loading archived records…
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Archive className="w-10 h-10 text-gray-700" />
          <p className="text-gray-500 text-sm">No archived records found</p>
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.map(record => (
            <div
              key={`${record._entityType}-${record.id}`}
              className="flex items-center gap-3 px-4 py-3 rounded-lg border"
              style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-amber-500 uppercase tracking-widest">{record._entityType}</span>
                  <span className="text-white text-sm font-medium truncate">{getLabel(record, record._entityType)}</span>
                </div>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  {record.archive_reason && (
                    <span className="text-[10px] text-gray-500 italic">"{record.archive_reason}"</span>
                  )}
                  {!record.archive_reason && (
                    <span className="text-[10px] text-gray-700 flex items-center gap-1">
                      <AlertTriangle className="w-2.5 h-2.5" /> No reason given
                    </span>
                  )}
                  {record.archived_at && (
                    <span className="text-[10px] text-gray-600 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {format(new Date(record.archived_at), 'MMM d, yyyy HH:mm')}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setHistoryRecord({ id: record.id, type: record._entityType, name: getLabel(record, record._entityType) })}
                  className="px-2 py-1 rounded text-[10px] font-semibold border transition-colors bg-white/[0.02] border-white/[0.08] text-gray-500 hover:text-gray-300 flex items-center gap-1"
                >
                  <Clock className="w-3 h-3" /> History
                </button>
                <button
                  onClick={() => restoreMutation.mutate({ entity_type: record._entityType, entity_id: record.id })}
                  disabled={restoreMutation.isPending}
                  className="px-2 py-1 rounded text-[10px] font-semibold border transition-colors bg-teal-900/20 border-teal-700/40 text-teal-400 hover:bg-teal-900/40 flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Restore
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* History drawer */}
      {historyRecord && (
        <RecordHistoryDrawer
          open={!!historyRecord}
          onClose={() => setHistoryRecord(null)}
          entityType={historyRecord.type}
          entityId={historyRecord.id}
          entityName={historyRecord.name}
        />
      )}
    </div>
  );
}