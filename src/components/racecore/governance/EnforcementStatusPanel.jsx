/**
 * R9CT — EnforcementStatusPanel
 * Shows the current enforcement status across all governance phases.
 * Displayed in the Governance dashboard.
 */
import React from 'react';
import { ShieldCheck, ShieldAlert, Shield, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

const PHASES = [
  {
    phase: 1,
    name: 'Universal Audit Coverage',
    status: 'active',
    coverage: '93%',
    detail: '57/61 mutations across 16 entity types produce AuditLog records.',
    gaps: ['Standings manual edit', 'Penalty fine payment'],
  },
  {
    phase: 2,
    name: 'Delete Eradication',
    status: 'partial',
    coverage: '80%',
    detail: 'Archive replaces delete in EventGridPanel, Officials, Closeout. Legacy list pages retain delete buttons pending full sweep.',
    gaps: ['ManageDrivers hard delete', 'ManageTeams hard delete', 'ManageEvents hard delete'],
  },
  {
    phase: 3,
    name: 'Lifecycle Enforcement',
    status: 'active',
    coverage: '100%',
    detail: 'validateTransition() enforced in LifecycleTransitionButton. All 11 entity types have transition rules. Cannot skip steps.',
    gaps: [],
  },
  {
    phase: 4,
    name: 'Permission Enforcement',
    status: 'active',
    coverage: '85%',
    detail: 'hasPermission() consumed by useGovernanceEnforcement, PermissionGate, EventCloseout. Legacy panels still use isAdmin boolean.',
    gaps: ['BulkPublishActions direct isAdmin check', 'ResultsManager direct isAdmin'],
  },
  {
    phase: 5,
    name: 'Grid Operations Control',
    status: 'active',
    coverage: '100%',
    detail: 'EventGridPanel fully deployed. Generate/Approve/Publish/Lock workflow with audit trail and readiness checks.',
    gaps: [],
  },
  {
    phase: 6,
    name: 'Session Readiness Engine',
    status: 'active',
    coverage: '100%',
    detail: 'useSessionReadiness() checks: Grid, Officials, CheckIn, Tech, Hold, Results. Ready/Warning/Blocked output.',
    gaps: [],
  },
  {
    phase: 7,
    name: 'Officials Enforcement',
    status: 'active',
    coverage: '100%',
    detail: 'OfficialsEnforcement component deployed. Required roles: Race Director (blocker), Chief Steward (blocker), Tech Director (warning), T&S (warning).',
    gaps: [],
  },
  {
    phase: 8,
    name: 'Event Export History',
    status: 'active',
    coverage: '100%',
    detail: 'EventExportPacket entity deployed. Closeout panel persists every export. Versioning + file history survives page refreshes.',
    gaps: [],
  },
  {
    phase: 9,
    name: 'ResultsManager Authority',
    status: 'partial',
    coverage: '70%',
    detail: 'EventResultsPanel passes wsData. ResultsManager still runs its own session/results queries internally.',
    gaps: ['ResultsManager internal session query', 'ResultsManager internal results query'],
  },
  {
    phase: 10,
    name: 'Governance Blockers',
    status: 'active',
    coverage: '100%',
    detail: 'useGovernanceEnforcement active. Score <70 blocks close_event, publish_results, approve_grid. Critical health blocks closeout. Missing RD blocks lifecycle.',
    gaps: [],
  },
];

const STATUS_CONFIG = {
  active:   { icon: ShieldCheck, color: 'text-green-400',  bg: 'bg-green-950/20',  border: 'border-green-800/40',  label: 'Active' },
  partial:  { icon: Shield,      color: 'text-amber-400',  bg: 'bg-amber-950/20',  border: 'border-amber-800/40',  label: 'Partial' },
  planned:  { icon: ShieldAlert, color: 'text-gray-500',   bg: 'bg-gray-800/20',   border: 'border-gray-700/40',   label: 'Planned' },
};

export default function EnforcementStatusPanel() {
  const activeCount = PHASES.filter(p => p.status === 'active').length;
  const partialCount = PHASES.filter(p => p.status === 'partial').length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded border border-green-800/40 bg-green-950/20">
          <p className="text-[9px] uppercase tracking-widest text-green-500 mb-1">Active</p>
          <p className="text-2xl font-bold text-green-300">{activeCount}</p>
        </div>
        <div className="p-3 rounded border border-amber-800/40 bg-amber-950/20">
          <p className="text-[9px] uppercase tracking-widest text-amber-500 mb-1">Partial</p>
          <p className="text-2xl font-bold text-amber-300">{partialCount}</p>
        </div>
        <div className="p-3 rounded border border-white/[0.08] bg-white/[0.02]">
          <p className="text-[9px] uppercase tracking-widest text-gray-500 mb-1">Phases</p>
          <p className="text-2xl font-bold text-gray-200">{PHASES.length}</p>
        </div>
      </div>

      {/* Phase list */}
      <div className="space-y-2">
        {PHASES.map(p => {
          const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.planned;
          const Icon = cfg.icon;
          return (
            <div key={p.phase} className={`p-3 rounded border ${cfg.border} ${cfg.bg}`}>
              <div className="flex items-start gap-2">
                <Icon className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${cfg.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[9px] font-bold uppercase tracking-widest ${cfg.color}`}>Phase {p.phase}</span>
                    <span className="text-[11px] font-semibold text-gray-200">{p.name}</span>
                    <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${cfg.border} ${cfg.color}`}>
                      {cfg.label} · {p.coverage}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1">{p.detail}</p>
                  {p.gaps.length > 0 && (
                    <div className="mt-1.5 space-y-0.5">
                      {p.gaps.map((g, i) => (
                        <div key={i} className="flex items-center gap-1">
                          <AlertTriangle className="w-2.5 h-2.5 text-amber-500 flex-shrink-0" />
                          <span className="text-[10px] text-amber-400/70">{g}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}