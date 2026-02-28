import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();

    const {
      operation_type,
      source_type,
      entity_name,
      function_name,
      status = 'completed',
      total_records = 0,
      created_records = [],
      updated_records = [],
      skipped_count = 0,
      failed_count = 0,
      error_details = [],
      file_name = null,
      source_url = null,
      metadata = {},
      execution_time_ms = 0,
    } = payload;

    const operationLog = await base44.asServiceRole.entities.OperationLog.create({
      operation_type,
      source_type,
      entity_name,
      function_name,
      status,
      total_records,
      created_records,
      updated_records,
      skipped_count,
      failed_count,
      error_details,
      file_name,
      source_url,
      metadata,
      execution_time_ms,
      initiated_by: user.email,
    });

    return Response.json({
      success: true,
      operation_log_id: operationLog.id,
    });
  } catch (error) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});