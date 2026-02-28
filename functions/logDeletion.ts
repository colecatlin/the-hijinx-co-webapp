import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { entityName, recordIds, recordNames } = await req.json();

    if (!entityName || !recordIds || recordIds.length === 0) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const log = await base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'deletion',
      source_type: 'manual',
      entity_name: entityName,
      status: 'completed',
      total_records: recordIds.length,
      deleted_records: [
        {
          entity: entityName,
          ids: recordIds,
          names: (recordNames || []).filter(name => name !== null && name !== undefined)
        }
      ],
      initiated_by: user.email,
      execution_time_ms: 0,
      metadata: {
        deleted_at: new Date().toISOString()
      }
    });

    return Response.json({ success: true, logId: log.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});