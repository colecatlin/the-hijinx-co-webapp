/**
 * recalculateDriverCareerStats — Phase 6 Career Statistics Migration.
 *
 * Aggregates career statistics for a PersonIdentity through the modern chain:
 *   PersonIdentity → RacerProfile → SeasonParticipation → Entry → Results
 *
 * Also includes legacy Results matched by driver_id (canonical + merged)
 * as a compatibility fallback for historical unresolved records.
 *
 * Input:  { identity_id?, driver_id?, use_modern_chain? }
 * Output: { ok, stats_record_id, career_stats, resolution_summary }
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
    const { identity_id, driver_id, use_modern_chain = true } = body;

    if (!identity_id && !driver_id) {
      return Response.json({ error: 'identity_id or driver_id is required' }, { status: 400 });
    }

    const sr = base44.asServiceRole;
    const now = new Date().toISOString();

    // ── Resolve identity and all driver IDs ────────────────────────────────
    let allDriverIds = [];
    let resolvedIdentityId = identity_id || null;
    let primaryDriverId = driver_id || null;
    let racerProfileIds = [];
    let participationIds = [];
    let entryIds = [];

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

      // ── Modern chain: resolve RacerProfiles → SeasonParticipations → Entries ──
      if (use_modern_chain) {
        // RacerProfiles for this PersonIdentity
        const racerProfiles = await sr.entities.RacerProfile
          .filter({ person_identity_id: identity_id }).catch(() => []);
        racerProfileIds = racerProfiles.map(rp => rp.id);

        // SeasonParticipations for these RacerProfiles
        for (const rp of racerProfiles) {
          const participations = await sr.entities.SeasonParticipation
            .filter({ racer_profile_id: rp.id }).catch(() => []);
          for (const p of participations) {
            participationIds.push(p.id);
          }
        }

        // Entries for these SeasonParticipations
        for (const pid of participationIds) {
          const entries = await sr.entities.Entry
            .filter({ participation_id: pid }).catch(() => []);
          for (const e of entries) {
            entryIds.push(e.id);
          }
        }
      }
    } else {
      allDriverIds.push(driver_id);
    }

    if (allDriverIds.length === 0 && driver_id) allDriverIds = [driver_id];
    if (allDriverIds.length === 0 && entryIds.length === 0) {
      return Response.json({ error: 'No driver IDs or entries resolved from identity or driver_id' }, { status: 400 });
    }

    // ── Collect all Results through modern chain (entry_id) ─────────────────
    const seenResultIds = new Set();
    let allResults = [];
    let modernChainResults = 0;
    let legacyDriverResults = 0;

    // Modern chain: Results matched by entry_id
    if (use_modern_chain && entryIds.length > 0) {
      // Load all Results and filter by entry_id (SDK doesn't support IN queries)
      let offset = 0;
      while (true) {
        const batch = await sr.entities.Results.list('-created_date', 200, offset).catch(() => []);
        if (!batch || batch.length === 0) break;
        for (const r of batch) {
          if (r.entry_id && entryIds.includes(r.entry_id) &&
              r.record_status !== 'superseded' && !r.is_archived &&
              !seenResultIds.has(r.id)) {
            allResults.push(r);
            seenResultIds.add(r.id);
            modernChainResults++;
          }
        }
        if (batch.length < 200) break;
        offset += batch.length;
      }
    }

    // Legacy fallback: Results matched by driver_id (canonical + merged)
    for (const did of allDriverIds) {
      let offset = 0;
      while (true) {
        const batch = await sr.entities.Results.list('-created_date', 200, offset).catch(() => []);
        if (!batch || batch.length === 0) break;
        const driverResults = batch.filter(r =>
          r.driver_id === did &&
          r.record_status !== 'superseded' &&
          !r.is_archived &&
          !seenResultIds.has(r.id)
        );
        for (const r of driverResults) {
          allResults.push(r);
          seenResultIds.add(r.id);
          legacyDriverResults++;
        }
        if (batch.length < 200) break;
        offset += batch.length;
      }
    }

    // ── Aggregate career totals (preserved from existing logic) ────────────
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

      career_starts++;
      if (result.series_id) seriesSet.add(result.series_id);
      if (result.season_year || result.round_number) seasonSet.add(result.season_year || 'unknown');

      if (status === 'DNF') career_dnf++;
      else if (status === 'DNS') career_dns++;
      else if (status === 'DSQ') career_dsq++;

      if (pos && pos > 0 && status !== 'DSQ') {
        if (pos === 1) {
          career_wins++;
          if (!first_win_date || eventDate < first_win_date) first_win_date = eventDate;
          if (!most_recent_win_date || eventDate > most_recent_win_date) most_recent_win_date = eventDate;
        }
        if (pos <= 3) career_podiums++;
        if (pos <= 5) career_top5++;
        if (pos <= 10) career_top10++;
      }

      if (result.points) career_points_total += result.points;

      if (eventDate) {
        if (!first_start_date || eventDate < first_start_date) first_start_date = eventDate;
        if (!most_recent_start_date || eventDate > most_recent_start_date) most_recent_start_date = eventDate;
      }

      if (result.series_id) {
        if (!seriesMap[result.series_id]) seriesMap[result.series_id] = { series_id: result.series_id, starts: 0, wins: 0, podiums: 0, points_total: 0, seasons: new Set() };
        seriesMap[result.series_id].starts++;
        if (pos === 1 && status !== 'DSQ') seriesMap[result.series_id].wins++;
        if (pos <= 3 && status !== 'DSQ') seriesMap[result.series_id].podiums++;
        if (result.points) seriesMap[result.series_id].points_total += result.points;
        if (result.season_year) seriesMap[result.series_id].seasons.add(result.season_year);
      }

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
      championships: 0,
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

    // ── Upsert ────────────────────────────────────────────────────────────
    const existing = await sr.entities.DriverCareerStats.filter({ stats_identity_key: statsIdentityKey }).catch(() => []);
    let statsRecord;
    if (existing?.length) {
      statsRecord = await sr.entities.DriverCareerStats.update(existing[0].id, statsData);
    } else {
      statsRecord = await sr.entities.DriverCareerStats.create(statsData);
    }

    // ── AuditLog + OperationLog ────────────────────────────────────────────
    await sr.entities.AuditLog.create({
      entity_type: 'DriverCareerStats',
      entity_id: statsRecord.id,
      entity_name: `Career stats: ${resolvedIdentityId || primaryDriverId}`,
      action: existing?.length ? 'updated' : 'created',
      performed_by: user.id,
      performed_by_name: user.full_name || user.email,
      timestamp: now,
      after_data: { career_starts, career_wins, career_podiums, seasons_count: seasonSet.size, series_count: seriesSet.size },
      notes: `recalculateDriverCareerStats Phase 6 — ${allResults.length} results (${modernChainResults} modern chain, ${legacyDriverResults} legacy driver_id), ${allDriverIds.length} driver IDs, ${racerProfileIds.length} racer profiles, ${participationIds.length} participations, ${entryIds.length} entries`,
    }).catch(() => {});

    await sr.entities.OperationLog.create({
      operation_type: 'career_stats_recalculated',
      entity_name: 'DriverCareerStats',
      status: 'success',
      metadata: {
        identity_id: resolvedIdentityId,
        driver_ids: allDriverIds,
        racer_profile_ids: racerProfileIds,
        participation_ids: participationIds,
        entry_ids: entryIds,
        results_processed: allResults.length,
        modern_chain_results: modernChainResults,
        legacy_driver_results: legacyDriverResults,
        career_starts, career_wins,
      },
    }).catch(() => {});

    return Response.json({
      ok: true,
      stats_record_id: statsRecord.id,
      career_stats: statsRecord,
      resolution_summary: {
        identity_id: resolvedIdentityId,
        driver_ids: allDriverIds,
        racer_profile_ids: racerProfileIds,
        participation_ids: participationIds,
        entry_ids: entryIds,
        total_results: allResults.length,
        modern_chain_results: modernChainResults,
        legacy_driver_results: legacyDriverResults
      }
    });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});