import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Series slug mappings for nascar.com URLs
const SERIES_SLUGS = {
  1: 'nascar-cup-series',
  2: 'nascar-oreilly-auto-parts-series',
  3: 'nascar-craftsman-truck-series',
};

// Series name mappings for matching our DB Series records
const SERIES_NAMES = {
  1: 'NASCAR Cup Series',
  2: "NASCAR O'Reilly Auto Parts Series",
  3: 'NASCAR Craftsman Truck Series',
};

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Parse the race results markdown from nascar.com race center page
function parseRaceResults(markdown) {
  const results = [];

  // Look for result rows: position, driver name, car number, start pos, final status, laps completed, laps led, points
  // Pattern from the markdown: position ## DriverName ### ![carNum](...) | startPos FinalStatus lapsCompleted lapsLed points playoffPoints
  const lines = markdown.split('\n');

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();

    // Match position lines like: 1, 2, 3... followed by ## DriverName
    const posMatch = line.match(/^(\d+)$/);
    if (posMatch) {
      const position = parseInt(posMatch[1]);
      // Next meaningful line should be driver name: ## DRIVER NAME
      let j = i + 1;
      while (j < lines.length && lines[j].trim() === '') j++;
      const nameLine = lines[j] ? lines[j].trim() : '';
      const nameMatch = nameLine.match(/^##\s+(.+)$/);
      if (nameMatch) {
        const driverName = nameMatch[1].trim();
        // Next line: ### ![carNum](...) | startPos
        j++;
        while (j < lines.length && lines[j].trim() === '') j++;
        const carLine = lines[j] ? lines[j].trim() : '';
        const carMatch = carLine.match(/!\[([^\]]+)\]/);
        const carNumber = carMatch ? carMatch[1] : '';

        // Parse the data values after | in carLine or subsequent lines
        // They appear as: startPos FinalStatus lapsCompleted lapsLed points playoffPoints
        j++;
        while (j < lines.length && lines[j].trim() === '') j++;
        const dataLine = lines[j] ? lines[j].trim() : '';

        // Extract status - it's usually one of: Running, DNF, DNQ, DNS, DSQ, Accident, etc.
        const statusMatch = dataLine.match(/\b(Running|DNF|DNS|DNQ|DSQ|Accident|Mechanical|Crash|Engine|Suspension|Disqualified|Overheating)\b/i);
        const finalStatus = statusMatch ? statusMatch[1] : 'Running';

        // Extract numbers from data line
        const nums = dataLine.match(/\d+/g) || [];
        const startPos = nums[0] ? parseInt(nums[0]) : null;
        const lapsCompleted = nums[1] ? parseInt(nums[1]) : null;
        const lapsLed = nums[2] ? parseInt(nums[2]) : 0;
        const points = nums[3] ? parseInt(nums[3]) : null;

        results.push({
          position,
          driver_name: driverName,
          car_number: carNumber,
          start_position: startPos,
          status_text: finalStatus,
          laps_completed: lapsCompleted,
          laps_led: lapsLed,
          points,
        });

        i = j + 1;
        continue;
      }
    }
    i++;
  }

  return results;
}

