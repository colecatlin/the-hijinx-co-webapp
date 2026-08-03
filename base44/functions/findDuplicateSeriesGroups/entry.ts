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

    // 4. Fuzzy substring match — catches sponsor-prefix variants like
    //    "AMSOIL Championship Off-Road" vs "Championship Off-Road" where the
    //    shorter normalized name is a contiguous substring of the longer one.
    //    Guard: shorter name must be ≥15 chars and ≥3 words to avoid false positives.
    const fuzzyCandidates = candidates.filter(s => !processedIds.has(s.id));
    const parent = new Map();
    const find = (id) => {
      let cur = id;
      while (parent.get(cur) !== cur) { parent.set(cur, parent.get(parent.get(cur))); cur = parent.get(cur); }
      return cur;
    };
    const union = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent.set(ra, rb); };

    for (let i = 0; i < fuzzyCandidates.length; i++) {
      const normI = fuzzyCandidates[i].normalized_name || normalizeName(fuzzyCandidates[i].name || fuzzyCandidates[i].full_name || '');
      if (!normI || normI.length < 15 || normI.split(' ').length < 3) continue;
      if (!parent.has(fuzzyCandidates[i].id)) parent.set(fuzzyCandidates[i].id, fuzzyCandidates[i].id);
      for (let j = i + 1; j < fuzzyCandidates.length; j++) {
        const normJ = fuzzyCandidates[j].normalized_name || normalizeName(fuzzyCandidates[j].name || fuzzyCandidates[j].full_name || '');
        if (!normJ || normJ.length < 15 || normJ.split(' ').length < 3) continue;
        const shorter = normI.length <= normJ.length ? normI : normJ;
        const longer  = normI.length <= normJ.length ? normJ : normI;
        if (longer.includes(shorter)) {
          if (!parent.has(fuzzyCandidates[j].id)) parent.set(fuzzyCandidates[j].id, fuzzyCandidates[j].id);
          union(fuzzyCandidates[i].id, fuzzyCandidates[j].id);
        }
      }
    }
    // Collect connected components
    const fuzzyComponents = new Map();
    for (const id of parent.keys()) {
      const root = find(id);
      const arr = fuzzyComponents.get(root) || [];
      arr.push(id);
      fuzzyComponents.set(root, arr);
    }
    for (const [, ids] of fuzzyComponents) {
      if (ids.length < 2) continue;
      const records = candidates.filter(s => ids.includes(s.id) && !processedIds.has(s.id));
      if (records.length >= 2) {
        addGroup('fuzzy_substring', records.map(r => r.normalized_name || r.name || '').join(' / '), records);
      }
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