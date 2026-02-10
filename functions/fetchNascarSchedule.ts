import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Fetch the .ics file
    const icsUrl = 'https://ics.ecal.com/ecal-sub/698b948296aa600002feb809/NASCAR.ics';
    const response = await fetch(icsUrl);
    const icsText = await response.text();
    
    // Parse ICS format
    const events = parseICS(icsText);
    
    // Create or update events in the database
    const nascarSeries = await base44.asServiceRole.entities.Series.filter({ name: 'NASCAR' }, '-created_date', 1);
    let seriesId = nascarSeries[0]?.id;
    
    // If NASCAR series doesn't exist, create it
    if (!seriesId) {
      const newSeries = await base44.asServiceRole.entities.Series.create({
        name: 'NASCAR',
        slug: 'nascar',
        discipline: 'Asphalt Oval',
        competition_level: 'Professional',
        description_summary: 'NASCAR racing events and schedule',
        region: 'North America',
        founded_year: 1948,
        status: 'Active'
      });
      seriesId = newSeries.id;
    }
    
    // Process events
    const createdEvents = [];
    for (const event of events) {
      try {
        const eventData = {
          name: event.summary,
          slug: event.summary.toLowerCase().replace(/\s+/g, '-'),
          series_id: seriesId,
          series_name: 'NASCAR',
          date: event.dtstart.split('T')[0],
          end_date: event.dtend ? event.dtend.split('T')[0] : event.dtstart.split('T')[0],
          season: new Date(event.dtstart).getFullYear(),
          status: 'upcoming',
          description: event.description || ''
        };
        
        // Check if event already exists
        const existing = await base44.asServiceRole.entities.Event.filter(
          { name: event.summary, series_id: seriesId },
          '-created_date',
          1
        );
        
        if (!existing[0]) {
          const created = await base44.asServiceRole.entities.Event.create(eventData);
          createdEvents.push(created);
        }
      } catch (error) {
        console.error('Error creating event:', error);
      }
    }
    
    return Response.json({
      success: true,
      eventsProcessed: events.length,
      eventsCreated: createdEvents.length,
      message: `Successfully processed ${events.length} NASCAR events`
    });
  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});

function parseICS(icsText) {
  const events = [];
  const lines = icsText.split('\n');
  let currentEvent = null;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (trimmedLine === 'BEGIN:VEVENT') {
      currentEvent = {};
    } else if (trimmedLine === 'END:VEVENT' && currentEvent) {
      events.push(currentEvent);
      currentEvent = null;
    } else if (currentEvent && trimmedLine.includes(':')) {
      const [key, ...valueParts] = trimmedLine.split(':');
      const value = valueParts.join(':');
      const cleanKey = key.split(';')[0].toLowerCase();
      
      if (cleanKey === 'summary') currentEvent.summary = decodeURIComponent(value);
      else if (cleanKey === 'dtstart') currentEvent.dtstart = value;
      else if (cleanKey === 'dtend') currentEvent.dtend = value;
      else if (cleanKey === 'description') currentEvent.description = decodeURIComponent(value);
      else if (cleanKey === 'location') currentEvent.location = decodeURIComponent(value);
    }
  }
  
  return events.filter(e => e.summary && e.dtstart);
}