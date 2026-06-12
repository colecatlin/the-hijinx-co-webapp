/**
 * upsertOperationalResult.js
 *
 * Safe idempotent upsert for a single Result row.
 * Builds a stable identity key and updates the existing row if found,
 * creates a new one only if no match exists.
 *
 * R8Z Part 1D: Backend is now the authority for session metadata normalization.
 * When session_id is present, fetches the parent Session and merges:
 *   event_day_id, points_enabled, points_type, points_rule, round_number
 * Also normalizes Feature → Final for session_type.
 *
 * Input:  { payload, source_path? }
 * Output: { action: 'created'|'updated', record }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Valid session_type values for the Results entity (Feature is NOT in Results enum)
const VALID_RESULT_SESSION_TYPES = new Set(['Practice', 'Qualifying', 'Heat', 'LCQ', 'Final']);

/**
 * Normalize session_type for Results: Feature → Final.
 * Returns a value safe for the Results.session_type enum.
 */
function normalizeResultSessionType(sessionType) {
  if (!sessionType) return undefined;
  if (sessionType === 'Feature') return 'Final';
  if (VALID_RESULT_SESSION_TYPES.has(sessionType)) return sessionType;
  return undefined; // unknown type — omit, do not write invalid enum value
}

/**
 * Merge session competition metadata into the result payload.
 * Session is the authority. Payload values are overridden by session metadata
 * to enforce consistency. Only skips if session field is null/undefined (not set on session).
 */
function mergeSessionMetadata(payload, session) {
  const merged = { ...payload };

  // session_type: normalize Feature → Final; use session value as authority
  const normalizedType = normalizeResultSessionType(session.session_type);
  if (normalizedType) merged.session_type = normalizedType;

  // event_day_id: copy if session has it
  if (session.event_day_id != null) merged.event_day_id = session.event_day_id;

  // points_enabled: session is authority; default false
  merged.points_enabled = session.points_enabled === true;

  // points_type: session is authority; default 'none'
  merged.points_type = session.points_type || 'none';

  // points_rule: copy if session has it
  if (session.points_rule != null) merged.points_rule = session.points_rule;

  // round_number: only meaningful for final points; enforce null for non-final
  if (merged.points_type === 'final') {
    merged.round_number = session.round_number ?? null;
  } else {
    merged.round_number = null;
  }

  return merged;
}

function normalizeName(name) {
  if (!name) return '';
  return name.toLowerCase().replace(/[^\w\s]/g, '').trim();
}

function buildNormalizedResultKey(session_id, driver_id, driver_name) {
  if (!session_id) return null;
  if (driver_id) return `result:${session_id}:${driver_id}`;
  if (driver_name) return `result:${session_id}:${normalizeName(driver_name)}`;
  return null;
}

