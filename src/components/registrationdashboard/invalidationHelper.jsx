/**
 * Centralized cache invalidation for RegistrationDashboard.
 *
 * Uses REG_QK for exact targeted invalidation when payload is provided.
 * Falls back to broad prefix invalidation for backward compatibility.
 */
import { REG_QK } from './queryKeys';

/**
 * Returns the precise REG_QK keys to invalidate for a given operationType + payload.
 * Also includes legacy broad-prefix keys so any component still using old keys gets refreshed.
 */
function getKeysForOperation(operationType, payload = {}) {
  const { eventId, seriesId, seasonYear } = payload;

  // Exact REG_QK keys (targeted, precise)
  const exact = [];
  // Legacy prefix keys (broad, backward-compat with components not yet migrated)
  const broad = [];

  switch (operationType) {
    case 'event_created':
      broad.push(['events'], ['seasonCalendarEvents'], ['eventCollaboration'], ['eventCollaborations'], ['operationLogs'], ['eventCollaborators']);
      if (eventId) exact.push(REG_QK.event(eventId), REG_QK.operationLogs(eventId), ['eventCollaboration', eventId], ['eventCollaborations', eventId], ['eventCollaborators', eventId]);
      break;

    case 'event_updated':
    case 'event_status_changed':
    case 'event_published':
      broad.push(['events'], ['seasonCalendarEvents'], ['seasonCalendarSessions'], ['seasonCalendarEntries'], ['seasonCalendarResults'], ['selectedEvent'], ['operationLogs']);
      if (eventId) exact.push(REG_QK.event(eventId), REG_QK.operationLogs(eventId));
      break;

    case 'event_collaboration_requested':
    case 'event_collaboration_response':
    case 'event_collaboration_updated':
    case 'event_collaboration_track_accepted':
    case 'event_collaboration_series_accepted':
    case 'event_collaboration_track_declined':
    case 'event_collaboration_series_declined':
      broad.push(['events'], ['eventCollaborations'], ['sessions'], ['results'], ['standings'], ['operationLogs'], ['eventCollaboration']);
      if (eventId) exact.push(REG_QK.event(eventId), REG_QK.sessions(eventId), REG_QK.results(eventId), REG_QK.operationLogs(eventId), ['eventCollaboration', eventId], ['eventCollaborations', eventId]);
      break;
    
    case 'event_publish_attempt':
    case 'event_published_mutual':
    case 'event_published':
      broad.push(['events'], ['eventCollaborations'], ['sessions'], ['results'], ['standings'], ['operationLogs']);
      if (eventId) exact.push(REG_QK.event(eventId), REG_QK.sessions(eventId), REG_QK.results(eventId), REG_QK.operationLogs(eventId), ['eventCollaborations', eventId]);
      break;

    case 'session_created':
    case 'session_updated':
    case 'session_deleted':
    case 'session_locked':
    case 'session_status_changed':
    case 'session_set_draft':
    case 'session_mark_provisional':
    case 'session_publish_official':
    case 'session_unlocked':
    case 'session_start':
    case 'session_end':
    case 'session_cancel':
      broad.push(['sessions'], ['session'], ['seasonCalendarSessions'], ['operationLogs'], ['rc_sessions']);
      if (eventId) exact.push(REG_QK.sessions(eventId), REG_QK.operationLogs(eventId));
      if (seriesId && seasonYear) exact.push(REG_QK.standings(seriesId, seasonYear));
      break;

    case 'operation_logged':
      broad.push(['operationLogs'], ['rc_results']);
      if (eventId) exact.push(REG_QK.operationLogs(eventId));
      // Also invalidate timeline queries
      if (eventId) exact.push(['operationLogs', eventId]);
      break;

    case 'red_flag':
      broad.push(['operationLogs']);
      if (eventId) exact.push(REG_QK.operationLogs(eventId));
      break;

    case 'results_saved':
    case 'results_updated':
    case 'results_published':
    case 'results_published_provisional':
    case 'results_saved_draft':
    case 'results_imported_csv':
      broad.push(['results'], ['seasonCalendarResults'], ['sessions'], ['operationLogs']);
      if (eventId) exact.push(REG_QK.results(eventId), REG_QK.sessions(eventId), REG_QK.operationLogs(eventId));
      break;

    case 'results_published_official':
    case 'results_locked':
    case 'session_marked_provisional':
    case 'session_published_official':
    case 'session_locked':
    case 'standings_recalculated':
    case 'standings_published':
      broad.push(['results'], ['sessions'], ['standings'], ['operationLogs'], ['overview']);
      if (eventId) exact.push(REG_QK.results(eventId), REG_QK.sessions(eventId), REG_QK.operationLogs(eventId));
      if (seriesId && seasonYear) exact.push(REG_QK.standings(seriesId, seasonYear));
      if (eventId) exact.push(['overview', eventId]);
      if (eventId) exact.push(['officialResults', eventId]);
      break;

    case 'event_class_created':
    case 'event_class_updated':
    case 'event_class_deleted':
      broad.push(['eventClasses'], ['entries'], ['sessions'], ['operationLogs']);
      if (eventId) exact.push(['eventClasses', eventId], REG_QK.entries(eventId), REG_QK.sessions(eventId));
      break;

    case 'entries_updated':
    case 'entry_created':
    case 'entry_updated':
    case 'entry_deleted':
    case 'entry_withdrawn':
    case 'entry_bulk_updated':
    case 'entry_bulk_transponder':
    case 'entry_bulk_class_change':
    case 'entry_bulk_withdraw':
    case 'entry_checked_in':
    case 'checkin_updated':
    case 'entry_tech_updated':
    case 'compliance_created':
    case 'compliance_updated':
    case 'compliance_resolved':
    case 'compliance_scanned':
    case 'compliance_fixed':
    case 'tech_updated':
    case 'tech_created':
    case 'tech_deleted':
    case 'waiver_verified':
    case 'payment_collected':
    case 'gate_checkin':
    case 'gate_override_checkin':
    case 'gate_verify':
    case 'gate_updated':
    case 'wristband_assigned':
      broad.push(['entries'], ['seasonCalendarEntries'], ['complianceFlags'], ['techInspections'], ['myEntry'], ['driverPrograms'], ['results'], ['standings'], ['events'], ['operationLogs']);
      if (eventId) exact.push(REG_QK.entries(eventId), REG_QK.driverPrograms(eventId), REG_QK.operationLogs(eventId));
      if (eventId) exact.push(['complianceFlags', eventId], ['techInspections', eventId]);
      break;

    case 'driver_updated':
    case 'driver_created':
      broad.push(['drivers'], ['myDriver']);
      break;

    case 'tech_updated':
      broad.push(['entries'], ['myEntry'], ['operationLogs']);
      if (eventId) exact.push(REG_QK.entries(eventId), REG_QK.operationLogs(eventId));
      break;

    case 'standings_recalculated':
    case 'standings_updated':
       broad.push(['standings'], ['results'], ['sessions'], ['driverPrograms'], ['series'], ['events'], ['entries'], ['operationLogs']);
       if (seriesId && seasonYear) exact.push(REG_QK.standings(seriesId, seasonYear));
       if (eventId) exact.push(REG_QK.operationLogs(eventId), REG_QK.results(eventId), REG_QK.sessions(eventId), REG_QK.entries(eventId));
       break;

    case 'points_config_updated':
    case 'points_config_created':
    case 'points_ruleset_updated':
    case 'points_ruleset_created':
       broad.push(['pointsConfig'], ['pointsRuleSets'], ['standings'], ['operationLogs']);
       if (seriesId) exact.push(['pointsConfig', seriesId]);
       if (seriesId && seasonYear) exact.push(REG_QK.standings(seriesId, seasonYear));
       if (seriesId) exact.push(REG_QK.standings(seriesId, seasonYear || 'any'));
       break;
    
    case 'standings_recalculated':
       broad.push(['standings'], ['drivers'], ['events'], ['operationLogs']);
       if (eventId) exact.push(REG_QK.event(eventId), REG_QK.operationLogs(eventId));
       if (seriesId && seasonYear) exact.push(REG_QK.standings(seriesId, seasonYear));
       break;

    case 'import_completed':
      broad.push(['results'], ['sessions'], ['entries'], ['operationLogs']);
      if (eventId) exact.push(REG_QK.results(eventId), REG_QK.sessions(eventId), REG_QK.entries(eventId), REG_QK.operationLogs(eventId));
      break;

    case 'export_completed':
      broad.push(['operationLogs']);
      if (eventId) exact.push(REG_QK.operationLogs(eventId));
      break;

    case 'gate_updated':
      broad.push(['entries'], ['operationLogs'], ['driverPrograms']);
      if (eventId) exact.push(REG_QK.entries(eventId), REG_QK.operationLogs(eventId), REG_QK.driverPrograms(eventId));
      break;

    case 'announcer_updated':
      broad.push(['sessions'], ['results'], ['drivers'], ['teams'], ['entries'], ['operationLogs']);
      if (eventId) exact.push(REG_QK.sessions(eventId), REG_QK.results(eventId), REG_QK.entries(eventId), REG_QK.operationLogs(eventId));
      break;

    case 'gate_updated':
      broad.push(['entries'], ['drivers'], ['eventClasses'], ['operationLogs']);
      if (eventId) exact.push(REG_QK.entries(eventId), REG_QK.operationLogs(eventId));
      break;

    case 'race_control_override':
    case 'race_control_incident':
    case 'red_flag':
      broad.push(['sessions'], ['results'], ['standings'], ['operationLogs']);
      if (eventId) exact.push(REG_QK.sessions(eventId), REG_QK.results(eventId), REG_QK.operationLogs(eventId));
      if (seriesId && seasonYear) exact.push(REG_QK.standings(seriesId, seasonYear));
      break;

    case 'integration_sync_completed':
    case 'sync_completed':
    case 'sync_failed':
      broad.push(['results'], ['sessions'], ['operationLogs']);
      if (eventId) exact.push(REG_QK.results(eventId), REG_QK.sessions(eventId), REG_QK.operationLogs(eventId));
      break;

    default:
      console.warn(`[invalidateAfterOperation] Unknown operationType: "${operationType}"`);
      // Broad fallback
      broad.push(['events'], ['sessions'], ['results'], ['entries'], ['standings'], ['operationLogs'],
                 ['reg']); // catches all REG_QK keys
      break;
  }

  return { exact, broad };
}

/**
 * Factory: given a queryClient, returns an invalidateAfterOperation function.
 *
 * @param {object} queryClient
 * @returns {function(operationType: string, payload?: object): void}
 */
export function buildInvalidateAfterOperation(queryClient) {
  return function invalidateAfterOperation(operationType, payload = {}) {
    const { exact, broad } = getKeysForOperation(operationType, payload);

    // Invalidate exact targeted keys first (no prefix matching needed)
    exact.forEach((queryKey) => {
      queryClient.invalidateQueries({ queryKey, exact: true });
    });

    // Invalidate broad prefix keys for backward compat
    broad.forEach((queryKey) => {
      queryClient.invalidateQueries({ queryKey });
    });
  };
}

// Legacy export for any file still importing INVALIDATION_MAP
export const INVALIDATION_MAP = {};