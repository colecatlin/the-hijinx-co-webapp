/**
 * triggerStandingsFromSession
 *
 * Called when a Session transitions to "Official".
 * Loads Results for the session, applies PointsConfig rules,
 * aggregates totals per driver_id, and upserts Standings records.
 *
 * Payload: { session_id, event_id }
 *
 * Standings are written with published=false.
 * Admin must separately click "Publish Standings" to set published=true.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const DEFAULT_POINTS_TABLE = {
  1: 50, 2: 45, 3: 42, 4: 40, 5: 38, 6: 36, 7: 34, 8: 32, 9: 30, 10: 28,
  11: 26, 12: 24, 13: 22, 14: 20, 15: 18, 16: 16, 17: 14, 18: 12, 19: 10, 20: 8,
};
const DEFAULT_DNF_POINTS = 2;
const DEFAULT_DNS_POINTS = 0;
const DEFAULT_DSQ_POINTS = 0;
const DEFAULT_21PLUS_POINTS = 5;

function buildPointsMap(configRules) {
  const map = { ...DEFAULT_POINTS_TABLE };
  if (Array.isArray(configRules)) {
    configRules.forEach(({ position, points }) => {
      if (position != null) map[position] = points ?? 0;
    });
  }
  return map;
}

function getResultPoints(result, pointsMap) {
  const s = (result.status || 'Running').toUpperCase();
  if (s === 'DNF') return DEFAULT_DNF_POINTS;
  if (s === 'DNS') return DEFAULT_DNS_POINTS;
  if (s === 'DSQ') return DEFAULT_DSQ_POINTS;
  const pos = parseInt(result.position);
  if (!pos || pos < 1) return 0;
  if (pointsMap[pos] != null) return pointsMap[pos];
  return DEFAULT_21PLUS_POINTS;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Auth — allow admin users or internal service calls
    const user = await base44.auth.me().catch(() => null);
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { session_id, event_id } = body;

    if (!session_id || !event_id) {
      return Response.json({ error: 'session_id and event_id are required' }, { status: 400 });
    }

    // ── Load session ──────────────────────────────────────────────────────────
    const sessions = await base44.asServiceRole.entities.Session.filter({ event_id });
    const session = sessions.find(s => s.id === session_id);
    if (!session) {
      return Response.json({ error: 'Session not found' }, { status: 404 });
    }

    const seriesClassId = session.series_class_id || null;
    const seriesId = session.series_id || null;

    // ── Load event (for series_id / season fallback) ──────────────────────────
    const events = await base44.asServiceRole.entities.Event.filter({ id: event_id });
    const event = events[0] || null;
    const resolvedSeriesId = seriesId || event?.series_id || null;
    const season = event?.season || String(new Date().getFullYear());

    // ── Load Results for this session ─────────────────────────────────────────
    const results = await base44.asServiceRole.entities.Results.filter({
      event_id,
      session_id,
    });

    if (!results.length) {
      return Response.json({ success: true, message: 'No results found — standings not updated', drivers_processed: 0 });
    }

    // ── Load PointsConfig ─────────────────────────────────────────────────────
    let pointsMap = { ...DEFAULT_POINTS_TABLE };
    if (resolvedSeriesId || seriesClassId) {
      const allConfigs = await base44.asServiceRole.entities.PointsConfig.list();
      const matchingConfig = allConfigs.find(c => {
        if (c.status && c.status !== 'active') return false;
        if (seriesClassId && c.series_class_id === seriesClassId) return true;
        if (resolvedSeriesId && c.series_id === resolvedSeriesId) return true;
        return false;
      });
      if (matchingConfig?.points_table) {
        let tableRows = matchingConfig.points_table;
        if (typeof tableRows === 'string') {
          try { tableRows = JSON.parse(tableRows); } catch (_) { tableRows = []; }
        }
        pointsMap = buildPointsMap(Array.isArray(tableRows) ? tableRows : []);
      }
    }

    // ── Aggregate per driver ──────────────────────────────────────────────────
    const byDriver = {};
    for (const r of results) {
      const dId = r.driver_id;
      if (!dId) continue;
      if (!byDriver[dId]) {
        byDriver[dId] = {
          driver_id: dId,
          points_total: 0,
          wins: 0,
          podiums: 0,
        };
      }
      const pts = getResultPoints(r, pointsMap);
      byDriver[dId].points_total += pts;
      const pos = parseInt(r.position);
      if (!isNaN(pos) && pos >= 1) {
        if (pos === 1) byDriver[dId].wins += 1;
        if (pos <= 3) byDriver[dId].podiums += 1;
      }
    }

    // ── Load existing Standings for upsert ───────────────────────────────────
    const existingStandings = resolvedSeriesId
      ? await base44.asServiceRole.entities.Standings.filter({
          series_id: resolvedSeriesId,
          season,
          ...(seriesClassId ? { series_class_id: seriesClassId } : {}),
        })
      : [];

    const existingByDriver = Object.fromEntries(
      existingStandings.map(s => [s.driver_id, s])
    );

    const now = new Date().toISOString();
    const ops = [];

    for (const agg of Object.values(byDriver)) {
      const existing = existingByDriver[agg.driver_id];

      const payload = {
        series_id: resolvedSeriesId || null,
        season,
        series_class_id: seriesClassId || null,
        driver_id: agg.driver_id,
        // Accumulate on top of existing standings
        points_total: (existing?.points_total || 0) + agg.points_total,
        wins: (existing?.wins || 0) + agg.wins,
        podiums: (existing?.podiums || 0) + agg.podiums,
        last_calculated: now,
        published: existing?.published ?? false,
      };

      if (existing) {
        ops.push(base44.asServiceRole.entities.Standings.update(existing.id, payload));
      } else {
        ops.push(base44.asServiceRole.entities.Standings.create(payload));
      }
    }

    await Promise.all(ops);

    // ── Log operation ─────────────────────────────────────────────────────────
    base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'standings_recalculated',
      status: 'success',
      entity_name: 'Standings',
      event_id,
      message: `Standings updated from session ${session_id}: ${ops.length} drivers`,
      metadata: { session_id, series_id: resolvedSeriesId, season, series_class_id: seriesClassId },
    }).catch(() => {});

    return Response.json({
      success: true,
      drivers_processed: ops.length,
      season,
      series_id: resolvedSeriesId,
      series_class_id: seriesClassId,
      message: 'Standings recalculated. Set published=true to make public.',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});