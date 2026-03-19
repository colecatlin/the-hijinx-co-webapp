import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId, seriesClassId } = await req.json();

    if (!eventId) {
      return Response.json({ error: 'eventId is required' }, { status: 400 });
    }

    // Fetch event and its associated series/track
    const event = await base44.entities.Event.list().then(events =>
      events.find(e => e.id === eventId)
    );

    if (!event) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }

    // Step 1: Check for event-specific override
    if (event.points_ruleset_id) {
      const ruleset = await base44.entities.PointsRuleSet.list().then(rulesets =>
        rulesets.find(r => r.id === event.points_ruleset_id)
      );

      if (ruleset && ruleset.status === 'active') {
        // Log operation
        await base44.entities.OperationLog.create({
          operation_type: 'points_ruleset_resolved',
          entity_name: 'Event',
          entity_id: eventId,
          event_id: eventId,
          status: 'success',
          source_type: 'api_function',
          function_name: 'resolvePointsRuleSet',
          message: `Resolved ruleset: ${ruleset.name} (event override)`,
          metadata: {
            event_id: eventId,
            series_class_id: seriesClassId,
            ruleset_id: ruleset.id,
            source: 'event_override'
          }
        });

        return Response.json({
          ruleset,
          source: 'event_override',
          reason: 'Event has explicit override'
        });
      }
    }

    // Step 2: Match by most specific criteria
    const allRulesets = await base44.entities.PointsRuleSet.list().then(rulesets =>
      rulesets.filter(r => r.status === 'active')
    );

    const matches = [];

    // a) series_id + class_id + season
    matches.push(
      ...allRulesets.filter(r =>
        r.series_id === event.series_id &&
        r.series_class_id === seriesClassId &&
        r.season === event.season
      ).map(r => ({ ...r, specificity: 6 }))
    );

    // b) series_id + class_id
    if (matches.length === 0) {
      matches.push(
        ...allRulesets.filter(r =>
          r.series_id === event.series_id &&
          r.series_class_id === seriesClassId &&
          !r.season
        ).map(r => ({ ...r, specificity: 5 }))
      );
    }

    // c) series_id + season
    if (matches.length === 0) {
      matches.push(
        ...allRulesets.filter(r =>
          r.series_id === event.series_id &&
          !r.series_class_id &&
          r.season === event.season
        ).map(r => ({ ...r, specificity: 4 }))
      );
    }

    // d) series_id only
    if (matches.length === 0) {
      matches.push(
        ...allRulesets.filter(r =>
          r.series_id === event.series_id &&
          !r.series_class_id &&
          !r.season
        ).map(r => ({ ...r, specificity: 3 }))
      );
    }

    // e) track_id + season
    if (matches.length === 0) {
      matches.push(
        ...allRulesets.filter(r =>
          r.track_id === event.track_id &&
          r.season === event.season
        ).map(r => ({ ...r, specificity: 2 }))
      );
    }

    // f) track_id only
    if (matches.length === 0) {
      matches.push(
        ...allRulesets.filter(r =>
          r.track_id === event.track_id &&
          !r.season
        ).map(r => ({ ...r, specificity: 1 }))
      );
    }

    if (matches.length === 0) {
      // Log failure
      await base44.entities.OperationLog.create({
        operation_type: 'points_ruleset_resolved',
        entity_name: 'Event',
        entity_id: eventId,
        event_id: eventId,
        status: 'failed',
        source_type: 'api_function',
        function_name: 'resolvePointsRuleSet',
        message: 'No active ruleset found for event',
        metadata: {
          event_id: eventId,
          series_class_id: seriesClassId,
          source: 'none'
        }
      });

      return Response.json({
        ruleset: null,
        source: 'none',
        reason: 'No active ruleset found matching event criteria'
      });
    }

    // Sort by priority (desc) then created_date (desc)
    matches.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return new Date(b.created_date) - new Date(a.created_date);
    });

    const selected = matches[0];
    const source = selected.series_id ? 'series' : 'track';

    // Log success
    await base44.entities.OperationLog.create({
      operation_type: 'points_ruleset_resolved',
      entity_name: 'Event',
      entity_id: eventId,
      event_id: eventId,
      status: 'success',
      source_type: 'api_function',
      function_name: 'resolvePointsRuleSet',
      message: `Resolved ruleset: ${selected.name} (${source})`,
      metadata: {
        event_id: eventId,
        series_class_id: seriesClassId,
        ruleset_id: selected.id,
        source
      }
    });

    return Response.json({
      ruleset: selected,
      source,
      reason: `Matched ${source} ruleset with specificity ${selected.specificity}`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});