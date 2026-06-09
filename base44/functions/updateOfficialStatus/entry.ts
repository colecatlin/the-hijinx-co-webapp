/**
 * updateOfficialStatus
 * R9BP Sprint 1 — Updates EventOfficial status (Confirmed/Active/Withdrawn).
 * Self-confirmation: a user may confirm their own record.
 * Permission: admin OR canManageOfficials OR self-confirming own record
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const MANAGE_ROLES = ['Race Director', 'Competition Director'];
const VALID_STATUSES = ['Invited', 'Confirmed', 'Active', 'Withdrawn'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { official_id, status } = await req.json();
    if (!official_id) return Response.json({ error: 'official_id is required' }, { status: 400 });
    if (!status) return Response.json({ error: 'status is required' }, { status: 400 });
    if (!VALID_STATUSES.includes(status)) {
      return Response.json({ error: `Invalid status: ${status}` }, { status: 400 });
    }

    const officials = await base44.asServiceRole.entities.EventOfficial.filter({ id: official_id });
    if (!officials || officials.length === 0) return Response.json({ error: 'EventOfficial not found' }, { status: 404 });
    const official = officials[0];

    const isSelfConfirming = official.user_id === user.id && status === 'Confirmed';

    if (!isSelfConfirming && user.role !== 'admin') {
      const myOfficials = await base44.asServiceRole.entities.EventOfficial.filter({
        event_id: official.event_id, user_id: user.id,
      });
      const permitted = myOfficials.some(
        (o) => MANAGE_ROLES.includes(o.role) && ['Invited', 'Confirmed', 'Active'].includes(o.status)
      );
      if (!permitted) return Response.json({ error: 'Forbidden: canManageOfficials required' }, { status: 403 });
    }

    const updates = { status };
    if (status === 'Confirmed') updates.confirmed_at = new Date().toISOString();

    const updated = await base44.asServiceRole.entities.EventOfficial.update(official_id, updates);

    base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'official_status_updated',
      status: 'success',
      entity_name: 'EventOfficial',
      entity_id: official_id,
      event_id: official.event_id,
      message: `${official.role} status: ${official.status} → ${status}`,
      metadata: { role: official.role, before: official.status, after: status, updated_by: user.id },
    }).catch(() => {});

    return Response.json({ official: updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});