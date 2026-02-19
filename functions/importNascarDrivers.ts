import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// All drivers from all 3 NASCAR series standings (2026 season)
const NASCAR_DRIVERS = [
  // Cup Series
  { first: 'Tyler', last: 'Reddick', number: '45', manufacturer: 'Toyota', series: 'NASCAR Cup Series' },
  { first: 'Joey', last: 'Logano', number: '22', manufacturer: 'Ford', series: 'NASCAR Cup Series' },
  { first: 'Chase', last: 'Elliott', number: '9', manufacturer: 'Chevrolet', series: 'NASCAR Cup Series' },
  { first: 'Zane', last: 'Smith', number: '38', manufacturer: 'Ford', series: 'NASCAR Cup Series' },
  { first: 'Ricky', last: 'Stenhouse Jr', number: '47', manufacturer: 'Chevrolet', series: 'NASCAR Cup Series' },
  { first: 'Brad', last: 'Keselowski', number: '6', manufacturer: 'Ford', series: 'NASCAR Cup Series' },
  { first: 'Chris', last: 'Buescher', number: '17', manufacturer: 'Ford', series: 'NASCAR Cup Series' },
  { first: 'Bubba', last: 'Wallace', number: '23', manufacturer: 'Toyota', series: 'NASCAR Cup Series' },
  { first: 'Carson', last: 'Hocevar', number: '77', manufacturer: 'Chevrolet', series: 'NASCAR Cup Series' },
  { first: 'Ryan', last: 'Blaney', number: '12', manufacturer: 'Ford', series: 'NASCAR Cup Series' },
  { first: 'Riley', last: 'Herbst', number: '35', manufacturer: 'Toyota', series: 'NASCAR Cup Series' },
  { first: 'Daniel', last: 'Suárez', number: '7', manufacturer: 'Chevrolet', series: 'NASCAR Cup Series' },
  { first: 'Josh', last: 'Berry', number: '21', manufacturer: 'Ford', series: 'NASCAR Cup Series' },
  { first: 'Kyle', last: 'Busch', number: '8', manufacturer: 'Chevrolet', series: 'NASCAR Cup Series' },
  { first: 'Kyle', last: 'Larson', number: '5', manufacturer: 'Chevrolet', series: 'NASCAR Cup Series' },
  { first: 'Noah', last: 'Gragson', number: '4', manufacturer: 'Ford', series: 'NASCAR Cup Series' },
  { first: 'Michael', last: 'McDowell', number: '71', manufacturer: 'Chevrolet', series: 'NASCAR Cup Series' },
  { first: 'William', last: 'Byron', number: '24', manufacturer: 'Chevrolet', series: 'NASCAR Cup Series' },
  { first: 'John Hunter', last: 'Nemechek', number: '42', manufacturer: 'Toyota', series: 'NASCAR Cup Series' },
  { first: 'Ty', last: 'Dillon', number: '10', manufacturer: 'Chevrolet', series: 'NASCAR Cup Series' },
  { first: 'Martin', last: 'Truex Jr', number: '19', manufacturer: 'Toyota', series: 'NASCAR Cup Series' },
  { first: 'Denny', last: 'Hamlin', number: '11', manufacturer: 'Toyota', series: 'NASCAR Cup Series' },
  { first: 'Alex', last: 'Bowman', number: '48', manufacturer: 'Chevrolet', series: 'NASCAR Cup Series' },
  { first: 'Ross', last: 'Chastain', number: '1', manufacturer: 'Chevrolet', series: 'NASCAR Cup Series' },
  { first: 'Christopher', last: 'Bell', number: '20', manufacturer: 'Toyota', series: 'NASCAR Cup Series' },
  { first: 'Austin', last: 'Dillon', number: '3', manufacturer: 'Chevrolet', series: 'NASCAR Cup Series' },
  { first: 'Ty', last: 'Gibbs', number: '54', manufacturer: 'Toyota', series: 'NASCAR Cup Series' },
  { first: 'Todd', last: 'Gilliland', number: '34', manufacturer: 'Ford', series: 'NASCAR Cup Series' },
  { first: 'Corey', last: 'LaJoie', number: '51', manufacturer: 'Ford', series: 'NASCAR Cup Series' },
  { first: 'Erik', last: 'Jones', number: '43', manufacturer: 'Toyota', series: 'NASCAR Cup Series' },
  { first: 'Harrison', last: 'Burton', number: '21', manufacturer: 'Ford', series: 'NASCAR Cup Series' },
  { first: 'Justin', last: 'Haley', number: '31', manufacturer: 'Chevrolet', series: 'NASCAR Cup Series' },
  { first: 'Shane', last: 'van Gisbergen', number: '16', manufacturer: 'Chevrolet', series: 'NASCAR Cup Series' },
  { first: 'Chase', last: 'Briscoe', number: '14', manufacturer: 'Ford', series: 'NASCAR Cup Series' },
  { first: 'Kaz', last: 'Grala', number: '15', manufacturer: 'Ford', series: 'NASCAR Cup Series' },

  // O'Reilly Auto Parts Series (Xfinity)
  { first: 'Austin', last: 'Hill', number: '21', manufacturer: 'Chevrolet', series: "NASCAR O'Reilly Auto Parts Series" },
  { first: 'Justin', last: 'Allgaier', number: '7', manufacturer: 'Chevrolet', series: "NASCAR O'Reilly Auto Parts Series" },
  { first: 'Carson', last: 'Kvapil', number: '1', manufacturer: 'Chevrolet', series: "NASCAR O'Reilly Auto Parts Series" },
  { first: 'Jesse', last: 'Love', number: '2', manufacturer: 'Chevrolet', series: "NASCAR O'Reilly Auto Parts Series" },
  { first: 'Sammy', last: 'Smith', number: '8', manufacturer: 'Chevrolet', series: "NASCAR O'Reilly Auto Parts Series" },
  { first: 'Blaine', last: 'Perkins', number: '31', manufacturer: 'Chevrolet', series: "NASCAR O'Reilly Auto Parts Series" },
  { first: 'Ryan', last: 'Sieg', number: '39', manufacturer: 'Chevrolet', series: "NASCAR O'Reilly Auto Parts Series" },
  { first: 'Rajah', last: 'Caruth', number: '88', manufacturer: 'Chevrolet', series: "NASCAR O'Reilly Auto Parts Series" },
  { first: 'Jordan', last: 'Anderson', number: '32', manufacturer: 'Chevrolet', series: "NASCAR O'Reilly Auto Parts Series" },
  { first: 'Ryan', last: 'Ellis', number: '02', manufacturer: 'Chevrolet', series: "NASCAR O'Reilly Auto Parts Series" },
  { first: 'Parker', last: 'Retzlaff', number: '99', manufacturer: 'Chevrolet', series: "NASCAR O'Reilly Auto Parts Series" },
  { first: 'Anthony', last: 'Alfredo', number: '96', manufacturer: 'Chevrolet', series: "NASCAR O'Reilly Auto Parts Series" },
  { first: 'Brennan', last: 'Poole', number: '44', manufacturer: 'Chevrolet', series: "NASCAR O'Reilly Auto Parts Series" },
  { first: 'Kyle', last: 'Sieg', number: '28', manufacturer: 'Chevrolet', series: "NASCAR O'Reilly Auto Parts Series" },
  { first: 'William', last: 'Sawalich', number: '18', manufacturer: 'Toyota', series: "NASCAR O'Reilly Auto Parts Series" },
  { first: 'Lavar', last: 'Scott', number: '45', manufacturer: 'Chevrolet', series: "NASCAR O'Reilly Auto Parts Series" },
  { first: 'Josh', last: 'Bilicki', number: '07', manufacturer: 'Chevrolet', series: "NASCAR O'Reilly Auto Parts Series" },
  { first: 'Patrick', last: 'Staropoli', number: '48', manufacturer: 'Chevrolet', series: "NASCAR O'Reilly Auto Parts Series" },
  { first: 'Carson', last: 'Ware', number: '30', manufacturer: 'Chevrolet', series: "NASCAR O'Reilly Auto Parts Series" },
  { first: 'Sheldon', last: 'Creed', number: '00', manufacturer: 'Chevrolet', series: "NASCAR O'Reilly Auto Parts Series" },
  { first: 'Taylor', last: 'Gray', number: '17', manufacturer: 'Ford', series: "NASCAR O'Reilly Auto Parts Series" },
  { first: 'Chandler', last: 'Smith', number: '81', manufacturer: 'Toyota', series: "NASCAR O'Reilly Auto Parts Series" },
  { first: 'Connor', last: 'Zilisch', number: '11', manufacturer: 'Chevrolet', series: "NASCAR O'Reilly Auto Parts Series" },
  { first: 'Cole', last: 'Custer', number: '0', manufacturer: 'Ford', series: "NASCAR O'Reilly Auto Parts Series" },
  { first: 'Santino', last: 'Ferrucci', number: '13', manufacturer: 'Chevrolet', series: "NASCAR O'Reilly Auto Parts Series" },
  { first: 'Jeremy', last: 'Clements', number: '51', manufacturer: 'Chevrolet', series: "NASCAR O'Reilly Auto Parts Series" },
  { first: 'Brandon', last: 'Jones', number: '19', manufacturer: 'Toyota', series: "NASCAR O'Reilly Auto Parts Series" },
  { first: 'Nick', last: 'Sanchez', number: '2', manufacturer: 'Chevrolet', series: "NASCAR O'Reilly Auto Parts Series" },

  // Craftsman Truck Series
  { first: 'Chandler', last: 'Smith', number: '38', manufacturer: 'Ford', series: 'NASCAR Craftsman Truck Series' },
  { first: 'Christian', last: 'Eckes', number: '91', manufacturer: 'Chevrolet', series: 'NASCAR Craftsman Truck Series' },
  { first: 'Ty', last: 'Majeski', number: '88', manufacturer: 'Ford', series: 'NASCAR Craftsman Truck Series' },
  { first: 'Giovanni', last: 'Ruggiero', number: '17', manufacturer: 'Toyota', series: 'NASCAR Craftsman Truck Series' },
  { first: 'Kaden', last: 'Honeycutt', number: '11', manufacturer: 'Toyota', series: 'NASCAR Craftsman Truck Series' },
  { first: 'Brenden', last: 'Queen', number: '12', manufacturer: 'RAM', series: 'NASCAR Craftsman Truck Series' },
  { first: 'Nick', last: 'Leitz', number: '5', manufacturer: 'Toyota', series: 'NASCAR Craftsman Truck Series' },
  { first: 'Tyler', last: 'Ankrum', number: '18', manufacturer: 'Chevrolet', series: 'NASCAR Craftsman Truck Series' },
  { first: 'Stewart', last: 'Friesen', number: '52', manufacturer: 'Toyota', series: 'NASCAR Craftsman Truck Series' },
  { first: 'Ben', last: 'Rhodes', number: '99', manufacturer: 'Ford', series: 'NASCAR Craftsman Truck Series' },
  { first: 'Andres', last: 'Perez De Lara', number: '44', manufacturer: 'Chevrolet', series: 'NASCAR Craftsman Truck Series' },
  { first: 'Cole', last: 'Butcher', number: '13', manufacturer: 'Ford', series: 'NASCAR Craftsman Truck Series' },
  { first: 'Tanner', last: 'Gray', number: '15', manufacturer: 'Toyota', series: 'NASCAR Craftsman Truck Series' },
  { first: 'Travis', last: 'Pastrana', number: '42', manufacturer: 'Chevrolet', series: 'NASCAR Craftsman Truck Series' },
  { first: 'Frankie', last: 'Muniz', number: '33', manufacturer: 'Ford', series: 'NASCAR Craftsman Truck Series' },
  { first: 'Daniel', last: 'Dye', number: '10', manufacturer: 'RAM', series: 'NASCAR Craftsman Truck Series' },
  { first: 'Clay', last: 'Greenfield', number: '95', manufacturer: 'Chevrolet', series: 'NASCAR Craftsman Truck Series' },
  { first: 'Mini', last: 'Tyrrell', number: '14', manufacturer: 'RAM', series: 'NASCAR Craftsman Truck Series' },
  { first: 'Josh', last: 'Reaume', number: '22', manufacturer: 'Ford', series: 'NASCAR Craftsman Truck Series' },
  { first: 'Jack', last: 'Wood', number: '24', manufacturer: 'Chevrolet', series: 'NASCAR Craftsman Truck Series' },
  { first: 'Matt', last: 'Crafton', number: '88', manufacturer: 'Ford', series: 'NASCAR Craftsman Truck Series' },
  { first: 'Grant', last: 'Enfinger', number: '23', manufacturer: 'Chevrolet', series: 'NASCAR Craftsman Truck Series' },
  { first: 'Hailie', last: 'Deegan', number: '1', manufacturer: 'Ford', series: 'NASCAR Craftsman Truck Series' },
  { first: 'Taylor', last: 'Gray', number: '17', manufacturer: 'Toyota', series: 'NASCAR Craftsman Truck Series' },
  { first: 'Connor', last: 'Mosack', number: '27', manufacturer: 'Chevrolet', series: 'NASCAR Craftsman Truck Series' },
  { first: 'Tricky', last: 'Tricky', number: '0', manufacturer: 'Ford', series: 'NASCAR Craftsman Truck Series' },
];

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function normalizeManufacturer(mfr) {
  const m = mfr?.toLowerCase() || '';
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
    const dry_run = body.dry_run !== false; // default to dry_run = true

    // Load existing data
    const [existingDrivers, existingSeries, existingPrograms] = await Promise.all([
      base44.asServiceRole.entities.Driver.list(),
      base44.asServiceRole.entities.Series.list(),
      base44.asServiceRole.entities.DriverProgram.list(),
    ]);

    const driverMap = new Map(); // "first last" -> driver record
    for (const d of existingDrivers) {
      const key = `${d.first_name?.toLowerCase()} ${d.last_name?.toLowerCase()}`;
      driverMap.set(key, d);
    }

    const seriesMap = new Map(); // series name -> series record
    for (const s of existingSeries) {
      seriesMap.set(s.name, s);
    }

    // Build set of existing programs to avoid duplication
    const programSet = new Set();
    for (const p of existingPrograms) {
      programSet.add(`${p.driver_id}|${p.series_name}|${p.season || '2026'}`);
    }

    const stats = { drivers_created: 0, drivers_found: 0, series_created: 0, programs_created: 0, skipped: 0 };
    const log = [];

    // Ensure all series exist first
    const allSeriesNames = [...new Set(NASCAR_DRIVERS.map(d => d.series))];
    for (const seriesName of allSeriesNames) {
      if (!seriesMap.has(seriesName)) {
        stats.series_created++;
        if (!dry_run) {
          const created = await base44.asServiceRole.entities.Series.create({
            name: seriesName,
            slug: slugify(seriesName),
            discipline: 'Stock Car',
            region: 'United States',
            status: 'Active',
            season_year: '2026',
            sanctioning_body: 'NASCAR',
          });
          seriesMap.set(seriesName, created);
          log.push(`Created series: ${seriesName}`);
        } else {
          seriesMap.set(seriesName, { id: `dry-run-${seriesName}`, name: seriesName });
          log.push(`[DRY RUN] Would create series: ${seriesName}`);
        }
      }
    }

    // Process each driver
    for (const driverData of NASCAR_DRIVERS) {
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
            hometown_city: 'Unknown',
            hometown_country: 'United States',
            slug: slugify(`${driverData.first} ${driverData.last}`),
          });
          driverMap.set(fullKey, driver);
          log.push(`Created driver: ${driverData.first} ${driverData.last}`);
        } else {
          driver = { id: `dry-run-${fullKey}` };
          log.push(`[DRY RUN] Would create driver: ${driverData.first} ${driverData.last} (${driverData.series})`);
        }
      } else {
        stats.drivers_found++;
      }

      // Create DriverProgram if not already exists
      const programKey = `${driver.id}|${driverData.series}|2026`;
      if (!programSet.has(programKey) && driver.id) {
        const seriesRecord = seriesMap.get(driverData.series);
        if (!dry_run) {
          await base44.asServiceRole.entities.DriverProgram.create({
            driver_id: driver.id,
            series_id: seriesRecord?.id || null,
            series_name: driverData.series,
            car_number: driverData.number,
            season: '2026',
            status: 'active',
          });
          programSet.add(programKey);
          log.push(`Created program: ${driverData.first} ${driverData.last} → ${driverData.series}`);
        } else {
          log.push(`[DRY RUN] Would create program: ${driverData.first} ${driverData.last} → ${driverData.series} #${driverData.number}`);
        }
        stats.programs_created++;
      } else if (programSet.has(programKey)) {
        stats.skipped++;
      }
    }

    return Response.json({
      success: true,
      dry_run,
      stats,
      log,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});