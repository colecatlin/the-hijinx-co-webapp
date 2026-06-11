/**
 * R9CT — useSessionReadiness
 * Evaluates per-session readiness for race operations.
 * Returns Ready / Warning / Blocked per session.
 */
import { useMemo } from 'react';

const REQUIRED_OFFICIALS = ['Race Director', 'Chief Steward'];

export function useSessionReadiness({
  session,
  entries = [],
  officials = [],
  gridLineups = [],
  results = [],
  holds = [],
}) {
  return useMemo(() => {
    if (!session) return { status: 'unknown', checks: [], blockers: [] };

    const checks = [];
    const sessionId = session.id;

    // 1. Grid approved
    const grid = gridLineups.find(g => g.session_id === sessionId);
    const gridApproved = grid && ['Approved', 'Published'].includes(grid.status);
    checks.push({
      id: 'grid',
      label: 'Grid Approved',
      passed: !!gridApproved,
      severity: 'warning',
      detail: grid ? `Grid: ${grid.status}` : 'No grid generated',
    });

    // 2. Required officials confirmed
    const confirmedOfficials = officials.filter(o => ['Confirmed', 'Active'].includes(o.status));
    const missingOfficials = REQUIRED_OFFICIALS.filter(
      r => !confirmedOfficials.some(o => o.role === r)
    );
    checks.push({
      id: 'officials',
      label: 'Required Officials Confirmed',
      passed: missingOfficials.length === 0,
      severity: 'blocker',
      detail: missingOfficials.length > 0 ? `Missing: ${missingOfficials.join(', ')}` : 'All confirmed',
    });

    // 3. Entries checked in (>= 70% threshold for session start)
    const sessionEntries = entries.filter(e => !e.is_archived);
    const checkedIn = sessionEntries.filter(e => ['Checked In', 'Teched'].includes(e.entry_status)).length;
    const checkInPct = sessionEntries.length > 0 ? checkedIn / sessionEntries.length : 1;
    checks.push({
      id: 'checkin',
      label: 'Entries Checked In',
      passed: checkInPct >= 0.7 || sessionEntries.length === 0,
      severity: 'warning',
      detail: `${checkedIn}/${sessionEntries.length} checked in`,
    });

    // 4. Tech passed (>= 70%)
    const techPassed = sessionEntries.filter(e => ['Passed', 'Conditionally Passed'].includes(e.tech_status)).length;
    const techPct = sessionEntries.length > 0 ? techPassed / sessionEntries.length : 1;
    checks.push({
      id: 'tech',
      label: 'Tech Inspections Passed',
      passed: techPct >= 0.7 || sessionEntries.length === 0,
      severity: 'warning',
      detail: `${techPassed}/${sessionEntries.length} cleared`,
    });

    // 5. No active results holds
    const activeHold = session.results_on_hold === true;
    checks.push({
      id: 'hold',
      label: 'No Active Results Hold',
      passed: !activeHold,
      severity: 'blocker',
      detail: activeHold ? `Hold active: ${session.hold_reason || 'Pending review'}` : 'Clear',
    });

    // 6. Prior results cleared (no draft results from a previous conflicting session)
    const sessionResults = results.filter(r => r.session_id === sessionId);
    const hasDraftResults = sessionResults.some(r => r.status_state === 'Draft');
    checks.push({
      id: 'results_clean',
      label: 'Results State Clean',
      passed: !hasDraftResults || sessionResults.length === 0,
      severity: 'warning',
      detail: hasDraftResults ? 'Draft results present — promote or clear before starting' : 'Clean',
    });

    // Derive overall status
    const blockers = checks.filter(c => !c.passed && c.severity === 'blocker');
    const warnings = checks.filter(c => !c.passed && c.severity === 'warning');

    let status = 'ready';
    if (blockers.length > 0) status = 'blocked';
    else if (warnings.length > 0) status = 'warning';

    return { status, checks, blockers, warnings };
  }, [session, entries, officials, gridLineups, results, holds]);
}

export default useSessionReadiness;