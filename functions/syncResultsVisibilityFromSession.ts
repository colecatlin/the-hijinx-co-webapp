import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { session_id } = await req.json();

    if (!session_id) {
      return Response.json({ error: 'session_id required' }, { status: 400 });
    }

    // 1) Load Session
    const session = await base44.entities.Session.get(session_id);
    if (!session) {
      return Response.json({ error: 'Session not found' }, { status: 404 });
    }

    // 2) Determine shouldBePublic
    const shouldBePublic = ['Official', 'Locked'].includes(session.status);

    // 3) Load all Results for this session
    const results = await base44.entities.Results.filter({ session_id });

    // 4) Update is_public for each result
    const updates = results.map(r =>
      base44.entities.Results.update(r.id, { is_public: shouldBePublic })
    );
    await Promise.all(updates);

    // 5) Write OperationLog
    await base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'results_visibility_sync',
      status: 'success',
      entity_name: 'Results',
      entity_id: session_id,
      event_id: session.event_id,
      message: `Results visibility synced: ${results.length} rows set is_public=${shouldBePublic}`,
      metadata: {
        session_id,
        session_status: session.status,
        shouldBePublic,
        resultCount: results.length,
      },
    }).catch(() => {});

    return Response.json({
      session_id,
      shouldBePublic,
      updatedCount: results.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});