/**
 * R9CT — OfficialsEnforcement (Phase 7)
 * Shows enforcement status for required event officials.
 * Alerts on missing required roles, provides remediation link.
 */
import React from 'react';
import { ShieldAlert, CheckCircle2, AlertTriangle, UserX } from 'lucide-react';

const REQUIRED_ROLES = [
  { role: 'Race Director',     weight: 'critical', blocksCloseout: true },
  { role: 'Chief Steward',     weight: 'critical', blocksCloseout: true },
  { role: 'Technical Director', weight: 'warning', blocksCloseout: false },
  { role: 'Timing and Scoring', weight: 'warning', blocksCloseout: false },
];

export default function OfficialsEnforcement({ officials = [], onNavigate, compact = false }) {
  const activeOfficials = officials.filter(o => !['Withdrawn'].includes(o.status));

  const roleStatuses = REQUIRED_ROLES.map(req => {
    const assigned = activeOfficials.find(o => o.role === req.role);
    const confirmed = assigned && ['Confirmed', 'Active'].includes(assigned.status);
    return { ...req, assigned: !!assigned, confirmed: !!confirmed };
  });

  const criticalMissing = roleStatuses.filter(r => r.weight === 'critical' && !r.confirmed);
  const warningMissing = roleStatuses.filter(r => r.weight === 'warning' && !r.confirmed);

  if (compact) {
    if (criticalMissing.length === 0 && warningMissing.length === 0) return null;
    return (
      <div className="flex items-center gap-1.5">
        {criticalMissing.length > 0 && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded border border-red-800/40 bg-red-950/20">
            <UserX className="w-2.5 h-2.5 text-red-400" />
            <span className="text-[10px] font-bold text-red-300">{criticalMissing.length} Role{criticalMissing.length > 1 ? 's' : ''} Missing</span>
          </div>
        )}
        {warningMissing.length > 0 && criticalMissing.length === 0 && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded border border-amber-800/40 bg-amber-950/20">
            <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />
            <span className="text-[10px] font-semibold text-amber-300">{warningMissing.length} Role{warningMissing.length > 1 ? 's' : ''} Unconfirmed</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <ShieldAlert className="w-3.5 h-3.5 text-gray-400" />
        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Required Officials</p>
        {criticalMissing.length === 0 && warningMissing.length === 0 && (
          <span className="text-[10px] text-green-400 font-semibold">All confirmed ✓</span>
        )}
      </div>

      <div className="space-y-1">
        {roleStatuses.map(r => (
          <div key={r.role} className="flex items-center gap-2 px-2 py-1 rounded border border-white/[0.05] bg-white/[0.02]">
            {r.confirmed ? (
              <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" />
            ) : r.assigned ? (
              <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0" />
            ) : (
              <UserX className="w-3 h-3 text-red-400 flex-shrink-0" />
            )}
            <span className="text-[11px] text-gray-300 flex-1">{r.role}</span>
            <span className={`text-[9px] font-bold uppercase tracking-widest ${
              r.confirmed ? 'text-green-500' :
              r.assigned ? 'text-amber-400' :
              'text-red-400'
            }`}>
              {r.confirmed ? 'Confirmed' : r.assigned ? 'Invited' : 'Missing'}
            </span>
            {r.blocksCloseout && !r.confirmed && (
              <span className="text-[8px] text-red-500 uppercase tracking-widest">Blocks Closeout</span>
            )}
          </div>
        ))}
      </div>

      {criticalMissing.length > 0 && onNavigate && (
        <button
          onClick={() => onNavigate('officials')}
          className="text-[10px] text-teal-400 hover:text-teal-300 underline transition-colors"
        >
          Assign required officials →
        </button>
      )}
    </div>
  );
}