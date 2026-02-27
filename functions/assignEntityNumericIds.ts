import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const generateUniqueNumericId = (existingIds) => {
      let numericId;
      let isUnique = false;
      while (!isUnique) {
        numericId = String(Math.floor(Math.random() * 90000000) + 10000000);
        isUnique = !existingIds.has(numericId);
      }
      existingIds.add(numericId);
      return numericId;
    };

    // Gather all existing numeric_ids across all entity types to ensure global uniqueness
    const [teams, tracks, series, events, drivers] = await Promise.all([
      base44.entities.Team.list(),
      base44.entities.Track.list(),
      base44.entities.Series.list(),
      base44.entities.Event.list(),
      base44.entities.Driver.list(),
    ]);

    const existingIds = new Set();
    [...teams, ...tracks, ...series, ...events, ...drivers].forEach((e) => {
      if (e.numeric_id) existingIds.add(e.numeric_id);
    });

    const results = {};

    const entitySets = [
      { name: 'Team', records: teams, entity: base44.entities.Team },
      { name: 'Track', records: tracks, entity: base44.entities.Track },
      { name: 'Series', records: series, entity: base44.entities.Series },
      { name: 'Event', records: events, entity: base44.entities.Event },
    ];

    for (const { name, records, entity } of entitySets) {
      const toUpdate = records.filter((r) => !r.numeric_id);
      let updated = 0;
      for (const record of toUpdate) {
        const numericId = generateUniqueNumericId(existingIds);
        await entity.update(record.id, { numeric_id: numericId });
        updated++;
      }
      results[name] = { updated, total: records.length };
    }

    return Response.json({ success: true, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});