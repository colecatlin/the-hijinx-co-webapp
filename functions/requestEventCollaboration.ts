import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId, trackId, seriesId, requestedByType } = await req.json();

    if (!eventId || !trackId || !seriesId || !requestedByType) {
      return Response.json({
        ok: false,
        error: 'Missing required fields: eventId, trackId, seriesId, requestedByType'
      }, { status: 400 });
    }

    // Create or get EventCollaboration
    const existing = await base44.asServiceRole.entities.EventCollaboration.filter({
      event_id: eventId,
      track_id: trackId,
      series_id: seriesId
    });

    let collaboration;
    if (existing.length === 0) {
      collaboration = await base44.asServiceRole.entities.EventCollaboration.create({
        event_id: eventId,
        track_id: trackId,
        series_id: seriesId,
        requested_by_type: requestedByType,
        requested_by_user_id: user.id || user.email,
        requested_date: new Date().toISOString(),
        track_acceptance: 'pending',
        series_acceptance: 'pending'
      });
    } else {
      collaboration = existing[0];
    }

    // Update Event to pending states (unless admin initiated)
    const eventUpdate = {
      track_publish_state: 'pending',
      series_publish_state: 'pending',
      publish_ready: false,
      public_status: 'draft'
    };

    await base44.asServiceRole.entities.Event.update(eventId, eventUpdate);

    // Log operation
    await base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'event_collaboration_requested',
      status: 'success',
      entity_type: 'Event',
      entity_id: eventId,
      details: {
        event_id: eventId,
        track_id: trackId,
        series_id: seriesId,
        requested_by_type: requestedByType
      }
    });

    return Response.json({ ok: true, collaboration });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});