import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { eventId, seriesClassId } = await req.json();

    if (!eventId) {
      return Response.json({ ok: false, error: 'Missing eventId' }, { status: 400 });
    }

    // Load the event
    const event = await base44.asServiceRole.entities.Event.filter({ id: eventId });
    if (event.length === 0) {
      return Response.json({ ok: false, error: 'Event not found' }, { status: 404 });
    }

    const eventRecord = event[0];
    const seriesId = eventRecord.series_id;
    const trackId = eventRecord.track_id;
    const season = eventRecord.season;

    // Step 1: Check for event override
    if (eventRecord.points_ruleset_id) {
      const rulesets = await base44.asServiceRole.entities.PointsRuleSet.filter({
        id: eventRecord.points_ruleset_id
      });
      if (rulesets.length > 0 && rulesets[0].status === 'active') {
        const ruleset = rulesets[0];
        await base44.asServiceRole.entities.OperationLog.create({
          operation_type: 'points_ruleset_resolved',
          status: 'success',
          entity_type: 'Event',
          entity_id: eventId,
          details: {
            event_id: eventId,
            series_class_id: seriesClassId || null,
            ruleset_id: ruleset.id,
            source: 'event_override'
          }
        }).catch(() => {});
        return Response.json({
          ok: true,
          ruleset,
          source: 'event_override',
          reason: 'Event-specific override is active'
        });
      }
    }

    // Step 2: Load all active rulesets that could match
    const allRulesets = await base44.asServiceRole.entities.PointsRuleSet.filter({
      status: 'active'
    });

    // Helper to match and score
    const matches = [];
    for (const ruleset of allRulesets) {
      let score = 0;
      let matchType = null;

      // Series + Class + Season (highest specificity)
      if (
        ruleset.series_id === seriesId &&
        ruleset.series_class_id === seriesClassId &&
        ruleset.season === season &&
        !ruleset.track_id
      ) {
        score = 6;
        matchType = 'series_class_season';
      }
      // Series + Class (no season)
      else if (
        ruleset.series_id === seriesId &&
        ruleset.series_class_id === seriesClassId &&
        !ruleset.season &&
        !ruleset.track_id
      ) {
        score = 5;
        matchType = 'series_class';
      }
      // Series + Season (no class)
      else if (
        ruleset.series_id === seriesId &&
        ruleset.season === season &&
        !ruleset.series_class_id &&
        !ruleset.track_id
      ) {
        score = 4;
        matchType = 'series_season';
      }
      // Series only
      else if (
        ruleset.series_id === seriesId &&
        !ruleset.series_class_id &&
        !ruleset.season &&
        !ruleset.track_id
      ) {
        score = 3;
        matchType = 'series';
      }
      // Track + Season
      else if (
        ruleset.track_id === trackId &&
        ruleset.season === season &&
        !ruleset.series_id &&
        !ruleset.series_class_id
      ) {
        score = 2;
        matchType = 'track_season';
      }
      // Track only
      else if (
        ruleset.track_id === trackId &&
        !ruleset.series_id &&
        !ruleset.series_class_id &&
        !ruleset.season
      ) {
        score = 1;
        matchType = 'track';
      }

      if (score > 0) {
        matches.push({
          ruleset,
          score,
          matchType,
          createdDate: new Date(ruleset.created_date || 0).getTime()
        });
      }
    }

    if (matches.length === 0) {
      return Response.json({
        ok: true,
        ruleset: null,
        source: 'none',
        reason: 'No matching active ruleset found'
      });
    }

    // Sort by score descending, then by created_date descending
    matches.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.ruleset.priority !== a.ruleset.priority) {
        return Number(b.ruleset.priority || 0) - Number(a.ruleset.priority || 0);
      }
      return b.createdDate - a.createdDate;
    });

    const chosen = matches[0];

    await base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'points_ruleset_resolved',
      status: 'success',
      entity_type: 'Event',
      entity_id: eventId,
      details: {
        event_id: eventId,
        series_class_id: seriesClassId || null,
        ruleset_id: chosen.ruleset.id,
        source: 'series_or_track'
      }
    }).catch(() => {});

    return Response.json({
      ok: true,
      ruleset: chosen.ruleset,
      source: chosen.matchType,
      reason: `Matched by ${chosen.matchType}`
    });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});