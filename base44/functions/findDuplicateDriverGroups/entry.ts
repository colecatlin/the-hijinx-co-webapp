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

    // 6. Fuzzy substring match — catches name variants like "John Smith Jr." vs "John Smith"
    //    where the shorter normalized name is a contiguous substring of the longer one.
    //    Guard: shorter name must be ≥10 chars and ≥2 words to avoid false positives.
    const fuzzyCandidates = candidates.filter(d => !processedIds.has(d.id));
    const parent = new Map();
    const find = (id) => { let c = id; while (parent.get(c) !== c) { parent.set(c, parent.get(parent.get(c))); c = parent.get(c); } return c; };
    const union = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent.set(ra, rb); };
    for (let i = 0; i < fuzzyCandidates.length; i++) {
      const normI = fuzzyCandidates[i].normalized_name || normalizeName(driverFullName(fuzzyCandidates[i]));
      if (!normI || normI.length < 10 || normI.split(' ').length < 2) continue;
      if (!parent.has(fuzzyCandidates[i].id)) parent.set(fuzzyCandidates[i].id, fuzzyCandidates[i].id);
      for (let j = i + 1; j < fuzzyCandidates.length; j++) {
        const normJ = fuzzyCandidates[j].normalized_name || normalizeName(driverFullName(fuzzyCandidates[j]));
        if (!normJ || normJ.length < 10 || normJ.split(' ').length < 2) continue;
        const shorter = normI.length <= normJ.length ? normI : normJ;
        const longer  = normI.length <= normJ.length ? normJ : normI;
        if (longer.includes(shorter)) {
          if (!parent.has(fuzzyCandidates[j].id)) parent.set(fuzzyCandidates[j].id, fuzzyCandidates[j].id);
          union(fuzzyCandidates[i].id, fuzzyCandidates[j].id);
        }
      }
    }
    const fuzzyComponents = new Map();
    for (const id of parent.keys()) { const root = find(id); const arr = fuzzyComponents.get(root) || []; arr.push(id); fuzzyComponents.set(root, arr); }
    for (const [, ids] of fuzzyComponents) {
      if (ids.length < 2) continue;
      const records = candidates.filter(d => ids.includes(d.id) && !processedIds.has(d.id));
      if (records.length >= 2) addGroup('fuzzy_substring', records.map(d => d.normalized_name || driverFullName(d)).join(' / '), records);
    }

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