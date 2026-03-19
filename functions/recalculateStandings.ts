import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { sortStandingsWithTieBreakers } from './standingsTieBreakers.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { series_id, season, series_class_id, event_id } = await req.json();

    if (!series_id) {
      return Response.json({ ok: false, error: 'Missing series_id' }, { status: 400 });
    }

    // Resolve the correct PointsConfig
    const configRes = await base44.functions.invoke('resolvePointsConfig', {
      series_id,
      series_class_id,
      season,
      event_id
    });

    const pointsConfig = configRes.data?.pointsConfig;
    if (!pointsConfig) {
      const errMsg = configRes.data?.error || 'No PointsConfig found for this series/season/class';
      await base44.asServiceRole.entities.OperationLog.create({
        operation_type: 'standings_recalculated',
        status: 'failed',
        error_message: errMsg,
        entity_type: 'Standings',
        details: { series_id, season, series_class_id, event_id, reason: 'no_points_config_found' }
      });
      return Response.json({ ok: false, error: errMsg }, { status: 404 });
    }

    // Load all events for this series and season
    const events = await base44.asServiceRole.entities.Event.filter({
      series_id,
      season
    });

    if (events.length === 0) {
      await base44.asServiceRole.entities.OperationLog.create({
        operation_type: 'standings_recalculated',
        status: 'success',
        entity_type: 'Standings',
        details: { series_id, season, series_class_id, standingsCount: 0 }
      });
      return Response.json({ ok: true, standingsCount: 0, message: 'No events found for this series/season' });
    }

    const eventIds = events.map(e => e.id);
    const eventMap = {};
    events.forEach(e => { eventMap[e.id] = e; });

    // Load all results for these events
    let allResults = [];
    for (const eventId of eventIds) {
      const results = await base44.asServiceRole.entities.Result.filter({
        event_id: eventId,
        series_id
      });
      allResults = allResults.concat(results);
    }

    // Filter by class if specified, and by session types
    const applicableSessionTypes = pointsConfig.applies_to_session_types || ['Final'];
    const filteredResults = allResults.filter(r => {
      if (!r.position || r.position <= 0) return false;
      if (series_class_id && r.series_class_id !== series_class_id) return false;
      return applicableSessionTypes.includes(r.session_type);
    });

    // Build per-driver raw event results for drop rounds
    const driverEvents = {};
    for (const result of filteredResults) {
      const driverId = result.driver_id;
      if (!driverId) continue;
      if (!driverEvents[driverId]) driverEvents[driverId] = [];
      driverEvents[driverId].push({
        event_id: result.event_id,
        event_date: eventMap[result.event_id]?.event_date,
        position: result.position,
        points: pointsConfig.points_by_position[result.position - 1] || 0
      });
    }

    // Apply drop rounds
    const dropRoundsEnabled = pointsConfig.drop_rounds?.enabled && pointsConfig.drop_rounds?.count > 0;
    const dropCount = dropRoundsEnabled ? pointsConfig.drop_rounds.count : 0;
    let droppedRoundsCount = 0;

    if (dropRoundsEnabled) {
      for (const driverId in driverEvents) {
        const events = driverEvents[driverId];
        if (events.length > dropCount) {
          events.sort((a, b) => a.points - b.points);
          const toDropCount = Math.min(dropCount, events.length);
          driverEvents[driverId] = events.slice(toDropCount);
          droppedRoundsCount = toDropCount;
        }
      }
    }

    // Aggregate points per driver with tie-breaker stats
    const driverStandings = {};

    for (const driverId in driverEvents) {
      const events = driverEvents[driverId];
      if (events.length === 0) continue;

      let total = 0;
      let wins = 0;
      let seconds = 0;
      let thirds = 0;
      const finishes = [];
      let latestFinish = null;

      for (let i = 0; i < events.length; i++) {
        const evt = events[i];
        total += evt.points;

        if (evt.position === 1) wins++;
        else if (evt.position === 2) seconds++;
        else if (evt.position === 3) thirds++;

        finishes.push(evt.position);
        latestFinish = evt.position;
      }

      finishes.sort((a, b) => a - b);

      driverStandings[driverId] = {
        driver_id: driverId,
        series_id,
        season_year: season,
        series_class_id: series_class_id || null,
        points_total: total,
        rank: 0,
        wins,
        seconds,
        thirds,
        best_finishes: finishes,
        starts: events.length,
        latest_finish: latestFinish,
        rounds_counted: events.length,
        points_breakdown: events.map(e => ({
          event_id: e.event_id,
          event_date: e.event_date,
          points: e.points,
          finish_position: e.position
        })),
        last_calculated: new Date().toISOString(),
        calculation_source: 'RaceCore',
        points_config_id: pointsConfig.id,
        podiums: (wins + seconds + thirds),
        top5: finishes.filter(f => f <= 5).length,
        top10: finishes.filter(f => f <= 10).length
      };
    }

    // Load drivers for name fields
    let allDrivers = [];
    try {
      allDrivers = await base44.asServiceRole.entities.Driver.list();
    } catch (err) {
      console.log('Could not load drivers:', err.message);
    }
    const driverMap = {};
    allDrivers.forEach(d => { driverMap[d.id] = d; });

    // Apply tie-breaker sorting
    let standingsArray = Object.values(driverStandings);
    standingsArray = standingsArray.map(s => ({
      ...s,
      first_name: driverMap[s.driver_id]?.first_name || '',
      last_name: driverMap[s.driver_id]?.last_name || ''
    }));

    standingsArray = sortStandingsWithTieBreakers(standingsArray, pointsConfig.tie_breaker_order);

    // Write standings records if entity exists
    try {
      const existingStandings = await base44.asServiceRole.entities.Standings.filter({
        series_id,
        season_year: season
      });

      // Delete old standings for this series/season/class
      for (const standing of existingStandings) {
        if (!series_class_id || standing.series_class_id === series_class_id) {
          await base44.asServiceRole.entities.Standings.delete(standing.id);
        }
      }

      // Create new standings
      for (const standing of standingsArray) {
        const { first_name, last_name, ...data } = standing;
        await base44.asServiceRole.entities.Standings.create(data);
      }
    } catch (err) {
      console.log('Standings entity not available or error:', err.message);
    }

    // Log operation
    await base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'standings_recalculated',
      status: 'success',
      entity_type: 'Standings',
      details: {
        series_id,
        season,
        series_class_id,
        event_id,
        points_config_id: pointsConfig.id,
        standingsCount: standingsArray.length,
        resultsProcessed: filteredResults.length,
        dropped_rounds_count: droppedRoundsCount
      }
    });

    return Response.json({
      ok: true,
      pointsConfig,
      standingsCount: standingsArray.length,
      resultsProcessed: filteredResults.length,
      droppedRoundsCount,
      standings: standingsArray
    });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});