async function isEventCollaborator(base44, userId, eventId, seriesId, trackId) {
  const collabs = await base44.asServiceRole.entities.EntityCollaborator.filter({ user_id: userId }).catch(() => []);
  const allowed = new Set(['owner', 'editor']);
  return collabs.some(c =>
    allowed.has(c.role) && (
      (c.entity_type === 'Event'  && c.entity_id === eventId) ||
      (c.entity_type === 'Series' && seriesId && c.entity_id === seriesId) ||
      (c.entity_type === 'Track'  && trackId  && c.entity_id === trackId)
    )
  );
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { payload = {}, source_path = 'unknown' } = body;

    if (!payload.driver_id || !payload.event_id) {
      return Response.json({ error: 'payload.driver_id and payload.event_id are required' }, { status: 400 });
    }
    if (!payload.session_id) {
      return Response.json({ error: 'payload.session_id is required — do not create results without a session', status: 400 }, { status: 400 });
    }

    // Authorization: admin, or event/series collaborator
    if (user.role !== 'admin') {
      const event = await base44.asServiceRole.entities.Event.filter({ id: payload.event_id }).then(r => r?.[0]).catch(() => null);
      const allowed = await isEventCollaborator(base44, user.id, payload.event_id, event?.series_id || null, event?.track_id || null);
      if (!allowed) {
        return Response.json({ error: 'Forbidden: must be admin or event/series collaborator' }, { status: 403 });
      }
    }

    // R8Z Part 1D: Fetch parent Session and merge metadata into payload
    let enrichedPayload = { ...payload };
    try {
      const sessions = await base44.asServiceRole.entities.Session.filter({ id: payload.session_id }).catch(() => []);
      const session = sessions?.[0];
      if (session) {
        enrichedPayload = mergeSessionMetadata(enrichedPayload, session);
      }
    } catch {
      // Non-fatal: if session lookup fails, proceed with caller payload
    }

    const normalizedKey = buildNormalizedResultKey(enrichedPayload.session_id, enrichedPayload.driver_id, enrichedPayload.driver_name);

    // 1. Check by normalized_result_key (strongest, includes session context)
    let existing = null;
    let matchMethod = 'none';

    if (normalizedKey) {
      const byNormalizedKey = await base44.asServiceRole.entities.Results.filter({ normalized_result_key: normalizedKey }).catch(() => []);
      if (byNormalizedKey?.length) {
        existing = byNormalizedKey[0];
        matchMethod = 'normalized_result_key';
        if (byNormalizedKey.length > 1) {
          await base44.asServiceRole.entities.OperationLog.create({
            operation_type: 'operational_duplicate_detected',
            entity_name: 'Results',
            status: 'success',
            metadata: { entity_type: 'results', source_path, normalized_result_key: normalizedKey, count: byNormalizedKey.length },
          }).catch(() => {});
        }
      }
    }

    // 2. Fallback: session_id + driver_id
    if (!existing && payload.driver_id) {
      const byComposite = await base44.asServiceRole.entities.Results.filter({
        session_id: payload.session_id,
        driver_id: payload.driver_id,
      }).catch(() => []);
      if (byComposite?.length === 1) {
        existing = byComposite[0];
        matchMethod = 'session_driver_id';
      } else if (byComposite?.length > 1) {
        await base44.asServiceRole.entities.OperationLog.create({
          operation_type: 'operational_duplicate_detected',
          entity_name: 'Results',
          status: 'success',
          metadata: { entity_type: 'results', source_path, session_id: payload.session_id, driver_id: payload.driver_id, count: byComposite.length },
        }).catch(() => {});
        existing = byComposite.sort((a, b) => {
          const score = r => (r.normalized_result_key ? 2 : 0) + (r.points != null ? 1 : 0) + (r.position != null ? 1 : 0);
          return score(b) - score(a);
        })[0];
        matchMethod = 'session_driver_ambiguous';
      }
    }

    // 3. Fallback: session_id + normalized_driver_name
    if (!existing && payload.driver_name) {
      const normDriverName = normalizeName(payload.driver_name);
      if (normDriverName) {
        const byName = await base44.asServiceRole.entities.Results.filter({
          session_id: payload.session_id,
          driver_name: payload.driver_name,
        }).catch(() => []);
        if (byName?.length === 1) {
          existing = byName[0];
          matchMethod = 'session_driver_name';
        }
      }
    }

    const { id: _id, ...cleanPayload } = enrichedPayload;
    const dataWithKey = { ...cleanPayload, normalized_result_key: normalizedKey };
    let record, action;

    if (existing) {
      record = await base44.asServiceRole.entities.Results.update(existing.id, dataWithKey);
      action = 'updated';
    } else {
      record = await base44.asServiceRole.entities.Results.create(dataWithKey);
      action = 'created';
    }

    await base44.asServiceRole.entities.OperationLog.create({
      operation_type: action === 'created' ? 'operational_result_created' : 'operational_result_updated',
      entity_name: 'Results',
      entity_id: record.id,
      status: 'success',
      metadata: { entity_type: 'results', source_path, normalized_result_key: normalizedKey, matched_by: matchMethod },
    }).catch(() => {});

    // R9DC Phase 5: AuditLog for governance — result create/edit
    base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'Results',
      entity_id: record.id,
      entity_name: `Result — session:${record.session_id} driver:${record.driver_id}`,
      action: action === 'created' ? 'created' : 'updated',
      performed_by: user.id,
      performed_by_name: user.full_name || user.email || user.id,
      timestamp: new Date().toISOString(),
      after_data: {
        position: record.position,
        status: record.status,
        points: record.points,
        status_state: record.status_state,
        session_id: record.session_id,
      },
      event_id: record.event_id || null,
      notes: `source_path: ${source_path}`,
    }).catch(() => {});

    return Response.json({ action, record, normalized_key: normalizedKey, match_method: matchMethod });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});