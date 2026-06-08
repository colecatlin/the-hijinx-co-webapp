/**
 * logDeletion.js
 *
 * Creates an OperationLog entry for entity deletion events.
 * Called by admin management pages (ManageDrivers, ManageTeams,
 * ManageTracks, ManageSeries, ManageEvents) after deleting records.
 *
 * Input:  { entityName, recordIds, recordNames? }
 * Output: { ok: true, logged: number }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const { entityName, recordIds = [], recordNames = [] } = await req.json();

    if (!entityName || !Array.isArray(recordIds) || recordIds.length === 0) {
      return Response.json({ error: 'entityName and recordIds are required' }, { status: 400 });
    }

    const now = new Date().toISOString();

    // Log one OperationLog entry per deleted record for full audit trail
    const logs = recordIds.map((id, idx) =>
      base44.asServiceRole.entities.OperationLog.create({
        operation_type: 'entity_deleted',
        entity_name: entityName,
        entity_id: id,
        status: 'success',
        message: `${entityName} deleted: ${recordNames[idx] || id}`,
        initiated_by: user.email,
        metadata: {
          entity_type: entityName,
          record_id: id,
          record_name: recordNames[idx] || null,
          deleted_by_user_id: user.id,
          deleted_by_email: user.email,
          deleted_at: now,
          bulk: recordIds.length > 1,
          bulk_count: recordIds.length,
        },
      }).catch(() => null)
    );

    await Promise.all(logs);

    return Response.json({ ok: true, logged: recordIds.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});