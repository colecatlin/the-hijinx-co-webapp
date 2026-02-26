import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

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
    const existingTeams = await base44.asServiceRole.entities.Team.list('-created_date', 500);

    // Build a map: lowercase name → team
    const teamMap = new Map();
    for (const t of existingTeams) {
      teamMap.set(t.name.toLowerCase().trim(), t);
    }

    const log = [];
    let updated = 0;
    let created = 0;

    for (const prog of programsNeedingTeam) {
      const rawName = prog.team_name.trim();
      if (!rawName || rawName.toLowerCase() === 'not available') {
        log.push(`Skipped: invalid team_name "${rawName}"`);
        continue;
      }

      const key = rawName.toLowerCase();
      let team = teamMap.get(key);

      // Fuzzy match if exact not found
      if (!team) {
        for (const [tKey, tVal] of teamMap) {
          if (key.includes(tKey) || tKey.includes(key)) {
            team = tVal;
            break;
          }
        }
      }

      // Create team if still not found
      if (!team) {
        if (!dry_run) {
          team = await base44.asServiceRole.entities.Team.create({
            name: rawName,
            slug: slugify(rawName),
            primary_discipline: 'Asphalt Oval',
            team_level: 'National',
            status: 'Active',
            country: 'United States',
            headquarters_state: 'NC',
            headquarters_city: 'Mooresville',
          });
          teamMap.set(key, team);
          log.push(`Created team: "${rawName}"`);
        } else {
          team = { id: `dry-run-${key}`, name: rawName };
          log.push(`[DRY RUN] Would create team: "${rawName}"`);
        }
        created++;
      }

      // Now update the program
      if (!dry_run) {
        await base44.asServiceRole.entities.DriverProgram.update(prog.id, { team_id: team.id });
        log.push(`Linked program → "${team.name}"`);
      } else {
        log.push(`[DRY RUN] Would link program → "${team.name}"`);
      }
      updated++;
    }

    return Response.json({ success: true, dry_run, programs_updated: updated, teams_created: created, total: programsNeedingTeam.length, log });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});