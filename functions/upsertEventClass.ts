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

function normalizeClassName(name) {
  return (name || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

function buildEventClassKey(event_id, class_name) {
  return `event_class:${event_id || 'none'}:${normalizeClassName(class_name)}`;
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

    const identityKey = buildEventClassKey(payload.event_id, payload.class_name);

    // 1. By stored identity key
    let existing = null;
    let matchMethod = 'none';

    const byKey = await base44.asServiceRole.entities.EventClass.filter({ event_class_identity_key: identityKey }).catch(() => []);
    if (byKey?.length) {
      existing = byKey[0];
      matchMethod = 'identity_key';
    }

    // 2. Fallback: event_id + normalized name match
    if (!existing) {
      const all = await base44.asServiceRole.entities.EventClass.filter({ event_id: payload.event_id }).catch(() => []);
      const normTarget = normalizeClassName(payload.class_name);
      const matches = all.filter(c => normalizeClassName(c.class_name) === normTarget && c.class_status !== 'Closed');
      if (matches.length === 1) {
        existing = matches[0];
        matchMethod = 'fallback_normalized_name';
      } else if (matches.length > 1) {
        existing = matches[0];
        matchMethod = 'fallback_ambiguous_first';
      }
    }

    const { id: _id, ...cleanPayload } = payload;
    const dataWithKey = { ...cleanPayload, event_class_identity_key: identityKey };
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
      metadata: { entity_type: 'event_class', source_path, event_class_identity_key: identityKey, matched_by: matchMethod },
    }).catch(() => {});

    return Response.json({ action, record, identity_key: identityKey, match_method: matchMethod });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});