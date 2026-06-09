/**
 * approveGridLineup
 * R9BP Sprint 1 — Approves a Draft or Pending Approval GridLineup.
 * Permission: admin OR canApproveGrid
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ALLOWED_ROLES = ['Race Director', 'Competition Director'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { lineup_id } = await req.json();
    if (!lineup_id) return Response.json({ error: 'lineup_id is required' }, { status: 400 });

    const lineups = await base44.asServiceRole.entities.GridLineup.filter({ id: lineup_id });
    if (!lineups || lineups.length === 0) return Response.json({ error: 'GridLineup not found' }, { status: 404 });
    const lineup = lineups[0];

    if (!['Draft', 'Pending Approval'].includes(lineup.status)) {
      return Response.json({ error: `Cannot approve lineup with status: ${lineup.status}` }, { status: 409 });
    }

    if (user.role !== 'admin') {
      const officials = await base44.asServiceRole.entities.EventOfficial.filter({
        event_id: lineup.event_id, user_id: user.id,
      });
      const permitted = officials.some(
        (o) => ALLOWED_ROLES.includes(o.role) && ['Invited', 'Confirmed', 'Active'].includes(o.status)
      );
      if (!permitted) return Response.json({ error: 'Forbidden: canApproveGrid required' }, { status: 403 });
    }

    const updated = await base44.asServiceRole.entities.GridLineup.update(lineup_id, {
      status: 'Approved',
      approved_by_user_id: user.id,
      approved_at: new Date().toISOString(),
    });

    base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'lineup_approved',
      status: 'success',
      entity_name: 'GridLineup',
      entity_id: lineup_id,
      event_id: lineup.event_id,
      message: `Grid lineup approved for session ${lineup.session_id}`,
      metadata: { session_id: lineup.session_id, approved_by: user.id },
    }).catch(() => {});

    return Response.json({ lineup: updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});