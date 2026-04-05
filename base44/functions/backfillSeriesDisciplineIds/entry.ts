import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const [allSeries, allDisciplines] = await Promise.all([
      base44.asServiceRole.entities.Series.list(),
      base44.asServiceRole.entities.Discipline.list(),
    ]);

    // Build lookup: lowercase name → discipline record
    const disciplineByName = {};
    allDisciplines.forEach(d => {
      disciplineByName[d.name.toLowerCase().trim()] = d;
    });

    const results = { matched: [], already_linked: [], mismatched: [], no_discipline: [] };

    await Promise.all(allSeries.map(async (series) => {
      // Already correctly linked — skip
      if (series.discipline_id) {
        const linked = allDisciplines.find(d => d.id === series.discipline_id);
        if (linked) {
          results.already_linked.push({ id: series.id, name: series.name, discipline: series.discipline, discipline_id: series.discipline_id });
          return;
        }
      }

      if (!series.discipline) {
        results.no_discipline.push({ id: series.id, name: series.name });
        return;
      }

      const match = disciplineByName[series.discipline.toLowerCase().trim()];
      if (match) {
        await base44.asServiceRole.entities.Series.update(series.id, { discipline_id: match.id });
        results.matched.push({ id: series.id, name: series.name, discipline: series.discipline, discipline_id: match.id });
      } else {
        results.mismatched.push({ id: series.id, name: series.name, discipline: series.discipline });
      }
    }));

    return Response.json({
      summary: {
        total: allSeries.length,
        matched: results.matched.length,
        already_linked: results.already_linked.length,
        mismatched: results.mismatched.length,
        no_discipline: results.no_discipline.length,
      },
      details: results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});