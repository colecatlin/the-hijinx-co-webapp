/**
 * findDuplicateTeamGroups.js
 *
 * Groups Team records into potential duplicate sets using:
 *   1. external_uid exact match
 *   2. canonical_key exact match
 *   3. normalized_name exact match
 *   4. sponsor-stripped normalized name (removes common title sponsor prefixes)
 *
 * Sponsor prefixes stripped for comparison:
 *   Monster Energy, AMSOIL, Lucas Oil, Red Bull, Rockstar, Makita,
 *   Polaris, Yamaha, Ford, Chevrolet, Toyota, BRP, Ski-Doo
 *
 * Input:  {} (no params required)
 * Output: { total_teams, duplicate_groups: [...] }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ── Normalization ────────────────────────────────────────────────────────────

const SPONSOR_PREFIXES = [
  'monster energy', 'amsoil', 'lucas oil', 'red bull', 'rockstar', 'makita',
  'polaris', 'yamaha', 'ford', 'chevrolet', 'chevy', 'toyota', 'brp', 'ski-doo',
  'can-am', 'canam', 'husqvarna', 'ktm', 'honda', 'kawasaki', 'suzuki',
];

function normalizeName(name) {
  if (!name) return '';
  return name.trim().toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function stripSponsorPrefixes(normalized) {
  let n = normalized;
  let prev = '';
  while (prev !== n) {
    prev = n;
    for (const prefix of SPONSOR_PREFIXES) {
      if (n.startsWith(prefix + ' ')) {
        n = n.slice(prefix.length).trim();
      }
    }
  }
  return n;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const allTeams = await base44.asServiceRole.entities.Team.list('-created_date', 5000);

    // Skip already-marked duplicates
    const candidates = allTeams.filter(t =>
      !t.canonical_key?.includes('DUPLICATE_OF') &&
      !(t.notes || '').includes('DUPLICATE_OF')
    );

    const byExternalUid    = new Map();
    const byCanonicalKey   = new Map();
    const byNormName       = new Map();
    const bySponsorStripped = new Map();

    for (const t of candidates) {
      // 1. external_uid
      if (t.external_uid) {
        const arr = byExternalUid.get(t.external_uid) || []; arr.push(t);
        byExternalUid.set(t.external_uid, arr);
      }

      // 2. canonical_key
      if (t.canonical_key && !t.canonical_key.includes('DUPLICATE')) {
        const arr = byCanonicalKey.get(t.canonical_key) || []; arr.push(t);
        byCanonicalKey.set(t.canonical_key, arr);
      }

      // 3. normalized_name
      const norm = t.normalized_name || normalizeName(t.name || '');
      if (norm) {
        const arr = byNormName.get(norm) || []; arr.push(t);
        byNormName.set(norm, arr);
      }

      // 4. sponsor-stripped normalized name
      if (norm) {
        const stripped = stripSponsorPrefixes(norm);
        if (stripped && stripped !== norm) {
          const arr = bySponsorStripped.get(stripped) || []; arr.push(t);
          bySponsorStripped.set(stripped, arr);
        }
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
        record_ids:       fresh.map(r => r.id),
        names:            fresh.map(r => r.name || ''),
        normalized_names: fresh.map(r => r.normalized_name || normalizeName(r.name || '')),
        external_uids:    fresh.map(r => r.external_uid || null),
        canonical_keys:   fresh.map(r => r.canonical_key || null),
        created_dates:    fresh.map(r => r.created_date || null),
        statuses:         fresh.map(r => r.racing_status || r.status || 'Unknown'),
        note: match_type === 'sponsor_stripped'
          ? `Sponsor prefix removed — base team name: "${key}". Review before merging.`
          : null,
      });
      fresh.forEach(r => processedIds.add(r.id));
    }

    for (const [k, g] of byExternalUid)    if (g.length > 1) addGroup('external_uid', k, g);
    for (const [k, g] of byCanonicalKey)   if (g.length > 1) addGroup('canonical_key', k, g);
    for (const [k, g] of byNormName)       if (g.length > 1) addGroup('normalized_name', k, g);
    for (const [k, g] of bySponsorStripped) if (g.length > 1) addGroup('sponsor_stripped', k, g);

    // 5. Fuzzy substring match — catches variants where one team name contains the other
    //    Guard: shorter name must be ≥15 chars and ≥3 words to avoid false positives.
    const fuzzyCandidates = candidates.filter(t => !processedIds.has(t.id));
    const parent = new Map();
    const find = (id) => { let c = id; while (parent.get(c) !== c) { parent.set(c, parent.get(parent.get(c))); c = parent.get(c); } return c; };
    const union = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent.set(ra, rb); };
    for (let i = 0; i < fuzzyCandidates.length; i++) {
      const normI = fuzzyCandidates[i].normalized_name || normalizeName(fuzzyCandidates[i].name || '');
      if (!normI || normI.length < 15 || normI.split(' ').length < 3) continue;
      if (!parent.has(fuzzyCandidates[i].id)) parent.set(fuzzyCandidates[i].id, fuzzyCandidates[i].id);
      for (let j = i + 1; j < fuzzyCandidates.length; j++) {
        const normJ = fuzzyCandidates[j].normalized_name || normalizeName(fuzzyCandidates[j].name || '');
        if (!normJ || normJ.length < 15 || normJ.split(' ').length < 3) continue;
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
      const records = candidates.filter(t => ids.includes(t.id) && !processedIds.has(t.id));
      if (records.length >= 2) addGroup('fuzzy_substring', records.map(t => t.normalized_name || t.name || '').join(' / '), records);
    }

    return Response.json({
      success: true,
      total_teams: allTeams.length,
      candidates_checked: candidates.length,
      duplicate_groups: groups,
      generated_at: new Date().toISOString(),
    });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});