import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const dry_run = body.dry_run !== false;
    const log = [];
    let fixed = 0;
    let skipped = 0;

    // Load all needed data
    const [allResults, allPrograms, allTeams, allDrivers] = await Promise.all([
      base44.asServiceRole.entities.Results.list('-created_date', 1000),
      base44.asServiceRole.entities.DriverProgram.list('-created_date', 1000),
      base44.asServiceRole.entities.Team.list(),
      base44.asServiceRole.entities.Driver.list('-created_date', 500),
    ]);

    // Build lookups
    const programById = new Map(allPrograms.map(p => [p.id, p]));
    const teamById = new Map(allTeams.map(t => [t.id, t]));
    const driverById = new Map(allDrivers.map(d => [d.id, d]));

    // Build program lookup by driver_id + series_name
    const programByDriverSeries = new Map();
    for (const p of allPrograms) {
      if (!p.driver_id) continue;
      const key = `${p.driver_id}|${p.series_name}`;
      if (!programByDriverSeries.has(key)) programByDriverSeries.set(key, p);
    }

    const resultsNeedingFix = allResults.filter(r => !r.team_name || r.program_id === 'placeholder' || !r.program_id);
    log.push(`Found ${resultsNeedingFix.length} results needing fixes`);

    for (const result of resultsNeedingFix) {
      const updates = {};

      // Try to fix program_id if placeholder
      if (result.program_id === 'placeholder' || !result.program_id) {
        const key = `${result.driver_id}|${result.series}`;
        const prog = programByDriverSeries.get(key);
        if (prog) {
          updates.program_id = prog.id;
        }
      }

      // Try to fill team_name
      if (!result.team_name) {
        const progId = updates.program_id || result.program_id;
        const prog = progId && progId !== 'placeholder' ? programById.get(progId) : programByDriverSeries.get(`${result.driver_id}|${result.series}`);

        if (prog) {
          const teamName = prog.team_name || (prog.team_id ? teamById.get(prog.team_id)?.name : null);
          if (teamName) updates.team_name = teamName;
        }
      }

      if (Object.keys(updates).length > 0) {
        fixed++;
        if (!dry_run) {
          await base44.asServiceRole.entities.Results.update(result.id, updates);
        } else {
          const driver = driverById.get(result.driver_id);
          const driverName = driver ? `${driver.first_name} ${driver.last_name}` : result.driver_id;
          log.push(`  [DRY] ${driverName} (${result.series} P${result.position}) → ${JSON.stringify(updates)}`);
        }
      } else {
        skipped++;
      }
    }

    log.push(`Fixed: ${fixed}, Skipped (no data available): ${skipped}`);
    return Response.json({ success: true, dry_run, fixed, skipped, log });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});