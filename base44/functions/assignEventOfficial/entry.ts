/**
 * assignEventOfficial
 * R9BP Sprint 1 — Creates an EventOfficial record assigning a user to a role at an event.
 * Blocks duplicate event_id + user_id + role combinations.
 * Permission: admin OR canManageOfficials (Race Director, Competition Director)
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ALLOWED_ROLES = ['Race Director', 'Competition Director'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { event_id, user_id, role, notes } = await req.json();
    if (!event_id) return Response.json({ error: 'event_id is required' }, { status: 400 });
    if (!user_id) return Response.json({ error: 'user_id is required' }, { status: 400 });
    if (!role) return Response.json({ error: 'role is required' }, { status: 400 });

    // Permission check
    if (user.role !== 'admin') {
      const officials = await base44.asServiceRole.entities.EventOfficial.filter({
        event_id, user_id: user.id,
      });
      const permitted = officials.some(
        (o) => ALLOWED_ROLES.includes(o.role) && ['Invited', 'Confirmed', 'Active'].includes(o.status)
      );
      if (!permitted) return Response.json({ error: 'Forbidden: canManageOfficials required' }, { status: 403 });
    }

    // Verify event exists
    const events = await base44.asServiceRole.entities.Event.filter({ id: event_id });
    if (!events || events.length === 0) return Response.json({ error: 'Event not found' }, { status: 404 });

    // Block duplicate: same event + user + role
    const existing = await base44.asServiceRole.entities.EventOfficial.filter({
      event_id, user_id, role,
    });
    const activeExisting = existing.filter((o) => o.status !== 'Withdrawn');
    if (activeExisting.length > 0) {
      return Response.json({
        error: `User already assigned as ${role} for this event`,
        existing_id: activeExisting[0].id,
      }, { status: 409 });
    }

    const official = await base44.asServiceRole.entities.EventOfficial.create({
      event_id,
      user_id,
      role,
      status: 'Invited',
      assigned_by_user_id: user.id,
      notes: notes || '',
    });

    base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'official_assigned',
      status: 'success',
      entity_name: 'EventOfficial',
      entity_id: official.id,
      event_id,
      message: `${user_id} assigned as ${role} for event ${event_id}`,
      metadata: { user_id, role, assigned_by: user.id },
    }).catch(() => {});

    return Response.json({ official });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});