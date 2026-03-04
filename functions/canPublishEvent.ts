import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { event_id, user_id } = await req.json();

    if (!event_id) {
      return Response.json({ error: 'event_id is required' }, { status: 400 });
    }

    // Fetch event
    const event = await base44.entities.Event.list().then(events =>
      events.find(e => e.id === event_id)
    );

    if (!event) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }

    // If no collaboration, simple case
    if (!event.collaboration_id) {
      return Response.json({
        canPublish: true,
        reason: 'No collaboration required'
      });
    }

    // Fetch collaboration
    const collaboration = await base44.entities.EventCollaboration.list().then(colls =>
      colls.find(c => c.id === event.collaboration_id)
    );

    if (!collaboration) {
      return Response.json({
        canPublish: false,
        reason: 'Collaboration not found'
      });
    }

    // Check publish gate
    if (collaboration.publish_gate_mode === 'both_must_accept') {
      if (collaboration.track_acceptance_status === 'accepted' &&
          collaboration.series_acceptance_status === 'accepted') {
        return Response.json({
          canPublish: true,
          reason: 'Both sides accepted'
        });
      } else {
        return Response.json({
          canPublish: false,
          reason: 'Both sides must accept before publishing'
        });
      }
    } else if (collaboration.publish_gate_mode === 'either_full_publish') {
      const trackCanPublish = collaboration.track_planning_rights === 'full_publish' &&
                             collaboration.track_acceptance_status === 'accepted';
      const seriesCanPublish = collaboration.series_planning_rights === 'full_publish' &&
                              collaboration.series_acceptance_status === 'accepted';

      if (trackCanPublish || seriesCanPublish) {
        return Response.json({
          canPublish: true,
          reason: 'Either side with full_publish rights and accepted'
        });
      } else {
        return Response.json({
          canPublish: false,
          reason: 'Neither side has full_publish rights and acceptance'
        });
      }
    }

    return Response.json({
      canPublish: false,
      reason: 'Unknown publish gate mode'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});