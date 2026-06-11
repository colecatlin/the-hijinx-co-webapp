/**
 * R9CT — EventCloseoutPanel
 * Full event closeout workflow with persisted export packets + governance enforcement.
 */
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useEventWorkspace } from '../EventWorkspaceContext';
import CloseoutChecklist from '../../closeout/CloseoutChecklist';
import CloseoutProgressBar from '../../closeout/CloseoutProgressBar';
import GovernanceBlockerBanner from '../../../governance/GovernanceBlockerBanner';
import OfficialsEnforcement from '../../../governance/OfficialsEnforcement';
import { Download, Flag, RefreshCw, ShieldCheck, CheckCircle2, ExternalLink, History } from 'lucide-react';
import { toast } from 'sonner';
import { useGovernanceEnforcement } from '../../../../hooks/useGovernanceEnforcement';
import { useGovernanceReadiness } from '../../../../hooks/useGovernanceReadiness';
import { useAuditWriter } from '../../../../hooks/useAuditWriter';

export default function EventCloseoutPanel({ onNavigate }) {
  const { selectedEvent, isAdmin, invalidateAfterOperation, wsData, user } = useEventWorkspace();
  const eventId = selectedEvent?.id;
  const queryClient = useQueryClient();
  const { writeAudit } = useAuditWriter(user);
  const [completing, setCompleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState(null);

  const officials = wsData?.officials || [];
  const sessions = wsData?.sessions || [];
  const results = wsData?.results || [];
  const gridLineups = wsData?.gridLineups || [];
  const entries = wsData?.entries || [];

  // Load persisted export packets for this event
  const { data: exportPackets = [] } = useQuery({
    queryKey: ['export_packets', eventId],
    queryFn: () => eventId ? base44.entities.EventExportPacket.filter({ event_id: eventId }) : Promise.resolve([]),
    enabled: !!eventId,
    staleTime: 30_000,
  });
  const latestPacket = exportPackets.sort((a, b) => (b.packet_version || 0) - (a.packet_version || 0))[0];

  const { data: validation, isLoading, refetch } = useQuery({
    queryKey: ['closeout_validation', eventId],
    queryFn: () => base44.functions.invoke('validateEventCloseout', { event_id: eventId }),
    enabled: !!eventId,
    select: res => res.data,
    staleTime: 10_000,
  });

  // Load audit logs scoped to this event for governance score
  const { data: auditLogs = [] } = useQuery({
    queryKey: ['auditLogs_event', eventId],
    queryFn: () => eventId ? base44.entities.AuditLog.filter({ event_id: eventId }, '-timestamp', 100) : Promise.resolve([]),
    enabled: !!eventId,
    staleTime: 60_000,
  });

  // R9CX Phase 5: Compute real governance inputs
  const exportPacketExists = exportPackets.length > 0;
  const closeoutPassed = validation?.can_close === true;
  // Simple data health score from entries/results
  const dataHealthScore = (() => {
    let penalty = 0;
    entries.forEach(e => { if (!e.driver_id) penalty += 15; });
    results.forEach(r => { if (!r.driver_id) penalty += 15; if (!r.session_id) penalty += 5; });
    return Math.max(0, 100 - penalty);
  })();

  // Governance readiness with REAL values (R9CX Fix)
  const { score: govScore, blockers: govBlockers } = useGovernanceReadiness({
    event: selectedEvent,
    sessions,
    results,
    officials,
    gridLineups,
    auditLogs,
    exportPacketExists,
    closeoutPassed,
    dataHealthScore,
  });

  // Enforcement
  const { canPerform, blockers: enforcementBlockers } = useGovernanceEnforcement({
    event: selectedEvent,
    officials,
    sessions,
    results,
    governanceScore: govScore,
    isAdmin,
  });

  const completeMutation = useMutation({
    mutationFn: () => base44.functions.invoke('setEventLifecycleStatus', {
      event_id: eventId,
      status: 'Completed',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['closeout_validation', eventId] });
      invalidateAfterOperation?.('event_completed', { eventId });
      toast.success('Event marked as Completed');
      setCompleting(false);
    },
    onError: () => {
      toast.error('Failed to complete event');
      setCompleting(false);
    },
  });

  const handleComplete = () => {
    if (!validation?.can_close) return;
    // Governance enforcement check
    const { allowed, reason } = canPerform('close_event');
    if (!allowed && !isAdmin) {
      toast.error(reason);
      return;
    }
    setCompleting(true);
    completeMutation.mutate();
  };

  const handleExportPacket = async () => {
    setExporting(true);
    toast.info('Generating export packet — building CSVs…');
    try {
      const res = await base44.functions.invoke('generateEventExportPacket', { event_id: eventId });
      const data = res.data;
      setExportResult(data);

      // Persist to EventExportPacket entity
      const nextVersion = (latestPacket?.packet_version || 0) + 1;
      await base44.entities.EventExportPacket.create({
        event_id: eventId,
        generated_by: user?.id || 'system',
        generated_by_name: user?.full_name || 'System',
        generated_at: new Date().toISOString(),
        packet_version: nextVersion,
        files: data.files || [],
        summary: { file_count: data.files?.length || 0 },
      });
      queryClient.invalidateQueries({ queryKey: ['export_packets', eventId] });

      // Write audit log
      writeAudit({
        entity_type: 'Event',
        entity_id: eventId,
        entity_name: selectedEvent?.name,
        action: 'updated',
        event_id: eventId,
        notes: `Export packet v${nextVersion} generated (${data.files?.length || 0} files)`,
      });

      refetch();
      toast.success(`Export packet ready — ${data.files?.length || 0} files generated`);
    } catch (e) {
      toast.error('Export failed: ' + (e.response?.data?.error || e.message));
    } finally {
      setExporting(false);
    }
  };

  const checklist = validation?.checklist || [];
  const passed = checklist.filter(c => c.passed).length;
  // R9CX: Allow non-admin to close event if all checks pass and governance allows
  const govEnforcement = canPerform('close_event');
  const govBlocked = !isAdmin && !govEnforcement.allowed;
  // Can close if: validation passes AND (admin OR governance allows)
  const canClose = validation?.can_close && !govBlocked;
  const isCompleted = selectedEvent?.status === 'Completed';

  return (
    <div className="space-y-5 max-w-xl">
      {/* Governance blockers */}
      {!isCompleted && enforcementBlockers.length > 0 && (
        <GovernanceBlockerBanner blockers={enforcementBlockers} onNavigate={onNavigate} />
      )}

      {/* Officials enforcement */}
      {!isCompleted && (
        <OfficialsEnforcement officials={officials} onNavigate={onNavigate} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Event Closeout</h2>
          <p className="text-[10px] text-gray-500 mt-0.5">
            {isCompleted
              ? 'This event has been completed.'
              : 'Complete all items below to close out this event.'}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1.5 rounded border border-white/[0.07] text-gray-500 hover:text-gray-300 transition-colors"
          title="Refresh validation"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Completed state */}
      {isCompleted && (
        <div className="flex items-center gap-3 p-4 rounded border border-green-700/40 bg-green-950/30">
          <ShieldCheck className="w-5 h-5 text-green-400 flex-shrink-0" />
          <div>
            <p className="text-green-200 text-sm font-semibold">Event Completed</p>
            <p className="text-green-400 text-[11px]">This event has been successfully closed out.</p>
          </div>
        </div>
      )}

      {/* Progress bar */}
      {!isCompleted && checklist.length > 0 && (
        <CloseoutProgressBar passed={passed} total={checklist.length} />
      )}

      {isLoading && (
        <div className="flex items-center gap-2 py-4">
          <RefreshCw className="w-4 h-4 text-gray-500 animate-spin" />
          <span className="text-gray-500 text-sm">Validating event state…</span>
        </div>
      )}

      {/* Checklist with action links */}
      {checklist.length > 0 && (
        <CloseoutChecklist items={checklist} onNavigate={onNavigate} />
      )}

      {/* Blocker summary */}
      {validation && validation.blockers?.length > 0 && !isCompleted && (
        <div className="p-3 rounded border border-red-800/40 bg-red-950/20">
          <p className="text-[10px] font-bold uppercase tracking-widest text-red-400 mb-1">
            {validation.blockers.length} {validation.blockers.length === 1 ? 'Blocker' : 'Blockers'} Remaining
          </p>
          <p className="text-xs text-red-300">
            Resolve all blockers before the event can be completed.
          </p>
        </div>
      )}

      {/* Export packet — persisted history */}
      {latestPacket && (
        <div className="p-3 rounded border border-teal-700/40 bg-teal-950/20 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
            <p className="text-[11px] font-semibold text-teal-300">
              Export Packet v{latestPacket.packet_version} — {latestPacket.files?.length || 0} files
            </p>
            <span className="text-[9px] text-teal-600 ml-auto">Persisted ✓</span>
          </div>
          <p className="text-[10px] text-teal-500">
            Generated {new Date(latestPacket.generated_at).toLocaleString()} · {latestPacket.generated_by_name}
          </p>
          <div className="space-y-1">
            {(latestPacket.files || []).map(f => (
              <a
                key={f.name}
                href={f.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[10px] text-teal-300 hover:text-teal-200 transition-colors"
              >
                <ExternalLink className="w-2.5 h-2.5" />
                {f.name} {f.row_count ? `(${f.row_count} rows)` : ''}
              </a>
            ))}
          </div>
          {exportPackets.length > 1 && (
            <p className="text-[10px] text-gray-600">
              <History className="w-2.5 h-2.5 inline mr-1" />
              {exportPackets.length} versions in history
            </p>
          )}
        </div>
      )}
      {/* Fallback — in-session export result before persisted */}
      {exportResult && !latestPacket && (
        <div className="p-3 rounded border border-teal-700/40 bg-teal-950/20 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
            <p className="text-[11px] font-semibold text-teal-300">
              Export Packet Generated — {exportResult.files?.length || 0} files
            </p>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {!isCompleted && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-white/[0.06]">
          <button
            onClick={handleExportPacket}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded border border-white/[0.08] text-[11px] font-semibold uppercase tracking-wider text-gray-300 bg-white/[0.04] hover:bg-white/[0.08] transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            {exporting ? 'Generating…' : exportResult ? 'Re-generate Export Packet' : 'Generate Export Packet'}
          </button>
          <button
            onClick={handleComplete}
            disabled={!canClose || completing}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded border text-[11px] font-semibold uppercase tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-teal-700/50 border-teal-600/40 text-teal-200 hover:bg-teal-700/70"
          >
            <Flag className="w-3.5 h-3.5" />
            {completing ? 'Completing…' : 'Complete Event'}
          </button>
        </div>
      )}

      {!isAdmin && govBlocked && (
        <p className="text-[10px] text-gray-600">Governance requirements must be met before this event can be completed.</p>
      )}
    </div>
  );
}