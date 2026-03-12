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

function normalizeName(name) {
  if (!name) return '';
  return name.toLowerCase().replace(/[^\w\s]/g, '').trim();
}

function buildNormalizedEntryKey(event_id, driver_id, driver_name, class_id) {
  if (!event_id) return null;
  const classPart = class_id || 'none';
  if (driver_id) return `entry:${event_id}:${driver_id}:${classPart}`;
  if (driver_name) return `entry:${event_id}:${normalizeName(driver_name)}:${classPart}`;
  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { payload = {}, source_path = 'unknown' } = body;

    if (!payload.event_id) {
      return Response.json({ error: 'payload.event_id is required' }, { status: 400 });
    }

    // Use event_class_id preferentially, fallback to series_class_id
    const class_id = payload.event_class_id || payload.series_class_id || null;
    const normalizedKey = buildNormalizedEntryKey(payload.event_id, payload.driver_id, payload.driver_name, class_id);

    // 1. Check by normalized_entry_key (strongest, includes event + driver context)
    let existing = null;
    let matchMethod = 'none';

    if (normalizedKey) {
      const byNormalizedKey = await base44.asServiceRole.entities.Entry.filter({ normalized_entry_key: normalizedKey }).catch(() => []);
      if (byNormalizedKey?.length) {
        existing = byNormalizedKey[0];
        matchMethod = 'normalized_entry_key';
        if (byNormalizedKey.length > 1) {
          await base44.asServiceRole.entities.OperationLog.create({
            operation_type: 'operational_duplicate_detected',
            entity_name: 'Entry',
            status: 'success',
            metadata: { entity_type: 'entry', source_path, normalized_entry_key: normalizedKey, count: byNormalizedKey.length },
          }).catch(() => {});
        }
      }
    }

    // 2. Fallback: event_id + driver_id + class_id
    if (!existing && payload.driver_id) {
      const filters = { event_id: payload.event_id, driver_id: payload.driver_id };
      if (class_id) {
        if (payload.event_class_id) filters.event_class_id = payload.event_class_id;
        else if (payload.series_class_id) filters.series_class_id = payload.series_class_id;
      }
      const byComposite = await base44.asServiceRole.entities.Entry.filter(filters).catch(() => []);
      if (byComposite?.length === 1) {
        existing = byComposite[0];
        matchMethod = 'event_driver_class';
      } else if (byComposite?.length > 1) {
        await base44.asServiceRole.entities.OperationLog.create({
          operation_type: 'operational_duplicate_detected',
          entity_name: 'Entry',
          status: 'success',
          metadata: { entity_type: 'entry', source_path, event_id: payload.event_id, driver_id: payload.driver_id, count: byComposite.length },
        }).catch(() => {});
        existing = byComposite.sort((a, b) => {
          const score = r => (r.normalized_entry_key ? 4 : 0) + (r.entry_status === 'Checked In' || r.entry_status === 'Teched' ? 2 : 0) + (r.transponder_id ? 1 : 0);
          return score(b) - score(a);
        })[0];
        matchMethod = 'event_driver_class_ambiguous';
      }
    }

    // 3. Fallback: event_id + normalized_driver_name + class_id
    if (!existing && payload.driver_name) {
      const normDriverName = normalizeName(payload.driver_name);
      if (normDriverName) {
        const filters = { event_id: payload.event_id, driver_name: payload.driver_name };
        if (class_id) {
          if (payload.event_class_id) filters.event_class_id = payload.event_class_id;
          else if (payload.series_class_id) filters.series_class_id = payload.series_class_id;
        }
        const byName = await base44.asServiceRole.entities.Entry.filter(filters).catch(() => []);
        if (byName?.length === 1) {
          existing = byName[0];
          matchMethod = 'event_driver_name_class';
        }
      }
    }

    const { id: _id, ...cleanPayload } = payload;
    const dataWithKey = { ...cleanPayload, normalized_entry_key: normalizedKey };
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
      metadata: { entity_type: 'entry', source_path, normalized_entry_key: normalizedKey, matched_by: matchMethod },
    }).catch(() => {});

    return Response.json({ action, record, normalized_key: normalizedKey, match_method: matchMethod });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});