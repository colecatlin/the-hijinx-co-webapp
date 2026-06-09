/**
 * createSessionNote
 * R9BP Sprint 1 — Adds a note to the session/event official log.
 * Permission: admin OR canCreateSessionNote
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const NOTE_ROLES = [
  'Race Director', 'Competition Director', 'Chief Steward', 'Steward',
  'Timing and Scoring', 'Announcer', 'Safety Director',
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { event_id, session_id, note_type, body, lap_number, is_public, author_role } = await req.json();

    if (!event_id) return Response.json({ error: 'event_id is required' }, { status: 400 });
    if (!note_type) return Response.json({ error: 'note_type is required' }, { status: 400 });
    if (!body) return Response.json({ error: 'body is required' }, { status: 400 });

    // Permission check
    if (user.role !== 'admin') {
      const officials = await base44.asServiceRole.entities.EventOfficial.filter({
        event_id, user_id: user.id,
      });
      const permitted = officials.some(
        (o) => NOTE_ROLES.includes(o.role) && ['Invited', 'Confirmed', 'Active'].includes(o.status)
      );
      if (!permitted) return Response.json({ error: 'Forbidden: canCreateSessionNote required' }, { status: 403 });
    }

    // Derive author role from EventOfficial record if not provided
    let resolvedRole = author_role || '';
    if (!resolvedRole) {
      const myOfficials = await base44.asServiceRole.entities.EventOfficial.filter({
        event_id, user_id: user.id,
      });
      if (myOfficials && myOfficials.length > 0) {
        resolvedRole = myOfficials[0].role;
      }
    }

    const note = await base44.asServiceRole.entities.SessionNote.create({
      event_id,
      session_id: session_id || undefined,
      note_type,
      body,
      lap_number: lap_number || undefined,
      is_public: is_public || false,
      author_user_id: user.id,
      author_role: resolvedRole,
      created_at: new Date().toISOString(),
    });

    base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'session_note_added',
      status: 'success',
      entity_name: 'SessionNote',
      entity_id: note.id,
      event_id,
      message: `[${note_type}] ${body.substring(0, 80)}`,
      metadata: { note_type, session_id, author: user.id, author_role: resolvedRole },
    }).catch(() => {});

    return Response.json({ note });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});