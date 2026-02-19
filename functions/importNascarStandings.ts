import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const series = body.series || 'nascar-cup-series'; // nascar-cup-series | nascar-oreilly-auto-parts-series | nascar-craftsman-truck-series

    // Use AI to scrape the NASCAR standings page and extract structured data
    const scrapeSchema = {
      type: 'object',
      properties: {
        drivers: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              position: { type: 'number' },
              car_number: { type: 'string' },
              first_name: { type: 'string' },
              last_name: { type: 'string' },
              manufacturer: { type: 'string' },
              team_name: { type: 'string' },
              points: { type: 'number' },
            }
          }
        },
        manufacturers: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              points: { type: 'number' },
            }
          }
        },
        season: { type: 'string' },
        series_name: { type: 'string' },
      }
    };

    const prompt = `Fetch and parse the NASCAR standings page at https://www.nascar.com/standings/${series}/

IMPORTANT: Extract EVERY SINGLE driver listed on the page — do not stop early. There are typically 35-40 drivers in Cup Series standings. Make sure you capture all of them including those near the bottom of the standings table.

For each driver get:
- position (finishing rank in standings)
- car_number (the car/number badge shown)
- first_name (driver first name)
- last_name (driver last name)
- manufacturer (Toyota, Ford, Chevrolet, etc.)
- team_name (the team that owns the car — use your knowledge if not shown. e.g. #45 Toyota = 23XI Racing, #22 Ford = Team Penske, #9 Chevy = Hendrick Motorsports, #19 Toyota = Joe Gibbs Racing, #10 Ford = Stewart-Haas Racing / Haas Factory Team, #17 Ford = RFK Racing, #20 Toyota = Joe Gibbs Racing, #23 Toyota = 23XI Racing, #2 Ford = Team Penske, #12 Ford = Team Penske, #1 Chevy = Trackhouse Racing, #99 Ford = Haas Factory Team, #77 Chevy = Spire Motorsports, etc.)
- points (current standings points)

Also extract the manufacturer standings (name and points).
Also extract the season year and series name (e.g. "NASCAR Cup Series").

Return ALL drivers — the complete list. Do not truncate.`;

    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      response_json_schema: scrapeSchema,
    });

    const { drivers = [], manufacturers = [], season, series_name } = aiResponse;

    // --- Upsert Teams ---
    const existingTeams = await base44.asServiceRole.entities.Team.list();
    const teamMap = {}; // name -> id

    for (const t of existingTeams) {
      teamMap[t.name.toLowerCase().trim()] = t.id;
    }

    // Collect unique team names from standings
    const uniqueTeamNames = [...new Set(drivers.map(d => d.team_name).filter(Boolean))];
    const teamsCreated = [];
    const teamsSkipped = [];

    for (const teamName of uniqueTeamNames) {
      const key = teamName.toLowerCase().trim();
      if (teamMap[key]) {
        teamsSkipped.push(teamName);
        continue;
      }
      const created = await base44.asServiceRole.entities.Team.create({
        name: teamName,
        primary_discipline: 'Asphalt Oval',
        team_level: 'National',
        country: 'United States',
        status: 'Active',
        headquarters_city: '',
        headquarters_state: '',
      });
      teamMap[key] = created.id;
      teamsCreated.push(teamName);
    }

    // --- Upsert Drivers ---
    const existingDrivers = await base44.asServiceRole.entities.Driver.list();

    const driversCreated = [];
    const driversSkipped = [];
    const duplicatesFound = [];

    for (const d of drivers) {
      if (!d.first_name || !d.last_name) continue;

      const nameKey = `${d.first_name} ${d.last_name}`.toLowerCase().trim();
      const teamId = d.team_name ? teamMap[d.team_name.toLowerCase().trim()] : null;

      // Find ALL existing drivers with the same name (there may be multiple)
      const nameMatches = existingDrivers.filter(e =>
        `${e.first_name} ${e.last_name}`.toLowerCase().trim() === nameKey
      );

      if (nameMatches.length > 0) {
        // Use the first/best match (prefer one with a real date_of_birth set)
        const existing = nameMatches.find(e => e.date_of_birth && e.date_of_birth !== '2000-01-01') || nameMatches[0];

        if (nameMatches.length > 1) {
          duplicatesFound.push(`${d.first_name} ${d.last_name} (${nameMatches.length} records found)`);
        }

        // Update team_id and primary_number if missing
        if (!existing.team_id || !existing.primary_number || !existing.manufacturer) {
          const mfr = d.manufacturer?.trim();
          const validMfrs = ['Chevrolet', 'Ford', 'Toyota', 'Honda'];
          const matchedMfr = mfr ? validMfrs.find(v => mfr.toLowerCase().includes(v.toLowerCase())) : null;

          await base44.asServiceRole.entities.Driver.update(existing.id, {
            ...(teamId && !existing.team_id ? { team_id: teamId } : {}),
            ...(!existing.primary_number && d.car_number ? { primary_number: d.car_number } : {}),
            ...(!existing.manufacturer && matchedMfr ? { manufacturer: matchedMfr } : {}),
          });
        }
        driversSkipped.push(`${d.first_name} ${d.last_name}`);
        continue;
      }

      // No match found — safe to create
      await base44.asServiceRole.entities.Driver.create({
        first_name: d.first_name,
        last_name: d.last_name,
        primary_number: d.car_number || '',
        primary_discipline: 'Stock Car',
        status: 'Active',
        team_id: teamId || null,
        hometown_city: '',
        hometown_country: 'United States',
        date_of_birth: '2000-01-01',
      });
      driversCreated.push(`${d.first_name} ${d.last_name}`);
    }

    return Response.json({
      success: true,
      season,
      series_name,
      drivers: {
        found: drivers.length,
        created: driversCreated.length,
        skipped: driversSkipped.length,
        created_names: driversCreated,
      },
      teams: {
        found: uniqueTeamNames.length,
        created: teamsCreated.length,
        skipped: teamsSkipped.length,
        created_names: teamsCreated,
      },
      manufacturers,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});