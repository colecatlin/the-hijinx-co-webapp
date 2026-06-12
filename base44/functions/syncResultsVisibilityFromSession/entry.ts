import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

async function isEventCollaborator(base44, userId, userEmail, eventId, seriesId) {
  const collabs = await base44.asServiceRole.entities.EntityCollaborator.filter({
    user_id: userId,
  }).catch(() => []);

  const allowed = new Set(['owner', 'editor']);
  return collabs.some(c =>
    allowed.has(c.role) && (
      (c.entity_type === 'Event'  && c.entity_id === eventId) ||
      (c.entity_type === 'Series' && c.entity_id === seriesId)
    )
  );
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { session_id } = await req.json();

    if (!session_id) {
      return Response.json({ error: 'session_id required' }, { status: 400 });
    }

    // 1) Load Session
    const session = await base44.asServiceRole.entities.Session.filter({ id: session_id }).then(r => r?.[0]).catch(() => null);
    if (!session) {
      return Response.json({ error: 'Session not found' }, { status: 404 });
    }

    // 2) Authorization: admin, or event/series collaborator
    if (user.role !== 'admin') {
      const event = await base44.asServiceRole.entities.Event.filter({ id: session.event_id }).then(r => r?.[0]).catch(() => null);
      const seriesId = event?.series_id || null;
      const allowed = await isEventCollaborator(base44, user.id, user.email, session.event_id, seriesId);
      if (!allowed) {
        return Response.json({ error: 'Forbidden: must be admin or event/series collaborator' }, { status: 403 });
      }
    }

    // 3) Determine shouldBePublic + status_state from session status
    const shouldBePublic = ['Official', 'Locked'].includes(session.status);

    // Map Session.status → Result.status_state
    const STATUS_STATE_MAP = {
      'Draft':       'Draft',
      'Provisional': 'Provisional',
      'Official':    'Official',
      'Locked':      'Locked',
    };
    const status_state = STATUS_STATE_MAP[session.status] || 'Draft';

    // 4) Load all Results for this session
    const results = await base44.asServiceRole.entities.Results.filter({ session_id });

    // 5) Update is_public + status_state for each result
    const updates = results.map(r =>
      base44.asServiceRole.entities.Results.update(r.id, {
        is_public: shouldBePublic,
        status_state,
      })
    );
    await Promise.all(updates);

    // 5) Write OperationLog
    await base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'results_visibility_sync',
      status: 'success',
      entity_name: 'Results',
      entity_id: session_id,
      event_id: session.event_id,
      message: `Results visibility synced: ${results.length} rows set is_public=${shouldBePublic}, status_state=${status_state}`,
      metadata: {
        session_id,
        session_status: session.status,
        shouldBePublic,
        status_state,
        resultCount: results.length,
      },
    }).catch(() => {});

    // Fire-and-forget: create ActivityFeed item when results become official/public
    if (shouldBePublic && results.length > 0) {
      const eventId = session.event_id;
      base44.functions.invoke('createActivityFeedItemSafe', {
        activity_type: 'results_posted',
        title: `Official results posted`,
        description: `Results are now available for this event.`,
        entity_type: 'event',
        entity_id: eventId || null,
        related_event_id: eventId || null,
        visibility: 'public',
      }).catch(() => {});
    }

    // R9DC Phase 5: AuditLog for Result Official / Lock publication events
    if (shouldBePublic && results.length > 0) {
      base44.asServiceRole.entities.AuditLog.create({
        entity_type: 'Session',
        entity_id: session_id,
        entity_name: `Session publication — ${session.name}`,
        action: status_state === 'Locked' ? 'lifecycle_change' : 'status_changed',
        performed_by: user.id,
        performed_by_name: user.full_name || user.email || user.id,
        timestamp: new Date().toISOString(),
        after_data: { status_state, is_public: shouldBePublic, results_count: results.length },
        event_id: session.event_id || null,
        notes: `Results visibility sync — session ${session.name} → ${status_state}`,
      }).catch(() => {});
    }

    return Response.json({
      session_id,
      shouldBePublic,
      status_state,
      updatedCount: results.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});