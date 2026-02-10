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
    
    // Group events by series
    const seriesByName = {};
    for (const event of events) {
      const seriesName = extractSeriesName(event.summary);
      if (!seriesByName[seriesName]) {
        seriesByName[seriesName] = [];
      }
      seriesByName[seriesName].push(event);
    }
    
    // Create/update series and their events
    const results = {
      seriesCreated: 0,
      eventsCreated: 0,
      errors: []
    };
    
    for (const [seriesName, seriesEvents] of Object.entries(seriesByName)) {
      try {
        // Find or create series
        let series = await base44.asServiceRole.entities.Series.filter({ name: seriesName }, '-created_date', 1);
        let seriesId;
        
        if (!series[0]) {
          const newSeries = await base44.asServiceRole.entities.Series.create({
            name: seriesName,
            slug: seriesName.toLowerCase().replace(/\s+/g, '-'),
            discipline: 'Asphalt Oval',
            competition_level: 'Professional',
            description_summary: `${seriesName} racing series`,
            region: 'North America',
            founded_year: 1948,
            status: 'Active'
          });
          seriesId = newSeries.id;
          results.seriesCreated++;
        } else {
          seriesId = series[0].id;
        }
        
        // Create events for this series
        for (const event of seriesEvents) {
          try {
            const existing = await base44.asServiceRole.entities.Event.filter(
              { name: event.summary, series_id: seriesId },
              '-created_date',
              1
            );
            
            if (!existing[0]) {
              const eventDate = event.dtstart.split('T')[0];
              const endDate = event.dtend ? event.dtend.split('T')[0] : eventDate;
              
              // Extract track name and find or create track
              let trackId = null;
              if (event.location) {
                const trackMatch = event.location.match(/@ (.+?)(?:\s|$)/);
                const trackName = trackMatch ? trackMatch[1].trim() : event.location;
                
                let track = await base44.asServiceRole.entities.Track.filter({ name: trackName }, '-created_date', 1);
                if (!track[0]) {
                  const newTrack = await base44.asServiceRole.entities.Track.create({
                    name: trackName,
                    slug: trackName.toLowerCase().replace(/\s+/g, '-'),
                    city: 'Unknown',
                    state: 'Unknown',
                    country: 'USA',
                    status: 'Active',
                    description_summary: `${trackName} - NASCAR track`,
                    track_type: 'Oval',
                    surfaces: ['Asphalt']
                  });
                  trackId = newTrack.id;
                } else {
                  trackId = track[0].id;
                }
              }
              
              if (trackId) {
                await base44.asServiceRole.entities.Event.create({
                  name: event.summary,
                  slug: event.summary.toLowerCase().replace(/\s+/g, '-') + '-' + eventDate,
                  series_id: seriesId,
                  series_name: seriesName,
                  track_id: trackId,
                  date: eventDate,
                  end_date: endDate,
                  season: new Date(event.dtstart).getFullYear(),
                  status: new Date(eventDate) > new Date() ? 'upcoming' : 'completed',
                  description: event.location || ''
                });
                results.eventsCreated++;
              }
            }
          } catch (error) {
            results.errors.push(`Event ${event.summary}: ${error.message}`);
          }
        }
      } catch (error) {
        results.errors.push(`Series ${seriesName}: ${error.message}`);
      }
    }
    
    return Response.json({
      success: true,
      ...results,
      message: `Successfully processed ${Object.keys(seriesByName).length} NASCAR series with ${events.length} total events`
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

function extractSeriesName(eventSummary) {
  // Extract series from event title
  if (eventSummary.includes('Cup')) return 'NASCAR Cup Series';
  if (eventSummary.includes('Xfinity')) return 'NASCAR Xfinity Series';
  if (eventSummary.includes('Truck')) return 'NASCAR Truck Series';
  if (eventSummary.includes('Craftsman')) return 'NASCAR Craftsman Truck Series';
  if (eventSummary.includes('IndyCar')) return 'IndyCar';
  return 'NASCAR';
}