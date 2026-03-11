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

function buildStandingIdentityKey(series_id, season_year, series_class_id, driver_id) {
  return `standing:${series_id || 'none'}:${season_year || 'none'}:${series_class_id || 'none'}:${driver_id || 'none'}`;
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

    const identityKey = buildStandingIdentityKey(
      payload.series_id,
      payload.season_year,
      payload.series_class_id || null,
      payload.driver_id
    );

    // 1. Check by stored identity key
    let existing = null;
    let matchMethod = 'none';

    const byKey = await base44.asServiceRole.entities.Standings.filter({ standing_identity_key: identityKey }).catch(() => []);
    if (byKey?.length) {
      existing = byKey[0];
      matchMethod = 'identity_key';
      if (byKey.length > 1) {
        await base44.asServiceRole.entities.OperationLog.create({
          operation_type: 'operational_duplicate_detected',
          entity_name: 'Standings',
          status: 'success',
          metadata: { entity_type: 'standings', source_path, standing_identity_key: identityKey, count: byKey.length },
        }).catch(() => {});
      }
    }

    // 2. Fallback: composite lookup
    if (!existing) {
      const filters = { series_id: payload.series_id, season_year: payload.season_year, driver_id: payload.driver_id };
      if (payload.series_class_id) filters.series_class_id = payload.series_class_id;
      const fallback = await base44.asServiceRole.entities.Standings.filter(filters).catch(() => []);
      if (fallback?.length === 1) {
        existing = fallback[0];
        matchMethod = 'fallback_composite';
      } else if (fallback?.length > 1) {
        await base44.asServiceRole.entities.OperationLog.create({
          operation_type: 'operational_duplicate_detected',
          entity_name: 'Standings',
          status: 'success',
          metadata: { entity_type: 'standings', source_path, count: fallback.length, match: 'composite_ambiguous' },
        }).catch(() => {});
        existing = fallback.sort((a, b) => {
          const score = r => (r.standing_identity_key ? 2 : 0) + (r.points_total != null ? 1 : 0) + (r.rank != null ? 1 : 0);
          return score(b) - score(a);
        })[0];
        matchMethod = 'fallback_ambiguous_best';
      }
    }

    const { id: _id, ...cleanPayload } = payload;
    const dataWithKey = { ...cleanPayload, standing_identity_key: identityKey };
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
      metadata: { entity_type: 'standings', source_path, standing_identity_key: identityKey, matched_by: matchMethod },
    }).catch(() => {});

    return Response.json({ action, record, identity_key: identityKey, match_method: matchMethod });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});