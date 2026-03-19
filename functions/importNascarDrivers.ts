import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// --- inline normalization helpers (no local imports allowed) ---
function normalizeName(value) {
  if (!value) return '';
  return value.trim().toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}
function buildEntitySlug(value) { return normalizeName(value).replace(/\s+/g, '-'); }
function buildCanonicalKey({ entity_type, name, external_uid }) {
  const type = (entity_type || '').toLowerCase();
  if (external_uid) return `${type}:${external_uid}`;
  return `${type}:${normalizeName(name)}`;
}

function normalizeManufacturer(mfr) {
  const m = (mfr || '').toLowerCase();
  if (m.includes('toyota')) return 'Toyota';
  if (m.includes('ford')) return 'Ford';
  if (m.includes('chevy') || m.includes('chevrolet')) return 'Chevrolet';
  if (m.includes('honda')) return 'Honda';
  return 'Other';
}

// NOTE: upsertEntity raw helper removed — all source entity writes now route through
// syncSourceAndEntityRecord (safe sync pipeline) or direct filter+match only for dry_run checks.

const SERIES_CONFIGS = [
  { id: 1, name: 'NASCAR Cup Series',                      slug: 'nascar-cup-series' },
  { id: 2, name: "NASCAR O'Reilly Auto Parts Series",       slug: 'nascar-oreilly-auto-parts-series' },
  { id: 3, name: 'NASCAR Craftsman Truck Series',           slug: 'nascar-craftsman-truck-series' },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const dry_run   = body.dry_run !== false;
    const series_ids = body.series_ids || [1, 2, 3];

    const seriesConfigs = SERIES_CONFIGS.filter(c => series_ids.includes(c.id));

    // Use LLM to fetch driver rosters
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
                first_name:  { type: 'string' },
                last_name:   { type: 'string' },
                car_number:  { type: 'string' },
                manufacturer:{ type: 'string' },
                series:      { type: 'string' },
                team_name:   { type: 'string' },
              },
            },
          },
        },
      },
    });

    const nascarDrivers = llmResult?.drivers || [];

    // Load existing DB data once
    const [existingPrograms] = await Promise.all([
      base44.asServiceRole.entities.DriverProgram.list('-created_date', 1000),
    ]);

    const programSet = new Set();
    for (const p of existingPrograms) {
      programSet.add(`${p.driver_id}|${p.series_name}|${p.season || '2026'}`);
    }

    const stats = { drivers_created: 0, drivers_found: 0, series_created: 0, series_found: 0, programs_created: 0, teams_created: 0, teams_found: 0, skipped: 0 };
    const log = [];

    // ---- STEP 1: Ensure all series exist using safe upsert ----
    const seriesMap = new Map(); // config.name -> record

    for (const config of seriesConfigs) {
      const normN = normalizeName(config.name);
      const cKey  = buildCanonicalKey({ entity_type: 'series', name: config.name });

      if (dry_run) {
        const existing = await base44.asServiceRole.entities.Series.filter({ canonical_key: cKey });
        if (existing && existing.length > 0) {
          seriesMap.set(config.name, existing[0]);
          log.push(`[DRY RUN] Found series: ${config.name}`);
          stats.series_found++;
        } else {
          seriesMap.set(config.name, { id: `dry-run-${config.id}`, name: config.name });
          log.push(`[DRY RUN] Would create series: ${config.name}`);
          stats.series_created++;
        }
        continue;
      }

      // source_path: nascar_driver_import — routes through syncSourceAndEntityRecord (safe sync pipeline)
      const seriesSyncRes = await base44.functions.invoke('syncSourceAndEntityRecord', {
        entity_type: 'series',
        payload: {
          name: config.name,
          slug: config.slug,
          discipline: 'Stock Car',
          status: 'Active',
          season_year: '2026',
          sanctioning_body: 'NASCAR',
          data_source: 'importNascarDrivers',
          sync_last_seen_at: new Date().toISOString(),
        },
        triggered_from: 'nascar_driver_import',
      });
      const record = seriesSyncRes?.data?.source_record || null;
      const action = seriesSyncRes?.data?.source_action || 'skipped';

      if (record) seriesMap.set(config.name, record);
      if (action === 'created') { stats.series_created++; log.push(`Created series: ${config.name}`); }
      else { stats.series_found++; log.push(`Found existing series: ${config.name}`); }
    }

    log.push(`LLM returned ${nascarDrivers.length} total drivers across all series`);

    // ---- STEP 2: Upsert drivers and teams ----
    for (const driverData of nascarDrivers) {
      const { first_name: first, last_name: last, car_number, manufacturer, series: seriesName, team_name } = driverData;
      if (!first || !last || !seriesName) { stats.skipped++; continue; }

      // Upsert Team
      let teamRecord = null;
      if (team_name) {
        const teamNorm = normalizeName(team_name);
        const teamKey  = buildCanonicalKey({ entity_type: 'team', name: team_name });

        if (dry_run) {
          const existing = await base44.asServiceRole.entities.Team.filter({ canonical_key: teamKey });
          if (existing && existing.length > 0) { teamRecord = existing[0]; stats.teams_found++; }
          else { teamRecord = { id: `dry-run-team-${teamNorm}` }; stats.teams_created++; log.push(`[DRY RUN] Would create team: ${team_name}`); }
        } else {
          // source_path: nascar_driver_import — routes through syncSourceAndEntityRecord (safe sync pipeline)
          const teamSyncRes = await base44.functions.invoke('syncSourceAndEntityRecord', {
            entity_type: 'team',
            payload: {
              name: team_name,
              slug: buildEntitySlug(team_name),
              primary_discipline: 'Stock Car',
              status: 'Active',
              country: 'United States',
              headquarters_state: 'NC',
              headquarters_city: 'Concord',
              data_source: 'importNascarDrivers',
              sync_last_seen_at: new Date().toISOString(),
            },
            triggered_from: 'nascar_driver_import',
          });
          teamRecord = teamSyncRes?.data?.source_record || null;
          const teamAction = teamSyncRes?.data?.source_action || 'skipped';
          if (teamAction === 'created') { stats.teams_created++; log.push(`Created team: ${team_name}`); }
          else { stats.teams_found++; }
        }
      }

      // Upsert Driver
      const fullName  = `${first} ${last}`;
      const normN     = normalizeName(fullName);
      const driverKey = buildCanonicalKey({ entity_type: 'driver', name: fullName });

      let driverRecord = null;

      if (dry_run) {
        const existing = await base44.asServiceRole.entities.Driver.filter({ canonical_key: driverKey });
        if (existing && existing.length > 0) { driverRecord = existing[0]; stats.drivers_found++; }
        else { driverRecord = { id: `dry-run-${normN}` }; stats.drivers_created++; log.push(`[DRY RUN] Would create driver: ${fullName}`); }
      } else {
        // source_path: nascar_driver_import — routes through syncSourceAndEntityRecord (safe sync pipeline)
        const driverSyncRes = await base44.functions.invoke('syncSourceAndEntityRecord', {
          entity_type: 'driver',
          payload: {
            first_name: first,
            last_name: last,
            primary_number: car_number,
            manufacturer: normalizeManufacturer(manufacturer),
            primary_discipline: 'Stock Car',
            status: 'Active',
            hometown_country: 'United States',
            team_id: teamRecord?.id || null,
            data_source: 'importNascarDrivers',
            sync_last_seen_at: new Date().toISOString(),
          },
          triggered_from: 'nascar_driver_import',
        });
        driverRecord = driverSyncRes?.data?.source_record || null;
        const driverAction = driverSyncRes?.data?.source_action || 'skipped';
        if (driverAction === 'created') { stats.drivers_created++; log.push(`Created driver: ${fullName} (${seriesName})`); }
        else {
          stats.drivers_found++;
          // If team_id newly resolved, patch it through safe update path via syncSourceAndEntityRecord
          if (teamRecord?.id && driverRecord && !driverRecord.team_id) {
            await base44.functions.invoke('syncSourceAndEntityRecord', {
              entity_type: 'driver',
              payload: { id: driverRecord.id, team_id: teamRecord.id, sync_last_seen_at: new Date().toISOString() },
              triggered_from: 'nascar_driver_import',
            });
            log.push(`  Updated team on driver: ${fullName} → ${team_name}`);
          }
        }
      }

      // Create DriverProgram if not already exists
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