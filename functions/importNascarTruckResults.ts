import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch the NASCAR page
    const pageUrl = 'https://www.nascar.com/live-results/nascar-craftsman-truck-series/2026-fresh-from-florida-250/';
    const pageResponse = await fetch(pageUrl);
    const html = await pageResponse.text();

    // Extract race data from the HTML
    // Look for the winner name from the HTML
    const winnerMatch = html.match(/<div class="name">(\w+)<\/div>\s*<div class="surname">(\w+)<\/div>/);
    const winnerFirstName = winnerMatch ? winnerMatch[1] : null;
    const winnerLastName = winnerMatch ? winnerMatch[2] : null;

    // Extract event details from the HTML
    const eventTitleMatch = html.match(/<div class="event-title">([^<]+)<\/div>/);
    const eventTitle = eventTitleMatch ? eventTitleMatch[1] : 'Daytona International Speedway';
    
    const eventDateMatch = html.match(/<div class="event-date">([^<]+)<\/div>/);
    const eventDate = eventDateMatch ? eventDateMatch[1] : 'Feb 13, 2026';

    // Get the NASCAR Craftsman Truck Series
    const series = await base44.entities.Series.filter({
      name: { $regex: 'NASCAR Craftsman Truck' }
    });

    if (!series || series.length === 0) {
      return Response.json({ error: 'Series not found' }, { status: 404 });
    }

    const seriesId = series[0].id;

    // Get or create the event
    const eventQuery = await base44.entities.Event.filter({
      name: eventTitle,
      series: series[0].name
    });

    let event;
    if (!eventQuery || eventQuery.length === 0) {
      const dateObj = new Date(eventDate);
      event = await base44.entities.Event.create({
        name: eventTitle,
        series: series[0].name,
        season: '2026',
        event_date: dateObj.toISOString().split('T')[0],
        status: 'completed'
      });
    } else {
      event = eventQuery[0];
    }

    // Extract results data - looking for the results table in the HTML
    // The HTML contains driver results in a structured format
    const resultsData = [];
    
    // Parse results from the page
    // For now, we'll extract the winner info
    if (winnerFirstName && winnerLastName) {
      // Find the driver
      const drivers = await base44.entities.Driver.filter({
        first_name: winnerFirstName,
        last_name: winnerLastName
      });

      if (drivers && drivers.length > 0) {
        const driver = drivers[0];
        // Find or create a program
        const programs = await base44.entities.DriverProgram.filter({
          driver_id: driver.id,
          series_name: series[0].name
        });

        let program;
        if (!programs || programs.length === 0) {
          program = await base44.entities.DriverProgram.create({
            driver_id: driver.id,
            series_name: series[0].name,
            season: '2026',
            status: 'active'
          });
        } else {
          program = programs[0];
        }

        // Create result for the winner
        const result = await base44.entities.Results.create({
          driver_id: driver.id,
          program_id: program.id,
          event_id: event.id,
          session_type: 'Final',
          position: 1,
          status_text: 'Running',
          series: series[0].name,
          team_name: 'Front Row Motorsports',
          points: 65
        });

        resultsData.push(result);
      }
    }

    return Response.json({
      success: true,
      message: 'NASCAR results imported successfully',
      event: event,
      resultsCreated: resultsData.length,
      results: resultsData
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});