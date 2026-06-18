/**
 * recalculateDriverCareerStats.js — R9EA Phase 5
 *
 * Aggregates career statistics for a driver from Results records.
 * Accepts identity_id or driver_id. When identity_id is provided,
 * collects all canonical + merged driver IDs from the PersonIdentity
 * to give a complete cross-series career picture.
 *
 * Input:  { identity_id?, driver_id? }
 * Output: { ok, stats_record_id, career_stats }
 *
 * Admin only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { identity_id, driver_id } = body;

    if (!identity_id && !driver_id) {
      return Response.json({ error: 'identity_id or driver_id is required' }, { status: 400 });
    }

    const sr = base44.asServiceRole;
    const now = new Date().toISOString();

    // ── Resolve all driver IDs to aggregate across ────────────────────────────
    let allDriverIds = [];
    let resolvedIdentityId = identity_id || null;
    let primaryDriverId = driver_id || null;

    if (identity_id) {
      const idList = await sr.entities.PersonIdentity.filter({ id: identity_id }).catch(() => []);
      const identity = idList?.[0];
      if (!identity) return Response.json({ error: `PersonIdentity not found: ${identity_id}` }, { status: 404 });

      if (identity.canonical_driver_id) allDriverIds.push(identity.canonical_driver_id);
      if (Array.isArray(identity.merged_driver_ids)) {
        for (const did of identity.merged_driver_ids) {
          if (did && !allDriverIds.includes(did)) allDriverIds.push(did);
        }
      }
      primaryDriverId = identity.canonical_driver_id || driver_id || null;
    } else {
      allDriverIds.push(driver_id);
    }

    if (allDriverIds.length === 0 && driver_id) allDriverIds = [driver_id];
    if (allDriverIds.length === 0) {
      return Response.json({ error: 'No driver IDs resolved from identity or driver_id' }, { status: 400 });
    }

    // ── Collect all Results ──────────────────────────────────────────────────
    let allResults = [];
    for (const did of allDriverIds) {
      let offset = 0;
      while (true) {
        const batch = await sr.entities.Results.list('-created_date', 200, offset).catch(() => []);
        if (!batch || batch.length === 0) break;
        const driverResults = batch.filter(r =>
          r.driver_id === did &&
          r.record_status !== 'superseded' &&
          !r.is_archived
        );
        allResults = allResults.concat(driverResults);
        if (batch.length < 200) break;
        offset += batch.length;
      }
    }

    // ── Aggregate career totals ──────────────────────────────────────────────
    let career_starts = 0;
    let career_wins = 0;
    let career_podiums = 0;
    let career_top5 = 0;
    let career_top10 = 0;
    let career_dnf = 0;
    let career_dns = 0;
    let career_dsq = 0;
    let career_points_total = 0;
    let first_start_date = null;
    let most_recent_start_date = null;
    let first_win_date = null;
    let most_recent_win_date = null;

    const seriesMap = {};
    const classMap = {};
    const seasonSet = new Set();
    const seriesSet = new Set();

    // Load event dates for date tracking
    const eventIds = [...new Set(allResults.map(r => r.event_id).filter(Boolean))];
    const eventDateMap = {};
    for (const eid of eventIds) {
      const evts = await sr.entities.Event.filter({ id: eid }).catch(() => []);
      if (evts?.[0]) eventDateMap[eid] = evts[0].event_date || null;
    }

    for (const result of allResults) {
      const pos = result.position;
      const status = result.status;
      const eventDate = eventDateMap[result.event_id] || null;

      // Count starts — includes Running, DNF, DNS, DSQ
      career_starts++;
      if (result.series_id) seriesSet.add(result.series_id);
      if (result.season_year || result.round_number) seasonSet.add(result.season_year || 'unknown');

      // Outcome stats
      if (status === 'DNF') career_dnf++;
      else if (status === 'DNS') career_dns++;
      else if (status === 'DSQ') career_dsq++;

      if (pos && pos > 0 && status !== 'DSQ') {
        if (pos === 1) { career_wins++; if (!first_win_date || eventDate < first_win_date) first_win_date = eventDate; if (!most_recent_win_date || eventDate > most_recent_win_date) most_recent_win_date = eventDate; }
        if (pos <= 3) career_podiums++;
        if (pos <= 5) career_top5++;
        if (pos <= 10) career_top10++;
      }

      if (result.points) career_points_total += result.points;

      if (eventDate) {
        if (!first_start_date || eventDate < first_start_date) first_start_date = eventDate;
        if (!most_recent_start_date || eventDate > most_recent_start_date) most_recent_start_date = eventDate;
      }

      // By-series aggregation
      if (result.series_id) {
        if (!seriesMap[result.series_id]) seriesMap[result.series_id] = { series_id: result.series_id, starts: 0, wins: 0, podiums: 0, points_total: 0, seasons: new Set() };
        seriesMap[result.series_id].starts++;
        if (pos === 1 && status !== 'DSQ') seriesMap[result.series_id].wins++;
        if (pos <= 3 && status !== 'DSQ') seriesMap[result.series_id].podiums++;
        if (result.points) seriesMap[result.series_id].points_total += result.points;
        if (result.season_year) seriesMap[result.series_id].seasons.add(result.season_year);
      }

      // By-class aggregation
      if (result.series_class_id) {
        if (!classMap[result.series_class_id]) classMap[result.series_class_id] = { series_class_id: result.series_class_id, starts: 0, wins: 0, podiums: 0, points_total: 0 };
        classMap[result.series_class_id].starts++;
        if (pos === 1 && status !== 'DSQ') classMap[result.series_class_id].wins++;
        if (pos <= 3 && status !== 'DSQ') classMap[result.series_class_id].podiums++;
        if (result.points) classMap[result.series_class_id].points_total += result.points;
      }
    }

    const by_series = Object.values(seriesMap).map(s => ({ ...s, seasons: s.seasons.size }));
    const by_class = Object.values(classMap);

    const statsIdentityKey = `career_stats:${resolvedIdentityId || primaryDriverId}:career_total:::`;

    const statsData = {
      identity_id: resolvedIdentityId || null,
      driver_id: primaryDriverId || null,
      scope_type: 'career_total',
      career_starts,
      career_wins,
      career_podiums,
      career_top5,
      career_top10,
      career_dnf,
      career_dns,
      career_dsq,
      career_points_total,
      championships: 0, // computed separately from Standings
      seasons_count: seasonSet.size,
      series_count: seriesSet.size,
      first_start_date: first_start_date || null,
      most_recent_start_date: most_recent_start_date || null,
      first_win_date: first_win_date || null,
      most_recent_win_date: most_recent_win_date || null,
      by_series,
      by_class,
      last_calculated: now,
      calculation_source: 'RaceCore',
      record_status: 'verified',
      stats_identity_key: statsIdentityKey,
    };

    // ── Upsert ────────────────────────────────────────────────────────────────
    const existing = await sr.entities.DriverCareerStats.filter({ stats_identity_key: statsIdentityKey }).catch(() => []);
    let statsRecord;
    if (existing?.length) {
      statsRecord = await sr.entities.DriverCareerStats.update(existing[0].id, statsData);
    } else {
      statsRecord = await sr.entities.DriverCareerStats.create(statsData);
    }

    // ── AuditLog + OperationLog ───────────────────────────────────────────────
    await sr.entities.AuditLog.create({
      entity_type: 'DriverCareerStats',
      entity_id: statsRecord.id,
      entity_name: `Career stats: ${resolvedIdentityId || primaryDriverId}`,
      action: existing?.length ? 'updated' : 'created',
      performed_by: user.id,
      performed_by_name: user.full_name || user.email,
      timestamp: now,
      after_data: { career_starts, career_wins, career_podiums, seasons_count: seasonSet.size, series_count: seriesSet.size },
      notes: `recalculateDriverCareerStats — ${allResults.length} results processed, ${allDriverIds.length} driver ID(s)`,
    }).catch(() => {});

    await sr.entities.OperationLog.create({
      operation_type: 'career_stats_recalculated',
      entity_name: 'DriverCareerStats',
      status: 'success',
      metadata: {
        identity_id: resolvedIdentityId,
        driver_ids: allDriverIds,
        results_processed: allResults.length,
        career_starts,
        career_wins,
      },
    }).catch(() => {});

    return Response.json({ ok: true, stats_record_id: statsRecord.id, career_stats: statsRecord });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});