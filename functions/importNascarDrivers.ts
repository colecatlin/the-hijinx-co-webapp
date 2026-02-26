import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// NASCAR CF cache series IDs: 1=Cup, 2=Xfinity/O'Reilly, 3=Trucks
const SERIES_CONFIGS = [
  { id: 1, name: 'NASCAR Cup Series', url: 'https://cf.nascar.com/cacher/2026/1/race-feed.json' },
  { id: 2, name: "NASCAR O'Reilly Auto Parts Series", url: 'https://cf.nascar.com/cacher/2026/2/race-feed.json' },
  { id: 3, name: 'NASCAR Craftsman Truck Series', url: 'https://cf.nascar.com/cacher/2026/3/race-feed.json' },
];

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

async function fetchDriversFromFeed(seriesConfig) {
  // Try standings feed first (most reliable for current season drivers)
  const standingsUrl = `https://cf.nascar.com/cacher/2026/${seriesConfig.id}/standings.json`;
  const scheduleUrl = `https://cf.nascar.com/cacher/2026/${seriesConfig.id}/race-feed.json`;
  
  const drivers = new Map(); // key: "first last" -> driver data
  
  // Try standings feed
  try {
    const res = await fetch(standingsUrl);
    if (res.ok) {
      const data = await res.json();
      const rows = Array.isArray(data) ? data : (data?.standings || data?.data || []);
      for (const row of rows) {
        const first = row.Driver?.FirstName || row.first_name || row.FirstName || '';
        const last = row.Driver?.LastName || row.last_name || row.LastName || '';
        const number = row.Driver?.CarNumber || row.car_number || row.CarNumber || row.No || '';
        const mfr = row.Driver?.Manufacturer || row.manufacturer || row.Manufacturer || '';
        if (first && last) {
          drivers.set(`${first.toLowerCase()} ${last.toLowerCase()}`, { first, last, number: String(number), manufacturer: mfr });
        }
      }
    }
  } catch (_e) { /* ignore */ }

  // Try race feed to get more drivers
  try {
    const res = await fetch(scheduleUrl);
    if (res.ok) {
      const races = await res.json();
      const raceList = Array.isArray(races) ? races : [];
      for (const race of raceList.slice(0, 3)) {
        const results = race?.results || race?.Competitors || [];
        for (const r of results) {
          const first = r.driver_firstname || r.FirstName || r.first_name || '';
          const last = r.driver_lastname || r.LastName || r.last_name || '';
          const number = r.car_number || r.CarNumber || r.No || '';
          const mfr = r.Manufacturer || r.manufacturer || '';
          if (first && last) {
            const key = `${first.toLowerCase()} ${last.toLowerCase()}`;
            if (!drivers.has(key)) {
              drivers.set(key, { first, last, number: String(number), manufacturer: mfr });
            }
          }
        }
      }
    }
  } catch (_e) { /* ignore */ }

  return [...drivers.values()];
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
    const series_ids = body.series_ids || [1, 2, 3]; // which series to import

    // Load existing data
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

    for (const config of SERIES_CONFIGS.filter(c => series_ids.includes(c.id))) {
      log.push(`\n=== ${config.name} ===`);

      // Ensure series exists in DB
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
          log.push(`  Created series: ${config.name}`);
        } else {
          seriesMap.set(config.name, { id: `dry-run-${config.id}`, name: config.name });
          log.push(`  [DRY RUN] Would create series: ${config.name}`);
        }
      }

      // Fetch live drivers from NASCAR feed
      const feedDrivers = await fetchDriversFromFeed(config);
      log.push(`  Fetched ${feedDrivers.length} drivers from feed`);

      for (const driverData of feedDrivers) {
        if (!driverData.first || !driverData.last) { stats.skipped++; continue; }

        const fullKey = `${driverData.first.toLowerCase()} ${driverData.last.toLowerCase()}`;
        let driver = driverMap.get(fullKey);

        if (!driver) {
          stats.drivers_created++;
          if (!dry_run) {
            driver = await base44.asServiceRole.entities.Driver.create({
              first_name: driverData.first,
              last_name: driverData.last,
              primary_number: driverData.number,
              manufacturer: normalizeManufacturer(driverData.manufacturer),
              primary_discipline: 'Stock Car',
              status: 'Active',
              hometown_country: 'United States',
              slug: slugify(`${driverData.first} ${driverData.last}`),
            });
            driverMap.set(fullKey, driver);
            log.push(`  Created driver: ${driverData.first} ${driverData.last}`);
          } else {
            driver = { id: `dry-run-${fullKey}` };
            log.push(`  [DRY RUN] Would create driver: ${driverData.first} ${driverData.last}`);
          }
        } else {
          stats.drivers_found++;
        }

        // Create DriverProgram if not already exists
        const programKey = `${driver.id}|${config.name}|2026`;
        if (!programSet.has(programKey) && driver.id) {
          const seriesRecord = seriesMap.get(config.name);
          stats.programs_created++;
          if (!dry_run) {
            await base44.asServiceRole.entities.DriverProgram.create({
              driver_id: driver.id,
              series_id: seriesRecord?.id || null,
              series_name: config.name,
              car_number: driverData.number,
              season: '2026',
              status: 'active',
            });
            programSet.add(programKey);
            log.push(`  Created program: ${driverData.first} ${driverData.last} → ${config.name} #${driverData.number}`);
          } else {
            log.push(`  [DRY RUN] Would create program: ${driverData.first} ${driverData.last} → ${config.name} #${driverData.number}`);
          }
        } else if (programSet.has(programKey)) {
          stats.skipped++;
        }
      }
    }

    return Response.json({ success: true, dry_run, stats, log });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});