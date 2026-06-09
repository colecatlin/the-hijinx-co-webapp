/**
 * approvePenalty
 * R9BP Sprint 1 — Approves a Proposed penalty.
 * Does NOT apply cascade to Results — that is Sprint 2 (applyPenaltyCascade).
 * Permission: admin OR canApprovePenalty (Race Director / Competition Director / Chief Steward)
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const APPROVE_ROLES = ['Race Director', 'Competition Director', 'Chief Steward'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { penalty_id, internal_note } = await req.json();
    if (!penalty_id) return Response.json({ error: 'penalty_id is required' }, { status: 400 });

    const penalties = await base44.asServiceRole.entities.Penalty.filter({ id: penalty_id });
    if (!penalties || penalties.length === 0) return Response.json({ error: 'Penalty not found' }, { status: 404 });
    const penalty = penalties[0];

    // Permission check
    if (user.role !== 'admin') {
      const officials = await base44.asServiceRole.entities.EventOfficial.filter({
        event_id: penalty.event_id, user_id: user.id,
      });
      const permitted = officials.some(
        (o) => APPROVE_ROLES.includes(o.role) && ['Invited', 'Confirmed', 'Active'].includes(o.status)
      );
      if (!permitted) return Response.json({ error: 'Forbidden: canApprovePenalty required' }, { status: 403 });
    }

    // Guard: must be Proposed
    if (penalty.status !== 'Proposed') {
      return Response.json({
        error: `Cannot approve: penalty is already ${penalty.status}`,
        current_status: penalty.status,
      }, { status: 409 });
    }

    const updates = {
      status: 'Approved',
      approved_by_user_id: user.id,
      approved_at: new Date().toISOString(),
    };
    if (internal_note) updates.internal_note = internal_note;

    const updated = await base44.asServiceRole.entities.Penalty.update(penalty_id, updates);

    base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'penalty_approved',
      status: 'success',
      entity_name: 'Penalty',
      entity_id: penalty_id,
      event_id: penalty.event_id,
      message: `${penalty.penalty_number} approved by ${user.id}`,
      metadata: { penalty_number: penalty.penalty_number, penalty_type: penalty.penalty_type, approved_by: user.id },
    }).catch(() => {});

    return Response.json({ penalty: updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});