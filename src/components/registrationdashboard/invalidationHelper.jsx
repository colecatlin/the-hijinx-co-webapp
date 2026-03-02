/**
 * Centralized cache invalidation map for RegistrationDashboard.
 * Each operationType maps to an array of base query keys to invalidate.
 * React Query will match all queries whose key STARTS with each entry.
 */
export const INVALIDATION_MAP = {
  event_updated:                [['events'], ['event']],
  event_published:              [['events'], ['event'], ['operationLogs']],
  event_status_changed:         [['events'], ['event'], ['sessions'], ['operationLogs']],
  session_updated:              [['sessions'], ['session'], ['operationLogs']],
  session_status_changed:       [['sessions'], ['session'], ['results'], ['operationLogs']],
  results_saved:                [['results'], ['operationLogs']],
  results_published_provisional:[['results'], ['sessions'], ['operationLogs']],
  results_published_official:   [['results'], ['sessions'], ['standings'], ['operationLogs']],
  results_locked:               [['results'], ['sessions'], ['operationLogs']],
  standings_recalculated:       [['standings'], ['driver'], ['team'], ['series'], ['operationLogs']],
  entries_updated:              [['entries'], ['operationLogs']],
  checkin_updated:              [['entries'], ['operationLogs']],
  tech_updated:                 [['entries'], ['operationLogs']],
  compliance_updated:           [['entries'], ['operationLogs']],
  import_completed:             [['results'], ['sessions'], ['entries'], ['operationLogs']],
  export_completed:             [['operationLogs']],
  integration_sync_completed:   [['results'], ['sessions'], ['operationLogs']],
};

/**
 * Factory: given a queryClient, returns an invalidateAfterOperation function.
 * Usage:
 *   const invalidateAfterOperation = buildInvalidateAfterOperation(queryClient);
 *   invalidateAfterOperation('entries_updated', { eventId });
 *
 * @param {object} queryClient
 * @returns {function(operationType: string, payload?: object): void}
 */
export function buildInvalidateAfterOperation(queryClient) {
  return function invalidateAfterOperation(operationType, payload = {}) {
    const targets = INVALIDATION_MAP[operationType];
    if (!targets) {
      console.warn(`[invalidateAfterOperation] Unknown operationType: "${operationType}"`);
      return;
    }
    targets.forEach((queryKey) => {
      queryClient.invalidateQueries({ queryKey });
    });
  };
}