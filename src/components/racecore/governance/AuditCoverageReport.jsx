/**
 * R9CT — AuditCoverageReport (Phase 1)
 * Shows per-entity audit coverage metrics.
 * Coverage = mutations that write to AuditLog / total known mutations.
 */
import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

// Static coverage map — updated as audit hooks are wired in
const COVERAGE_DATA = [
  { entity: 'Driver',               mutations: 4, audited: 3, notes: 'Create/Archive/Restore covered. Update wired via useAuditWriter.' },
  { entity: 'Team',                 mutations: 4, audited: 3, notes: 'Create/Archive/Restore covered.' },
  { entity: 'Track',                mutations: 4, audited: 3, notes: 'Create/Archive/Restore covered.' },
  { entity: 'Series',               mutations: 4, audited: 3, notes: 'Create/Archive/Restore covered.' },
  { entity: 'Event',                mutations: 6, audited: 5, notes: 'Create/Archive/Publish/Complete/Export covered. Lifecycle updates wired.' },
  { entity: 'Session',              mutations: 5, audited: 4, notes: 'Create/Status/Archive/Hold covered.' },
  { entity: 'Entry',                mutations: 5, audited: 4, notes: 'Create/CheckIn/Tech/Archive covered.' },
  { entity: 'Results',              mutations: 5, audited: 4, notes: 'Status transitions covered via updateSessionStatus + bulk publish.' },
  { entity: 'Standings',            mutations: 3, audited: 2, notes: 'Recalculate/Archive covered. Manual edit gap remains.' },
  { entity: 'EventOfficial',        mutations: 3, audited: 3, notes: 'Assign/Confirm/Remove all covered via useAuditWriter.' },
  { entity: 'Incident',             mutations: 4, audited: 3, notes: 'Create/Status/Archive covered.' },
  { entity: 'Penalty',              mutations: 5, audited: 4, notes: 'Propose/Approve/Apply/Archive covered. Fine payment gap.' },
  { entity: 'Protest',              mutations: 4, audited: 3, notes: 'File/Resolve/Archive covered.' },
  { entity: 'TechInspectionRecord', mutations: 4, audited: 4, notes: 'Full coverage — create/pass/fail/archive all audited.' },
  { entity: 'EventExportPacket',    mutations: 2, audited: 2, notes: 'Generate + archive covered.' },
  { entity: 'GridLineup',           mutations: 4, audited: 4, notes: 'Generate/Approve/Publish/Lock all audited via EventGridPanel.' },
];

function CoverageBar({ pct }) {
  const color = pct >= 90 ? 'bg-green-500' : pct >= 70 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-1.5 rounded-full bg-white/[0.08]">
        <div className={`h-1.5 rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-[10px] font-bold w-8 text-right ${pct >= 90 ? 'text-green-400' : pct >= 70 ? 'text-amber-400' : 'text-red-400'}`}>
        {pct}%
      </span>
    </div>
  );
}

export default function AuditCoverageReport() {
  const totalMutations = COVERAGE_DATA.reduce((s, r) => s + r.mutations, 0);
  const totalAudited = COVERAGE_DATA.reduce((s, r) => s + r.audited, 0);
  const overallPct = Math.round((totalAudited / totalMutations) * 100);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Overall Coverage', value: `${overallPct}%`, color: overallPct >= 90 ? 'text-green-300' : 'text-amber-300' },
          { label: 'Mutations Audited', value: `${totalAudited}/${totalMutations}`, color: 'text-gray-200' },
          { label: 'Entities Covered', value: `${COVERAGE_DATA.filter(r => r.audited === r.mutations).length}/${COVERAGE_DATA.length}`, color: 'text-teal-300' },
        ].map(stat => (
          <div key={stat.label} className="p-3 rounded border border-white/[0.08] bg-white/[0.03]">
            <p className="text-[9px] uppercase tracking-widest text-gray-500 mb-1">{stat.label}</p>
            <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Per-entity table */}
      <div>
        <p className="text-[9px] uppercase tracking-widest font-bold text-gray-500 mb-2">Per-Entity Audit Coverage</p>
        <div className="space-y-1">
          {COVERAGE_DATA.map(row => {
            const pct = Math.round((row.audited / row.mutations) * 100);
            return (
              <div key={row.entity} className="flex items-center gap-3 px-3 py-2 rounded border border-white/[0.06] bg-white/[0.02]">
                <div className="w-44 flex-shrink-0">
                  <span className="text-[11px] font-semibold text-gray-200">{row.entity}</span>
                </div>
                <div className="flex-1">
                  <CoverageBar pct={pct} />
                </div>
                <div className="w-20 text-right flex-shrink-0">
                  <span className="text-[10px] text-gray-500">{row.audited}/{row.mutations}</span>
                </div>
                {row.notes && (
                  <div className="hidden xl:block w-64 flex-shrink-0">
                    <span className="text-[10px] text-gray-600 truncate">{row.notes}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}