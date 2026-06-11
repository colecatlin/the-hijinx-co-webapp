/**
 * R9CS — RecordHistoryDrawer
 * Shows complete AuditLog history for any entity record.
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, User, ArrowRight, Archive, RotateCcw, Plus, Pencil, Trash2, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

const ACTION_CONFIG = {
  created:          { label: 'Created',          icon: Plus,       color: 'text-green-400' },
  updated:          { label: 'Updated',           icon: Pencil,     color: 'text-blue-400' },
  archived:         { label: 'Archived',          icon: Archive,    color: 'text-amber-400' },
  restored:         { label: 'Restored',          icon: RotateCcw,  color: 'text-teal-400' },
  deleted:          { label: 'Deleted',           icon: Trash2,     color: 'text-red-400' },
  status_changed:   { label: 'Status Changed',    icon: RefreshCw,  color: 'text-purple-400' },
  lifecycle_change: { label: 'Lifecycle Change',  icon: ArrowRight, color: 'text-orange-400' },
  permission_change:{ label: 'Permission Change', icon: User,       color: 'text-pink-400' },
};

function DiffView({ before, after }) {
  if (!before && !after) return null;
  const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
  const changed = [...keys].filter(k => JSON.stringify((before || {})[k]) !== JSON.stringify((after || {})[k]));
  if (changed.length === 0) return <p className="text-gray-600 text-xs italic">No field-level diff available.</p>;
  return (
    <div className="space-y-1 mt-2">
      {changed.map(k => (
        <div key={k} className="text-[10px] font-mono">
          <span className="text-gray-500">{k}: </span>
          <span className="text-red-400 line-through mr-1">{String((before || {})[k] ?? '—')}</span>
          <span className="text-green-400">{String((after || {})[k] ?? '—')}</span>
        </div>
      ))}
    </div>
  );
}

export default function RecordHistoryDrawer({ open, onClose, entityType, entityId, entityName }) {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['auditLog', entityType, entityId],
    queryFn: () => base44.entities.AuditLog.filter({ entity_type: entityType, entity_id: entityId }, '-timestamp', 50),
    enabled: open && !!entityId,
    staleTime: 30_000,
  });

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="right" className="w-[480px] max-w-full p-0 flex flex-col" style={{ background: '#0F1212', borderColor: 'rgba(255,255,255,0.08)' }}>
        <SheetHeader className="px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <SheetTitle className="text-white text-sm font-bold">
            Record History
          </SheetTitle>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">{entityType}</span>
            {entityName && <span className="text-xs text-gray-300 truncate">— {entityName}</span>}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-5 py-4 space-y-3">
            {isLoading && (
              <div className="flex items-center gap-2 text-gray-600 text-xs py-8 justify-center">
                <div className="w-4 h-4 border border-gray-700 border-t-gray-500 rounded-full animate-spin" />
                Loading history…
              </div>
            )}
            {!isLoading && logs.length === 0 && (
              <div className="text-center py-12">
                <Clock className="w-8 h-8 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No audit history found for this record.</p>
              </div>
            )}
            {logs.map((log) => {
              const cfg = ACTION_CONFIG[log.action] || { label: log.action, icon: Clock, color: 'text-gray-400' };
              const Icon = cfg.icon;
              return (
                <div
                  key={log.id}
                  className="rounded-lg border p-3 space-y-2"
                  style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.07)' }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${cfg.color}`} />
                      <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                    </div>
                    <span className="text-[10px] text-gray-600 font-mono flex-shrink-0">
                      {log.timestamp ? format(new Date(log.timestamp), 'MMM d, HH:mm') : '—'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-gray-500">
                    <User className="w-3 h-3" />
                    <span>{log.performed_by_name || log.performed_by || 'Unknown'}</span>
                  </div>
                  {log.notes && (
                    <p className="text-[11px] text-gray-400 italic">{log.notes}</p>
                  )}
                  {(log.before_data || log.after_data) && (
                    <DiffView before={log.before_data} after={log.after_data} />
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}