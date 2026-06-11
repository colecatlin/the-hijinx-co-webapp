/**
 * R9CT — EventGridPanel (Phase 5)
 * Grid operations control panel for all sessions in an event.
 * Displays: Generated / Approved / Published / Locked state per session.
 * Actions: Generate, Approve, Publish, Lock grid per session.
 */
import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useEventWorkspace } from '../EventWorkspaceContext';
import { Grip, CheckCircle2, AlertCircle, Clock, Lock, RefreshCw, Eye, Play, Square } from 'lucide-react';
import { toast } from 'sonner';
import SessionReadinessIndicator from '../SessionReadinessIndicator';
import { useAuditWriter } from '../../../../hooks/useAuditWriter';
import EventGridGeneratorModal from './EventGridGeneratorModal';

const GRID_STATUS_CONFIG = {
  Draft:            { label: 'Draft',     color: 'text-gray-400', bg: 'bg-gray-800/40',    border: 'border-gray-700', icon: Clock },
  'Pending Approval': { label: 'Pending', color: 'text-amber-300', bg: 'bg-amber-900/20',   border: 'border-amber-700/40', icon: AlertCircle },
  Approved:         { label: 'Approved',  color: 'text-teal-300',  bg: 'bg-teal-900/20',    border: 'border-teal-700/40', icon: CheckCircle2 },
  Published:        { label: 'Published', color: 'text-green-300', bg: 'bg-green-900/20',   border: 'border-green-700/40', icon: Eye },
  Superseded:       { label: 'Superseded',color: 'text-gray-500',  bg: 'bg-gray-800/20',    border: 'border-gray-700/40', icon: Clock },
  Locked:           { label: 'Locked',    color: 'text-purple-300',bg: 'bg-purple-900/20',  border: 'border-purple-700/40', icon: Lock },
};

