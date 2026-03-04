/**
 * Compute event operational metrics from raw data.
 */
export function computeEventMetrics({
  sessions = [],
  entries = [],
  results = [],
  standings = [],
  operationLogs = [],
}) {
  // Sessions
  const totalSessions = sessions.length;
  const sessionsCompleted = sessions.filter((s) => s.status === 'completed' || s.status === 'Official' || s.status === 'Locked').length;
  const sessionsInProgress = sessions.filter((s) => s.status === 'in_progress').length;
  const sessionsRemaining = totalSessions - sessionsCompleted - sessionsInProgress;

  // Entries
  const totalEntries = entries.length;
  const checkedInCount = entries.filter((e) => e.entry_status === 'Checked In').length;
  const techedCount = entries.filter((e) => e.tech_status === 'Passed').length;
  const unpaidCount = entries.filter((e) => e.payment_status === 'Unpaid').length;

  // Results
  const resultsPublishedCount = results.filter(
    (r) => r.status === 'Official' || r.status === 'Locked'
  ).length;
  const resultsDraftCount = results.filter(
    (r) => r.status === 'Draft' || r.status === 'Provisional'
  ).length;

  // Standings
  const standingsCalculated = standings.length > 0;

  // Race Control
  const raceControlLogs = operationLogs
    .filter((l) => ['session_updated', 'flag_incident', 'race_control_action'].includes(l.operation_type))
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  const lastRaceControlAction = raceControlLogs[0]?.created_date || null;

  return {
    totalSessions,
    sessionsCompleted,
    sessionsInProgress,
    sessionsRemaining,

    totalEntries,
    checkedInCount,
    techedCount,
    unpaidCount,

    resultsPublishedCount,
    resultsDraftCount,

    standingsCalculated,

    lastRaceControlAction,
  };
}