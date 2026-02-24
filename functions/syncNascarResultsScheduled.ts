import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const SERIES_CONFIG = [
  { name: 'NASCAR Cup Series', seriesId: 'cup', baseUrl: 'https://www.nascar.com/results/nascar-cup-series' },
  { name: 'NASCAR Craftsman Truck Series', seriesId: 'truck', baseUrl: 'https://www.nascar.com/results/nascar-craftsman-truck-series' },
  { name: 'NASCAR O\'Reilly Auto Parts Series', seriesId: 'arca', baseUrl: 'https://www.nascar.com/results/nascar-oreilly-auto-parts-series' }
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { seriesId } = body;

    // If seriesId specified, sync only that series; otherwise sync all
    const seriesToSync = seriesId 
      ? SERIES_CONFIG.filter(s => s.seriesId === seriesId)
      : SERIES_CONFIG;

    let totalImported = 0;
    const results = [];

    for (const series of seriesToSync) {
      try {
        // Get events for this series that are completed but don't have results yet
        const seriesRecord = await base44.asServiceRole.entities.Series.filter({
          name: series.name
        });

        if (!seriesRecord || seriesRecord.length === 0) {
          results.push({
            series: series.name,
            status: 'skipped',
            reason: 'Series not found in database'
          });
          continue;
        }

        const seriesId = seriesRecord[0].id;

        // Get all completed events without results
        const events = await base44.asServiceRole.entities.Event.filter({
          series: series.name,
          status: 'completed'
        });

        for (const event of events || []) {
          // Check if this event already has results
          const existingResults = await base44.asServiceRole.entities.Results.filter({
            event_id: event.id
          });

          if (existingResults && existingResults.length > 0) {
            continue; // Skip if results already exist
          }

          // Construct URL for this race
          const raceName = event.name.toLowerCase().replace(/\s+/g, '-');
          const raceUrl = `${series.baseUrl}/${raceName}`;

          // Call the import function
          try {
            const importResponse = await base44.asServiceRole.functions.invoke(
              'importNascarRaceData',
              {
                raceUrl: raceUrl,
                eventId: event.id,
                seriesName: series.name,
                raceName: event.name
              }
            );

            if (importResponse.data?.success) {
              totalImported += importResponse.data.resultsImported || 0;
              results.push({
                series: series.name,
                event: event.name,
                status: 'success',
                resultsImported: importResponse.data.resultsImported
              });
            }
          } catch (e) {
            results.push({
              series: series.name,
              event: event.name,
              status: 'error',
              error: e.message
            });
          }
        }
      } catch (error) {
        results.push({
          series: series.name,
          status: 'error',
          error: error.message
        });
      }
    }

    return Response.json({
      success: true,
      totalImported,
      results
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});