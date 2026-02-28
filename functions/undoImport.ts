import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { importLogId } = body;

    if (!importLogId) {
      return Response.json({ error: 'importLogId required' }, { status: 400 });
    }

    const importLog = await base44.asServiceRole.entities.ImportLog.list();
    const log = importLog.find(l => l.id === importLogId);

    if (!log) {
      return Response.json({ error: 'Import log not found' }, { status: 404 });
    }

    if (log.status === 'rolled_back') {
      return Response.json({ error: 'This import has already been rolled back' }, { status: 400 });
    }

    const deleted = { drivers: 0, tracks: 0, series: 0, classes: 0, events: 0, programs: 0, results: 0 };

    const deleteAsync = async (entityName, ids) => {
      for (const id of ids || []) {
        await base44.asServiceRole.entities[entityName].delete(id);
      }
      return ids?.length || 0;
    };

    const [dCount, tCount, sCount, cCount, eCount, pCount, rCount] = await Promise.all([
      deleteAsync('Driver', log.created_drivers),
      deleteAsync('Track', log.created_tracks),
      deleteAsync('Series', log.created_series),
      deleteAsync('SeriesClass', log.created_classes),
      deleteAsync('Event', log.created_events),
      deleteAsync('DriverProgram', log.created_programs),
      deleteAsync('Results', log.created_results),
    ]);

    deleted.drivers = dCount;
    deleted.tracks = tCount;
    deleted.series = sCount;
    deleted.classes = cCount;
    deleted.events = eCount;
    deleted.programs = pCount;
    deleted.results = rCount;

    await base44.asServiceRole.entities.ImportLog.update(importLogId, { status: 'rolled_back' });

    return Response.json({
      success: true,
      message: 'Import rolled back successfully',
      deleted,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});