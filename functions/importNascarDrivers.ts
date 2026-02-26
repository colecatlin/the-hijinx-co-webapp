import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function normalizeManufacturer(mfr) {
  const m = (mfr || '').toLowerCase();
  if (m.includes('toyota')) return 'Toyota';
  if (m.includes('ford')) return 'Ford';
  if (m.includes('chevy') || m.includes('chevrolet')) return 'Chevrolet';
  if (m.includes('honda')) return 'Honda';
  return 'Other';
}

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
Include their car number and vehicle manufacturer (Chevrolet, Ford, Toyota).

Return a JSON object with this structure:
{
  "drivers": [
    { "first_name": "...", "last_name": "...", "car_number": "...", "manufacturer": "...", "series": "..." }
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
              },
            },
          },
        },
      },
    });

    const nascarDrivers = llmResult?.drivers || [];

    // Load existing DB data
    const [existingDrivers, existingSeries, existingPrograms] = await Promise.all([
      base44.asServiceRole.entities.Driver.list('-created_date', 500),
      base44.asServiceRole.entities.Series.list(),
      base44.asServiceRole.entities.DriverProgram.list('-created_date', 1000),
    ]);

    const driverMap = new Map();
    for (const d of existingDrivers) {
      const key = `${d.first_name?.toLowerCase()} ${d.last_name?.toLowerCase()}`;
      driverMap.set(key, d);
    }

    const seriesMap = new Map();
    for (const s of existingSeries) {
      seriesMap.set(s.name, s);
    }

    const programSet = new Set();
    for (const p of existingPrograms) {
      programSet.add(`${p.driver_id}|${p.series_name}|${p.season || '2026'}`);
    }

    const stats = { drivers_created: 0, drivers_found: 0, programs_created: 0, skipped: 0 };
    const log = [];

    // Ensure all series exist
    for (const config of seriesConfigs) {
      if (!seriesMap.has(config.name)) {
        if (!dry_run) {
          const created = await base44.asServiceRole.entities.Series.create({
            name: config.name,
            slug: slugify(config.name),
            discipline: 'Stock Car',
            status: 'Active',
            season_year: '2026',
            sanctioning_body: 'NASCAR',
          });
          seriesMap.set(config.name, created);
          log.push(`Created series: ${config.name}`);
        } else {
          seriesMap.set(config.name, { id: `dry-run-${config.id}`, name: config.name });
          log.push(`[DRY RUN] Would create series: ${config.name}`);
        }
      }
    }

    log.push(`LLM returned ${nascarDrivers.length} total drivers across all series`);

    for (const driverData of nascarDrivers) {
      const { first_name: first, last_name: last, car_number, manufacturer, series: seriesName } = driverData;
      if (!first || !last || !seriesName) { stats.skipped++; continue; }

      const fullKey = `${first.toLowerCase()} ${last.toLowerCase()}`;
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
          });
          driverMap.set(fullKey, driver);
          log.push(`Created driver: ${first} ${last} (${seriesName})`);
        } else {
          driver = { id: `dry-run-${fullKey}` };
          log.push(`[DRY RUN] Would create: ${first} ${last} (${seriesName} #${car_number})`);
        }
      } else {
        stats.drivers_found++;
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
            car_number: car_number,
            season: '2026',
            status: 'active',
          });
          programSet.add(programKey);
          log.push(`  Program: ${first} ${last} → ${seriesName} #${car_number}`);
        } else {
          log.push(`  [DRY RUN] Program: ${first} ${last} → ${seriesName} #${car_number}`);
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