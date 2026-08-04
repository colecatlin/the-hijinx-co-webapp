/**
 * R9CQ — EventCommandHeader (expanded)
 * Full event operations command center header.
 * Shows 17 operational widgets + lifecycle actions.
 */
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle, CheckCircle2, Clock, Eye, EyeOff, Zap, Flag,
  Users, LogIn, DollarSign, FileText, Shield, BarChart3, Lock,
  AlertCircle, Gavel, Radio
} from 'lucide-react';
import { toast } from 'sonner';

function StatChip({ label, value, variant = 'default', onClick, title }) {
  const styles = {
    default: 'bg-surface-interactive/60 text-foreground-secondary border-divider',
    warning: 'bg-warning/10 text-warning border-warning/30',
    success: 'bg-success/10 text-success border-success/30',
    critical: 'bg-danger/10 text-danger border-danger/30',
    active:   'bg-motion/10 text-motion border-motion/30',
    muted:    'bg-surface-interactive/30 text-foreground-quiet border-divider/60',
  };
  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-medium transition-colors ${styles[variant]} ${onClick ? 'cursor-pointer hover:opacity-80' : ''}`}
      onClick={onClick}
      title={title}
    >
      <span className="text-[9px] uppercase tracking-widest opacity-60">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}

function LifecycleButton({ label, onClick, loading, variant = 'default' }) {
  const styles = {
    default: 'border-divider text-foreground-secondary hover:text-foreground hover:bg-surface-interactive',
    active:  'border-motion/40 text-motion bg-motion/10 hover:bg-motion/20',
    live:    'border-danger/40 text-danger bg-danger/10 hover:bg-danger/20',
    success: 'border-success/40 text-success bg-success/10 hover:bg-success/20',
  };
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded border text-[10px] font-semibold uppercase tracking-wider transition-all disabled:opacity-40 ${styles[variant]}`}
    >
      {loading ? '…' : label}
    </button>
  );
}

