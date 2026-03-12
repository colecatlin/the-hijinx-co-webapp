/**
 * upsertOperationalStanding.js
 *
 * Safe idempotent upsert for a single Standing row.
 * Builds a stable identity key and updates the existing row if found,
 * creates a new one only if no match exists.
 *
 * Input:  { payload, source_path? }
 * Output: { action: 'created'|'updated', record }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function normalizeName(name) {
  if (!name) return '';
  return name.toLowerCase().replace(/[^\w\s]/g, '').trim();
}

function buildNormalizedStandingKey(series_id, season_year, driver_id, driver_name) {
  if (!series_id || !season_year) return null;
  if (driver_id) return `standing:${series_id}:${season_year}:${driver_id}`;
  if (driver_name) return `standing:${series_id}:${season_year}:${normalizeName(driver_name)}`;
  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { payload = {}, source_path = 'unknown' } = body;

    // Accept season or season_year for backwards compat
    if (!payload.season_year && payload.season) {
      payload.season_year = payload.season;
    }
    delete payload.season; // remove legacy field

    if (!payload.driver_id || !payload.series_id || !payload.season_year) {
      return Response.json({ error: 'payload.driver_id, payload.series_id, and payload.season_year are required' }, { status: 400 });
    }

    const normalizedKey = buildNormalizedStandingKey(
      payload.series_id,
      payload.season_year,
      payload.driver_id,
      payload.driver_name
    );

    // 1. Check by normalized_standing_key (strongest key)
    let existing = null;
    let matchMethod = 'none';

    if (normalizedKey) {
      const byNormalizedKey = await base44.asServiceRole.entities.Standings.filter({ normalized_standing_key: normalizedKey }).catch(() => []);
      if (byNormalizedKey?.length) {
        existing = byNormalizedKey[0];
        matchMethod = 'normalized_standing_key';
        if (byNormalizedKey.length > 1) {
          await base44.asServiceRole.entities.OperationLog.create({
            operation_type: 'operational_duplicate_detected',
            entity_name: 'Standings',
            status: 'success',
            metadata: { entity_type: 'standings', source_path, normalized_standing_key: normalizedKey, count: byNormalizedKey.length },
          }).catch(() => {});
        }
      }
    }

    // 2. Fallback: series_id + season_year + driver_id
    if (!existing && payload.driver_id) {
      const filters = { series_id: payload.series_id, season_year: payload.season_year, driver_id: payload.driver_id };
      if (payload.series_class_id) filters.series_class_id = payload.series_class_id;
      const byComposite = await base44.asServiceRole.entities.Standings.filter(filters).catch(() => []);
      if (byComposite?.length === 1) {
        existing = byComposite[0];
        matchMethod = 'series_season_driver_id';
      } else if (byComposite?.length > 1) {
        await base44.asServiceRole.entities.OperationLog.create({
          operation_type: 'operational_duplicate_detected',
          entity_name: 'Standings',
          status: 'success',
          metadata: { entity_type: 'standings', source_path, series_id: payload.series_id, season_year: payload.season_year, driver_id: payload.driver_id, count: byComposite.length },
        }).catch(() => {});
        existing = byComposite.sort((a, b) => {
          const score = r => (r.normalized_standing_key ? 2 : 0) + (r.points_total != null ? 1 : 0) + (r.rank != null ? 1 : 0);
          return score(b) - score(a);
        })[0];
        matchMethod = 'series_season_driver_ambiguous';
      }
    }

    // 3. Fallback: series_id + season_year + normalized_driver_name
    if (!existing && payload.driver_name) {
      const normDriverName = normalizeName(payload.driver_name);
      if (normDriverName) {
        const byName = await base44.asServiceRole.entities.Standings.filter({
          series_id: payload.series_id,
          season_year: payload.season_year,
          driver_name: payload.driver_name,
        }).catch(() => []);
        if (byName?.length === 1) {
          existing = byName[0];
          matchMethod = 'series_season_driver_name';
        }
      }
    }

    const { id: _id, ...cleanPayload } = payload;
    const dataWithKey = { ...cleanPayload, normalized_standing_key: normalizedKey };
    let record, action;

    if (existing) {
      record = await base44.asServiceRole.entities.Standings.update(existing.id, dataWithKey);
      action = 'updated';
    } else {
      record = await base44.asServiceRole.entities.Standings.create(dataWithKey);
      action = 'created';
    }

    await base44.asServiceRole.entities.OperationLog.create({
      operation_type: action === 'created' ? 'operational_standing_created' : 'operational_standing_updated',
      entity_name: 'Standings',
      entity_id: record.id,
      status: 'success',
      metadata: { entity_type: 'standings', source_path, normalized_standing_key: normalizedKey, matched_by: matchMethod },
    }).catch(() => {});

    return Response.json({ action, record, normalized_key: normalizedKey, match_method: matchMethod });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});