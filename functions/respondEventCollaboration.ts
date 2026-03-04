import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId, responderType, decision, userId } = await req.json();

    if (!eventId || !responderType || !decision) {
      return Response.json({
        ok: false,
        error: 'Missing required fields: eventId, responderType, decision'
      }, { status: 400 });
    }

    if (!['track', 'series'].includes(responderType)) {
      return Response.json({ ok: false, error: 'responderType must be track or series' }, { status: 400 });
    }

    if (!['accepted', 'rejected'].includes(decision)) {
      return Response.json({ ok: false, error: 'decision must be accepted or rejected' }, { status: 400 });
    }

    // Load Event and EventCollaboration
    const event = await base44.asServiceRole.entities.Event.filter({ id: eventId });
    if (event.length === 0) {
      return Response.json({ ok: false, error: 'Event not found' }, { status: 404 });
    }

    const collab = await base44.asServiceRole.entities.EventCollaboration.filter({ event_id: eventId });
    if (collab.length === 0) {
      return Response.json({ ok: false, error: 'EventCollaboration not found' }, { status: 404 });
    }

    const eventRecord = event[0];
    const collaborationRecord = collab[0];

    // Update EventCollaboration acceptance
    const collabUpdate = {};
    if (responderType === 'track') {
      collabUpdate.track_acceptance = decision === 'accepted' ? 'accepted' : 'rejected';
      collabUpdate.track_accepted_by_user_id = userId || user.id || user.email;
      collabUpdate.track_accepted_date = new Date().toISOString();
    } else if (responderType === 'series') {
      collabUpdate.series_acceptance = decision === 'accepted' ? 'accepted' : 'rejected';
      collabUpdate.series_accepted_by_user_id = userId || user.id || user.email;
      collabUpdate.series_accepted_date = new Date().toISOString();
    }

    await base44.asServiceRole.entities.EventCollaboration.update(collaborationRecord.id, collabUpdate);

    // Update Event publish states
    const eventUpdate = {};
    if (responderType === 'track') {
      eventUpdate.track_publish_state = decision === 'accepted' ? 'accepted' : 'rejected';
    } else if (responderType === 'series') {
      eventUpdate.series_publish_state = decision === 'accepted' ? 'accepted' : 'rejected';
    }

    // If either rejected, force draft
    if (decision === 'rejected') {
      eventUpdate.public_status = 'draft';
      eventUpdate.publish_ready = false;
    }

    await base44.asServiceRole.entities.Event.update(eventId, eventUpdate);

    // Log operation
    await base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'event_collaboration_response',
      status: 'success',
      entity_type: 'Event',
      entity_id: eventId,
      details: {
        event_id: eventId,
        responder_type: responderType,
        decision: decision
      }
    });

    return Response.json({ ok: true, event: eventRecord, collaboration: collaborationRecord });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});