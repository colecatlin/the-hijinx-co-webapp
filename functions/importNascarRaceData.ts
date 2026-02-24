import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { seriesName, raceName, raceYear = '2026' } = body;

    if (!seriesName || !raceName) {
      return Response.json(
        { error: 'seriesName and raceName are required' },
        { status: 400 }
      );
    }

    // Construct the URL
    const url = `https://www.nascar.com/live-results/${seriesName}/${raceYear}-${raceName}/`;

    // Fetch the race page
    const response = await fetch(url);
    if (!response.ok) {
      return Response.json(
        { error: `Failed to fetch race data: ${response.statusText}` },
        { status: response.status }
      );
    }

    const html = await response.text();

    // Extract race results
    const resultsData = extractRaceResults(html, seriesName, raceName, raceYear);

    // Extract standings data
    const standingsData = extractStandings(html, seriesName, raceYear);

    // Get series ID
    const series = await base44.asServiceRole.entities.Series.filter({
      slug: seriesName.toLowerCase().replace(/\s+/g, '-')
    });

    if (!series || series.length === 0) {
      return Response.json(
        { error: `Series not found: ${seriesName}` },
        { status: 404 }
      );
    }

    const seriesId = series[0].id;

    // Process results
    let resultsCreated = 0;
    if (resultsData && resultsData.length > 0) {
      // Get or create event
      const eventName = raceName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      let event = await base44.asServiceRole.entities.Event.filter({
        name: eventName,
        series: series[0].name,
        season: raceYear
      });

      let eventId;
      if (!event || event.length === 0) {
        const newEvent = await base44.asServiceRole.entities.Event.create({
          name: eventName,
          series: series[0].name,
          season: raceYear,
          event_date: new Date().toISOString().split('T')[0],
          status: 'completed',
          track_id: null
        });
        eventId = newEvent.id;
      } else {
        eventId = event[0].id;
      }

      // Create results for each driver
      for (const result of resultsData) {
        const driver = await base44.asServiceRole.entities.Driver.filter({
          first_name: result.firstName,
          last_name: result.lastName
        });

        if (driver && driver.length > 0) {
          await base44.asServiceRole.entities.Results.create({
            driver_id: driver[0].id,
            event_id: eventId,
            position: result.position,
            status_text: result.statusText || 'Running',
            team_name: result.teamName,
            series: series[0].name,
            class: result.class || '',
            laps_completed: result.lapsCompleted,
            best_lap_time: result.bestLapTime,
            points: result.points
          });
          resultsCreated++;
        }
      }
    }

    // Process standings
    let standingsCreated = 0;
    if (standingsData && standingsData.length > 0) {
      for (const standing of standingsData) {
        const driver = await base44.asServiceRole.entities.Driver.filter({
          first_name: standing.firstName,
          last_name: standing.lastName
        });

        if (driver && driver.length > 0) {
          // Check if standing already exists
          const existingStanding = await base44.asServiceRole.entities.Standings.filter({
            driver_id: driver[0].id,
            series_id: seriesId,
            season: raceYear
          });

          if (!existingStanding || existingStanding.length === 0) {
            await base44.asServiceRole.entities.Standings.create({
              driver_id: driver[0].id,
              series_id: seriesId,
              season: raceYear,
              rank: standing.rank,
              points: standing.points,
              wins: standing.wins || 0,
              top_5s: standing.top5s || 0,
              top_10s: standing.top10s || 0
            });
          } else {
            // Update existing standing
            await base44.asServiceRole.entities.Standings.update(existingStanding[0].id, {
              rank: standing.rank,
              points: standing.points,
              wins: standing.wins || 0,
              top_5s: standing.top5s || 0,
              top_10s: standing.top10s || 0
            });
          }
          standingsCreated++;
        }
      }
    }

    return Response.json({
      success: true,
      message: `Imported ${resultsCreated} results and ${standingsCreated} standings records`,
      data: {
        resultsCreated,
        standingsCreated
      }
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function extractRaceResults(html, seriesName, raceName, raceYear) {
  const results = [];

  // Look for results table/grid data in the HTML
  // NASCAR typically uses data attributes or structured divs with class names like "result-row", "finish-position", etc.
  const resultRows = html.match(/<tr[^>]*class="[^"]*result[^"]*"[^>]*>.*?<\/tr>/gi) || [];

  resultRows.forEach((row) => {
    const positionMatch = row.match(/<td[^>]*class="[^"]*position[^"]*"[^>]*>(\d+)<\/td>/i);
    const driverMatch = row.match(/<td[^>]*class="[^"]*driver[^"]*"[^>]*>([^<]+)<\/td>/i);
    const teamMatch = row.match(/<td[^>]*class="[^"]*team[^"]*"[^>]*>([^<]+)<\/td>/i);
    const pointsMatch = row.match(/<td[^>]*class="[^"]*points[^"]*"[^>]*>(\d+)<\/td>/i);
    const lapsMatch = row.match(/<td[^>]*class="[^"]*laps[^"]*"[^>]*>(\d+)<\/td>/i);

    if (positionMatch && driverMatch) {
      const [firstName, lastName] = driverMatch[1].trim().split(/\s+/);

      results.push({
        position: parseInt(positionMatch[1]),
        firstName: firstName || '',
        lastName: lastName || driverMatch[1].trim(),
        teamName: teamMatch ? teamMatch[1].trim() : '',
        points: pointsMatch ? parseInt(pointsMatch[1]) : 0,
        lapsCompleted: lapsMatch ? parseInt(lapsMatch[1]) : 0,
        bestLapTime: '',
        statusText: 'Running'
      });
    }
  });

  return results;
}

function extractStandings(html, seriesName, raceYear) {
  const standings = [];

  // Look for standings table data
  const standingRows = html.match(/<tr[^>]*class="[^"]*standing[^"]*"[^>]*>.*?<\/tr>/gi) || [];

  standingRows.forEach((row) => {
    const rankMatch = row.match(/<td[^>]*class="[^"]*rank[^"]*"[^>]*>(\d+)<\/td>/i);
    const driverMatch = row.match(/<td[^>]*class="[^"]*driver[^"]*"[^>]*>([^<]+)<\/td>/i);
    const pointsMatch = row.match(/<td[^>]*class="[^"]*points[^"]*"[^>]*>(\d+)<\/td>/i);
    const winsMatch = row.match(/<td[^>]*class="[^"]*wins[^"]*"[^>]*>(\d+)<\/td>/i);
    const top5Match = row.match(/<td[^>]*class="[^"]*top\s*5[^"]*"[^>]*>(\d+)<\/td>/i);
    const top10Match = row.match(/<td[^>]*class="[^"]*top\s*10[^"]*"[^>]*>(\d+)<\/td>/i);

    if (rankMatch && driverMatch) {
      const [firstName, lastName] = driverMatch[1].trim().split(/\s+/);

      standings.push({
        rank: parseInt(rankMatch[1]),
        firstName: firstName || '',
        lastName: lastName || driverMatch[1].trim(),
        points: pointsMatch ? parseInt(pointsMatch[1]) : 0,
        wins: winsMatch ? parseInt(winsMatch[1]) : 0,
        top5s: top5Match ? parseInt(top5Match[1]) : 0,
        top10s: top10Match ? parseInt(top10Match[1]) : 0
      });
    }
  });

  return standings;
}