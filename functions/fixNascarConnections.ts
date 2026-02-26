import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Normalize for fuzzy matching
const normalize = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const dry_run = body.dry_run !== false;
    const log = [];
    const stats = {
      results_program_fixed: 0,
      results_team_fixed: 0,
      events_track_fixed: 0,
      programs_team_fixed: 0,
    };

    // Load all data
    const [allResults, allPrograms, allDrivers, allEvents, allTracks, allTeams] = await Promise.all([
      base44.asServiceRole.entities.Results.list('-created_date', 1000),
      base44.asServiceRole.entities.DriverProgram.list('-created_date', 1000),
      base44.asServiceRole.entities.Driver.list('-created_date', 500),
      base44.asServiceRole.entities.Event.list('-created_date', 500),
      base44.asServiceRole.entities.Track.list(),
      base44.asServiceRole.entities.Team.list(),
    ]);

    log.push(`Loaded: ${allResults.length} results, ${allPrograms.length} programs, ${allDrivers.length} drivers, ${allEvents.length} events, ${allTracks.length} tracks, ${allTeams.length} teams`);

    // ─── 1. Fix placeholder program_ids in Results ─────────────────────────
    log.push('\n=== FIX 1: Results with placeholder program_id ===');

    // Build program lookup: driver_id + series_name → program
    const programByDriverSeries = new Map();
    for (const p of allPrograms) {
      const key = `${p.driver_id}|${p.series_name}`;
      if (!programByDriverSeries.has(key)) {
        programByDriverSeries.set(key, p);
      }
    }

    const placeholderResults = allResults.filter(r => r.program_id === 'placeholder' || !r.program_id);
    log.push(`Found ${placeholderResults.length} results needing program_id fix`);

    for (const result of placeholderResults) {
      const key = `${result.driver_id}|${result.series}`;
      const prog = programByDriverSeries.get(key);
      if (prog) {
        stats.results_program_fixed++;
        if (!dry_run) {
          await base44.asServiceRole.entities.Results.update(result.id, { program_id: prog.id });
        } else {
          log.push(`  [DRY] Fix program: result ${result.id} → program ${prog.id}`);
        }
      } else {
        log.push(`  WARN: No program found for driver ${result.driver_id} in series "${result.series}"`);
      }
    }
    log.push(`  Fixed ${stats.results_program_fixed} program links`);

    // ─── 2. Populate team_name on Results from DriverProgram ───────────────
    log.push('\n=== FIX 2: Results missing team_name ===');

    const resultsWithoutTeam = allResults.filter(r => !r.team_name);
    log.push(`Found ${resultsWithoutTeam.length} results without team_name`);

    // Build team lookup by id
    const teamById = new Map(allTeams.map(t => [t.id, t]));
    // Build program by id
    const programById = new Map(allPrograms.map(p => [p.id, p]));

    for (const result of resultsWithoutTeam) {
      const progId = result.program_id === 'placeholder' ? null : result.program_id;
      if (!progId) continue;
      const prog = programById.get(progId);
      if (!prog) continue;

      const teamName = prog.team_name || (prog.team_id ? teamById.get(prog.team_id)?.name : null);
      if (teamName) {
        stats.results_team_fixed++;
        if (!dry_run) {
          await base44.asServiceRole.entities.Results.update(result.id, { team_name: teamName });
        } else {
          log.push(`  [DRY] team_name: result ${result.id} → "${teamName}"`);
        }
      }
    }
    log.push(`  Fixed ${stats.results_team_fixed} team_name fields`);

    // ─── 3. Link Events to Tracks ──────────────────────────────────────────
    log.push('\n=== FIX 3: Events missing track_id ===');

    const eventsWithoutTrack = allEvents.filter(e => !e.track_id);
    log.push(`Found ${eventsWithoutTrack.length} events without track_id`);

    // Build track lookup by normalized name
    const trackByName = new Map();
    for (const t of allTracks) {
      trackByName.set(normalize(t.name), t);
      // Also index by city
      if (t.location_city) trackByName.set(normalize(t.location_city), t);
    }

    for (const event of eventsWithoutTrack) {
      const locationNote = event.location_note || '';
      const eventName = event.name || '';

      // Try to extract track name from location_note (e.g. "NASCAR Cup Series @ Daytona International Speedway")
      const atMatch = locationNote.match(/@\s*(.+)$/);
      const candidateName = atMatch ? atMatch[1].trim() : '';

      let matchedTrack = null;

      if (candidateName) {
        matchedTrack = trackByName.get(normalize(candidateName));
        if (!matchedTrack) {
          // Try partial match — first 10 chars
          const prefix = normalize(candidateName).substring(0, 10);
          for (const [key, t] of trackByName) {
            if (key.includes(prefix) || prefix.includes(key.substring(0, 10))) {
              matchedTrack = t;
              break;
            }
          }
        }
      }

      // Fallback: search event name for track keywords
      if (!matchedTrack) {
        const eNameNorm = normalize(eventName);
        for (const [key, t] of trackByName) {
          if (key.length > 4 && eNameNorm.includes(key.substring(0, 8))) {
            matchedTrack = t;
            break;
          }
        }
      }

      if (matchedTrack) {
        stats.events_track_fixed++;
        if (!dry_run) {
          await base44.asServiceRole.entities.Event.update(event.id, { track_id: matchedTrack.id });
        } else {
          log.push(`  [DRY] Event "${eventName}" → Track "${matchedTrack.name}"`);
        }
      }
    }
    log.push(`  Linked ${stats.events_track_fixed} events to tracks`);

    // ─── 4. Link DriverPrograms to Teams ───────────────────────────────────
    log.push('\n=== FIX 4: DriverPrograms missing team_id ===');

    const programsWithoutTeam = allPrograms.filter(p => !p.team_id && !p.team_name);
    log.push(`Found ${programsWithoutTeam.length} programs without team_id or team_name`);

    // Build team lookup by normalized name
    const teamByName = new Map();
    for (const t of allTeams) {
      teamByName.set(normalize(t.name), t);
    }

    // Use LLM to get car-number-to-team mapping for each series
    const seriesList = ['NASCAR Cup Series', "NASCAR O'Reilly Auto Parts Series", 'NASCAR Craftsman Truck Series'];
    const teamMappings = {};

    for (const series of seriesList) {
      const seriesPrograms = programsWithoutTeam.filter(p => p.series_name === series);
      if (seriesPrograms.length === 0) continue;

      const carNumbers = [...new Set(seriesPrograms.map(p => p.car_number).filter(Boolean))];
      if (carNumbers.length === 0) continue;

      log.push(`  Querying team-car mapping for ${series} (${carNumbers.length} car numbers)...`);

      try {
        const llmResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `For the 2026 ${series} season, provide the team name for each of these car numbers: ${carNumbers.join(', ')}.
          
Return JSON with each car_number mapped to the team_name (owner team name, not sponsor name).
Example: {"5": "Hendrick Motorsports", "11": "Joe Gibbs Racing"}`,
          add_context_from_internet: true,
          response_json_schema: {
            type: 'object',
            properties: {
              mappings: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    car_number: { type: 'string' },
                    team_name: { type: 'string' },
                  }
                }
              }
            }
          }
        });

        if (llmResult?.mappings) {
          for (const m of llmResult.mappings) {
            teamMappings[`${series}|${m.car_number}`] = m.team_name;
          }
          log.push(`  Got ${llmResult.mappings.length} team mappings for ${series}`);
        }
      } catch (e) {
        log.push(`  LLM error for ${series}: ${e.message}`);
      }
    }

    // Apply team mappings to programs
    for (const prog of programsWithoutTeam) {
      const teamNameFromLLM = teamMappings[`${prog.series_name}|${prog.car_number}`];
      if (!teamNameFromLLM) continue;

      const teamRecord = teamByName.get(normalize(teamNameFromLLM));
      const updateData = teamRecord
        ? { team_id: teamRecord.id, team_name: teamRecord.name }
        : { team_name: teamNameFromLLM };

      stats.programs_team_fixed++;
      if (!dry_run) {
        await base44.asServiceRole.entities.DriverProgram.update(prog.id, updateData);
      } else {
        log.push(`  [DRY] Program ${prog.car_number} (${prog.series_name}) → team: "${teamNameFromLLM}" ${teamRecord ? '(matched DB)' : '(name only)'}`);
      }
    }
    log.push(`  Fixed ${stats.programs_team_fixed} program→team links`);

    return Response.json({ success: true, dry_run, stats, log });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});