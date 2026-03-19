import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { series_id, season, event_id, series_class_id } = await req.json();

    if (!series_id) {
      return Response.json({ ok: false, error: 'Missing series_id' }, { status: 400 });
    }

    // Load active configs for this series
    const configs = await base44.asServiceRole.entities.PointsConfig.filter({
      series_id,
      status: 'active'
    });

    if (configs.length === 0) {
      return Response.json({ ok: false, error: 'No active PointsConfig found', pointsConfig: null });
    }

    const bySeasonPreference = (arr) => {
      if (!season) return arr;
      const match = arr.filter(c => c.season === season || !c.season);
      const exactSeasonMatch = arr.filter(c => c.season === season);
      return exactSeasonMatch.length ? exactSeasonMatch : match;
    };

    const sortBest = (arr) =>
      [...arr].sort((a, b) =>
        (Number(b.priority || 0) - Number(a.priority || 0)) ||
        (new Date(b.created_date || 0).getTime() - new Date(a.created_date || 0).getTime())
      );

    let pool = bySeasonPreference(configs);

    // Resolution hierarchy
    // 1. Event override
    if (event_id) {
      const eventMatch = pool.filter(c => c.event_id === event_id);
      if (eventMatch.length) {
        const chosen = sortBest(eventMatch)[0];
        return Response.json({ ok: true, pointsConfig: chosen });
      }
    }

    // 2. Class-scoped config
    if (series_class_id) {
      const classMatch = pool.filter(c => c.series_class_id === series_class_id && !c.event_id);
      if (classMatch.length) {
        const chosen = sortBest(classMatch)[0];
        return Response.json({ ok: true, pointsConfig: chosen });
      }
    }

    // 3. Default for this series/season
    const defaults = pool.filter(c => c.is_default === true && !c.event_id && !c.series_class_id);
    if (defaults.length) {
      const chosen = sortBest(defaults)[0];
      return Response.json({ ok: true, pointsConfig: chosen });
    }

    // 4. Fallback: highest priority series-level config
    const seriesOnly = pool.filter(c => !c.event_id && !c.series_class_id);
    if (seriesOnly.length) {
      const chosen = sortBest(seriesOnly)[0];
      return Response.json({ ok: true, pointsConfig: chosen });
    }

    // 5. Any active config (broadest fallback)
    if (configs.length) {
      const chosen = sortBest(configs)[0];
      return Response.json({ ok: true, pointsConfig: chosen });
    }

    return Response.json({ ok: false, error: 'No suitable PointsConfig found', pointsConfig: null });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});