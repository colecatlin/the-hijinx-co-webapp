import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const events = await base44.asServiceRole.entities.Event.list();
    const eventIds = events.map(e => e.id);

    for (const id of eventIds) {
      await base44.asServiceRole.entities.Event.delete(id);
    }

    await base44.asServiceRole.functions.invoke('logOperation', {
      operation_type: 'deletion',
      source_type: 'manual',
      entity_name: 'Event',
      status: 'completed',
      total_records: eventIds.length,
      deleted_records: [{ entity: 'Event', ids: eventIds, names: events.map(e => e.name) }]
    });

    return Response.json({ success: true, deletedCount: eventIds.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});