function GridStatusBadge({ status }) {
  const cfg = GRID_STATUS_CONFIG[status] || GRID_STATUS_CONFIG.Draft;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${cfg.bg} ${cfg.border} ${cfg.color}`}>
      <Icon className="w-2.5 h-2.5" />
      {cfg.label}
    </span>
  );
}

export default function EventGridPanel() {
  const { selectedEvent, isAdmin, wsData, user } = useEventWorkspace();
  const eventId = selectedEvent?.id;
  const queryClient = useQueryClient();
  const { writeAudit } = useAuditWriter(user);
  const [expandedSession, setExpandedSession] = useState(null);
  const [generatorModal, setGeneratorModal] = useState(null); // session object to generate for

  const sessions = wsData?.sessions || [];
  const entries = wsData?.entries || [];
  const officials = wsData?.officials || [];
  const gridLineups = wsData?.gridLineups || [];

  // Per-session grid lookup
  const gridBySession = useMemo(() => {
    const map = {};
    gridLineups.forEach(g => {
      // Only track non-superseded grids
      if (g.status !== 'Superseded') map[g.session_id] = g;
    });
    return map;
  }, [gridLineups]);

  const generateMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('generateGridLineup', { event_id: eventId, ...data }),
    onSuccess: (res, vars) => {
      queryClient.invalidateQueries({ queryKey: ['grid_lineups', eventId] });
      toast.success(`Grid generated (${vars.generation_method})`);
      writeAudit({ entity_type: 'GridLineup', entity_id: vars.session_id, action: 'created', event_id: eventId, notes: `Grid generated: ${vars.generation_method}` });
    },
    onError: (e) => toast.error('Grid generation failed: ' + (e?.response?.data?.error || e.message)),
  });

  const sessionLifecycleMutation = useMutation({
    mutationFn: ({ sessionId, status }) => base44.entities.Session.update(sessionId, {
      status,
      ...(status === 'Live' ? { live_started_at: new Date().toISOString() } : {}),
      ...(status === 'Completed' ? { completed_at: new Date().toISOString() } : {}),
    }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['sessions', eventId] });
      toast.success(`Session ${vars.status}`);
      writeAudit({ entity_type: 'Session', entity_id: vars.sessionId, action: 'lifecycle_change', event_id: eventId, after_data: { status: vars.status } });
    },
    onError: () => toast.error('Failed to update session status'),
  });

  const approveMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('approveGridLineup', data),
    onSuccess: (res, vars) => {
      queryClient.invalidateQueries({ queryKey: ['grid_lineups', eventId] });
      toast.success('Grid approved');
      writeAudit({ entity_type: 'GridLineup', entity_id: vars.lineup_id, action: 'status_changed', event_id: eventId, after_data: { status: 'Approved' } });
    },
    onError: (e) => toast.error('Approval failed: ' + (e?.response?.data?.error || e.message)),
  });

  const publishMutation = useMutation({
    mutationFn: ({ lineupId }) => base44.entities.GridLineup.update(lineupId, {
      status: 'Published',
      published_at: new Date().toISOString(),
    }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['grid_lineups', eventId] });
      toast.success('Grid published');
      writeAudit({ entity_type: 'GridLineup', entity_id: vars.lineupId, action: 'status_changed', event_id: eventId, after_data: { status: 'Published' } });
    },
    onError: () => toast.error('Publish failed'),
  });

  const lockMutation = useMutation({
    mutationFn: ({ lineupId }) => base44.entities.GridLineup.update(lineupId, { status: 'Locked' }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['grid_lineups', eventId] });
      toast.success('Grid locked');
      writeAudit({ entity_type: 'GridLineup', entity_id: vars.lineupId, action: 'lifecycle_change', event_id: eventId, after_data: { status: 'Locked' } });
    },
    onError: () => toast.error('Lock failed'),
  });

  if (!selectedEvent) {
    return <div className="py-8 text-center text-gray-600 text-sm">Select an event to manage grids.</div>;
  }

  const featureSessions = sessions.filter(s => ['Feature', 'Final', 'Heat', 'LCQ'].includes(s.session_type));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Grip className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Grid Operations</h2>
          <span className="text-[11px] text-gray-500">{featureSessions.length} session{featureSessions.length !== 1 ? 's' : ''}</span>
        </div>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['grid_lineups', eventId] })}
          className="p-1.5 rounded border border-white/[0.07] text-gray-500 hover:text-gray-300 transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      {featureSessions.length === 0 && (
        <div className="py-8 text-center text-gray-600 text-sm">
          No grid-eligible sessions (Feature, Final, Heat, LCQ) found for this event.
        </div>
      )}

      <div className="space-y-2">
        {featureSessions.map(session => {
          const grid = gridBySession[session.id];
          const isExpanded = expandedSession === session.id;

          return (
            <div
              key={session.id}
              className="rounded border border-white/[0.08] bg-white/[0.02] overflow-hidden"
            >
              {/* Session row */}
              <div
                className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-white/[0.03] transition-colors"
                onClick={() => setExpandedSession(isExpanded ? null : session.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[12px] font-semibold text-gray-200">{session.name}</span>
                    <span className="text-[10px] text-gray-600 uppercase tracking-wider">{session.session_type}</span>
                    {grid ? (
                      <GridStatusBadge status={grid.status} />
                    ) : (
                      <span className="text-[10px] text-red-400 font-medium">No Grid</span>
                    )}
                  </div>
                  {grid && (
                    <p className="text-[10px] text-gray-600 mt-0.5">
                      {grid.rows?.length || 0} positions · {grid.generation_method}
                    </p>
                  )}
                </div>
                {/* Quick action buttons */}
                {isAdmin && (
                  <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    {/* Session lifecycle: Start / End */}
                    {session.status === 'Scheduled' && (
                      <button
                        disabled={sessionLifecycleMutation.isPending}
                        onClick={() => sessionLifecycleMutation.mutate({ sessionId: session.id, status: 'Live' })}
                        className="px-2 py-1 rounded border border-red-600/40 bg-red-900/20 text-red-300 text-[10px] font-semibold hover:bg-red-900/40 transition-colors disabled:opacity-50 flex items-center gap-1"
                      >
                        <Play className="w-2.5 h-2.5" /> Start
                      </button>
                    )}
                    {session.status === 'Live' && (
                      <button
                        disabled={sessionLifecycleMutation.isPending}
                        onClick={() => sessionLifecycleMutation.mutate({ sessionId: session.id, status: 'Completed' })}
                        className="px-2 py-1 rounded border border-amber-600/40 bg-amber-900/20 text-amber-300 text-[10px] font-semibold hover:bg-amber-900/40 transition-colors disabled:opacity-50 flex items-center gap-1"
                      >
                        <Square className="w-2.5 h-2.5" /> End
                      </button>
                    )}
                    {!grid && (
                      <button
                        disabled={generateMutation.isPending}
                        onClick={() => setGeneratorModal(session)}
                        className="px-2 py-1 rounded border border-teal-600/40 bg-teal-900/20 text-teal-300 text-[10px] font-semibold hover:bg-teal-900/40 transition-colors disabled:opacity-50"
                      >
                        Generate
                      </button>
                    )}
                    {grid?.status === 'Draft' && (
                      <button
                        disabled={approveMutation.isPending}
                        onClick={() => approveMutation.mutate({ lineup_id: grid.id, event_id: eventId })}
                        className="px-2 py-1 rounded border border-amber-600/40 bg-amber-900/20 text-amber-300 text-[10px] font-semibold hover:bg-amber-900/40 transition-colors disabled:opacity-50"
                      >
                        Approve
                      </button>
                    )}
                    {grid?.status === 'Pending Approval' && (
                      <button
                        disabled={approveMutation.isPending}
                        onClick={() => approveMutation.mutate({ lineup_id: grid.id, event_id: eventId })}
                        className="px-2 py-1 rounded border border-teal-600/40 bg-teal-900/20 text-teal-300 text-[10px] font-semibold hover:bg-teal-900/40 transition-colors disabled:opacity-50"
                      >
                        Approve
                      </button>
                    )}
                    {grid?.status === 'Approved' && (
                      <button
                        disabled={publishMutation.isPending}
                        onClick={() => publishMutation.mutate({ lineupId: grid.id })}
                        className="px-2 py-1 rounded border border-green-600/40 bg-green-900/20 text-green-300 text-[10px] font-semibold hover:bg-green-900/40 transition-colors disabled:opacity-50"
                      >
                        Publish
                      </button>
                    )}
                    {grid?.status === 'Published' && (
                      <button
                        disabled={lockMutation.isPending}
                        onClick={() => lockMutation.mutate({ lineupId: grid.id })}
                        className="px-2 py-1 rounded border border-purple-600/40 bg-purple-900/20 text-purple-300 text-[10px] font-semibold hover:bg-purple-900/40 transition-colors disabled:opacity-50"
                      >
                        Lock
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Expanded: grid row details + readiness */}
              {isExpanded && (
                <div className="border-t border-white/[0.06] px-3 py-3 space-y-3">
                  <SessionReadinessIndicator
                    session={session}
                    entries={entries}
                    officials={officials}
                    gridLineups={gridLineups}
                  />
                  {grid?.rows?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Grid Positions</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 max-h-48 overflow-y-auto">
                        {[...grid.rows].sort((a, b) => a.position - b.position).map(row => (
                          <div
                            key={row.position}
                            className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/[0.03] border border-white/[0.05]"
                          >
                            <span className="text-[10px] font-bold text-gray-500 w-4 text-right">{row.position}.</span>
                            <span className="text-[11px] text-gray-300 font-mono">{row.car_number || '—'}</span>
                            {row.status && row.status !== 'ok' && (
                              <span className="text-[9px] text-amber-400 uppercase">{row.status}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Grid Generator Modal — full method selection */}
      {generatorModal && (
        <EventGridGeneratorModal
          open={!!generatorModal}
          onClose={() => setGeneratorModal(null)}
          session={generatorModal}
          allSessions={sessions}
          onGenerate={(params) => generateMutation.mutate(params)}
          isPending={generateMutation.isPending}
        />
      )}
    </div>
  );
}