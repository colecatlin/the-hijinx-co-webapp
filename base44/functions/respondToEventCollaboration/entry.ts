import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { collaboration_id, entity_type, response, user_id } = await req.json();

    if (!collaboration_id || !entity_type || !response) {
      return Response.json({
        error: 'Missing required fields: collaboration_id, entity_type, response'
      }, { status: 400 });
    }

    // Fetch collaboration
    const collaboration = await base44.entities.EventCollaboration.list().then(colls =>
      colls.find(c => c.id === collaboration_id)
    );

    if (!collaboration) {
      return Response.json({ error: 'Collaboration not found' }, { status: 404 });
    }

    // Update acceptance status
    const updateData = {};

    if (entity_type === 'track') {
      updateData.track_acceptance_status = response;
      if (response === 'accepted') {
        updateData.accepted_track_user_id = user_id || user.email;
        updateData.accepted_track_date = new Date().toISOString();
      }
    } else if (entity_type === 'series') {
      updateData.series_acceptance_status = response;
      if (response === 'accepted') {
        updateData.accepted_series_user_id = user_id || user.email;
        updateData.accepted_series_date = new Date().toISOString();
      }
    }

    const updatedCollaboration = await base44.entities.EventCollaboration.update(
      collaboration_id,
      updateData
    );

    // Update Event publish_status based on both acceptance statuses
    const event = await base44.entities.Event.list().then(events =>
      events.find(e => e.id === collaboration.event_id)
    );

    let newPublishStatus = 'Draft';
    if (updatedCollaboration.track_acceptance_status === 'rejected' ||
        updatedCollaboration.series_acceptance_status === 'rejected') {
      newPublishStatus = 'Draft';
    } else if (updatedCollaboration.track_acceptance_status === 'accepted' &&
               updatedCollaboration.series_acceptance_status === 'accepted') {
      newPublishStatus = 'ReadyToPublish';
    } else {
      newPublishStatus = 'PendingAcceptance';
    }

    await base44.entities.Event.update(collaboration.event_id, {
      publish_status: newPublishStatus
    });

    // Log operation
    await base44.entities.OperationLog.create({
      operation_type: 'event_collaboration_response',
      entity_name: 'EventCollaboration',
      entity_id: collaboration_id,
      event_id: collaboration.event_id,
      status: 'success',
      source_type: 'api_function',
      function_name: 'respondToEventCollaboration',
      message: `${entity_type} ${response} collaboration`,
      metadata: {
        collaboration_id,
        event_id: collaboration.event_id,
        entity_type,
        response
      }
    });

    return Response.json({ collaboration: updatedCollaboration, newPublishStatus });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});