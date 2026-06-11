/**
 * R9CS — createAuditLog
 * Universal audit log writer. Called by all mutating operations.
 * Can be invoked as a standalone function or called internally.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const {
      entity_type,
      entity_id,
      entity_name,
      action,
      before_data,
      after_data,
      notes,
      event_id,
    } = await req.json();

    if (!entity_type || !entity_id || !action) {
      return Response.json({ error: 'entity_type, entity_id, action required' }, { status: 400 });
    }

    const log = await base44.entities.AuditLog.create({
      entity_type,
      entity_id,
      entity_name: entity_name || entity_id,
      action,
      before_data: before_data || null,
      after_data: after_data || null,
      performed_by: user.id,
      performed_by_name: user.full_name || user.email || user.id,
      timestamp: new Date().toISOString(),
      notes: notes || null,
      event_id: event_id || null,
    });

    return Response.json({ success: true, log_id: log.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});