export default function EventCommandHeader({
  selectedEvent,
  selectedTrack,
  selectedSeries,
  sessions = [],
  results = [],
  entries = [],
  incidents = [],
  penalties = [],
  protests = [],
  standings = [],
  officials = [],
  standingsDirty = false,
  mediaApplications = [],
  isAdmin = false,
  onNavigate,
  alerts = [],
}) {
  const queryClient = useQueryClient();
  const [lifecycleLoading, setLifecycleLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // { status, label }

  const lifecycleMutation = useMutation({
    mutationFn: ({ status }) =>
      base44.functions.invoke('setEventLifecycleStatus', { event_id: selectedEvent.id, new_status: status }),
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['event', selectedEvent.id] });
      toast.success(`Event set to ${status}`);
      setLifecycleLoading(false);
    },
    onError: (error) => {
      const msg = error?.message || error?.error || 'Failed to update event status';
      toast.error(msg);
      setLifecycleLoading(false);
    },
  });

  const handleLifecycle = (status, label) => {
    // Pre-flight: block SET LIVE if genuine CRITICAL alerts exist
    if (status === 'Live') {
      const criticalAlerts = alerts.filter(a => a.severity === 'CRITICAL');
      if (criticalAlerts.length > 0) {
        const reasons = criticalAlerts.map(a => a.message).join('; ');
        toast.error(`Cannot set live: ${reasons}`);
        onNavigate?.(criticalAlerts[0].target || 'overview');
        return;
      }
    }
    setConfirmAction({ status, label });
  };

  const confirmLifecycle = () => {
    if (!confirmAction) return;
    setLifecycleLoading(true);
    lifecycleMutation.mutate({ status: confirmAction.status });
    setConfirmAction(null);
  };

  // ── Derived metrics ──────────────────────────────────────────────────────
  const eventStatus = selectedEvent?.status || 'Draft';
  const isLive = eventStatus === 'Live';
  const isCompleted = eventStatus === 'Completed';

  const checkedIn = entries.filter(e => e.entry_status === 'Checked In').length;
  const missingPayment = entries.filter(e => e.payment_status === 'Unpaid').length;
  const missingWaiver = entries.filter(e => !e.waiver_verified).length;
  const missingTransponder = entries.filter(e => !e.transponder_id).length;
  const techPending = entries.filter(e => !e.tech_status || e.tech_status === 'Not Inspected').length;
  const techFailed = entries.filter(e => e.tech_status === 'Failed' || e.entry_status === 'Tech Failed').length;
  const techHold = entries.filter(e => e.entry_status === 'Tech Hold').length;

  const liveSession = sessions.find(s => s.status === 'Live');
  const sessionsReady = sessions.filter(s => ['Official', 'Locked'].includes(s.status)).length;
  const sessionsMissingResults = sessions.filter(
    s => ['Completed', 'Official', 'Locked'].includes(s.status) && !results.some(r => r.session_id === s.id)
  ).length;
  const provisionalResults = results.filter(r => r.status_state === 'Provisional').length;
  const officialResults = results.filter(r => r.status_state === 'Official').length;
  const lockedSessions = sessions.filter(s => s.locked || s.status === 'Locked').length;

  const activeIncidents = incidents.filter(i => ['Open', 'Under Review'].includes(i.status)).length;
  const pendingPenalties = penalties.filter(p => p.status === 'Proposed').length;
  const activeProtests = protests.filter(p => ['Filed', 'Under Review', 'Hearing Scheduled'].includes(p.status)).length;

  const pendingMedia = mediaApplications.filter(a => ['Pending', 'Submitted', 'Applied'].includes(a.status)).length;

  const statusVariant =
    isLive ? 'active' :
    isCompleted ? 'success' :
    eventStatus === 'Published' ? 'active' :
    'default';

  if (!selectedEvent) return null;

  return (
    <div
      className="border-b border-divider flex-shrink-0"
      style={{ background: 'hsl(var(--surface))' }}
    >
      {/* Confirmation Dialog */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-surface-elevated border border-divider rounded-lg p-5 max-w-sm w-full mx-4 shadow-2xl">
            <p className="text-sm font-semibold text-foreground mb-1">Confirm: {confirmAction.label}</p>
            <p className="text-[11px] text-foreground-quiet mb-4">This will update the event status. Are you sure?</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmAction(null)} className="flex-1 py-2 rounded border border-divider text-[11px] text-foreground-secondary hover:text-foreground transition-colors">Cancel</button>
              <button onClick={confirmLifecycle} className="flex-1 py-2 rounded bg-motion hover:bg-motion-hover border border-motion/40 text-[11px] font-semibold text-white transition-colors">Confirm</button>
            </div>
          </div>
        </div>
      )}

      <div className="px-5 py-2 space-y-1.5">
        {/* Row 1: Identity + status + lifecycle */}
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-sm font-bold text-foreground truncate">{selectedEvent.name}</h1>
          <StatChip label="Status" value={isLive ? 'Active' : eventStatus} variant={statusVariant} />
          {selectedTrack && (
            <span className="text-[10px] text-foreground-quiet">{selectedTrack.name}</span>
          )}
          {selectedSeries && (
            <span className="text-[10px] text-foreground-quiet">{selectedSeries.name}</span>
          )}
          {selectedEvent.season && (
            <span className="text-[10px] text-foreground-quiet">S{selectedEvent.season}</span>
          )}
          {selectedEvent.round_number && (
            <span className="text-[10px] text-foreground-quiet">R{selectedEvent.round_number}</span>
          )}

          <div className="flex-1" />

          {/* Lifecycle controls */}
          {isAdmin && !isLive && !isCompleted && (
            <LifecycleButton
              label="Set Active"
              onClick={() => handleLifecycle('Live', 'Set Event Active')}
              loading={lifecycleLoading}
              variant="active"
            />
          )}
          {isAdmin && isLive && !isCompleted && (
            <LifecycleButton
              label="Complete Event"
              onClick={() => handleLifecycle('Completed', 'Complete Event')}
              loading={lifecycleLoading}
              variant="success"
            />
          )}
          {selectedEvent.published_flag ? (
            <StatChip label="Public" value={<Eye className="w-3 h-3 inline" />} variant="success" />
          ) : (
            <StatChip label="Draft" value={<EyeOff className="w-3 h-3 inline" />} variant="muted" />
          )}
        </div>

        {/* Row 2: Operational status widgets — all clickable */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {liveSession && (
            <StatChip label="🔴 Live" value={liveSession.name} variant="critical" pulse={true} onClick={() => onNavigate?.('sessions')} title="Session in progress" />
          )}
          <StatChip label="Entries" value={entries.length} variant="default" onClick={() => onNavigate?.('entries')} title="Go to Entries" />
          <StatChip
            label="In"
            value={`${checkedIn}/${entries.length}`}
            variant={checkedIn === entries.length && entries.length > 0 ? 'success' : 'default'}
            onClick={() => onNavigate?.('checkin')} title="Go to Check-In"
          />

          {missingPayment > 0 && (
            <StatChip label="Unpaid" value={missingPayment} variant="warning" onClick={() => onNavigate?.('entries')} title="Unpaid entries → Entries" />
          )}
          {missingWaiver > 0 && (
            <StatChip label="Waiver" value={missingWaiver} variant="warning" onClick={() => onNavigate?.('compliance')} title="Missing waivers → Compliance" />
          )}
          {missingTransponder > 0 && (
            <StatChip label="Xpndr" value={missingTransponder} variant="warning" onClick={() => onNavigate?.('checkin')} title="Missing transponders → Check-In" />
          )}
          {techFailed > 0 && (
            <StatChip label="Tech Fail" value={techFailed} variant="critical" onClick={() => onNavigate?.('compliance')} title="Tech failures → Compliance" />
          )}
          {techHold > 0 && (
            <StatChip label="Tech Hold" value={techHold} variant="warning" onClick={() => onNavigate?.('compliance')} title="Tech holds → Compliance" />
          )}
          {techPending > 0 && (
            <StatChip label="Tech Pend" value={techPending} variant="default" onClick={() => onNavigate?.('compliance')} title="Pending tech → Compliance" />
          )}

          <span className="text-foreground-quiet/40 text-xs">|</span>

          {sessions.length > 0 && (
            <StatChip label="Sessions" value={`${sessionsReady}/${sessions.length}`} variant={sessionsReady === sessions.length ? 'success' : 'default'} onClick={() => onNavigate?.('sessions')} title="Go to Sessions" />
          )}
          {lockedSessions > 0 && (
            <StatChip label="Locked" value={lockedSessions} variant="success" onClick={() => onNavigate?.('sessions')} title="Locked sessions" />
          )}
          {sessionsMissingResults > 0 && (
            <StatChip label="No Results" value={sessionsMissingResults} variant="critical" onClick={() => onNavigate?.('results')} title="Sessions missing results → Results" />
          )}
          {provisionalResults > 0 && (
            <StatChip label="Prov." value={provisionalResults} variant="warning" onClick={() => onNavigate?.('results')} title="Provisional results → Results" />
          )}
          {officialResults > 0 && (
            <StatChip label="Official" value={officialResults} variant="success" onClick={() => onNavigate?.('results')} title="Official results" />
          )}

          {(activeIncidents > 0 || pendingPenalties > 0 || activeProtests > 0) && (
            <span className="text-foreground-quiet/40 text-xs">|</span>
          )}

          {activeIncidents > 0 && (
            <StatChip label="Incidents" value={activeIncidents} variant="critical" onClick={() => onNavigate?.('race_control')} title="Active incidents → Race Control" />
          )}
          {pendingPenalties > 0 && (
            <StatChip label="Penalties" value={pendingPenalties} variant="warning" onClick={() => onNavigate?.('race_control')} title="Pending penalties → Race Control" />
          )}
          {activeProtests > 0 && (
            <StatChip label="Protests" value={activeProtests} variant="critical" onClick={() => onNavigate?.('race_control')} title="Active protests → Race Control" />
          )}
          {standingsDirty && (
            <StatChip label="Standings" value="Stale" variant="warning" onClick={() => onNavigate?.('standings')} title="Standings stale → Standings" />
          )}
          {pendingMedia > 0 && (
            <StatChip label="Media" value={pendingMedia} variant="default" onClick={() => onNavigate?.('media')} title="Media pending → Media" />
          )}
          {officials.length === 0 && (
            <StatChip label="Officials" value="None" variant="warning" onClick={() => onNavigate?.('officials')} title="No officials assigned → Officials" />
          )}
        </div>
      </div>
    </div>
  );
}