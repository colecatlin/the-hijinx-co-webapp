import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      name,
      track_id,
      series_id,
      season,
      event_date,
      end_date,
      created_by_entity_type,
      created_by_entity_id
    } = await req.json();

    if (!name || !event_date || !track_id || !created_by_entity_type || !created_by_entity_id) {
      return Response.json({
        error: 'Missing required fields: name, event_date, track_id, created_by_entity_type, created_by_entity_id'
      }, { status: 400 });
    }

    // If no series_id, create simple event without collaboration
    if (!series_id) {
      const event = await base44.entities.Event.create({
        name,
        track_id,
        series_id: null,
        season,
        event_date,
        end_date,
        status: 'upcoming',
        publish_status: 'Draft',
        created_by_entity_type,
        created_by_entity_id
      });

      await base44.entities.OperationLog.create({
        operation_type: 'event_created',
        entity_name: 'Event',
        entity_id: event.id,
        event_id: event.id,
        status: 'success',
        source_type: 'api_function',
        function_name: 'createEventWithCollaboration',
        message: `Event created: ${name}`,
        metadata: {
          event_id: event.id,
          track_id,
          series_id: null,
          collaboration_id: null
        }
      });

      return Response.json({ event, collaboration: null });
    }

    // Create Event with PendingAcceptance status
    const event = await base44.entities.Event.create({
      name,
      track_id,
      series_id,
      season,
      event_date,
      end_date,
      status: 'upcoming',
      publish_status: 'PendingAcceptance',
      created_by_entity_type,
      created_by_entity_id
    });

    // Determine initial acceptance statuses based on who created it
    let track_acceptance_status = 'pending';
    let series_acceptance_status = 'pending';

    if (created_by_entity_type === 'track') {
      track_acceptance_status = 'accepted';
    } else if (created_by_entity_type === 'series') {
      series_acceptance_status = 'accepted';
    }

    // Create EventCollaboration
    const collaboration = await base44.entities.EventCollaboration.create({
      event_id: event.id,
      track_id,
      series_id,
      created_by_entity_type,
      created_by_entity_id,
      track_acceptance_status,
      series_acceptance_status,
      track_planning_rights: 'edit_only',
      series_planning_rights: 'edit_only',
      publish_gate_mode: 'both_must_accept',
      status: 'active'
    });

    // Update Event with collaboration_id
    const updatedEvent = await base44.entities.Event.update(event.id, {
      collaboration_id: collaboration.id
    });

    // Log operation
    await base44.entities.OperationLog.create({
      operation_type: 'event_created',
      entity_name: 'Event',
      entity_id: event.id,
      event_id: event.id,
      status: 'success',
      source_type: 'api_function',
      function_name: 'createEventWithCollaboration',
      message: `Event created with collaboration: ${name}`,
      metadata: {
        event_id: event.id,
        track_id,
        series_id,
        collaboration_id: collaboration.id
      }
    });

    return Response.json({ event: updatedEvent, collaboration });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});