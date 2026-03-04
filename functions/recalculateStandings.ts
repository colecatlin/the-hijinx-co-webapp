import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { series_id, season_year, series_class_id, event_id, force_default } = await req.json();

    if (!series_id || !season_year) {
      return Response.json({ error: 'Missing required: series_id, season_year' }, { status: 400 });
    }

    // Load PointsConfig
    let config = null;
    
    if (!force_default) {
      // Try specific class config first
      const classConfigs = await base44.entities.PointsConfig.filter({
        series_id,
        season_year,
        series_class_id: series_class_id || null,
        status: 'Active'
      });
      
      if (classConfigs.length > 0) {
        config = classConfigs[0];
      } else if (series_class_id) {
        // Fall back to series-wide config
        const seriesConfigs = await base44.entities.PointsConfig.filter({
          series_id,
          season_year,
          status: 'Active'
        });
        const seriesConfig = seriesConfigs.find(c => !c.series_class_id);
        if (seriesConfig) config = seriesConfig;
      }
    }

    // Use default if no config found
    const pointsTable = config?.points_table_json || buildDefaultPointsTable();
    const dnfPolicy = config?.dnf_policy || 'finish_position_points';
    const dnfMin = config?.dnf_minimum_points || 0;
    const dropRounds = config?.drop_rounds || 0;
    const applyTo = config?.apply_to_session_types || ['Final'];
    const participationPoints = config?.participation_points || 0;
    const tieBreakOrder = config?.tie_break_order || ['wins', 'seconds', 'thirds', 'best_recent_finish'];

    // Load Results
    let resultsQuery = {
      series_id,
      session_type: { $in: applyTo }
    };

    const results = await base44.entities.Results.filter(resultsQuery);
    
    // Filter by class if specified
    let relevantResults = results;
    if (series_class_id) {
      relevantResults = results.filter(r => r.series_class_id === series_class_id);
    }

    // Filter by event if specified
    if (event_id) {
      relevantResults = relevantResults.filter(r => r.event_id === event_id);
    }

    // Group by driver and compute standings
    const standingsByDriver = {};
    
    relevantResults.forEach(result => {
      if (!result.driver_id) return;
      
      if (!standingsByDriver[result.driver_id]) {
        standingsByDriver[result.driver_id] = {
          driver_id: result.driver_id,
          points_total: 0,
          wins: 0,
          seconds: 0,
          thirds: 0,
          podiums: 0,
          top5: 0,
          top10: 0,
          rounds_data: []
        };
      }

      const driver = standingsByDriver[result.driver_id];
      let points = 0;

      if (result.status === 'Running') {
        const position = result.position || result.heat_number;
        if (position && pointsTable[String(position)]) {
          points = pointsTable[String(position)];
        }

        // Track finishes
        if (position === 1) driver.wins++;
        else if (position === 2) driver.seconds++;
        else if (position === 3) driver.thirds++;
        if (position <= 3) driver.podiums++;
        if (position <= 5) driver.top5++;
        if (position <= 10) driver.top10++;
      } else if (result.status === 'DNF' || result.status === 'DNS') {
        if (dnfPolicy === 'minimum_points') {
          points = dnfMin;
        } else if (dnfPolicy === 'finish_position_points' && result.position) {
          points = pointsTable[String(result.position)] || 0;
        }
      }

      driver.rounds_data.push({ event_id: result.event_id, points, date: result.created_date });
      driver.points_total += points;
    });

    // Apply drop rounds if needed
    if (dropRounds > 0) {
      Object.values(standingsByDriver).forEach(driver => {
        if (driver.rounds_data.length > dropRounds) {
          driver.rounds_data.sort((a, b) => a.points - b.points);
          const dropped = driver.rounds_data.splice(0, dropRounds);
          driver.points_total = driver.rounds_data.reduce((sum, r) => sum + r.points, 0);
        }
      });
    }

    // Add participation points for missing entries
    if (participationPoints > 0) {
      const entries = await base44.entities.Entry.filter({ event_id });
      entries.forEach(entry => {
        if (entry.series_class_id === series_class_id || !series_class_id) {
          if (!standingsByDriver[entry.driver_id]) {
            standingsByDriver[entry.driver_id] = {
              driver_id: entry.driver_id,
              points_total: participationPoints,
              wins: 0,
              seconds: 0,
              thirds: 0,
              podiums: 0,
              top5: 0,
              top10: 0,
              rounds_counted: 1
            };
          }
        }
      });
    }

    // Sort and rank
    const standings = Object.values(standingsByDriver)
      .sort((a, b) => {
        if (b.points_total !== a.points_total) return b.points_total - a.points_total;
        
        for (const criterion of tieBreakOrder) {
          const aVal = a[criterion === 'best_recent_finish' ? 'points_total' : criterion] || 0;
          const bVal = b[criterion === 'best_recent_finish' ? 'points_total' : criterion] || 0;
          if (bVal !== aVal) return bVal - aVal;
        }
        return 0;
      })
      .map((s, idx) => ({
        ...s,
        position: idx + 1,
        rounds_counted: s.rounds_data?.length || 0
      }));

    // Upsert Standings records
    for (const standing of standings) {
      const existing = await base44.entities.Standings.filter({
        series_id,
        series_class_id: series_class_id || null,
        season_year,
        driver_id: standing.driver_id
      });

      const standingData = {
        series_id,
        series_class_id: series_class_id || null,
        season_year,
        driver_id: standing.driver_id,
        position: standing.position,
        points_total: standing.points_total,
        wins: standing.wins,
        seconds: standing.seconds,
        thirds: standing.thirds,
        podiums: standing.podiums,
        top5: standing.top5,
        top10: standing.top10,
        rounds_counted: standing.rounds_counted,
        last_calculated: new Date().toISOString(),
        calculation_source: 'RaceCore',
        points_config_id: config?.id || null,
        metadata_json: { force_default_used: !config && force_default }
      };

      if (existing.length > 0) {
        await base44.entities.Standings.update(existing[0].id, standingData);
      } else {
        await base44.entities.Standings.create(standingData);
      }
    }

    // Log operation
    await base44.entities.OperationLog.create({
      operation_type: 'standings_recalculated',
      series_id,
      season_year,
      series_class_id: series_class_id || null,
      metadata_json: {
        config_id: config?.id,
        drivers_count: standings.length,
        force_default
      }
    });

    return Response.json({
      success: true,
      drivers_processed: standings.length,
      config_used: config?.id || 'default',
      warning: !config && !force_default ? 'Default points table used' : null
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function buildDefaultPointsTable() {
  const table = {};
  const defaults = [25, 20, 16, 13, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
  for (let i = 0; i < defaults.length; i++) {
    table[String(i + 1)] = defaults[i];
  }
  return table;
}