import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { series_id, season, series_class_id } = await req.json();

    if (!series_id || !season) {
      return Response.json({ ok: false, error: 'Missing series_id or season' }, { status: 400 });
    }

    // Resolve the correct PointsConfig
    const configRes = await base44.functions.invoke('resolvePointsConfig', {
      series_id,
      series_class_id,
      season
    });

    if (!configRes.data?.ok) {
      await base44.asServiceRole.entities.OperationLog.create({
        operation_type: 'standings_recalculated',
        status: 'error',
        error_message: configRes.data?.error || 'Failed to resolve PointsConfig',
        entity_type: 'Standings',
        details: { series_id, season, series_class_id }
      });
      return Response.json({ ok: false, error: configRes.data?.error || 'No PointsConfig found' }, { status: 404 });
    }

    const pointsConfig = configRes.data.pointsConfig;

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
      if (series_class_id && r.series_class_id !== series_class_id) {
        return false;
      }
      return applicableSessionTypes.includes(r.session_type);
    });

    // Aggregate points per driver
    const driverStandings = {};

    for (const result of filteredResults) {
      const driverId = result.driver_id;
      if (!driverId) continue;

      if (!driverStandings[driverId]) {
        driverStandings[driverId] = {
          driver_id: driverId,
          series_id,
          season,
          series_class_id: series_class_id || null,
          total_points: 0,
          wins: 0,
          seconds: 0,
          thirds: 0,
          results_count: 0
        };
      }

      const standing = driverStandings[driverId];

      // Calculate points from position
      if (result.position && result.position > 0) {
        const posIndex = result.position - 1;
        const points = pointsConfig.points_by_position[posIndex] || 0;
        standing.total_points += points;

        if (result.position === 1) standing.wins++;
        else if (result.position === 2) standing.seconds++;
        else if (result.position === 3) standing.thirds++;
      }

      standing.results_count++;
    }

    // Write standings records if entity exists
    const standingsArray = Object.values(driverStandings);

    try {
      const existingStandings = await base44.asServiceRole.entities.Standings.filter({
        series_id,
        season
      });

      // Delete old standings for this series/season/class
      for (const standing of existingStandings) {
        if (!series_class_id || standing.series_class_id === series_class_id) {
          await base44.asServiceRole.entities.Standings.delete(standing.id);
        }
      }

      // Create new standings
      for (const standing of standingsArray) {
        standing.last_calculated = new Date().toISOString();
        await base44.asServiceRole.entities.Standings.create(standing);
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
        pointsConfigId: pointsConfig.id,
        standingsCount: standingsArray.length,
        resultsProcessed: filteredResults.length
      }
    });

    return Response.json({
      ok: true,
      pointsConfig,
      standingsCount: standingsArray.length,
      resultsProcessed: filteredResults.length,
      standings: standingsArray
    });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});