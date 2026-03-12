/**
 * upsertEventClass.js
 *
 * Safe idempotent upsert for an EventClass row.
 * Normalizes class name for deduplication.
 *
 * Input:  { payload, source_path? }
 * Output: { action: 'created'|'updated', record }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function normalizeName(name) {
  if (!name) return '';
  return name.toLowerCase().replace(/[^\w\s]/g, '').trim();
}

function buildNormalizedEventClassKey(event_id, class_name) {
  if (!event_id || !class_name) return null;
  return `event_class:${event_id}:${normalizeName(class_name)}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { payload = {}, source_path = 'unknown' } = body;

    if (!payload.event_id || !payload.class_name) {
      return Response.json({ error: 'payload.event_id and payload.class_name are required' }, { status: 400 });
    }

    const normalizedKey = buildNormalizedEventClassKey(payload.event_id, payload.class_name);

    // 1. Check by normalized_event_class_key (strongest)
    let existing = null;
    let matchMethod = 'none';

    if (normalizedKey) {
      const byNormalizedKey = await base44.asServiceRole.entities.EventClass.filter({ normalized_event_class_key: normalizedKey }).catch(() => []);
      if (byNormalizedKey?.length) {
        existing = byNormalizedKey[0];
        matchMethod = 'normalized_event_class_key';
      }
    }

    // 2. Fallback: event_id + normalized name match
    if (!existing) {
      const all = await base44.asServiceRole.entities.EventClass.filter({ event_id: payload.event_id }).catch(() => []);
      const normTarget = normalizeName(payload.class_name);
      const matches = all.filter(c => normalizeName(c.class_name) === normTarget && c.class_status !== 'Closed');
      if (matches.length === 1) {
        existing = matches[0];
        matchMethod = 'event_id_normalized_name';
      } else if (matches.length > 1) {
        existing = matches[0];
        matchMethod = 'event_id_normalized_name_ambiguous';
      }
    }

    const { id: _id, ...cleanPayload } = payload;
    const dataWithKey = { ...cleanPayload, normalized_event_class_key: normalizedKey };
    let record, action;

    if (existing) {
      record = await base44.asServiceRole.entities.EventClass.update(existing.id, dataWithKey);
      action = 'updated';
    } else {
      record = await base44.asServiceRole.entities.EventClass.create(dataWithKey);
      action = 'created';
    }

    await base44.asServiceRole.entities.OperationLog.create({
      operation_type: action === 'created' ? 'class_record_created' : 'class_record_updated',
      entity_name: 'EventClass',
      entity_id: record.id,
      status: 'success',
      metadata: { entity_type: 'event_class', source_path, normalized_event_class_key: normalizedKey, matched_by: matchMethod },
    }).catch(() => {});

    return Response.json({ action, record, normalized_key: normalizedKey, match_method: matchMethod });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});