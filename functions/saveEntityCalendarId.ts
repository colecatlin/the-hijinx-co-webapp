import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { entityType, entityId, calendarId } = await req.json();

    const entityMap = {
      Driver: base44.asServiceRole.entities.Driver,
      Team: base44.asServiceRole.entities.Team,
      Track: base44.asServiceRole.entities.Track,
    };

    const repo = entityMap[entityType];
    if (!repo) return Response.json({ error: 'Unknown entity type' }, { status: 400 });

    await repo.update(entityId, { calendar_id: calendarId });
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});