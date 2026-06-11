/**
 * R9CT — useGovernanceEnforcement
 * Central enforcement hook. Evaluates governance blockers and returns
 * a canPerform(action) function that components call before any mutation.
 *
 * Usage:
 *   const { canPerform, blockers, governanceScore } = useGovernanceEnforcement({ event, officials, ... });
 *   if (!canPerform('close_event')) { show blocker toast; return; }
 */
import { useMemo } from 'react';
import { hasPermission } from '../config/racecorePermissions';

export function useGovernanceEnforcement({
  event,
  officials = [],
  sessions = [],
  results = [],
  dataHealthScore,
  governanceScore,
  isAdmin = false,
  userRole = 'read_only',
}) {
  // Derive required officials status
  const officialStatus = useMemo(() => {
    const active = officials.filter(o => !['Withdrawn'].includes(o.status));
    return {
      hasRaceDirector: active.some(o => o.role === 'Race Director' && ['Confirmed', 'Active'].includes(o.status)),
      hasChiefSteward: active.some(o => o.role === 'Chief Steward' && ['Confirmed', 'Active'].includes(o.status)),
      hasTechDirector: active.some(o => o.role === 'Technical Director' && ['Confirmed', 'Active'].includes(o.status)),
      hasTimingScoring: active.some(o => o.role === 'Timing and Scoring' && ['Confirmed', 'Active'].includes(o.status)),
    };
  }, [officials]);

  // Derive critical health
  const hasCriticalHealthIssues = dataHealthScore !== undefined && dataHealthScore < 60;

  // Derive governance score gate
  const governanceGate = governanceScore !== undefined && governanceScore < 70;

  // Has unresolved draft results when event should be closing
  const hasDraftResults = useMemo(() =>
    results.some(r => r.status_state === 'Draft'),
  [results]);

  /**
   * Evaluate whether an action is permitted.
   * Returns { allowed: boolean, reason?: string }
   */
  const canPerform = useMemo(() => (action) => {
    // 1. Platform admin bypasses all governance checks
    if (isAdmin) {
      const perm = hasPermission('platform_admin', action, true);
      if (!perm) return { allowed: false, reason: `Action "${action}" is not defined in the permission matrix.` };
      return { allowed: true };
    }

    // 2. Check permission matrix first
    const permitted = hasPermission(userRole, action, isAdmin);
    if (!permitted) {
      return {
        allowed: false,
        reason: `Your role does not have permission to perform "${action}".`,
      };
    }

    // 3. Governance-gated actions
    const GOVERNANCE_GATED = ['close_event', 'publish_results', 'approve_grid'];
    if (GOVERNANCE_GATED.includes(action) && governanceGate) {
      return {
        allowed: false,
        reason: `Governance score is below 70. Resolve governance issues before performing "${action}".`,
        type: 'governance',
      };
    }

    // 4. Critical health blocks closeout
    if (action === 'close_event' && hasCriticalHealthIssues) {
      return {
        allowed: false,
        reason: 'Critical data health issues must be resolved before closing the event.',
        type: 'data_health',
      };
    }

    // 5. Race Director required for key actions
    const RD_REQUIRED = ['close_event', 'approve_grid', 'lifecycle_change'];
    if (RD_REQUIRED.includes(action) && !officialStatus.hasRaceDirector) {
      return {
        allowed: false,
        reason: 'A confirmed Race Director must be assigned before performing this action.',
        type: 'officials',
      };
    }

    // 6. Publish results: require official or admin override
    if (action === 'publish_results' && hasDraftResults) {
      return {
        allowed: true, // allowed but flagged — caller can show warning
        warning: 'Some results are still in Draft state. Consider promoting to Provisional first.',
      };
    }

    return { allowed: true };
  }, [isAdmin, userRole, governanceGate, hasCriticalHealthIssues, officialStatus, hasDraftResults]);

  // Collect top-level blockers for UI display
  const blockers = useMemo(() => {
    const b = [];
    if (hasCriticalHealthIssues) b.push({ type: 'data_health', message: 'Critical data health issues exist' });
    if (governanceGate) b.push({ type: 'governance', message: `Governance score is ${governanceScore}/100 — below the 70-point minimum` });
    if (!officialStatus.hasRaceDirector) b.push({ type: 'officials', message: 'Race Director not confirmed' });
    if (!officialStatus.hasChiefSteward) b.push({ type: 'officials', message: 'Chief Steward not confirmed' });
    return b;
  }, [hasCriticalHealthIssues, governanceGate, governanceScore, officialStatus]);

  return {
    canPerform,
    blockers,
    officialStatus,
    hasCriticalHealthIssues,
    governanceGate,
    isEnforcing: true,
  };
}

export default useGovernanceEnforcement;