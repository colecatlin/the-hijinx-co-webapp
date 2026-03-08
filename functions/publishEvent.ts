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

    // Update event status
    const updatedEvent = await base44.entities.Event.update(event_id, {
      publish_status: 'Published',
      published_by_user_id: user_id || user.email,
      published_date: new Date().toISOString(),
      status: 'Published'
    });

    // Log operation
    await base44.entities.OperationLog.create({
      operation_type: 'event_published',
      entity_name: 'Event',
      entity_id: event_id,
      event_id,
      status: 'success',
      source_type: 'api_function',
      function_name: 'publishEvent',
      message: `Event published: ${updatedEvent.name}`,
      metadata: {
        event_id,
        published_by_user_id: user_id || user.email
      }
    });

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