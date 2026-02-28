import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const { operation_log_id } = await req.json();

    if (!operation_log_id) {
      return Response.json(
        { error: 'operation_log_id is required' },
        { status: 400 }
      );
    }

    // Fetch the operation log
    const operationLog = await base44.asServiceRole.entities.OperationLog.get(operation_log_id);

    if (!operationLog) {
      return Response.json({ error: 'Operation log not found' }, { status: 404 });
    }

    if (operationLog.operation_type !== 'import') {
      return Response.json(
        { error: 'Only imports can be reversed' },
        { status: 400 }
      );
    }

    if (operationLog.status === 'rolled_back') {
      return Response.json(
        { error: 'Operation already rolled back' },
        { status: 400 }
      );
    }

    // Delete created records
    let deletedCount = 0;
    if (operationLog.created_records && Array.isArray(operationLog.created_records)) {
      for (const recordGroup of operationLog.created_records) {
        const { entity, ids } = recordGroup;
        if (entity && ids && Array.isArray(ids)) {
          for (const id of ids) {
            await base44.asServiceRole.entities[entity].delete(id);
            deletedCount++;
          }
        }
      }
    }

    // Update operation log to rolled_back
    await base44.asServiceRole.entities.OperationLog.update(operation_log_id, {
      status: 'rolled_back',
    });

    // Create a new log entry for the reversal
    await base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'import',
      source_type: 'manual',
      entity_name: operationLog.entity_name,
      function_name: 'reverseImport',
      status: 'completed',
      total_records: deletedCount,
      reversed_from: operation_log_id,
      initiated_by: user.email,
      metadata: {
        reversed_operation: operation_log_id,
        deleted_records: deletedCount,
      },
    });

    return Response.json({
      success: true,
      deleted_count: deletedCount,
      message: `Successfully reversed import. Deleted ${deletedCount} records.`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});