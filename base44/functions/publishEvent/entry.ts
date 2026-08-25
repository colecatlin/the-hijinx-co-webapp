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

    // Authorization: only admins or track/series collaborators (owner/editor) may publish.
    if (user.role !== 'admin') {
      const events = await base44.asServiceRole.entities.Event.filter({ id: event_id });
      if (events.length === 0) return Response.json({ error: 'Event not found' }, { status: 404 });
      const evt = events[0];
      let isAuthorized = false;
      if (evt.track_id) {
        const trackCollabs = await base44.asServiceRole.entities.EntityCollaborator.filter({ entity_type: 'Track', entity_id: evt.track_id }).catch(() => []);
        isAuthorized = trackCollabs.some(c => (c.user_id === user.id || c.user_email === user.email) && ['owner', 'editor'].includes(c.role));
      }
      if (!isAuthorized && evt.series_id) {
        const seriesCollabs = await base44.asServiceRole.entities.EntityCollaborator.filter({ entity_type: 'Series', entity_id: evt.series_id }).catch(() => []);
        isAuthorized = seriesCollabs.some(c => (c.user_id === user.id || c.user_email === user.email) && ['owner', 'editor'].includes(c.role));
      }
      if (!isAuthorized) return Response.json({ error: 'Forbidden: must be admin or a track/series owner or editor' }, { status: 403 });
    }

    // Check if publish is allowed
    const canPublishResponse = await base44.functions.invoke('canPublishEvent', {
      event_id,
      user_id: user_id || user.email
    });

    const canPublish = canPublishResponse.data?.canPublish;
    const reason = canPublishResponse.data?.reason;

    if (!canPublish) {
      return Response.json({
        error: 'Cannot publish event',
        reason
      }, { status: 403 });
    }

    // Atomic lifecycle update via canonical function (status + public_status + published_flag)
    const lifecycleRes = await base44.functions.invoke('setEventLifecycleStatus', {
      event_id,
      new_status: 'Published',
      reason: `publishEvent function called by ${user_id || user.email}`,
    });
    if (!lifecycleRes?.data?.ok) {
      throw new Error(lifecycleRes?.data?.error || 'setEventLifecycleStatus failed');
    }
    const updatedEvent = lifecycleRes.data.event;

    // Fire-and-forget: create ActivityFeed item for published event
    base44.functions.invoke('createActivityFeedItemSafe', {
      activity_type: 'event_created',
      title: `${updatedEvent.name} is now published`,
      description: updatedEvent.series_name || 'Motorsports event',
      entity_type: 'event',
      entity_id: event_id,
      related_event_id: event_id,
      related_series_id: updatedEvent.series_id || null,
      visibility: 'public',
    }).catch(() => {});

    return Response.json({ event: updatedEvent, success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});