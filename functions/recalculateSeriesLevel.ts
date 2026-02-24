import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json().catch(() => ({}));
    // Support both direct call with series_id and entity automation payload
    const seriesId = body.series_id || body.event?.entity_id || (body.data?.series_id);

    if (!seriesId) {
      return Response.json({ error: 'series_id is required' }, { status: 400 });
    }

    // Fetch all active classes for this series
    const allClasses = await base44.asServiceRole.entities.SeriesClass.filter({
      series_id: seriesId,
      active: true,
    });

    if (!allClasses || allClasses.length === 0) {
      // No active classes — clear derived values
      await base44.asServiceRole.entities.Series.update(seriesId, {
        derived_competition_level: null,
        derived_competition_score: null,
      });
      return Response.json({ message: 'No active classes found. Cleared derived values.', series_id: seriesId });
    }

    // Compute score total for each class
    const classesWithScores = allClasses.map((cls) => {
      const score =
        (cls.media_score || 0) +
        (cls.attendance_score || 0) +
        (cls.purse_score || 0) +
        (cls.manufacturer_score || 0) +
        (cls.geographic_diversity_score || 0) +
        (cls.team_budget_score || 0);
      return { ...cls, score_total: score };
    });

    // Derived competition level = highest competition_level among active classes
    const maxLevel = Math.max(...classesWithScores.map((c) => c.competition_level || 0));

    // Derived competition score = highest score total among active classes
    const maxScore = Math.max(...classesWithScores.map((c) => c.score_total));

    await base44.asServiceRole.entities.Series.update(seriesId, {
      derived_competition_level: maxLevel > 0 ? maxLevel : null,
      derived_competition_score: maxScore > 0 ? maxScore : null,
    });

    return Response.json({
      message: 'Series derived values updated successfully.',
      series_id: seriesId,
      derived_competition_level: maxLevel > 0 ? maxLevel : null,
      derived_competition_score: maxScore > 0 ? maxScore : null,
      classes_evaluated: classesWithScores.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});