import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (user.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const { claim_id, action, reviewer_notes } = await req.json();

  if (!claim_id || !action) {
    return Response.json({ error: 'claim_id and action are required' }, { status: 400 });
  }
  if (!['verified', 'rejected', 'duplicate'].includes(action)) {
    return Response.json({ error: 'action must be verified, rejected, or duplicate' }, { status: 400 });
  }

  // Load the claim
  const claims = await base44.asServiceRole.entities.DriverClaim.filter({ id: claim_id });
  const claim = claims?.[0];
  if (!claim) {
    return Response.json({ error: 'DriverClaim not found' }, { status: 404 });
  }

  const createdIds = {};

  if (action === 'verified') {
    let trackId = null;
    let eventId = null;
    let sessionId = null;

    // Create or find Track
    if (claim.track_name_claimed) {
      const allTracks = await base44.asServiceRole.entities.Track.list();
      const existingTrack = allTracks.find(t =>
        t.name.toLowerCase() === claim.track_name_claimed.toLowerCase()
      );

      if (existingTrack) {
        trackId = existingTrack.id;
      } else {
        const newTrack = await base44.asServiceRole.entities.Track.create({
          name: claim.track_name_claimed,
          location_city: 'Unknown',
          location_country: 'Unknown',
          track_type: 'Other',
          surface_type: 'Asphalt',
          operational_status: 'Active',
        });
        trackId = newTrack.id;
        createdIds.track_id = trackId;
      }
    }

    // Create or find Event
    const allEvents = await base44.asServiceRole.entities.Event.list();
    const existingEvent = allEvents.find(e =>
      e.name?.toLowerCase() === claim.event_name_claimed?.toLowerCase() &&
      e.event_date === claim.event_date_claimed
    );

    if (existingEvent) {
      eventId = existingEvent.id;
    } else {
      const newEvent = await base44.asServiceRole.entities.Event.create({
        name: claim.event_name_claimed,
        event_date: claim.event_date_claimed,
        series_name: claim.series_name_claimed || 'Unknown',
        track_id: trackId || undefined,
        status: 'Completed',
      });
      eventId = newEvent.id;
      createdIds.event_id = eventId;
    }

    // Create Session — use "Final" (valid enum value)
    const newSession = await base44.asServiceRole.entities.Session.create({
      event_id: eventId,
      session_type: 'Final',
      name: 'Main Event',
      status: 'Official',
    });
    sessionId = newSession.id;
    createdIds.session_id = sessionId;

    // Create Result
    const newResult = await base44.asServiceRole.entities.Results.create({
      driver_id: claim.driver_id,
      event_id: eventId,
      session_id: sessionId,
      position: claim.position_claimed || undefined,
      series_id: undefined,
      laps_completed: claim.laps_completed_claimed || undefined,
      best_lap_time_ms: claim.best_lap_time_claimed || undefined,
      status: 'Running',
      status_state: 'Official',
    });
    createdIds.result_id = newResult.id;

    // Update claim with verified result reference
    const updatedClaim = await base44.asServiceRole.entities.DriverClaim.update(claim_id, {
      status: 'verified',
      reviewer_notes: reviewer_notes || '',
      reviewed_by: user.email,
      reviewed_date: new Date().toISOString(),
      verified_result_id: newResult.id,
    });

    // Log operation (best-effort)
    try {
      await base44.asServiceRole.entities.OperationLog.create({
        operation_type: 'driver_claim_verified',
        entity_type: 'DriverClaim',
        entity_id: claim_id,
        performed_by: user.email,
        details: JSON.stringify({ action, created: createdIds }),
      });
    } catch (_) {
      // non-fatal
    }

    return Response.json({ success: true, claim: updatedClaim, created: createdIds });
  }

  // For rejected / duplicate — just update the claim
  const updatedClaim = await base44.asServiceRole.entities.DriverClaim.update(claim_id, {
    status: action,
    reviewer_notes: reviewer_notes || '',
    reviewed_by: user.email,
    reviewed_date: new Date().toISOString(),
  });

  // Log operation (best-effort)
  try {
    await base44.asServiceRole.entities.OperationLog.create({
      operation_type: `driver_claim_${action}`,
      entity_type: 'DriverClaim',
      entity_id: claim_id,
      performed_by: user.email,
      details: JSON.stringify({ action }),
    });
  } catch (_) {
    // non-fatal
  }

  return Response.json({ success: true, claim: updatedClaim, created: {} });
});