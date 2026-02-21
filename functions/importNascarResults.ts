import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// v2 - LLM internet search approach
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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const {
      series_id = 1,
      season_year = 2026,
      race_name,       // specific race name e.g. "Daytona 500"
      race_id,         // specific NASCAR race_id from schedule feed
      import_all = false,
      dry_run = false,
    } = body;

    const seriesName = SERIES_NAMES[series_id];
    const seriesSearchName = SERIES_SEARCH_NAMES[series_id];
    if (!seriesName) {
      return Response.json({ error: `Unknown series_id: ${series_id}` }, { status: 400 });
    }

    const log = [];

    // --- Step 1: Fetch NASCAR schedule feed ---
    const scheduleUrl = `https://cf.nascar.com/cacher/${season_year}/${series_id}/schedule-feed.json`;
    log.push(`Fetching schedule: ${scheduleUrl}`);

    const scheduleRes = await fetch(scheduleUrl);
    if (!scheduleRes.ok) {
      return Response.json({ error: `Schedule fetch failed: ${scheduleRes.status}` }, { status: 500 });
    }

    const schedule = await scheduleRes.json();
    const now = new Date();

    // Deduplicate: only race sessions (run_type=3), already completed
    const completedRaces = schedule
      .filter(e => e.run_type === 3 && new Date(e.start_time_utc) < now)
      .reduce((acc, e) => {
        if (!acc.find(r => r.race_id === e.race_id)) acc.push(e);
        return acc;
      }, []);

    log.push(`Found ${completedRaces.length} completed race(s)`);

    // --- Determine which races to process ---
    let targetRaces;
    if (race_id) {
      const found = completedRaces.find(r => r.race_id === race_id);
      if (!found) return Response.json({ error: `Race ID ${race_id} not found` }, { status: 404 });
      targetRaces = [found];
    } else if (race_name) {
      const nameLower = race_name.toLowerCase();
      const found = completedRaces.find(r => (r.race_name || '').toLowerCase().includes(nameLower));
      targetRaces = [found || { race_name, track_name: '', start_time: null }];
    } else if (import_all) {
      targetRaces = completedRaces;
    } else {
      // Default: most recent race
      targetRaces = [completedRaces[completedRaces.length - 1]];
    }

    log.push(`Will process ${targetRaces.length} race(s)`);

    // --- Step 2: Load DB data for matching ---
    const [dbDrivers, dbEvents] = await Promise.all([
      base44.asServiceRole.entities.Driver.list(),
      base44.asServiceRole.entities.Event.list(),
    ]);

    // Driver lookup maps
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

    // --- Step 3: Process each race ---
    for (const race of targetRaces) {
      const rName = race.race_name || race_name || 'Unknown Race';
      const trackName = race.track_name || '';
      const raceDate = race.start_time ? race.start_time.split('T')[0] : null;

      log.push(`\n=== ${rName} | ${trackName} | ${raceDate || 'no date'} ===`);

      // --- 3a: LLM internet search for results ---
      log.push(`  Querying LLM with internet context...`);
      let parsedResults = [];

      try {
        const llmResp = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `Look up the official race results for this NASCAR race and return the complete finishing order:

Series: ${seriesSearchName}
Race: ${rName}
Track: ${trackName}
Season: ${season_year}
${raceDate ? `Date: ${raceDate}` : ''}

Return all drivers in finishing order. For each driver include:
- position: finishing position (1 = winner)  
- driver_name: full name (e.g. "Kyle Larson")
- car_number: car/truck number (e.g. "5")
- status_text: finish status — one of: Running, Accident, Engine, Transmission, Handling, Suspension, Overheating, DNF, DNS, Disqualified
- laps_completed: number of laps completed
- points: championship points earned (if available, otherwise null)

If you cannot find reliable data for this specific race, return empty results array.`,
          add_context_from_internet: true,
          response_json_schema: {
            type: 'object',
            properties: {
              confirmed_race: { type: 'string' },
              confirmed_winner: { type: 'string' },
              confirmed_date: { type: 'string' },
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

        parsedResults = llmResp?.results || [];
        log.push(`  LLM returned ${parsedResults.length} drivers`);
        if (llmResp?.confirmed_winner) log.push(`  Winner: ${llmResp.confirmed_winner} on ${llmResp.confirmed_date}`);

      } catch (e) {
        log.push(`  LLM error: ${e.message}`);
        continue;
      }

      if (!parsedResults.length) {
        log.push(`  No results returned, skipping`);
        stats.events_unmatched.push(rName);
        continue;
      }

      // --- 3b: Match event in DB ---
      let dbEvent = null;
      const rNameLower = rName.toLowerCase();

      for (const e of dbEvents) {
        const eName = (e.name || '').toLowerCase();
        // Try name overlap (first 10 chars)
        if (eName.includes(rNameLower.substring(0, 10)) || rNameLower.includes(eName.substring(0, 10))) {
          dbEvent = e; break;
        }
        // Try date + series match
        if (raceDate && e.event_date === raceDate && e.series === seriesName) {
          dbEvent = e; break;
        }
        // Try track name in event name
        if (trackName && eName.includes(trackName.toLowerCase().substring(0, 8))) {
          dbEvent = e; break;
        }
      }

      if (!dbEvent) {
        log.push(`  WARNING: No DB event match for "${rName}"`);
        stats.events_unmatched.push(rName);
        continue;
      }

      log.push(`  Matched DB event: "${dbEvent.name}" (${dbEvent.id})`);

      // Check for duplicate results
      const existing = await base44.asServiceRole.entities.Results.filter({ event_id: dbEvent.id });
      if (existing.length > 0) {
        log.push(`  Already have ${existing.length} results, skipping`);
        stats.results_skipped += parsedResults.length;
        continue;
      }

      // --- 3c: Match drivers ---
      const recordsToCreate = [];
      for (const r of parsedResults) {
        const nameLower = (r.driver_name || '').toLowerCase().trim();
        let dbDriver = driverByFullName[nameLower];

        if (!dbDriver) {
          const parts = nameLower.split(' ');
          dbDriver = driverByLastName[parts[parts.length - 1]];
        }

        if (!dbDriver) {
          log.push(`  UNMATCHED driver: "${r.driver_name}" (#${r.car_number})`);
          if (!stats.drivers_unmatched.includes(r.driver_name)) stats.drivers_unmatched.push(r.driver_name);
        }

        recordsToCreate.push({
          driver_id: dbDriver?.id || null,
          event_id: dbEvent.id,
          series: seriesName,
          session_type: 'Final',
          position: r.position,
          status_text: r.status_text || 'Running',
          laps_completed: r.laps_completed || null,
          points: r.points || null,
          team_name: '',
        });
      }

      if (!dry_run) {
        for (const rec of recordsToCreate) {
          await base44.asServiceRole.entities.Results.create(rec);
        }
        await base44.asServiceRole.entities.Event.update(dbEvent.id, { status: 'completed' });
        log.push(`  Created ${recordsToCreate.length} result records, event marked completed`);
      } else {
        log.push(`  [DRY RUN] Would create ${recordsToCreate.length} records`);
        log.push(`  Sample P1: ${JSON.stringify(recordsToCreate[0])}`);
        log.push(`  Sample P2: ${JSON.stringify(recordsToCreate[1])}`);
      }

      stats.results_created += recordsToCreate.length;
      stats.races_processed++;
    }

    return Response.json({ success: true, dry_run, series: seriesName, season: season_year, stats, log });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});