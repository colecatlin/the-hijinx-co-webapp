/**
 * upsertOperationalResult.js
 *
 * Safe idempotent upsert for a single Result row.
 * Builds a stable identity key and updates the existing row if found,
 * creates a new one only if no match exists.
 *
 * Input:  { payload, source_path? }
 * Output: { action: 'created'|'updated', record }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function buildResultIdentityKey(event_id, session_id, driver_id) {
  return `result:${event_id || 'none'}:${session_id || 'none'}:${driver_id || 'none'}`;
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

    const identityKey = buildResultIdentityKey(payload.event_id, payload.session_id, payload.driver_id);

    // 1. Check by stored identity key
    let existing = null;
    let matchMethod = 'none';

    const byKey = await base44.asServiceRole.entities.Results.filter({ result_identity_key: identityKey }).catch(() => []);
    if (byKey?.length) {
      existing = byKey[0];
      matchMethod = 'identity_key';
      if (byKey.length > 1) {
        // Multiple matches — warn but use first
        await base44.asServiceRole.entities.OperationLog.create({
          operation_type: 'operational_duplicate_detected',
          entity_name: 'Results',
          status: 'success',
          metadata: { entity_type: 'results', source_path, result_identity_key: identityKey, count: byKey.length },
        }).catch(() => {});
      }
    }

    // 2. Fallback: composite lookup (handles pre-backfill rows)
    if (!existing) {
      const fallback = await base44.asServiceRole.entities.Results.filter({
        event_id: payload.event_id,
        session_id: payload.session_id,
        driver_id: payload.driver_id,
      }).catch(() => []);
      if (fallback?.length === 1) {
        existing = fallback[0];
        matchMethod = 'fallback_composite';
      } else if (fallback?.length > 1) {
        await base44.asServiceRole.entities.OperationLog.create({
          operation_type: 'operational_duplicate_detected',
          entity_name: 'Results',
          status: 'success',
          metadata: { entity_type: 'results', source_path, count: fallback.length, match: 'composite_ambiguous' },
        }).catch(() => {});
        // Use the one with most data
        existing = fallback.sort((a, b) => {
          const score = r => (r.result_identity_key ? 2 : 0) + (r.points != null ? 1 : 0) + (r.position != null ? 1 : 0);
          return score(b) - score(a);
        })[0];
        matchMethod = 'fallback_ambiguous_best';
      }
    }

    const { id: _id, ...cleanPayload } = payload;
    const dataWithKey = { ...cleanPayload, result_identity_key: identityKey };
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
      metadata: { entity_type: 'results', source_path, result_identity_key: identityKey, matched_by: matchMethod },
    }).catch(() => {});

    return Response.json({ action, record, identity_key: identityKey, match_method: matchMethod });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});