/**
 * REVISION 7A Part 2 — EventActivityPanel
 * Read-only activity feed for the event workspace.
 * Shows OperationLog records scoped to the selected event.
 * No mutations.
 */
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useEventWorkspace } from '../EventWorkspaceContext';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';
import { Activity, CheckCircle2, AlertCircle, Clock, Upload, Trophy, Lock, Flag, RefreshCw } from 'lucide-react';

const DQ = applyDefaultQueryOptions();

const OP_TYPE_META = {
  RESULTS_PUBLISHED_OFFICIAL:  { icon: Flag,        color: 'text-success',  label: 'Results Published' },
  RESULTS_PUBLISHED_PROVISIONAL: { icon: Flag,       color: 'text-warning',  label: 'Results Provisional' },
  SESSION_LOCKED:              { icon: Lock,         color: 'text-motion',   label: 'Session Locked' },
  SESSION_STATUS_CHANGED:      { icon: Activity,     color: 'text-motion',   label: 'Session Status Changed' },
  STANDINGS_RECALCULATED:      { icon: Trophy,       color: 'text-warning', label: 'Standings Recalculated' },
  CSV_IMPORT:                  { icon: Upload,       color: 'text-motion', label: 'CSV Import' },
  ADMIN_OVERRIDE:              { icon: AlertCircle,  color: 'text-danger',    label: 'Admin Override' },
  RESULTS_SAVED:               { icon: CheckCircle2, color: 'text-foreground-quiet',   label: 'Results Saved' },
};

function opMeta(type) {
  if (!type) return { icon: Activity, color: 'text-foreground-quiet', label: 'Operation' };
  const key = type.toUpperCase().replace(/ /g, '_');
  return OP_TYPE_META[key] || { icon: Activity, color: 'text-foreground-quiet', label: type.replace(/_/g, ' ') };
}

function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function EventActivityPanel() {
  const { eventId, selectedEvent } = useEventWorkspace();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['operationLogs', eventId],
    queryFn: () =>
      eventId
        ? base44.entities.OperationLog.filter({ event_id: eventId }, '-created_date', 60)
        : Promise.resolve([]),
    enabled: !!eventId,
    ...DQ,
  });

  // Group by date for display
  const grouped = useMemo(() => {
    const groups = {};
    logs.forEach(log => {
      const day = log.created_date
        ? new Date(log.created_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
        : 'Unknown';
      if (!groups[day]) groups[day] = [];
      groups[day].push(log);
    });
    return Object.entries(groups);
  }, [logs]);

  if (!selectedEvent) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-2">
        <Activity className="w-8 h-8 text-foreground-quiet" />
        <p className="text-sm text-foreground-quiet">No event selected.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-1">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-foreground-quiet">Event Activity Log</p>
          <p className="text-[11px] text-foreground-quiet mt-0.5">Operations scoped to this event · {logs.length} records</p>
        </div>
        <span className="text-[10px] px-2 py-1 rounded border border-divider text-foreground-quiet font-mono">READ ONLY</span>
      </div>

      {isLoading && (
        <div className="py-10 text-center text-xs text-foreground-quiet">Loading activity…</div>
      )}

      {!isLoading && logs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-2 bg-surface rounded-lg border border-divider/50">
          <Activity className="w-7 h-7 text-foreground-quiet" />
          <p className="text-sm text-foreground-quiet">No activity logged for this event yet.</p>
        </div>
      )}

      {!isLoading && grouped.map(([day, dayLogs]) => (
        <div key={day}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-foreground-quiet mb-1.5 px-1">{day}</p>
          <div className="space-y-1">
            {dayLogs.map(log => {
              const meta = opMeta(log.operation_type);
              const Icon = meta.icon;
              const isError = log.status === 'error';
              return (
                <div
                  key={log.id}
                  className="flex items-start gap-3 px-3 py-2.5 bg-surface border border-divider/50 rounded-lg"
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isError ? 'text-danger' : meta.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground-secondary leading-tight">
                      {meta.label}
                    </p>
                    {log.entity_name && (
                      <p className="text-[10px] text-foreground-quiet mt-0.5">{log.entity_name}{log.notes ? ` · ${log.notes.slice(0, 60)}` : ''}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    <span className={`text-[10px] font-medium ${isError ? 'text-danger' : 'text-foreground-quiet'}`}>
                      {isError ? 'Error' : log.status || '—'}
                    </span>
                    <span className="text-[10px] text-foreground-quiet">{timeAgo(log.created_date)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}