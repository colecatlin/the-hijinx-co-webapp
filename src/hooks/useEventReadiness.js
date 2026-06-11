/**
 * R9CR — useEventReadiness
 * Computes a 0-100 readiness score from workspace data.
 * Used by EventReadinessCard and Overview.
 */
import { useMemo } from 'react';

export function useEventReadiness({
  event,
  sessions = [],
  entries = [],
  results = [],
  officials = [],
  standings = [],
  standingsDirty = false,
  incidents = [],
  exportPacketGeneratedAt = null,
}) {
  return useMemo(() => {
    const checks = [];

    // 1. Schedule confirmed — at least one session exists
    const hasSchedule = sessions.length > 0;
    checks.push({ id: 'schedule', label: 'Schedule Confirmed', passed: hasSchedule, weight: 10 });

    // 2. Officials assigned — at least Race Director + one Steward
    const hasRaceDirector = officials.some(o => o.role === 'Race Director' && ['Confirmed', 'Active'].includes(o.status));
    const hasSteward = officials.some(o => ['Chief Steward', 'Steward'].includes(o.role) && ['Confirmed', 'Active'].includes(o.status));
    checks.push({ id: 'officials_rd', label: 'Race Director Assigned', passed: hasRaceDirector, weight: 10 });
    checks.push({ id: 'officials_steward', label: 'Steward Assigned', passed: hasSteward, weight: 5 });

    // 3. Entries checked in (threshold: 80%)
    const checkedIn = entries.filter(e => e.entry_status === 'Checked In').length;
    const checkInPct = entries.length > 0 ? (checkedIn / entries.length) : 0;
    checks.push({ id: 'checkin', label: 'Entries Checked In (80%+)', passed: checkInPct >= 0.8, weight: 15, detail: `${checkedIn}/${entries.length}` });

    // 4. Tech completed (threshold: 80% passed/cleared)
    const techCleared = entries.filter(e => ['Passed', 'Conditionally Passed'].includes(e.tech_status)).length;
    const techPct = entries.length > 0 ? (techCleared / entries.length) : 0;
    checks.push({ id: 'tech', label: 'Tech Inspection (80%+)', passed: techPct >= 0.8, weight: 15, detail: `${techCleared}/${entries.length}` });

    // 5. Results published — all completed sessions have official+ results
    const completedSessions = sessions.filter(s => ['Official', 'Locked'].includes(s.status));
    const sessionsWithOfficialResults = completedSessions.filter(s =>
      results.some(r => r.session_id === s.id && ['Official', 'Locked'].includes(r.status_state))
    );
    const resultsPublished = completedSessions.length === 0 || (sessionsWithOfficialResults.length === completedSessions.length);
    checks.push({ id: 'results', label: 'Results Published', passed: resultsPublished, weight: 20, detail: `${sessionsWithOfficialResults.length}/${completedSessions.length} sessions` });

    // 6. Standings current
    checks.push({ id: 'standings', label: 'Standings Current', passed: !standingsDirty, weight: 10 });

    // 7. No active incidents
    const activeIncidents = incidents.filter(i => ['Open', 'Under Review'].includes(i.status)).length;
    checks.push({ id: 'incidents', label: 'No Active Incidents', passed: activeIncidents === 0, weight: 10, detail: activeIncidents > 0 ? `${activeIncidents} open` : undefined });

    // 8. Export packet generated
    checks.push({ id: 'export', label: 'Export Packet Generated', passed: !!exportPacketGeneratedAt, weight: 5 });

    // Compute weighted score
    const totalWeight = checks.reduce((s, c) => s + c.weight, 0);
    const earnedWeight = checks.filter(c => c.passed).reduce((s, c) => s + c.weight, 0);
    const score = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;

    const tier = score >= 90 ? 'green' : score >= 70 ? 'amber' : 'red';

    return { score, tier, checks };
  }, [event, sessions, entries, results, officials, standings, standingsDirty, incidents, exportPacketGeneratedAt]);
}