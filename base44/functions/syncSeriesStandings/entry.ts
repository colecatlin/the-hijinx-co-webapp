import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const body = await req.json();
    const { series_id } = body;

    // If series_id provided, sync just that one. Otherwise sync all series with a standings_url.
    let seriesToSync = [];
    if (series_id) {
      const s = await base44.asServiceRole.entities.Series.get(series_id);
      if (!s) return Response.json({ error: 'Series not found' }, { status: 404 });
      if (!s.standings_url) return Response.json({ error: 'Series has no standings_url configured' }, { status: 400 });
      seriesToSync = [s];
    } else {
      const allSeries = await base44.asServiceRole.entities.Series.list();
      seriesToSync = allSeries.filter(s => s.standings_url);
    }

    const currentYear = new Date().getFullYear();
    const results = [];

    for (const series of seriesToSync) {
      try {
        // Use LLM with internet context to scrape and parse the standings page
        const parsed = await base44.integrations.Core.InvokeLLM({
          prompt: `Fetch the full driver standings table from this URL: ${series.standings_url}

IMPORTANT: You MUST extract EVERY SINGLE driver row from the complete standings table — do not stop early, do not truncate, do not summarize. Include all drivers from position 1 through to the last position. NASCAR Cup typically has 36+ drivers, Xfinity has 30+, Trucks has 30+. If the page has pagination or "show more", include all rows.

For each driver return:
- driver_name (string): full driver name
- car_number (string): car/entry number
- manufacturer (string): vehicle manufacturer (e.g. Chevrolet, Ford, Toyota)
- position (number): championship position
- points (number): total championship points
- stage_points (number): stage bonus points (0 if not shown)
- behind (number): points behind leader (0 for leader)
- starts (number): races started
- wins (number): number of wins
- top_5s (number): top-5 finishes
- top_10s (number): top-10 finishes
- dnfs (number): did-not-finish count
- laps_led (number): total laps led

Return the complete JSON array with ALL drivers. Do not stop at 10 or 20 — get every row.`,
          add_context_from_internet: true,
          model: 'gemini_3_1_pro',
          response_json_schema: {
            type: 'object',
            properties: {
              drivers: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    driver_name: { type: 'string' },
                    car_number: { type: 'string' },
                    manufacturer: { type: 'string' },
                    position: { type: 'number' },
                    points: { type: 'number' },
                    stage_points: { type: 'number' },
                    behind: { type: 'number' },
                    starts: { type: 'number' },
                    wins: { type: 'number' },
                    top_5s: { type: 'number' },
                    top_10s: { type: 'number' },
                    dnfs: { type: 'number' },
                    laps_led: { type: 'number' },
                  }
                }
              }
            }
          }
        });

        const drivers = parsed?.drivers || [];
        if (!drivers.length) {
          results.push({ series_id: series.id, series_name: series.name, status: 'no_data', synced: 0 });
          continue;
        }

        // Fetch existing standings for this series+season to enable upsert
        const existing = await base44.asServiceRole.entities.DriverStanding.filter({
          series_id: series.id,
          season_year: currentYear,
        });
        const existingByKey = {};
        for (const rec of existing) {
          if (rec.standings_key) existingByKey[rec.standings_key] = rec;
        }

        let created = 0;
        let updated = 0;

        for (const driver of drivers) {
          const standingsKey = `${series.id}:${currentYear}:${driver.driver_name}`;
          const payload = {
            series_id: series.id,
            season_year: currentYear,
            driver_name: driver.driver_name,
            car_number: driver.car_number || '',
            manufacturer: driver.manufacturer || '',
            position: driver.position || null,
            points: driver.points || 0,
            stage_points: driver.stage_points || 0,
            behind: driver.behind || 0,
            starts: driver.starts || 0,
            wins: driver.wins || 0,
            top_5s: driver.top_5s || 0,
            top_10s: driver.top_10s || 0,
            dnfs: driver.dnfs || 0,
            laps_led: driver.laps_led || 0,
            standings_key: standingsKey,
            last_synced_at: new Date().toISOString(),
          };

          if (existingByKey[standingsKey]) {
            await base44.asServiceRole.entities.DriverStanding.update(existingByKey[standingsKey].id, payload);
            updated++;
          } else {
            await base44.asServiceRole.entities.DriverStanding.create(payload);
            created++;
          }
        }

        // Auto-link new standings to Driver records by normalized name
        const allDrivers = await base44.asServiceRole.entities.Driver.list();
        const driverMap = {};
        for (const d of allDrivers) {
          const key = `${d.first_name} ${d.last_name}`.toLowerCase().trim();
          driverMap[key] = d.id;
        }
        const freshStandings = await base44.asServiceRole.entities.DriverStanding.filter({ series_id: series.id, season_year: currentYear });
        let autoLinked = 0;
        for (const s of freshStandings) {
          if (!s.driver_id && s.driver_name) {
            const dId = driverMap[s.driver_name.toLowerCase().trim()];
            if (dId) {
              await base44.asServiceRole.entities.DriverStanding.update(s.id, { driver_id: dId });
              autoLinked++;
            }
          }
        }

        results.push({ series_id: series.id, series_name: series.name, status: 'ok', created, updated, autoLinked });
      } catch (seriesErr) {
        results.push({ series_id: series.id, series_name: series.name, status: 'error', error: seriesErr.message });
      }
    }

    return Response.json({ success: true, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});