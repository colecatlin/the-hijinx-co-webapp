/**
 * findDuplicateSeriesClassGroups.js
 *
 * Groups SeriesClass records by identity key and normalized name to detect duplicates.
 * Admin only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function normalizeClassName(name) {
  return (name || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

function buildKey(series_id, class_name) {
  return `series_class:${series_id || 'none'}:${normalizeClassName(class_name)}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const all = await base44.asServiceRole.entities.SeriesClass.list('-created_date', 5000);

    const byStoredKey  = new Map();
    const byComposite  = new Map();
    let missingKeyCount = 0;

    for (const c of all) {
      if (c.active === false) continue;
      if (c.series_class_identity_key) {
        const a = byStoredKey.get(c.series_class_identity_key) || []; a.push(c); byStoredKey.set(c.series_class_identity_key, a);
      } else {
        missingKeyCount++;
        if (c.series_id && c.class_name) {
          const k = buildKey(c.series_id, c.class_name);
          const a = byComposite.get(k) || []; a.push(c); byComposite.set(k, a);
        }
      }
    }

    const processedIds = new Set();
    const duplicate_groups = [];

    for (const [key, group] of byStoredKey) {
      if (group.length > 1) {
        const unique = group.filter(r => !processedIds.has(r.id));
        if (unique.length > 1) {
          duplicate_groups.push({ key, match_type: 'identity_key', class_ids: unique.map(r => r.id), class_names: unique.map(r => r.class_name), series_id: unique[0].series_id, count: unique.length });
          unique.forEach(r => processedIds.add(r.id));
        }
      }
    }
    for (const [key, group] of byComposite) {
      if (group.length > 1) {
        const unique = group.filter(r => !processedIds.has(r.id));
        if (unique.length > 1) {
          duplicate_groups.push({ key, match_type: 'composite_fallback', class_ids: unique.map(r => r.id), class_names: unique.map(r => r.class_name), series_id: unique[0].series_id, count: unique.length });
          unique.forEach(r => processedIds.add(r.id));
        }
      }
    }

    return Response.json({ duplicate_groups, total_series_classes: all.length, total_missing_key: missingKeyCount });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});