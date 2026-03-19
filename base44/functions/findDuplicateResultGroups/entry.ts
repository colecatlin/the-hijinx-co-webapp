/**
 * findDuplicateResultGroups.js
 *
 * Groups Results by identity key and composite fallback to detect duplicates.
 * Input: {}
 * Output: { duplicate_groups, total_results, total_missing_key }
 * Admin only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function buildKey(event_id, session_id, driver_id) {
  return `result:${event_id || 'none'}:${session_id || 'none'}:${driver_id || 'none'}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const allResults = await base44.asServiceRole.entities.Results.list('-created_date', 10000);

    const byStoredKey   = new Map();
    const byComposite   = new Map();
    let missingKeyCount = 0;

    for (const r of allResults) {
      if (r.notes?.includes('DUPLICATE_OF:')) continue;

      if (r.result_identity_key) {
        const a = byStoredKey.get(r.result_identity_key) || []; a.push(r); byStoredKey.set(r.result_identity_key, a);
      } else {
        missingKeyCount++;
        if (r.event_id && r.driver_id) {
          const k = buildKey(r.event_id, r.session_id, r.driver_id);
          const a = byComposite.get(k) || []; a.push(r); byComposite.set(k, a);
        }
      }
    }

    const processedIds = new Set();
    const duplicate_groups = [];

    for (const [key, group] of byStoredKey) {
      if (group.length > 1) {
        const unique = group.filter(r => !processedIds.has(r.id));
        if (unique.length > 1) {
          duplicate_groups.push({
            key,
            match_type: 'identity_key',
            result_ids: unique.map(r => r.id),
            event_id: unique[0].event_id,
            session_id: unique[0].session_id,
            driver_id: unique[0].driver_id,
            count: unique.length,
          });
          unique.forEach(r => processedIds.add(r.id));
        }
      }
    }
    for (const [key, group] of byComposite) {
      if (group.length > 1) {
        const unique = group.filter(r => !processedIds.has(r.id));
        if (unique.length > 1) {
          duplicate_groups.push({
            key,
            match_type: 'composite_fallback',
            result_ids: unique.map(r => r.id),
            event_id: unique[0].event_id,
            session_id: unique[0].session_id,
            driver_id: unique[0].driver_id,
            count: unique.length,
          });
          unique.forEach(r => processedIds.add(r.id));
        }
      }
    }

    return Response.json({ duplicate_groups, total_results: allResults.length, total_missing_key: missingKeyCount });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});