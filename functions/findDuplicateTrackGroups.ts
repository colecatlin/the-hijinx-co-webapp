/**
 * findDuplicateTrackGroups.js
 *
 * Groups Track records into duplicate sets using three match dimensions:
 *   1. external_uid exact
 *   2. canonical_key exact
 *   3. normalized_name + location_state or location_country composite fallback
 *
 * Skips records already marked DUPLICATE_OF (already handled).
 * Location context is included to avoid false-positive grouping of
 * same-named tracks at different facilities.
 *
 * Input:  {} (no params)
 * Output: {
 *   total_tracks, candidates_checked, duplicate_groups: [{
 *     match_type, key, count, record_ids, names, created_dates,
 *     statuses, external_uids, canonical_keys, location_states, location_countries
 *   }]
 * }
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

    const allTracks = await base44.asServiceRole.entities.Track.list('-created_date', 3000);

    // Skip records already explicitly marked as duplicates
    const candidates = allTracks.filter(t =>
      !t.canonical_key?.includes('DUPLICATE_OF') &&
      !(t.notes || '').includes('DUPLICATE_OF')
    );

    const byExternalUid  = new Map();
    const byCanonicalKey = new Map();
    const byNormLocation = new Map(); // normalized_name:location composite

    for (const t of candidates) {
      if (t.external_uid) {
        const arr = byExternalUid.get(t.external_uid) || [];
        arr.push(t);
        byExternalUid.set(t.external_uid, arr);
      }

      if (t.canonical_key && !t.canonical_key.includes('DUPLICATE')) {
        const arr = byCanonicalKey.get(t.canonical_key) || [];
        arr.push(t);
        byCanonicalKey.set(t.canonical_key, arr);
      }

      // Location-aware composite: prevents false positives for same-named tracks
      // at different locations (e.g. "Lucas Oil Stadium" in two different states)
      const norm = t.normalized_name || normalizeName(t.name || '');
      if (norm) {
        const loc = normalizeName(t.location_state || t.location_country || '');
        const compositeKey = loc ? `${norm}:${loc}` : norm;
        const arr = byNormLocation.get(compositeKey) || [];
        arr.push(t);
        byNormLocation.set(compositeKey, arr);
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
        created_dates:    fresh.map(r => r.created_date || null),
        statuses:         fresh.map(r => r.status || 'Unknown'),
        external_uids:    fresh.map(r => r.external_uid || null),
        canonical_keys:   fresh.map(r => r.canonical_key || null),
        normalized_names: fresh.map(r => r.normalized_name || null),
        location_states:  fresh.map(r => r.location_state || null),
        location_countries: fresh.map(r => r.location_country || null),
      });
      fresh.forEach(r => processedIds.add(r.id));
    }

    for (const [key, grp] of byExternalUid) {
      if (grp.length > 1) addGroup('external_uid', key, grp);
    }
    for (const [key, grp] of byCanonicalKey) {
      if (grp.length > 1) addGroup('canonical_key', key, grp);
    }
    for (const [key, grp] of byNormLocation) {
      if (grp.length > 1) addGroup('normalized_name_location', key, grp);
    }

    return Response.json({
      success: true,
      total_tracks: allTracks.length,
      candidates_checked: candidates.length,
      duplicate_groups: groups,
      generated_at: new Date().toISOString(),
    });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});