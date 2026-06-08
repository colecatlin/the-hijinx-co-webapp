import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId, publisherType } = await req.json();

    if (!eventId || !publisherType) {
      return Response.json({
        ok: false,
        error: 'Missing required fields: eventId, publisherType'
      }, { status: 400 });
    }

    if (!['track', 'series', 'admin'].includes(publisherType)) {
      return Response.json({ ok: false, error: 'publisherType must be track, series, or admin' }, { status: 400 });
    }

    // Load Event
    const events = await base44.asServiceRole.entities.Event.filter({ id: eventId });
    if (events.length === 0) {
      return Response.json({ ok: false, error: 'Event not found' }, { status: 404 });
    }

    const event = events[0];
    const eventUpdate = {};
    let failureReason = null;

    // Authorization: validate caller has permission for the given publisherType
    if (publisherType === 'admin') {
      if (user.role !== 'admin') {
        return Response.json({ ok: false, error: 'Forbidden: admin publisherType requires admin role' }, { status: 403 });
      }
    } else if (publisherType === 'track') {
      if (user.role !== 'admin') {
        const trackId = event.track_id;
        if (!trackId) return Response.json({ ok: false, error: 'Event has no track associated' }, { status: 403 });
        const collabs = await base44.asServiceRole.entities.EntityCollaborator.filter({ entity_type: 'Track', entity_id: trackId }).catch(() => []);
        const hasAccess = collabs.some(c => (c.user_id === user.id || c.user_email === user.email) && ['owner', 'editor'].includes(c.role));
        if (!hasAccess) return Response.json({ ok: false, error: 'Forbidden: must be track owner or editor' }, { status: 403 });
      }
    } else if (publisherType === 'series') {
      if (user.role !== 'admin') {
        const seriesId = event.series_id;
        if (!seriesId) return Response.json({ ok: false, error: 'Event has no series associated' }, { status: 403 });
        const collabs = await base44.asServiceRole.entities.EntityCollaborator.filter({ entity_type: 'Series', entity_id: seriesId }).catch(() => []);
        const hasAccess = collabs.some(c => (c.user_id === user.id || c.user_email === user.email) && ['owner', 'editor'].includes(c.role));
        if (!hasAccess) return Response.json({ ok: false, error: 'Forbidden: must be series owner or editor' }, { status: 403 });
      }
    }

    // Validate and update based on publisherType
    if (publisherType === 'track') {
      const trackState = event.track_publish_state || 'pending';
      if (!['accepted', 'published'].includes(trackState)) {
        failureReason = `Track cannot publish: current state is ${trackState}. Must be accepted or published first.`;
        return Response.json({
          ok: false,
          error: failureReason,
          reason: failureReason
        }, { status: 403 });
      }
      eventUpdate.track_publish_state = 'published';
    } else if (publisherType === 'series') {
      const seriesState = event.series_publish_state || 'pending';
      if (!['accepted', 'published'].includes(seriesState)) {
        failureReason = `Series cannot publish: current state is ${seriesState}. Must be accepted or published first.`;
        return Response.json({
          ok: false,
          error: failureReason,
          reason: failureReason
        }, { status: 403 });
      }
      eventUpdate.series_publish_state = 'published';
    } else if (publisherType === 'admin') {
      eventUpdate.track_publish_state = 'published';
      eventUpdate.series_publish_state = 'published';
    }

    // Apply update and check if both are now published
    await base44.asServiceRole.entities.Event.update(eventId, eventUpdate);

    // Reload to check both states
    const updated = await base44.asServiceRole.entities.Event.filter({ id: eventId });
    const updatedEvent = updated[0];

    const trackPublished = updatedEvent.track_publish_state === 'published';
    const seriesPublished = updatedEvent.series_publish_state === 'published';

    if (trackPublished && seriesPublished) {
      await base44.asServiceRole.entities.Event.update(eventId, {
        publish_ready: true,
        public_status: 'published'
      });
    }

    // Log operation
    await base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'event_publish_attempt',
      status: 'success',
      entity_type: 'Event',
      entity_id: eventId,
      details: {
        event_id: eventId,
        publisher_type: publisherType,
        track_state: trackPublished ? 'published' : eventUpdate.track_publish_state || event.track_publish_state,
        series_state: seriesPublished ? 'published' : eventUpdate.series_publish_state || event.series_publish_state,
        publish_ready: trackPublished && seriesPublished
      }
    });

    return Response.json({
      ok: true,
      event: updatedEvent,
      publish_ready: trackPublished && seriesPublished
    });
  } catch (error) {
    await base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'event_publish_attempt',
      status: 'failed',
      entity_type: 'Event',
      entity_id: eventId,
      details: { error: error.message }
    }).catch(() => {});
    
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});