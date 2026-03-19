/**
 * findDuplicateStandingGroups.js
 *
 * Groups Standings by identity key and composite fallback to detect duplicates.
 * Input: {}
 * Output: { duplicate_groups, total_standings, total_missing_key }
 * Admin only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function buildKey(series_id, season_year, class_id, driver_id) {
  return `standing:${series_id || 'none'}:${season_year || 'none'}:${class_id || 'none'}:${driver_id || 'none'}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const allStandings = await base44.asServiceRole.entities.Standings.list('-created_date', 10000);

    const byStoredKey   = new Map();
    const byComposite   = new Map();
    let missingKeyCount = 0;

    for (const s of allStandings) {
      if (s.notes?.includes('DUPLICATE_OF:')) continue;

      if (s.standing_identity_key) {
        const a = byStoredKey.get(s.standing_identity_key) || []; a.push(s); byStoredKey.set(s.standing_identity_key, a);
      } else {
        missingKeyCount++;
        if (s.series_id && s.driver_id && s.season_year) {
          const k = buildKey(s.series_id, s.season_year, s.series_class_id || null, s.driver_id);
          const a = byComposite.get(k) || []; a.push(s); byComposite.set(k, a);
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
            standing_ids: unique.map(r => r.id),
            series_id: unique[0].series_id,
            season_year: unique[0].season_year,
            class_id: unique[0].series_class_id || null,
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
            standing_ids: unique.map(r => r.id),
            series_id: unique[0].series_id,
            season_year: unique[0].season_year,
            class_id: unique[0].series_class_id || null,
            driver_id: unique[0].driver_id,
            count: unique.length,
          });
          unique.forEach(r => processedIds.add(r.id));
        }
      }
    }

    return Response.json({ duplicate_groups, total_standings: allStandings.length, total_missing_key: missingKeyCount });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});