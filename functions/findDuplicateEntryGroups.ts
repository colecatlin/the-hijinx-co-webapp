/**
 * findDuplicateEntryGroups.js
 *
 * Groups Entries by identity key and composite fallback to detect duplicates.
 * Input: {}
 * Output: { duplicate_groups, total_entries, total_missing_key }
 * Admin only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function buildKey(event_id, driver_id, class_id) {
  return `entry:${event_id || 'none'}:${driver_id || 'none'}:${class_id || 'none'}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const all = await base44.asServiceRole.entities.Entry.list('-created_date', 10000);

    const byStoredKey  = new Map();
    const byComposite  = new Map();
    let missingKeyCount = 0;

    for (const e of all) {
      if (e.notes?.includes('DUPLICATE_OF:') || e.entry_status === 'Withdrawn') continue;

      if (e.entry_identity_key) {
        const a = byStoredKey.get(e.entry_identity_key) || []; a.push(e); byStoredKey.set(e.entry_identity_key, a);
      } else {
        missingKeyCount++;
        if (e.event_id && e.driver_id) {
          const k = buildKey(e.event_id, e.driver_id, e.event_class_id || e.series_class_id || null);
          const a = byComposite.get(k) || []; a.push(e); byComposite.set(k, a);
        }
      }
    }

    const processedIds = new Set();
    const duplicate_groups = [];

    for (const [key, group] of byStoredKey) {
      if (group.length > 1) {
        const unique = group.filter(r => !processedIds.has(r.id));
        if (unique.length > 1) {
          duplicate_groups.push({ key, match_type: 'identity_key', entry_ids: unique.map(r => r.id), event_id: unique[0].event_id, driver_id: unique[0].driver_id, class_id: unique[0].event_class_id || unique[0].series_class_id || null, count: unique.length });
          unique.forEach(r => processedIds.add(r.id));
        }
      }
    }
    for (const [key, group] of byComposite) {
      if (group.length > 1) {
        const unique = group.filter(r => !processedIds.has(r.id));
        if (unique.length > 1) {
          duplicate_groups.push({ key, match_type: 'composite_fallback', entry_ids: unique.map(r => r.id), event_id: unique[0].event_id, driver_id: unique[0].driver_id, class_id: unique[0].event_class_id || unique[0].series_class_id || null, count: unique.length });
          unique.forEach(r => processedIds.add(r.id));
        }
      }
    }

    return Response.json({ duplicate_groups, total_entries: all.length, total_missing_key: missingKeyCount });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});