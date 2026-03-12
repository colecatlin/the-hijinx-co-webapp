/**
 * findDuplicateDriverGroups.js
 *
 * Groups Driver records into duplicate sets using five match dimensions:
 *   1. external_uid exact
 *   2. canonical_key exact
 *   3. normalized_name + date_of_birth (strong positional match)
 *   4. normalized_name + primary_number (useful when DOB unavailable)
 *   5. normalized_name only (weakest — flagged separately)
 *
 * Skips records already marked DUPLICATE_OF.
 *
 * Input:  {} (no params)
 * Output: {
 *   total_drivers, candidates_checked, duplicate_groups: [{
 *     match_type, key, count, record_ids, names, created_dates,
 *     teams, car_numbers, external_uids, canonical_keys
 *   }]
 * }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function normalizeName(value) {
  if (!value) return '';
  return value.trim().toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}
function driverFullName(d) {
  return `${d.first_name || ''} ${d.last_name || ''}`.trim();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const allDrivers = await base44.asServiceRole.entities.Driver.list('-created_date', 5000);

    // Skip records already explicitly marked as duplicates
    const candidates = allDrivers.filter(d =>
      !d.canonical_key?.includes('DUPLICATE_OF') &&
      !(d.notes || '').includes('DUPLICATE_OF')
    );

    const byExternalUid  = new Map();
    const byCanonicalKey = new Map();
    const byNormDob      = new Map();
    const byNormNum      = new Map();
    const byNormName     = new Map();

    for (const d of candidates) {
      if (d.external_uid) {
        const a = byExternalUid.get(d.external_uid) || []; a.push(d); byExternalUid.set(d.external_uid, a);
      }
      if (d.canonical_key && !d.canonical_key.includes('DUPLICATE')) {
        const a = byCanonicalKey.get(d.canonical_key) || []; a.push(d); byCanonicalKey.set(d.canonical_key, a);
      }
      const norm = d.normalized_name || normalizeName(driverFullName(d));
      if (norm) {
        if (d.date_of_birth) {
          const k = `${norm}:dob:${d.date_of_birth}`;
          const a = byNormDob.get(k) || []; a.push(d); byNormDob.set(k, a);
        }
        if (d.primary_number) {
          const k = `${norm}:num:${d.primary_number}`;
          const a = byNormNum.get(k) || []; a.push(d); byNormNum.set(k, a);
        }
        const a = byNormName.get(norm) || []; a.push(d); byNormName.set(norm, a);
      }
    }

    const processedIds = new Set();
    const groups = [];

    function addGroup(match_type, key, records) {
      const fresh = records.filter(r => !processedIds.has(r.id));
      if (fresh.length < 2) return;
      groups.push({
        match_type,
        key,
        count: fresh.length,
        record_ids:    fresh.map(d => d.id),
        names:         fresh.map(d => driverFullName(d)),
        created_dates: fresh.map(d => d.created_date || null),
        statuses:      fresh.map(d => d.status || 'Active'),
        teams:         fresh.map(d => d.team_id || null),
        car_numbers:   fresh.map(d => d.primary_number || null),
        dobs:          fresh.map(d => d.date_of_birth || null),
        external_uids: fresh.map(d => d.external_uid || null),
        canonical_keys: fresh.map(d => d.canonical_key || null),
        normalized_names: fresh.map(d => d.normalized_name || null),
      });
      fresh.forEach(r => processedIds.add(r.id));
    }

    for (const [key, grp] of byExternalUid)  if (grp.length > 1) addGroup('external_uid', key, grp);
    for (const [key, grp] of byCanonicalKey) if (grp.length > 1) addGroup('canonical_key', key, grp);
    for (const [key, grp] of byNormDob)      if (grp.length > 1) addGroup('normalized_name_dob', key, grp);
    for (const [key, grp] of byNormNum)      if (grp.length > 1) addGroup('normalized_name_number', key, grp);
    for (const [key, grp] of byNormName)     if (grp.length > 1) addGroup('normalized_name', key, grp);

    return Response.json({
      success: true,
      total_drivers: allDrivers.length,
      candidates_checked: candidates.length,
      duplicate_groups: groups,
      generated_at: new Date().toISOString(),
    });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});