import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { slugify, normalizeManufacturer, createDriverKey } from './helpers/stringUtils.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const dry_run = body.dry_run !== false;
    const series_ids = body.series_ids || [1, 2, 3];

    const seriesConfigs = [
      { id: 1, name: 'NASCAR Cup Series', slug: 'nascar-cup-series' },
      { id: 2, name: "NASCAR O'Reilly Auto Parts Series", slug: 'nascar-oreilly-auto-parts-series' },
      { id: 3, name: 'NASCAR Craftsman Truck Series', slug: 'nascar-craftsman-truck-series' },
    ].filter(c => series_ids.includes(c.id));

    // Use LLM to fetch full driver rosters from the web
    const llmPrompt = `Please provide the complete 2026 NASCAR driver roster for the following series: ${seriesConfigs.map(c => c.name).join(', ')}.

For each series, list ALL full-time drivers competing in the 2026 season.
Include their car number, vehicle manufacturer (Chevrolet, Ford, Toyota), and the full team name they race for.

Return a JSON object with this structure:
{
  "drivers": [
    { "first_name": "...", "last_name": "...", "car_number": "...", "manufacturer": "...", "series": "...", "team_name": "..." }
  ]
}

Use exact series names: ${seriesConfigs.map(c => `"${c.name}"`).join(', ')}`;

    const llmResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: llmPrompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          drivers: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                first_name: { type: 'string' },
                last_name: { type: 'string' },
                car_number: { type: 'string' },
                manufacturer: { type: 'string' },
                series: { type: 'string' },
                team_name: { type: 'string' },
              },
            },
          },
        },
      },
    });

    const nascarDrivers = llmResult?.drivers || [];

    // Load existing DB data
    const [existingDrivers, existingSeries, existingPrograms, existingTeams] = await Promise.all([
      base44.asServiceRole.entities.Driver.list('-created_date', 500),
      base44.asServiceRole.entities.Series.list(),
      base44.asServiceRole.entities.DriverProgram.list('-created_date', 1000),
      base44.asServiceRole.entities.Team.list('-created_date', 500),
    ]);

    const driverMap = new Map();
    for (const d of existingDrivers) {
      const key = createDriverKey(d.first_name, d.last_name);
      driverMap.set(key, d);
    }

    const seriesMap = new Map();
    for (const s of existingSeries) {
      seriesMap.set(s.name, s);
      if (s.slug) seriesMap.set(s.slug, s);
    }

    const programSet = new Set();
    for (const p of existingPrograms) {
      programSet.add(`${p.driver_id}|${p.series_name}|${p.season || '2026'}`);
    }

    const teamMap = new Map();
    for (const t of existingTeams) {
      teamMap.set(t.name?.toLowerCase(), t);
    }

    const stats = { drivers_created: 0, drivers_found: 0, programs_created: 0, teams_created: 0, skipped: 0 };
    const log = [];

    // Ensure all series exist — match by name OR slug to avoid duplicates
    for (const config of seriesConfigs) {
      const existing = seriesMap.get(config.name) || seriesMap.get(config.slug);
      if (!existing) {
        if (!dry_run) {
          const created = await base44.asServiceRole.entities.Series.create({
            name: config.name,
            slug: config.slug,
            discipline: 'Stock Car',
            status: 'Active',
            season_year: '2026',
            sanctioning_body: 'NASCAR',
          });
          seriesMap.set(config.name, created);
          seriesMap.set(config.slug, created);
          log.push(`Created series: ${config.name}`);
        } else {
          const mock = { id: `dry-run-${config.id}`, name: config.name };
          seriesMap.set(config.name, mock);
          seriesMap.set(config.slug, mock);
          log.push(`[DRY RUN] Would create series: ${config.name}`);
        }
      } else {
        // Make sure it's also accessible by name in case it was found by slug
        seriesMap.set(config.name, existing);
        log.push(`Found existing series: ${config.name}`);
      }
    }

    log.push(`LLM returned ${nascarDrivers.length} total drivers across all series`);

    for (const driverData of nascarDrivers) {
      const { first_name: first, last_name: last, car_number, manufacturer, series: seriesName, team_name } = driverData;
      if (!first || !last || !seriesName) { stats.skipped++; continue; }

      // Upsert team if provided
      let teamRecord = null;
      if (team_name) {
        const teamKey = team_name.toLowerCase();
        teamRecord = teamMap.get(teamKey);
        if (!teamRecord) {
          stats.teams_created++;
          if (!dry_run) {
            teamRecord = await base44.asServiceRole.entities.Team.create({
              name: team_name,
              slug: slugify(team_name),
              primary_discipline: 'Stock Car',
              team_level: 'National',
              status: 'Active',
              country: 'United States',
              headquarters_state: 'NC',
              headquarters_city: 'Concord',
            });
            teamMap.set(teamKey, teamRecord);
            log.push(`Created team: ${team_name}`);
          } else {
            teamRecord = { id: `dry-run-team-${teamKey}` };
            log.push(`[DRY RUN] Would create team: ${team_name}`);
          }
        }
      }

      const fullKey = createDriverKey(first, last);
      let driver = driverMap.get(fullKey);

      if (!driver) {
        stats.drivers_created++;
        if (!dry_run) {
          driver = await base44.asServiceRole.entities.Driver.create({
            first_name: first,
            last_name: last,
            primary_number: car_number,
            manufacturer: normalizeManufacturer(manufacturer),
            primary_discipline: 'Stock Car',
            status: 'Active',
            hometown_country: 'United States',
            slug: slugify(`${first} ${last}`),
            team_id: teamRecord?.id || null,
          });
          driverMap.set(fullKey, driver);
          log.push(`Created driver: ${first} ${last} (${seriesName})`);
        } else {
          driver = { id: `dry-run-${fullKey}` };
          log.push(`[DRY RUN] Would create: ${first} ${last} (${seriesName} #${car_number})`);
        }
      } else {
        stats.drivers_found++;
        // Update team_id on existing driver if not already set
        if (!dry_run && teamRecord?.id && !driver.team_id) {
          await base44.asServiceRole.entities.Driver.update(driver.id, { team_id: teamRecord.id });
          log.push(`  Updated team on driver: ${first} ${last} → ${team_name}`);
        }
      }

      // Create DriverProgram if not already exists
      const programKey = `${driver.id}|${seriesName}|2026`;
      if (!programSet.has(programKey) && driver.id) {
        const seriesRecord = seriesMap.get(seriesName);
        stats.programs_created++;
        if (!dry_run) {
          await base44.asServiceRole.entities.DriverProgram.create({
            driver_id: driver.id,
            series_id: seriesRecord?.id || null,
            series_name: seriesName,
            team_id: teamRecord?.id || null,
            team_name: team_name || null,
            car_number: car_number,
            start_year: 2026,
            status: 'active',
            participation_status: 'Full-Time',
          });
          programSet.add(programKey);
          log.push(`  Program: ${first} ${last} → ${seriesName} #${car_number}${team_name ? ` (${team_name})` : ''}`);
        } else {
          log.push(`  [DRY RUN] Program: ${first} ${last} → ${seriesName} #${car_number}${team_name ? ` (${team_name})` : ''}`);
        }
      } else {
        stats.skipped++;
      }
    }

    return Response.json({ success: true, dry_run, stats, log });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});