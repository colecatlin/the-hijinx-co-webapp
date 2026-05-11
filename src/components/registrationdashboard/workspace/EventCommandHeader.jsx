/**
 * REVISION 7B — EventCommandHeader (Workspace-level)
 * Persistent command header showing event operational status.
 * Shows: event identity, lifecycle state, visibility, operational module status chips.
 */
import React from 'react';
import { AlertTriangle, CheckCircle2, Clock, Eye, EyeOff } from 'lucide-react';

function StatusChip({ label, value, icon: Icon, variant = 'default' }) {
  const styles = {
    default: 'bg-gray-800 text-gray-300 border-gray-700',
    warning: 'bg-amber-900/30 text-amber-300 border-amber-800/50',
    success: 'bg-green-900/30 text-green-300 border-green-800/50',
    critical: 'bg-red-900/30 text-red-300 border-red-800/50',
    active: 'bg-teal-900/30 text-teal-300 border-teal-800/50',
  };
  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded border font-medium ${styles[variant]}`}>
      {Icon && <Icon className="w-3 h-3" />}
      <span className="text-[10px] uppercase tracking-wider text-gray-500">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

export default function EventCommandHeader({
  selectedEvent,
  selectedTrack,
  selectedSeries,
  eventWorkspacePanel,
  sessions = [],
  results = [],
  entries = [],
  complianceFlags = 0,
}) {
  if (!selectedEvent) return null;

  const eventStatus = selectedEvent.status || 'Draft';
  const isLive = eventStatus === 'Live';
  const isPublished = selectedEvent.published_flag;
  const draftSessionsCount = sessions.filter(s => s.status === 'Draft').length;
  const resultsWithoutStatus = results.filter(r => !r.status_state || r.status_state === 'Draft').length;
  const entriesCount = entries.length;

  const statusVariant =
    eventStatus === 'Live' ? 'critical' :
    eventStatus === 'Completed' ? 'success' :
    eventStatus === 'Published' ? 'active' :
    'default';

  return (
    <div
      className="rounded-xl border border-gray-800/60 overflow-hidden"
      style={{
        background: 'rgba(10,12,14,0.9)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <div className="px-5 py-4 space-y-3">
        {/* Top row: Event identity + status */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-lg font-black text-white truncate">{selectedEvent.name}</h1>
              <StatusChip
                label="Event"
                value={eventStatus}
                variant={statusVariant}
              />
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
              {selectedTrack && <span>{selectedTrack.name}</span>}
              {selectedSeries && <span>•</span>}
              {selectedSeries && <span>{selectedSeries.name}</span>}
              {selectedEvent.season && <span>•</span>}
              {selectedEvent.season && <span>Season {selectedEvent.season}</span>}
              {selectedEvent.round_number && <span>•</span>}
              {selectedEvent.round_number && <span>Round {selectedEvent.round_number}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isPublished ? (
              <StatusChip label="Public" icon={Eye} variant="success" value="" />
            ) : (
              <StatusChip label="Draft" icon={EyeOff} variant="default" value="" />
            )}
          </div>
        </div>

        {/* Bottom row: Operational module status chips */}
        <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-gray-800/40">
          <span className="text-[9px] uppercase tracking-widest text-gray-600 font-bold">Modules:</span>

          <StatusChip
            label="Sessions"
            value={sessions.length}
            variant={draftSessionsCount > 0 ? 'warning' : sessions.length > 0 ? 'success' : 'default'}
          />
          <StatusChip
            label="Results"
            value={results.length}
            variant={resultsWithoutStatus > 0 ? 'warning' : results.length > 0 ? 'success' : 'default'}
          />
          <StatusChip
            label="Entries"
            value={entriesCount}
            variant={entriesCount > 0 ? 'success' : 'default'}
          />
          {complianceFlags > 0 && (
            <StatusChip
              label="Compliance"
              value={complianceFlags}
              icon={AlertTriangle}
              variant="warning"
            />
          )}
        </div>
      </div>
    </div>
  );
}