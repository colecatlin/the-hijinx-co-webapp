import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { url, eventId } = await req.json();
    
    if (!url || !eventId) {
      return Response.json({ error: 'Missing url or eventId' }, { status: 400 });
    }

    // Fetch the NASCAR page
    const response = await fetch(url);
    const html = await response.text();

    // Extract race results table data
    const resultsData = extractResultsFromHTML(html);
    
    if (!resultsData || resultsData.length === 0) {
      return Response.json({ error: 'No results found on page' }, { status: 400 });
    }

    // Get the event to verify it exists
    const event = await base44.entities.Event.get(eventId);
    if (!event) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }

    // Fetch all drivers to match against results
    const allDrivers = await base44.entities.Driver.list();
    
    // Get or create driver programs for the series
    const allPrograms = await base44.entities.DriverProgram.list();

    // Process results and create Result records
    const createdResults = [];
    
    for (const resultData of resultsData) {
      // Fuzzy match driver name to driver ID
      const matchedDriver = fuzzyMatchDriver(resultData.driverName, allDrivers);
      
      if (!matchedDriver) {
        console.log(`Could not match driver: ${resultData.driverName}`);
        continue;
      }

      // Find or create program for this driver/series combo
      let program = allPrograms.find(p => 
        p.driver_id === matchedDriver.id && 
        p.series === event.series
      );

      if (!program) {
        // Create a basic program if it doesn't exist
        program = await base44.entities.DriverProgram.create({
          driver_id: matchedDriver.id,
          series: event.series,
          class_name: resultData.className || event.series,
          team_name: resultData.teamName,
          status: 'Active'
        });
      }

      // Create the result record
      const resultRecord = {
        driver_id: matchedDriver.id,
        program_id: program.id,
        event_id: eventId,
        position: resultData.position,
        status_text: resultData.statusText || 'Running',
        team_name: resultData.teamName,
        series: event.series,
        class: resultData.className || 'N/A',
        laps_completed: resultData.lapsCompleted,
        best_lap_time: resultData.bestLapTime,
        points: resultData.points
      };

      const created = await base44.entities.Results.create(resultRecord);
      createdResults.push(created);
    }

    return Response.json({
      success: true,
      resultsCreated: createdResults.length,
      results: createdResults
    });

  } catch (error) {
    console.error('Error scraping NASCAR results:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// Extract results from NASCAR.com HTML
function extractResultsFromHTML(html) {
  const results = [];
  
  // Look for results table rows in the HTML
  const tableRowRegex = /<tr[^>]*>[\s\S]*?<\/tr>/g;
  const tableRows = html.match(tableRowRegex) || [];

  tableRows.forEach((row) => {
    // Skip header rows
    if (row.includes('class="header"') || row.includes('<th')) return;

    // Extract data from table cells
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/g;
    const cells = [];
    let match;
    
    while ((match = cellRegex.exec(row)) !== null) {
      let cellContent = match[1]
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .trim();
      cells.push(cellContent);
    }

    if (cells.length < 3) return; // Need at least position, name, and points

    // Parse cell data
    const position = parseInt(cells[0]) || null;
    const driverName = cells[1];
    const points = parseInt(cells[cells.length - 1]) || null;
    
    if (position && driverName) {
      results.push({
        position,
        driverName,
        points,
        statusText: 'Running',
        className: 'N/A',
        teamName: '',
        lapsCompleted: null,
        bestLapTime: null
      });
    }
  });

  return results;
}

// Fuzzy match driver name to driver record
function fuzzyMatchDriver(nameQuery, drivers) {
  const query = nameQuery.toLowerCase().trim();
  
  // Try exact match first (first name + last name)
  const exactMatch = drivers.find(d => {
    const fullName = `${d.first_name} ${d.last_name}`.toLowerCase();
    return fullName === query;
  });
  
  if (exactMatch) return exactMatch;

  // Try partial match (last name match)
  const lastNameMatch = drivers.find(d => {
    return d.last_name.toLowerCase() === query || query.includes(d.last_name.toLowerCase());
  });
  
  if (lastNameMatch) return lastNameMatch;

  // Try fuzzy match (contains both parts)
  const parts = query.split(/\s+/);
  const fuzzyMatch = drivers.find(d => {
    const fullName = `${d.first_name} ${d.last_name}`.toLowerCase();
    return parts.every(part => fullName.includes(part));
  });

  return fuzzyMatch || null;
}