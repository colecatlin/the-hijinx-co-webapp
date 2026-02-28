import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { phase = 'all' } = body;

    // Phase 1: Migrate Event data
    if (phase === 'all' || phase === 'events') {
      const events = await base44.asServiceRole.entities.Event.list();
      const series = await base44.asServiceRole.entities.Series.list();
      
      // Create a map of series names to IDs
      const seriesMap = {};
      series.forEach(s => {
        seriesMap[s.name.toLowerCase()] = s.id;
      });

      // Update events
      for (const event of events) {
        const updates = {};
        
        // Copy series to series_name if not already set
        if (event.series && !event.series_name) {
          updates.series_name = event.series;
        }
        
        // Set series_id if we can match it
        if (event.series_name && !event.series_id) {
          const matchedId = seriesMap[event.series_name.toLowerCase()];
          if (matchedId) {
            updates.series_id = matchedId;
          }
        }

        if (Object.keys(updates).length > 0) {
          await base44.asServiceRole.entities.Event.update(event.id, updates);
        }
      }
    }

    // Phase 2: Migrate Results data
    if (phase === 'all' || phase === 'results') {
      const results = await base44.asServiceRole.entities.Results.list();

      for (const result of results) {
        const updates = {};

        // Copy best_lap_time to best_lap_time_ms if not already set
        if (result.best_lap_time && !result.best_lap_time_ms) {
          updates.best_lap_time_ms = result.best_lap_time;
        }

        // Extract heat_number from session_type (e.g., "Heat 1" -> 1)
        if (!result.heat_number && result.session_type) {
          const heatMatch = result.session_type.match(/Heat\s*(\d+)/i);
          if (heatMatch) {
            updates.heat_number = parseInt(heatMatch[1], 10);
            // Also update session_type to just "Heat"
            updates.session_type = 'Heat';
          }
        }

        if (Object.keys(updates).length > 0) {
          await base44.asServiceRole.entities.Results.update(result.id, updates);
        }
      }
    }

    return Response.json({ 
      success: true, 
      message: `Migration ${phase} completed successfully` 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});