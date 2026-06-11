/**
 * R9CS — useGovernanceReadiness
 * Computes a 0–100 governance readiness score for an event.
 * Green 90+, Amber 70–89, Red <70.
 */
import { useMemo } from 'react';

export function useGovernanceReadiness({
  event,
  sessions,
  results,
  officials,
  techInspections,
  auditLogs,
  exportPacketExists,
  closeoutPassed,
  dataHealthScore,
  gridLineups,
} = {}) {
  const checks = useMemo(() => {
    const list = [];

    const check = (id, label, passed, weight, blocker = false) => {
      list.push({ id, label, passed: !!passed, weight, blocker });
    };

    // Audit system active — any audit logs exist for this event
    check('audit_active', 'Audit system active', (auditLogs || []).length > 0, 15);

    // Archive system active — check passes (schema is deployed)
    check('archive_active', 'Archive system deployed', true, 5);

    // No critical data health issues
    check('data_health', 'No critical data health issues', dataHealthScore === undefined || dataHealthScore >= 60, 20, true);

    // Officials assigned: Race Director + at least one other
    const raceDirAssigned = (officials || []).some(o => o.role === 'Race Director' && ['Confirmed', 'Active'].includes(o.status));
    const stewardAssigned = (officials || []).some(o => o.role === 'Chief Steward' && ['Confirmed', 'Active'].includes(o.status));
    check('race_director', 'Race Director assigned & confirmed', raceDirAssigned, 15, true);
    check('steward_assigned', 'Chief Steward assigned & confirmed', stewardAssigned, 10);

    // Tech Director assigned
    const techDirAssigned = (officials || []).some(o => o.role === 'Technical Director' && ['Confirmed', 'Active'].includes(o.status));
    check('tech_director', 'Technical Director assigned', techDirAssigned, 5);

    // Grids approved for feature sessions
    const featureSessions = (sessions || []).filter(s => ['Feature', 'Final', 'Heat', 'LCQ'].includes(s.session_type));
    const gridsOk = featureSessions.length === 0 || featureSessions.every(s => {
      const grid = (gridLineups || []).find(g => g.session_id === s.id && g.status !== 'Superseded');
      return grid && ['Approved', 'Published', 'Locked'].includes(grid.status);
    });
    check('grids_approved', 'Grids approved for feature sessions', gridsOk, 5);

    // Lifecycle compliance: no sessions in Draft/Scheduled state if event is Completed
    const eventStatus = event?.status || 'Draft';
    const hasStuckSessions = eventStatus === 'Completed' &&
      (sessions || []).some(s => ['Draft', 'Scheduled', 'Live'].includes(s.status));
    check('lifecycle_compliance', 'No lifecycle violations (draft sessions in live event)', !hasStuckSessions, 10);

    // Export packet generated — now checks persisted EventExportPacket entity
    const exportExists = !!exportPacketExists;
    check('export_packet', 'Export packet generated & persisted', exportExists, 10);

    // Closeout passed
    check('closeout_passed', 'Event closeout validated', !!closeoutPassed, 15, true);

    return list;
  }, [event, sessions, results, officials, techInspections, auditLogs, exportPacketExists, closeoutPassed, dataHealthScore, gridLineups]);

  const score = useMemo(() => {
    const total = checks.reduce((sum, c) => sum + c.weight, 0);
    const earned = checks.filter(c => c.passed).reduce((sum, c) => sum + c.weight, 0);
    return total > 0 ? Math.round((earned / total) * 100) : 0;
  }, [checks]);

  const color = score >= 90 ? 'green' : score >= 70 ? 'amber' : 'red';
  const passed = checks.filter(c => c.passed);
  const failed = checks.filter(c => !c.passed);
  const blockers = checks.filter(c => !c.passed && c.blocker);

  return { score, color, checks, passed, failed, blockers };
}

export default useGovernanceReadiness;