// Alternative simpler parser for the structured markdown format
function parseRaceResultsSimple(markdown) {
  const results = [];

  // The markdown has blocks like:
  // 1\n## Harrison Burton\n### ![20](...) |\n10\nRunning\n250\n81\n51\n0
  // Let's use a regex to find all result blocks
  const blockRegex = /(?:^|\n)(\d+)\s*\n##\s+([A-Z][^\n]+)\n###\s+!\[([^\]]*)\][^\n]*\n\n?(\d+)\n([A-Za-z]+)\n(\d+)\n(\d+)\n(\d+)\n(\d+)/gm;

  let match;
  while ((match = blockRegex.exec(markdown)) !== null) {
    results.push({
      position: parseInt(match[1]),
      driver_name: match[2].trim(),
      car_number: match[3].trim(),
      start_position: parseInt(match[4]),
      status_text: match[5].trim(),
      laps_completed: parseInt(match[6]),
      laps_led: parseInt(match[7]),
      points: parseInt(match[8]),
    });
  }

  return results;
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
      series_id = 1,       // 1=Cup, 2=Xfinity, 3=Trucks
      season_year = 2026,
      race_slug,           // e.g. "daytona-500" — if provided, only import this race
      race_id,             // NASCAR race_id — if provided, look up the slug
      dry_run = false,
    } = body;

    const seriesSlug = SERIES_SLUGS[series_id];
    const seriesName = SERIES_NAMES[series_id];

    if (!seriesSlug) {
      return Response.json({ error: `Unknown series_id: ${series_id}` }, { status: 400 });
    }

    const log = [];

    // Step 1: Fetch the schedule to get race info
    const scheduleUrl = `https://cf.nascar.com/cacher/${season_year}/${series_id}/schedule-feed.json`;
    log.push(`Fetching schedule: ${scheduleUrl}`);

    const scheduleRes = await fetch(scheduleUrl);
    if (!scheduleRes.ok) {
      return Response.json({ error: `Failed to fetch schedule: ${scheduleRes.status}` }, { status: 500 });
    }

    const schedule = await scheduleRes.json();

    // Get unique race entries (run_type=3 = Race, filter past races)
    const now = new Date();
    const races = schedule
      .filter(e => e.run_type === 3)
      .filter(e => new Date(e.start_time_utc) < now)
      .reduce((acc, e) => {
        if (!acc.find(r => r.race_id === e.race_id)) acc.push(e);
        return acc;
      }, []);

    log.push(`Found ${races.length} completed race(s) in schedule`);

    // Filter to specific race if requested
    let targetRaces = races;
    if (race_id) {
      targetRaces = races.filter(r => r.race_id === race_id);
      if (!targetRaces.length) {
        return Response.json({ error: `Race ID ${race_id} not found or not yet completed` }, { status: 404 });
      }
    } else if (race_slug) {
      // If a slug is provided directly, we create a synthetic race entry
      targetRaces = [{ race_id: null, race_name: race_slug, track_name: null, start_time: null }];
    }

    // Step 2: Load existing DB data for matching
    const [dbDrivers, dbEvents, dbSeries] = await Promise.all([
      base44.asServiceRole.entities.Driver.list(),
      base44.asServiceRole.entities.Event.list(),
      base44.asServiceRole.entities.Series.filter({ name: seriesName }),
    ]);

    const dbSeriesRecord = dbSeries[0];
    log.push(`DB series record: ${dbSeriesRecord ? dbSeriesRecord.id : 'NOT FOUND'}`);

    // Build driver lookup by full name and car number
    const driverByName = {};
    for (const d of dbDrivers) {
      const fullName = `${d.first_name} ${d.last_name}`.toLowerCase();
      driverByName[fullName] = d;
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
      const raceSlug = race_slug || slugify(race.race_name);
      const pageUrl = `https://www.nascar.com/results/racecenter/${season_year}/${seriesSlug}/${raceSlug}/`;

      log.push(`\nFetching results page: ${pageUrl}`);

      let pageMarkdown;
      try {
        const pageRes = await fetch(pageUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept': 'text/html',
          }
        });
        pageMarkdown = await pageRes.text();
      } catch (err) {
        log.push(`  ERROR fetching page: ${err.message}`);
        continue;
      }

      // Try to parse results from the HTML/text
      // The race center page returns full HTML — look for result data in script tags or structured HTML
      // NASCAR Race Center loads data via JavaScript, so we'll look for embedded JSON data
      let parsedResults = [];

      // Look for JSON data embedded in the page (NASCAR injects race data as JSON)
      const jsonMatch = pageMarkdown.match(/window\.__INITIAL_STATE__\s*=\s*({.+?});/s) ||
                        pageMarkdown.match(/window\.raceData\s*=\s*({.+?});/s) ||
                        pageMarkdown.match(/"results"\s*:\s*(\[.+?\])/s);

      if (jsonMatch) {
        try {
          const data = JSON.parse(jsonMatch[1]);
          log.push(`  Found embedded JSON data`);
          // Extract results from various possible structures
          const resultsArr = data.results || data.raceResults || data;
          if (Array.isArray(resultsArr)) {
            parsedResults = resultsArr.map((r, idx) => ({
              position: r.finishing_position || r.position || idx + 1,
              driver_name: r.driver?.full_name || r.full_name || r.name || '',
              car_number: r.vehicle_number || r.car_number || '',
              start_position: r.starting_position || r.start_position,
              status_text: r.status || r.final_status || 'Running',
              laps_completed: r.laps_completed,
              laps_led: r.laps_led || 0,
              points: r.points,
            }));
          }
        } catch (e) {
          log.push(`  JSON parse error: ${e.message}`);
        }
      }

      // Fall back to InvokeLLM to extract results from the HTML if no embedded JSON
      if (!parsedResults.length) {
        log.push(`  No embedded JSON found, using LLM to extract results...`);
        try {
          // Truncate HTML to first 50k chars
          const truncated = pageMarkdown.substring(0, 50000);
          const llmResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `Extract the race results table from this NASCAR race page HTML/text. 
Return ONLY a JSON array of objects with these fields: 
{ "position": number, "driver_name": string, "car_number": string, "start_position": number, "status_text": string, "laps_completed": number, "laps_led": number, "points": number }

If the page shows no race results (e.g. 404 or no results table), return an empty array [].

PAGE CONTENT:
${truncated}`,
            response_json_schema: {
              type: 'object',
              properties: {
                results: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      position: { type: 'number' },
                      driver_name: { type: 'string' },
                      car_number: { type: 'string' },
                      start_position: { type: 'number' },
                      status_text: { type: 'string' },
                      laps_completed: { type: 'number' },
                      laps_led: { type: 'number' },
                      points: { type: 'number' },
                    }
                  }
                }
              }
            }
          });
          parsedResults = llmResult?.results || [];
          log.push(`  LLM extracted ${parsedResults.length} results`);
        } catch (e) {
          log.push(`  LLM error: ${e.message}`);
        }
      }

      if (!parsedResults.length) {
        log.push(`  No results found for ${raceSlug}, skipping`);
        stats.events_unmatched.push(raceSlug);
        continue;
      }

      // Find matching Event in DB
      const eventName = race.race_name || raceSlug;
      const trackName = race.track_name || '';
      const raceDate = race.start_time ? race.start_time.split('T')[0] : null;

      // Match event by name similarity or date
      let dbEvent = null;
      for (const e of dbEvents) {
        const eName = (e.name || '').toLowerCase();
        const searchName = eventName.toLowerCase();
        if (eName.includes(searchName.substring(0, 10)) || searchName.includes(eName.substring(0, 10))) {
          dbEvent = e;
          break;
        }
        if (raceDate && e.event_date === raceDate && e.series === seriesName) {
          dbEvent = e;
          break;
        }
      }

      if (!dbEvent) {
        log.push(`  WARNING: No matching Event found for "${eventName}" (${raceDate})`);
        stats.events_unmatched.push(eventName);
        // Still proceed — create results without event_id if needed, or skip
        // We'll skip for now since event_id is required
        continue;
      }

      log.push(`  Matched event: ${dbEvent.name} (${dbEvent.id})`);

      // Check for existing results for this event
      const existingResults = await base44.asServiceRole.entities.Results.filter({ event_id: dbEvent.id });
      if (existingResults.length > 0) {
        log.push(`  Already have ${existingResults.length} results for this event, skipping`);
        stats.results_skipped += parsedResults.length;
        continue;
      }

      // Match drivers and build result records
      const resultRecords = [];
      for (const r of parsedResults) {
        const nameLower = r.driver_name.toLowerCase();
        let dbDriver = driverByName[nameLower];

        // Try partial match if exact fails
        if (!dbDriver) {
          for (const [key, d] of Object.entries(driverByName)) {
            if (nameLower.includes(key.split(' ')[1]) || key.includes(nameLower.split(' ').pop())) {
              dbDriver = d;
              break;
            }
          }
        }

        if (!dbDriver) {
          log.push(`  WARNING: No driver match for "${r.driver_name}" (#${r.car_number})`);
          if (!stats.drivers_unmatched.includes(r.driver_name)) {
            stats.drivers_unmatched.push(r.driver_name);
          }
        }

        resultRecords.push({
          driver_id: dbDriver?.id || null,
          event_id: dbEvent.id,
          series: seriesName,
          session_type: 'Final',
          position: r.position,
          status_text: r.status_text,
          laps_completed: r.laps_completed,
          points: r.points,
          team_name: '',
        });
      }

      if (!dry_run) {
        // Bulk create results
        for (const record of resultRecords) {
          await base44.asServiceRole.entities.Results.create(record);
        }
        log.push(`  Created ${resultRecords.length} result records`);
      } else {
        log.push(`  [DRY RUN] Would create ${resultRecords.length} result records`);
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