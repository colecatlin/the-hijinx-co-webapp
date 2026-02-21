import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const SERIES_NAMES = {
  1: 'NASCAR Cup Series',
  2: "NASCAR O'Reilly Auto Parts Series",
  3: 'NASCAR Craftsman Truck Series',
};

const SERIES_SEARCH_NAMES = {
  1: 'NASCAR Cup Series',
  2: 'NASCAR Xfinity Series',
  3: 'NASCAR Craftsman Truck Series',
};

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const {
      series_id = 1,        // 1=Cup, 2=Xfinity, 3=Trucks
      season_year = 2026,
      race_name,            // e.g. "Daytona 500" — specific race to import
      race_id,              // NASCAR race_id from schedule feed — specific race
      import_all = false,   // import all completed races in the schedule
      dry_run = false,
    } = body;

    const seriesName = SERIES_NAMES[series_id];
    const seriesSearchName = SERIES_SEARCH_NAMES[series_id];

    if (!seriesName) {
      return Response.json({ error: `Unknown series_id: ${series_id}` }, { status: 400 });
    }

    const log = [];

    // Step 1: Fetch schedule to get list of completed races
    const scheduleUrl = `https://cf.nascar.com/cacher/${season_year}/${series_id}/schedule-feed.json`;
    log.push(`Fetching schedule: ${scheduleUrl}`);

    const scheduleRes = await fetch(scheduleUrl);
    if (!scheduleRes.ok) {
      return Response.json({ error: `Failed to fetch schedule: ${scheduleRes.status}` }, { status: 500 });
    }

    const schedule = await scheduleRes.json();
    const now = new Date();

    // Get unique completed races (run_type=3 = Race)
    const allRaces = schedule
      .filter(e => e.run_type === 3)
      .filter(e => new Date(e.start_time_utc) < now)
      .reduce((acc, e) => {
        if (!acc.find(r => r.race_id === e.race_id)) acc.push(e);
        return acc;
      }, []);

    log.push(`Found ${allRaces.length} completed race(s) in schedule`);

    // Determine which races to process
    let targetRaces = [];
    if (race_id) {
      const found = allRaces.find(r => r.race_id === race_id);
      if (!found) return Response.json({ error: `Race ID ${race_id} not found or not completed` }, { status: 404 });
      targetRaces = [found];
    } else if (race_name) {
      // Manual race name provided — find best match in schedule or use as-is
      const nameLower = race_name.toLowerCase();
      const found = allRaces.find(r => r.race_name?.toLowerCase().includes(nameLower) || nameLower.includes(r.race_name?.toLowerCase()));
      targetRaces = [found || { race_name, track_name: '', start_time: null, race_id: null }];
    } else if (import_all) {
      targetRaces = allRaces;
    } else {
      // Default: import most recent completed race only
      targetRaces = [allRaces[allRaces.length - 1]];
    }

    log.push(`Processing ${targetRaces.length} race(s)`);

    // Step 2: Load existing DB data
    const [dbDrivers, dbEvents, dbSeriesArr] = await Promise.all([
      base44.asServiceRole.entities.Driver.list(),
      base44.asServiceRole.entities.Event.list(),
      base44.asServiceRole.entities.Series.filter({ name: seriesName }),
    ]);

    const dbSeriesRecord = dbSeriesArr[0];
    log.push(`Series in DB: ${dbSeriesRecord ? dbSeriesRecord.id : 'NOT FOUND'}`);

    // Build driver lookup maps
    const driverByFullName = {};
    const driverByLastName = {};
    for (const d of dbDrivers) {
      const full = `${d.first_name} ${d.last_name}`.toLowerCase();
      driverByFullName[full] = d;
      const last = d.last_name.toLowerCase();
      if (!driverByLastName[last]) driverByLastName[last] = d;
    }

    const stats = {
      races_processed: 0,
      results_created: 0,
      results_skipped: 0,
      drivers_unmatched: [],
      events_unmatched: [],
    };

    // Step 3: Process each race
    for (const race of targetRaces) {
      const raceName = race.race_name || race_name;
      const trackName = race.track_name || '';
      const raceDate = race.start_time ? race.start_time.split('T')[0] : null;

      log.push(`\n--- Processing: ${raceName} (${raceDate || 'unknown date'}) at ${trackName} ---`);

      // Step 3a: Use LLM + internet to get race results
      log.push(`  Querying LLM with internet search for results...`);

      let parsedResults = [];
      try {
        const prompt = `Find the official race results for the following NASCAR race:
- Series: ${seriesSearchName}
- Race: ${raceName}
- Track: ${trackName}
- Season: ${season_year}
${raceDate ? `- Date: ${raceDate}` : ''}

Return the COMPLETE finishing order with all drivers. For each driver return:
- position (finishing position, 1 = winner)
- driver_name (full name, e.g. "Kyle Larson")
- car_number (e.g. "5")
- status_text (e.g. "Running", "Accident", "Engine", "DNF", "Disqualified")
- laps_completed (number of laps completed)
- points (championship points earned, if available)

If you cannot find reliable data for this specific race, return an empty results array.`;

        const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt,
          add_context_from_internet: true,
          response_json_schema: {
            type: 'object',
            properties: {
              race_name: { type: 'string' },
              track: { type: 'string' },
              date: { type: 'string' },
              total_laps: { type: 'number' },
              results: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    position: { type: 'number' },
                    driver_name: { type: 'string' },
                    car_number: { type: 'string' },
                    status_text: { type: 'string' },
                    laps_completed: { type: 'number' },
                    points: { type: 'number' },
                  }
                }
              }
            }
          }
        });

        parsedResults = llmResponse?.results || [];
        log.push(`  LLM returned ${parsedResults.length} result entries`);
        if (llmResponse?.race_name) log.push(`  Confirmed race: ${llmResponse.race_name} at ${llmResponse.track} on ${llmResponse.date}`);

      } catch (e) {
        log.push(`  LLM error: ${e.message}`);
        continue;
      }

      if (!parsedResults.length) {
        log.push(`  No results returned, skipping`);
        stats.events_unmatched.push(raceName);
        continue;
      }

      // Step 3b: Find matching Event in DB
      let dbEvent = null;
      for (const e of dbEvents) {
        const eName = (e.name || '').toLowerCase();
        const searchName = raceName.toLowerCase();
        // Match by name overlap or date+series
        if (eName.includes(searchName.substring(0, 12)) || searchName.includes(eName.substring(0, 12))) {
          dbEvent = e;
          break;
        }
        if (raceDate && e.event_date === raceDate && e.series === seriesName) {
          dbEvent = e;
          break;
        }
        if (trackName && e.event_date === raceDate && (e.name || '').toLowerCase().includes(slugify(trackName).substring(0, 8))) {
          dbEvent = e;
          break;
        }
      }

      if (!dbEvent) {
        log.push(`  WARNING: No matching Event in DB for "${raceName}"`);
        stats.events_unmatched.push(raceName);
        continue;
      }

      log.push(`  Matched DB event: "${dbEvent.name}" (${dbEvent.id})`);

      // Check for existing results
      const existingResults = await base44.asServiceRole.entities.Results.filter({ event_id: dbEvent.id });
      if (existingResults.length > 0) {
        log.push(`  Already have ${existingResults.length} results for this event, skipping`);
        stats.results_skipped += parsedResults.length;
        continue;
      }

      // Step 3c: Match drivers and build records
      const resultRecords = [];
      for (const r of parsedResults) {
        const nameLower = (r.driver_name || '').toLowerCase().trim();
        let dbDriver = driverByFullName[nameLower];

        // Try last name match if full name fails
        if (!dbDriver) {
          const parts = nameLower.split(' ');
          const lastName = parts[parts.length - 1];
          dbDriver = driverByLastName[lastName];
        }

        if (!dbDriver) {
          log.push(`  WARNING: No driver match for "${r.driver_name}" (#${r.car_number})`);
          if (!stats.drivers_unmatched.includes(r.driver_name)) {
            stats.drivers_unmatched.push(r.driver_name);
          }
        }

        resultRecords.push({
          driver_id: dbDriver?.id || 'unmatched',
          event_id: dbEvent.id,
          series: seriesName,
          session_type: 'Final',
          position: r.position,
          status_text: r.status_text || 'Running',
          laps_completed: r.laps_completed,
          points: r.points || null,
          team_name: r.team_name || '',
        });
      }

      if (!dry_run) {
        for (const record of resultRecords) {
          await base44.asServiceRole.entities.Results.create(record);
        }
        log.push(`  Created ${resultRecords.length} result records`);
        // Mark event as completed
        await base44.asServiceRole.entities.Event.update(dbEvent.id, { status: 'completed' });
      } else {
        log.push(`  [DRY RUN] Would create ${resultRecords.length} records`);
        log.push(`  Sample: ${JSON.stringify(resultRecords[0])}`);
      }

      stats.results_created += resultRecords.length;
      stats.races_processed++;
    }

    return Response.json({
      success: true,
      dry_run,
      series: seriesName,
      season: season_year,
      stats,
      log,
    });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});