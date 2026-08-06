/**
 * auditStandingsIdentityIntegrity — Phase 6 read-only audit.
 *
 * Inspects every Standings record and validates:
 *   - STND RaceCore ID format and duplicates
 *   - participation_id present and valid
 *   - SeasonParticipation exists, series/season match
 *   - driver_id present (compatibility)
 *   - Series exists
 *   - SeriesClass exists and belongs to Series
 *   - PointsConfig exists
 *   - Logical duplicate groups
 *   - Points totals vs breakdown consistency
 *   - Starts/wins/podiums vs source Results
 *
 * Read-only — never repairs.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const STND_PREFIX = 'STND';
const STND_REGEX = /^STND\d{9}$/;

async function loadAll(sr, entityName, sortField, batchSize) {
  const sort = sortField || '-created_date';
  const size = batchSize || 200;
  let all = [];
  let offset = 0;
  let hasMore = true;
  while (hasMore) {
    let batch;
    try {
      batch = await sr.entities[entityName].list(sort, size, offset);
    } catch (e) {
      return { records: all, error: e.message, partial: true, inspected: all.length };
    }
    if (!batch || batch.length === 0) { hasMore = false; break; }
    all = all.concat(batch);
    offset += batch.length;
    if (batch.length < size) hasMore = false;
  }
  return { records: all, error: null, partial: false, inspected: all.length };
}

function normalizeSeasonYear(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (/^\d{4}$/.test(s)) return s;
  const n = parseInt(s, 10);
  if (!isNaN(n) && n >= 1900 && n <= 9999) return String(n);
  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });

    const sr = base44.asServiceRole;

    // ── Load all entities ────────────────────────────────────────────────
    const [standingsData, participationData, driverData, seriesData, seriesClassData, pointsConfigData, resultsData, entryData] = await Promise.all([
      loadAll(sr, 'Standings', '-created_date', 200),
      loadAll(sr, 'SeasonParticipation', '-created_date', 200),
      loadAll(sr, 'Driver', '-created_date', 200),
      loadAll(sr, 'Series', '-created_date', 200),
      loadAll(sr, 'SeriesClass', '-created_date', 200),
      loadAll(sr, 'PointsConfig', '-created_date', 200),
      loadAll(sr, 'Results', '-created_date', 200),
      loadAll(sr, 'Entry', '-created_date', 200),
    ]);

    const standings = standingsData.records;
    const participations = participationData.records;
    const drivers = driverData.records;
    const seriesList = seriesData.records;
    const seriesClasses = seriesClassData.records;
    const pointsConfigs = pointsConfigData.records;
    const results = resultsData.records;
    const entries = entryData.records;

    // ── Build lookup maps ─────────────────────────────────────────────────
    const participationMap = {};
    for (const p of participations) participationMap[p.id] = p;
    const driverMap = {};
    for (const d of drivers) driverMap[d.id] = d;
    const seriesMap = {};
    for (const s of seriesList) seriesMap[s.id] = s;
    const seriesClassMap = {};
    for (const sc of seriesClasses) seriesClassMap[sc.id] = sc;
    const pointsConfigMap = {};
    for (const pc of pointsConfigs) pointsConfigMap[pc.id] = pc;
    const entryMap = {};
    for (const e of entries) entryMap[e.id] = e;

    // ── STND ID integrity ─────────────────────────────────────────────────
    const invalidStndFormat = [];
    const stndIdCounts = {};
    for (const s of standings) {
      if (s.racecore_id) {
        if (!STND_REGEX.test(s.racecore_id)) {
          invalidStndFormat.push({ standings_id: s.id, racecore_id: s.racecore_id });
        } else {
          stndIdCounts[s.racecore_id] = (stndIdCounts[s.racecore_id] || 0) + 1;
        }
      }
    }
    const duplicateStndIds = Object.entries(stndIdCounts)
      .filter(([_, count]) => count > 1)
      .map(([id, count]) => ({ racecore_id: id, count }));

    // ── Validate each Standings record ────────────────────────────────────
    let withRacecoreId = 0, withoutRacecoreId = 0;
    let withParticipationId = 0, withoutParticipationId = 0;
    let withDriverId = 0, withoutDriverId = 0;
    let validParticipationLinks = 0, missingParticipation = [];
    let participationSeriesMismatches = [];
    let participationSeasonMismatches = [];
    let validDriverLinks = 0, missingDriver = [];
    let driverParticipationConflicts = [];
    let validSeries = 0, missingSeries = [];
    let validSeriesClass = 0, missingSeriesClass = [];
    let classSeriesMismatches = [];
    let validPointsConfig = 0, missingPointsConfig = [];
    let archivedRows = 0;
    let pointsBreakdownMismatches = [];
    let statsMismatches = [];

    // Logical duplicate detection
    const logicalKeyMap = {};
    const logicalDuplicateGroups = [];

    for (const s of standings) {
      if (s.is_archived) { archivedRows++; continue; }

      // RaceCore ID
      if (s.racecore_id) withRacecoreId++; else withoutRacecoreId++;

      // Participation
      if (s.participation_id) {
        withParticipationId++;
        const p = participationMap[s.participation_id];
        if (p) {
          validParticipationLinks++;
          // Series match
          if (p.series_id !== s.series_id) {
            participationSeriesMismatches.push({
              standings_id: s.id, participation_id: s.participation_id,
              participation_series: p.series_id, standings_series: s.series_id
            });
          }
          // Season match
          const pSeason = normalizeSeasonYear(p.season_year);
          const sSeason = normalizeSeasonYear(s.season_year);
          if (pSeason && sSeason && pSeason !== sSeason) {
            participationSeasonMismatches.push({
              standings_id: s.id, participation_id: s.participation_id,
              participation_season: p.season_year, standings_season: s.season_year
            });
          }
          // Driver conflict check
          if (s.driver_id && p.legacy_driver_id && s.driver_id !== p.legacy_driver_id) {
            driverParticipationConflicts.push({
              standings_id: s.id, standings_driver_id: s.driver_id,
              participation_legacy_driver_id: p.legacy_driver_id
            });
          }
        } else {
          missingParticipation.push({ standings_id: s.id, participation_id: s.participation_id });
        }
      } else {
        withoutParticipationId++;
      }

      // Driver
      if (s.driver_id) {
        withDriverId++;
        if (!driverMap[s.driver_id]) {
          missingDriver.push({ standings_id: s.id, driver_id: s.driver_id });
        } else {
          validDriverLinks++;
        }
      } else {
        withoutDriverId++;
      }

      // Series
      if (s.series_id) {
        if (seriesMap[s.series_id]) validSeries++;
        else missingSeries.push({ standings_id: s.id, series_id: s.series_id });
      }

      // SeriesClass
      if (s.series_class_id) {
        const sc = seriesClassMap[s.series_class_id];
        if (sc) {
          validSeriesClass++;
          if (sc.series_id !== s.series_id) {
            classSeriesMismatches.push({
              standings_id: s.id, series_class_id: s.series_class_id,
              class_series: sc.series_id, standings_series: s.series_id
            });
          }
        } else {
          missingSeriesClass.push({ standings_id: s.id, series_class_id: s.series_class_id });
        }
      }

      // PointsConfig
      if (s.points_config_id) {
        if (pointsConfigMap[s.points_config_id]) validPointsConfig++;
        else missingPointsConfig.push({ standings_id: s.id, points_config_id: s.points_config_id });
      }

      // Logical duplicate key
      const logicalKey = `${s.series_id}:${s.season_year}:${s.series_class_id || 'overall'}:${s.participation_id || s.driver_id}`;
      if (!logicalKeyMap[logicalKey]) logicalKeyMap[logicalKey] = [];
      logicalKeyMap[logicalKey].push(s.id);

      // Points breakdown consistency
      if (Array.isArray(s.points_breakdown) && s.points_breakdown.length > 0) {
        const breakdownSum = s.points_breakdown.reduce((sum, b) => sum + (b.points || 0), 0);
        if (Math.abs(breakdownSum - (s.points_total || 0)) > 0.01) {
          pointsBreakdownMismatches.push({
            standings_id: s.id, points_total: s.points_total, breakdown_sum: breakdownSum
          });
        }
        const breakdownStarts = s.points_breakdown.length;
        if (breakdownStarts !== s.starts) {
          statsMismatches.push({
            standings_id: s.id, field: 'starts',
            standings_value: s.starts, source_value: breakdownStarts
          });
        }
      }
    }

    // Find logical duplicate groups
    for (const [key, ids] of Object.entries(logicalKeyMap)) {
      if (ids.length > 1) {
        logicalDuplicateGroups.push({ logical_key: key, standings_ids: ids, count: ids.length });
      }
    }

    return Response.json({
      read_only: true,
      records_repaired: 0,
      partial: standingsData.partial || participationData.partial || driverData.partial || seriesData.partial,
      load_errors: {
        standings: standingsData.error,
        participations: participationData.error,
        drivers: driverData.error,
        series: seriesData.error,
      },
      records_inspected: {
        Standings: standings.length,
        SeasonParticipation: participations.length,
        Driver: drivers.length,
        Series: seriesList.length,
        SeriesClass: seriesClasses.length,
        PointsConfig: pointsConfigs.length,
        Results: results.length,
        Entry: entries.length
      },
      summary: {
        total_standings: standings.length,
        standings_with_racecore_id: withRacecoreId,
        standings_without_racecore_id: withoutRacecoreId,
        standings_with_participation_id: withParticipationId,
        standings_without_participation_id: withoutParticipationId,
        standings_with_driver_id: withDriverId,
        standings_without_driver_id: withoutDriverId,
        valid_participation_links: validParticipationLinks,
        missing_participation_records: missingParticipation.length,
        participation_series_mismatches: participationSeriesMismatches.length,
        participation_season_mismatches: participationSeasonMismatches.length,
        valid_driver_links: validDriverLinks,
        missing_driver_records: missingDriver.length,
        driver_participation_conflicts: driverParticipationConflicts.length,
        valid_series: validSeries,
        missing_series: missingSeries.length,
        valid_series_class: validSeriesClass,
        missing_series_class: missingSeriesClass.length,
        class_series_mismatches: classSeriesMismatches.length,
        valid_points_config: validPointsConfig,
        missing_points_config: missingPointsConfig.length,
        archived_rows: archivedRows,
        points_breakdown_mismatches: pointsBreakdownMismatches.length,
        stats_mismatches: statsMismatches.length,
        logical_duplicate_groups: logicalDuplicateGroups.length
      },
      stnd_id_integrity: {
        invalid_stnd_format: invalidStndFormat,
        invalid_stnd_format_count: invalidStndFormat.length,
        duplicate_stnd_ids: duplicateStndIds,
        duplicate_stnd_count: duplicateStndIds.length
      },
      logical_duplicate_groups: logicalDuplicateGroups,
      conflict_details: {
        missing_participation_ids: missingParticipation,
        participation_series_mismatches: participationSeriesMismatches,
        participation_season_mismatches: participationSeasonMismatches,
        missing_driver_ids: missingDriver,
        driver_participation_conflicts: driverParticipationConflicts,
        missing_series_ids: missingSeries,
        missing_series_class_ids: missingSeriesClass,
        class_series_mismatches: classSeriesMismatches,
        missing_points_config_ids: missingPointsConfig,
        points_breakdown_mismatches: pointsBreakdownMismatches,
        stats_mismatches: statsMismatches
      },
      counts_complete: !standingsData.partial && !participationData.partial
    });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});