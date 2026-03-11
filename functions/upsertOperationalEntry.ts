/**
 * upsertOperationalEntry.js
 *
 * Safe idempotent upsert for an Entry row.
 * Builds a stable identity key and updates the existing row if found,
 * creates a new one only if no match exists.
 *
 * Input:  { payload, source_path? }
 * Output: { action: 'created'|'updated', record }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function normalizeClassName(name) {
  return (name || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

function buildEntryKey(event_id, driver_id, class_id) {
  return `entry:${event_id || 'none'}:${driver_id || 'none'}:${class_id || 'none'}`;
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

    // Use event_class_id preferentially, fallback to series_class_id
    const class_id = payload.event_class_id || payload.series_class_id || null;
    const identityKey = buildEntryKey(payload.event_id, payload.driver_id, class_id);

    // 1. Check by stored identity key
    let existing = null;
    let matchMethod = 'none';

    const byKey = await base44.asServiceRole.entities.Entry.filter({ entry_identity_key: identityKey }).catch(() => []);
    if (byKey?.length) {
      existing = byKey[0];
      matchMethod = 'identity_key';
      if (byKey.length > 1) {
        await base44.asServiceRole.entities.OperationLog.create({
          operation_type: 'operational_duplicate_detected',
          entity_name: 'Entry',
          status: 'success',
          metadata: { entity_type: 'entry', source_path, entry_identity_key: identityKey, count: byKey.length },
        }).catch(() => {});
      }
    }

    // 2. Fallback: composite lookup (driver + event + class)
    if (!existing) {
      const filters = { event_id: payload.event_id, driver_id: payload.driver_id };
      if (class_id) {
        if (payload.event_class_id) filters.event_class_id = payload.event_class_id;
        else if (payload.series_class_id) filters.series_class_id = payload.series_class_id;
      }
      const fallback = await base44.asServiceRole.entities.Entry.filter(filters).catch(() => []);
      if (fallback?.length === 1) {
        existing = fallback[0];
        matchMethod = 'fallback_composite';
      } else if (fallback?.length > 1) {
        await base44.asServiceRole.entities.OperationLog.create({
          operation_type: 'operational_duplicate_detected',
          entity_name: 'Entry',
          status: 'success',
          metadata: { entity_type: 'entry', source_path, count: fallback.length, match: 'composite_ambiguous' },
        }).catch(() => {});
        // Use most complete
        existing = fallback.sort((a, b) => {
          const score = r => (r.entry_identity_key ? 4 : 0) + (r.entry_status === 'Checked In' || r.entry_status === 'Teched' ? 2 : 0) + (r.transponder_id ? 1 : 0);
          return score(b) - score(a);
        })[0];
        matchMethod = 'fallback_ambiguous_best';
      }
    }

    const { id: _id, ...cleanPayload } = payload;
    const dataWithKey = { ...cleanPayload, entry_identity_key: identityKey };
    let record, action;

    if (existing) {
      record = await base44.asServiceRole.entities.Entry.update(existing.id, dataWithKey);
      action = 'updated';
    } else {
      record = await base44.asServiceRole.entities.Entry.create(dataWithKey);
      action = 'created';
    }

    await base44.asServiceRole.entities.OperationLog.create({
      operation_type: action === 'created' ? 'operational_entry_created' : 'operational_entry_updated',
      entity_name: 'Entry',
      entity_id: record.id,
      event_id: record.event_id,
      status: 'success',
      metadata: { entity_type: 'entry', source_path, entry_identity_key: identityKey, matched_by: matchMethod },
    }).catch(() => {});

    return Response.json({ action, record, identity_key: identityKey, match_method: matchMethod });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});