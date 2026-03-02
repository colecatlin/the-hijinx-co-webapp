/**
 * operationLogger.js
 * Shared operation logging helper for RegistrationDashboard.
 * Always swallows errors — never blocks user workflows.
 */
import { base44 } from '@/api/base44Client';

/**
 * Returns a logOperation function bound to base44.
 * Usage:
 *   const { logOperation } = buildOperationLogger(base44);
 *   await logOperation({ operation_type, status, entity_name, ... });
 */
export function buildOperationLogger() {
  const hasOpLog = !!(base44?.entities?.OperationLog);

  async function logOperation({
    operation_type,
    status = 'success',
    entity_name,
    entity_id,
    event_id,
    series_id,
    track_id,
    season_year,
    message,
    meta_json,
  }) {
    if (!hasOpLog) return null;

    try {
      const record = {
        operation_type,
        status,
        entity_name,
      };
      if (entity_id)   record.entity_id   = entity_id;
      if (event_id)    record.event_id    = event_id;
      if (series_id)   record.series_id   = series_id;
      if (track_id)    record.track_id    = track_id;
      if (season_year) record.season_year = season_year;
      if (message)     record.message     = message;
      if (meta_json)   record.meta_json   = JSON.stringify(meta_json);

      return await base44.asServiceRole.entities.OperationLog.create(record);
    } catch (e) {
      // Never bubble logger errors
      console.warn('[operationLogger] swallowed error:', e?.message);
      return null;
    }
  }

  return { logOperation };
}

/** Singleton-style: build once and export for convenience */
export const { logOperation } = buildOperationLogger();