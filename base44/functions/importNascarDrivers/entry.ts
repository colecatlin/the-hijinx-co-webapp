import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// --- inline normalization helpers ---
function normalizeName(value) {
  if (!value) return '';
  return value.trim().toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}
function buildEntitySlug(value) { return normalizeName(value).replace(/\s+/g, '-'); }
function buildCanonicalKey(entity_type, name) {
  return `${entity_type.toLowerCase()}:${normalizeName(name)}`;
}
function normalizeManufacturer(mfr) {
  const m = (mfr || '').toLowerCase();
  if (m.includes('toyota')) return 'Toyota';
  if (m.includes('ford')) return 'Ford';
  if (m.includes('chevy') || m.includes('chevrolet')) return 'Chevrolet';
  if (m.includes('honda')) return 'Honda';
  return 'Other';
}

const SERIES_CONFIGS = [
  { id: 1, name: 'NASCAR Cup Series',                    slug: 'nascar-cup-series' },
  { id: 2, name: "NASCAR O'Reilly Auto Parts Series",     slug: 'nascar-oreilly-auto-parts-series' },
  { id: 3, name: 'NASCAR Craftsman Truck Series',         slug: 'nascar-craftsman-truck-series' },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const dry_run    = body.dry_run !== false;
    const series_ids = body.series_ids || [1, 2, 3];
    const seriesConfigs = SERIES_CONFIGS.filter(c => series_ids.includes(c.id));

    // ---- Fetch drivers from LLM one series at a time ----
    const nascarDrivers = [];
    for (const config of seriesConfigs) {
      const llmResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are a NASCAR expert. List ALL full-time drivers competing in the 2026 ${config.name} season as of April 2026.
Include every driver with their car number, manufacturer (Chevrolet, Ford, or Toyota only), and team name.
Be complete — do not truncate the list.`,
        add_context_from_internet: true,
        model: 'gemini_3_1_pro',
        response_json_schema: {
          type: 'object',
          properties: {
            drivers: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  first_name:   { type: 'string' },
                  last_name:    { type: 'string' },
                  car_number:   { type: 'string' },
                  manufacturer: { type: 'string' },
                  series:       { type: 'string' },
                  team_name:    { type: 'string' },
                },
              },
            },
          },
        },
      });
      const batch = llmResult?.drivers || [];
      for (const d of batch) { d.series = config.name; } // ensure series name is set
      nascarDrivers.push(...batch);
    }

    // ---- Load existing programs to prevent duplicates ----
    const existingPrograms = await base44.asServiceRole.entities.DriverProgram.list('-created_date', 2000);
    const programSet = new Set();
    for (const p of existingPrograms) {
      programSet.add(`${p.driver_id}|${p.series_name}|2026`);
    }

    const stats = { drivers_created: 0, drivers_found: 0, series_created: 0, series_found: 0, programs_created: 0, teams_created: 0, teams_found: 0, skipped: 0 };
    const log = [];

    // ---- STEP 1: Upsert Series ----
    const seriesMap = new Map();
    for (const config of seriesConfigs) {
      const cKey = buildCanonicalKey('series', config.name);
      const existing = await base44.asServiceRole.entities.Series.filter({ canonical_key: cKey });

      if (existing && existing.length > 0) {
        seriesMap.set(config.name, existing[0]);
        stats.series_found++;
        log.push(`${dry_run ? '[DRY RUN] ' : ''}Found series: ${config.name}`);
      } else if (dry_run) {
        seriesMap.set(config.name, { id: `dry-run-series-${config.id}`, name: config.name });
        stats.series_created++;
        log.push(`[DRY RUN] Would create series: ${config.name}`);
      } else {
        const normN = normalizeName(config.name);
        const created = await base44.asServiceRole.entities.Series.create({
          name: config.name,
          slug: config.slug,
          discipline: 'Stock Car',
          operational_status: 'Active',
          season_year: '2026',
          sanctioning_body: 'NASCAR',
          data_source: 'importNascarDrivers',
          normalized_name: normN,
          canonical_slug: config.slug,
          canonical_key: cKey,
          sync_last_seen_at: new Date().toISOString(),
        });
        seriesMap.set(config.name, created);
        stats.series_created++;
        log.push(`Created series: ${config.name}`);
      }
    }

    log.push(`LLM returned ${nascarDrivers.length} total drivers across all series`);

    // ---- STEP 2: Upsert Teams + Drivers + Programs ----
    const teamCache = new Map(); // canonical_key -> record

    for (const driverData of nascarDrivers) {
      const { first_name: first, last_name: last, car_number, manufacturer, series: seriesName, team_name } = driverData;
      if (!first || !last || !seriesName) { stats.skipped++; continue; }

      // -- Team --
      let teamRecord = null;
      if (team_name) {
        const teamKey = buildCanonicalKey('team', team_name);
        if (teamCache.has(teamKey)) {
          teamRecord = teamCache.get(teamKey);
        } else {
          const existingTeam = await base44.asServiceRole.entities.Team.filter({ canonical_key: teamKey });
          if (existingTeam && existingTeam.length > 0) {
            teamRecord = existingTeam[0];
            stats.teams_found++;
          } else if (!dry_run) {
            const normN = normalizeName(team_name);
            const slug  = buildEntitySlug(team_name);
            teamRecord = await base44.asServiceRole.entities.Team.create({
              name: team_name,
              slug,
              normalized_name: normN,
              canonical_slug: slug,
              canonical_key: teamKey,
              primary_discipline: 'Asphalt Oval',
              racing_status: 'Active',
              headquarters_city: 'Concord',
              headquarters_state: 'NC',
              country: 'United States',
              data_source: 'importNascarDrivers',
              sync_last_seen_at: new Date().toISOString(),
            });
            stats.teams_created++;
            log.push(`Created team: ${team_name}`);
          } else {
            teamRecord = { id: `dry-run-team-${normalizeName(team_name)}` };
            stats.teams_created++;
            log.push(`[DRY RUN] Would create team: ${team_name}`);
          }
          teamCache.set(teamKey, teamRecord);
        }
      }

      // -- Driver --
      const fullName  = `${first} ${last}`;
      const driverKey = buildCanonicalKey('driver', fullName);
      const existingDriver = await base44.asServiceRole.entities.Driver.filter({ canonical_key: driverKey });

      let driverRecord = null;
      if (existingDriver && existingDriver.length > 0) {
        driverRecord = existingDriver[0];
        stats.drivers_found++;
        if (!dry_run && teamRecord?.id && !driverRecord.team_id) {
          await base44.asServiceRole.entities.Driver.update(driverRecord.id, {
            team_id: teamRecord.id,
            sync_last_seen_at: new Date().toISOString(),
          });
          log.push(`  Patched team on driver: ${fullName} → ${team_name}`);
        }
      } else if (!dry_run) {
        const normN = normalizeName(fullName);
        const slug  = buildEntitySlug(fullName);
        driverRecord = await base44.asServiceRole.entities.Driver.create({
          first_name: first,
          last_name: last,
          primary_number: car_number,
          manufacturer: normalizeManufacturer(manufacturer),
          primary_discipline: 'Asphalt Oval',
          racing_status: 'Active',
          hometown_country: 'United States',
          team_id: teamRecord?.id || null,
          data_source: 'importNascarDrivers',
          normalized_name: normN,
          canonical_slug: slug,
          canonical_key: driverKey,
          sync_last_seen_at: new Date().toISOString(),
        });
        stats.drivers_created++;
        log.push(`Created driver: ${fullName} (${seriesName})`);
      } else {
        driverRecord = { id: `dry-run-${normalizeName(fullName)}` };
        stats.drivers_created++;
        log.push(`[DRY RUN] Would create driver: ${fullName}`);
      }

      // -- DriverProgram --
      if (driverRecord?.id) {
        const programKey = `${driverRecord.id}|${seriesName}|2026`;
        if (!programSet.has(programKey)) {
          const seriesRecord = seriesMap.get(seriesName);
          stats.programs_created++;
          if (!dry_run) {
            await base44.asServiceRole.entities.DriverProgram.create({
              driver_id: driverRecord.id,
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
            log.push(`  Program: ${fullName} → ${seriesName} #${car_number}${team_name ? ` (${team_name})` : ''}`);
          } else {
            log.push(`  [DRY RUN] Program: ${fullName} → ${seriesName} #${car_number}`);
          }
        } else {
          stats.skipped++;
        }
      }
    }

    return Response.json({ success: true, dry_run, stats, log });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});