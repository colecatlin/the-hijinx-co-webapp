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

    const normalizedKey = buildNormalizedResultKey(payload.session_id, payload.driver_id, payload.driver_name);

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

    const { id: _id, ...cleanPayload } = payload;
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

    return Response.json({ action, record, normalized_key: normalizedKey, match_method: matchMethod });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});