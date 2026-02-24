import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const seriesConfig = [
      { name: 'NASCAR Cup Series', seriesId: 'cup' },
      { name: 'NASCAR Craftsman Truck Series', seriesId: 'truck' },
      { name: 'NASCAR O\'Reilly Auto Parts Series', seriesId: 'arca' }
    ];

    let totalImported = 0;
    const results = [];

    for (const series of seriesConfig) {
      try {
        const seriesRecords = await base44.asServiceRole.entities.Series.filter({
          name: series.name
        });

        if (!seriesRecords || seriesRecords.length === 0) {
          results.push({ series: series.name, status: 'skipped', reason: 'Series not found' });
          continue;
        }

        const seriesId = seriesRecords[0].id;
        const events = await base44.asServiceRole.entities.Event.filter({
          series: series.name,
          status: 'completed'
        });

        for (const event of events || []) {
          const existingResults = await base44.asServiceRole.entities.Results.filter({
            event_id: event.id
          });

          if (existingResults && existingResults.length > 0) {
            continue;
          }

          try {
            const importResponse = await base44.asServiceRole.functions.invoke(
              'importNascarRaceData',
              {
                eventId: event.id,
                seriesName: series.name,
                raceName: event.name
              }
            );

            if (importResponse?.data?.success) {
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

    return Response.json({ success: true, totalImported, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});