/**
 * R9CU — getAnnouncerFeed
 * PHASE 8: Live announcer data feed.
 * Returns current session, grid, driver bios, championship positions, recent results, event notes.
 * Backend foundation — no UI required this sprint.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { event_id, session_id } = await req.json();
    if (!event_id) return Response.json({ error: 'event_id required' }, { status: 400 });

    // Parallel fetch
    const [event, sessions, entries, results, standings, officials, sessionNotes, incidents, gridLineups] = await Promise.all([
      base44.asServiceRole.entities.Event.get(event_id),
      base44.asServiceRole.entities.Session.filter({ event_id }),
      base44.asServiceRole.entities.Entry.filter({ event_id }),
      base44.asServiceRole.entities.Results.filter({ event_id }),
      base44.asServiceRole.entities.Standings.filter({ series_id: undefined }).catch(() => []),
      base44.asServiceRole.entities.EventOfficial.filter({ event_id }).catch(() => []),
      base44.asServiceRole.entities.SessionNote.filter({ event_id }, '-created_at', 20).catch(() => []),
      base44.asServiceRole.entities.Incident.filter({ event_id }).catch(() => []),
      base44.asServiceRole.entities.GridLineup.filter({ event_id }).catch(() => []),
    ]);

    if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });

    // Get driver IDs from entries for bio lookup
    const driverIds = [...new Set(entries.map(e => e.driver_id).filter(Boolean))];
    const drivers = driverIds.length > 0
      ? await base44.asServiceRole.entities.Driver.list('-created_date', 500).catch(() => [])
      : [];
    const driverMap = Object.fromEntries(drivers.map(d => [d.id, d]));

    // ── Current / target session ───────────────────────────────────────────────
    const sortedSessions = sessions.slice().sort((a, b) => (a.run_order || 0) - (b.run_order || 0));
    // Priority: explicit session_id > Live session > most recent Official > last session
    const currentSession = session_id
      ? sessions.find(s => s.id === session_id)
      : sortedSessions.find(s => s.status === 'Live')
        || sortedSessions.find(s => s.status === 'Official')
        || sortedSessions[sortedSessions.length - 1];

    // ── Current grid ───────────────────────────────────────────────────────────
    const currentGrid = currentSession
      ? gridLineups.find(g => g.session_id === currentSession.id && ['Approved', 'Published'].includes(g.status))
      : null;

    // ── Session results with driver bios ──────────────────────────────────────
    const sessionResults = currentSession
      ? results.filter(r => r.session_id === currentSession.id && r.published)
      : [];

    const enrichedResults = sessionResults.map(r => {
      const driver = driverMap[r.driver_id];
      const entry = entries.find(e => e.driver_id === r.driver_id);
      const driverStandings = standings.filter(s => s.driver_id === r.driver_id);
      const bestStanding = driverStandings.sort((a, b) => (a.rank || 999) - (b.rank || 999))[0];
      return {
        position: r.position,
        status: r.status,
        points: r.points,
        laps_completed: r.laps_completed,
        best_lap_time_ms: r.best_lap_time_ms,
        driver: driver ? {
          id: driver.id,
          name: `${driver.first_name} ${driver.last_name}`,
          number: entry?.car_number || driver.primary_number,
          hometown: [driver.hometown_city, driver.hometown_state].filter(Boolean).join(', '),
          team: driver.team_id,
          bio: driver.bio,
          tagline: driver.tagline,
          career_status: driver.career_status,
        } : null,
        championship_position: bestStanding?.rank || null,
        championship_points: bestStanding?.points_total || null,
      };
    }).sort((a, b) => (a.position || 999) - (b.position || 999));

    // ── Recent results (last 5 sessions with official results) ────────────────
    const recentSessions = sortedSessions
      .filter(s => ['Official', 'Locked'].includes(s.status) && s.id !== currentSession?.id)
      .slice(-5);

    const recentResults = recentSessions.map(session => ({
      session_name: session.name,
      session_type: session.session_type,
      results: results
        .filter(r => r.session_id === session.id && r.published)
        .sort((a, b) => (a.position || 999) - (b.position || 999))
        .slice(0, 10)
        .map(r => ({
          position: r.position,
          driver_id: r.driver_id,
          driver_name: driverMap[r.driver_id]
            ? `${driverMap[r.driver_id].first_name} ${driverMap[r.driver_id].last_name}`
            : 'Unknown',
          car_number: entries.find(e => e.driver_id === r.driver_id)?.car_number,
          status: r.status,
        })),
    }));

    // ── Session storylines (from notes + incidents) ───────────────────────────
    const storylines = [
      ...sessionNotes.filter(n => n.is_public).map(n => ({
        type: 'note',
        note_type: n.note_type,
        body: n.body,
        lap: n.lap_number,
        timestamp: n.created_at,
      })),
      ...incidents.filter(i => i.severity === 'Major' || i.severity === 'Serious').map(i => ({
        type: 'incident',
        note_type: i.incident_type,
        body: i.description,
        lap: i.lap_number,
        timestamp: i.created_date,
      })),
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 10);

    // ── Officials on duty ─────────────────────────────────────────────────────
    const activeOfficials = officials
      .filter(o => ['Confirmed', 'Active'].includes(o.status))
      .map(o => ({ role: o.role, user_id: o.user_id }));

    return Response.json({
      event: {
        id: event.id,
        name: event.name,
        date: event.event_date,
        status: event.status,
        series_name: event.series_name,
      },
      current_session: currentSession ? {
        id: currentSession.id,
        name: currentSession.name,
        type: currentSession.session_type,
        status: currentSession.status,
        laps: currentSession.laps,
        scheduled_time: currentSession.scheduled_time,
      } : null,
      current_grid: currentGrid,
      results: enrichedResults,
      recent_results: recentResults,
      storylines,
      officials: activeOfficials,
      sessions_summary: {
        total: sessions.length,
        completed: sessions.filter(s => ['Official', 'Locked'].includes(s.status)).length,
        remaining: sessions.filter(s => !['Official', 'Locked'].includes(s.status)).length,
      },
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});