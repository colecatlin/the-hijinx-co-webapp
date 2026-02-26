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

    // Load all programs that have team_name but no team_id
    const allPrograms = await base44.asServiceRole.entities.DriverProgram.list('-created_date', 2000);
    const programsNeedingTeam = allPrograms.filter(p => p.team_name && !p.team_id);

    if (programsNeedingTeam.length === 0) {
      return Response.json({ success: true, message: 'Nothing to backfill', dry_run });
    }

    // Load all teams
    const allTeams = await base44.asServiceRole.entities.Team.list('-created_date', 500);

    // Build a map: lowercase name → team
    const teamMap = new Map();
    for (const t of allTeams) {
      teamMap.set(t.name.toLowerCase().trim(), t);
    }

    const log = [];
    let updated = 0;
    let notFound = 0;

    for (const prog of programsNeedingTeam) {
      const key = prog.team_name.toLowerCase().trim();
      const team = teamMap.get(key);

      if (team) {
        if (!dry_run) {
          await base44.asServiceRole.entities.DriverProgram.update(prog.id, { team_id: team.id });
        }
        log.push(`${dry_run ? '[DRY RUN] ' : ''}Linked program ${prog.id} → team "${team.name}" (${team.id})`);
        updated++;
      } else {
        // Try fuzzy: check if any team name is contained in the program's team_name
        let found = null;
        for (const [tKey, tVal] of teamMap) {
          if (key.includes(tKey) || tKey.includes(key)) {
            found = tVal;
            break;
          }
        }
        if (found) {
          if (!dry_run) {
            await base44.asServiceRole.entities.DriverProgram.update(prog.id, { team_id: found.id });
          }
          log.push(`${dry_run ? '[DRY RUN] ' : ''}Fuzzy linked program ${prog.id} (team_name="${prog.team_name}") → "${found.name}"`);
          updated++;
        } else {
          log.push(`NOT FOUND: team_name="${prog.team_name}"`);
          notFound++;
        }
      }
    }

    return Response.json({ success: true, dry_run, updated, notFound, total: programsNeedingTeam.length, log });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});