/**
 * findDuplicateSeriesGroups.js
 *
 * Groups Series records into duplicate sets using three match dimensions:
 *   1. external_uid exact
 *   2. canonical_key exact
 *   3. normalized_name fallback
 *
 * Skips records already marked as DUPLICATE_OF (already handled).
 *
 * Input:  {} (no params)
 * Output: { total_series, duplicate_groups: [{
 *   match_type, key, count, record_ids, names, created_dates,
 *   statuses, external_uids, canonical_keys
 * }] }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function normalizeName(value) {
  if (!value) return '';
  return value.trim().toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const allSeries = await base44.asServiceRole.entities.Series.list('-created_date', 3000);

    // Skip records already explicitly marked as duplicates
    const candidates = allSeries.filter(s =>
      !s.canonical_key?.includes('DUPLICATE_OF') &&
      !(s.notes || '').includes('DUPLICATE_OF')
    );

    const byExternalUid  = new Map();
    const byCanonicalKey = new Map();
    const byNormName     = new Map();

    for (const s of candidates) {
      if (s.external_uid) {
        const arr = byExternalUid.get(s.external_uid) || [];
        arr.push(s);
        byExternalUid.set(s.external_uid, arr);
      }

      if (s.canonical_key && !s.canonical_key.includes('DUPLICATE')) {
        const arr = byCanonicalKey.get(s.canonical_key) || [];
        arr.push(s);
        byCanonicalKey.set(s.canonical_key, arr);
      }

      const norm = s.normalized_name || normalizeName(s.name || s.full_name || '');
      if (norm) {
        const arr = byNormName.get(norm) || [];
        arr.push(s);
        byNormName.set(norm, arr);
      }
    }

    // Collect unique groups — dedup across dimensions by tracking processed IDs
    const processedIds = new Set();
    const groups = [];

    function addGroup(match_type, key, records) {
      // Only include records not already assigned to a group in an earlier dimension
      const fresh = records.filter(r => !processedIds.has(r.id));
      if (fresh.length < 2) return;
      groups.push({
        match_type,
        key,
        count: fresh.length,
        record_ids:    fresh.map(r => r.id),
        names:         fresh.map(r => r.name || ''),
        created_dates: fresh.map(r => r.created_date || null),
        statuses:      fresh.map(r => r.status || 'Unknown'),
        external_uids: fresh.map(r => r.external_uid || null),
        canonical_keys: fresh.map(r => r.canonical_key || null),
        normalized_names: fresh.map(r => r.normalized_name || null),
        event_counts:  null, // populated on demand by repair step
      });
      fresh.forEach(r => processedIds.add(r.id));
    }

    for (const [key, grp] of byExternalUid) {
      if (grp.length > 1) addGroup('external_uid', key, grp);
    }
    for (const [key, grp] of byCanonicalKey) {
      if (grp.length > 1) addGroup('canonical_key', key, grp);
    }
    for (const [key, grp] of byNormName) {
      if (grp.length > 1) addGroup('normalized_name', key, grp);
    }

    return Response.json({
      success: true,
      total_series: allSeries.length,
      candidates_checked: candidates.length,
      duplicate_groups: groups,
      generated_at: new Date().toISOString(),
    });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});