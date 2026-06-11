/**
 * R9CU — getEventOperationalSnapshot
 * PHASE 7: Return complete event operational state in a single call.
 * Used by: Command Center, Export Packet, Announcer, Public API, Analytics.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { event_id } = await req.json();
    if (!event_id) return Response.json({ error: 'event_id required' }, { status: 400 });

    // Fetch all event data in parallel
    const [
      event,
      sessions,
      entries,
      results,
      incidents,
      penalties,
      protests,
      officials,
      techRecords,
      gridLineups,
      exportPackets,
      auditLogs,
    // standings is a placeholder in the array; real fetch below
    ] = await Promise.all([
      base44.asServiceRole.entities.Event.get(event_id),
      base44.asServiceRole.entities.Session.filter({ event_id }),
      base44.asServiceRole.entities.Entry.filter({ event_id }),
      base44.asServiceRole.entities.Results.filter({ event_id }),
      base44.asServiceRole.entities.Incident.filter({ event_id }).catch(() => []),
      base44.asServiceRole.entities.Penalty.filter({ event_id }).catch(() => []),
      base44.asServiceRole.entities.Protest.filter({ event_id }).catch(() => []),
      base44.asServiceRole.entities.EventOfficial.filter({ event_id }).catch(() => []),
      base44.asServiceRole.entities.TechInspectionRecord.filter({ event_id }).catch(() => []),
      base44.asServiceRole.entities.GridLineup.filter({ event_id }).catch(() => []),
      base44.asServiceRole.entities.EventExportPacket.filter({ event_id }).catch(() => []),
      base44.asServiceRole.entities.AuditLog.filter({ event_id }, '-timestamp', 50).catch(() => []),
    ]);

    if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });

    // Fetch standings now that we have the series_id
    const standings = event.series_id
      ? await base44.asServiceRole.entities.Standings.filter({ series_id: event.series_id }).catch(() => [])
      : [];

    // ── Compute readiness ─────────────────────────────────────────────────────
    const officialResults = results.filter(r => ['Official', 'Locked'].includes(r.status_state));
    const draftResults = results.filter(r => !r.status_state || r.status_state === 'Draft');
    const completedSessions = sessions.filter(s => ['Official', 'Locked'].includes(s.status));
    const confirmedOfficials = officials.filter(o => ['Confirmed', 'Active'].includes(o.status));
    const openIncidents = incidents.filter(i => ['Open', 'Under Review'].includes(i.status));
    const pendingPenalties = penalties.filter(p => p.status === 'Proposed');
    const activeProtests = protests.filter(p => ['Filed', 'Under Review', 'Hearing Scheduled'].includes(p.status));

    const readiness = {
      sessions_complete: sessions.length > 0 && completedSessions.length === sessions.length,
      results_official: results.length > 0 && officialResults.length === results.length,
      officials_assigned: confirmedOfficials.length > 0,
      race_director: confirmedOfficials.some(o => o.role === 'Race Director'),
      chief_steward: confirmedOfficials.some(o => o.role === 'Chief Steward'),
      tech_director: confirmedOfficials.some(o => o.role === 'Technical Director'),
      no_open_incidents: openIncidents.length === 0,
      no_pending_penalties: pendingPenalties.length === 0,
      no_active_protests: activeProtests.length === 0,
      export_packet_exists: exportPackets.length > 0,
      can_close: sessions.length > 0 && completedSessions.length === sessions.length
        && results.length > 0 && officialResults.length === results.length
        && openIncidents.length === 0 && pendingPenalties.length === 0
        && activeProtests.length === 0 && confirmedOfficials.some(o => o.role === 'Race Director'),
    };

    // ── Media summary ─────────────────────────────────────────────────────────
    const media = {
      export_packets: exportPackets.length,
      latest_packet: exportPackets.sort((a, b) => (b.packet_version || 0) - (a.packet_version || 0))[0] || null,
    };

    // ── Governance score ──────────────────────────────────────────────────────
    const govChecks = [
      readiness.sessions_complete,
      readiness.results_official,
      readiness.race_director,
      readiness.chief_steward,
      readiness.no_open_incidents,
      readiness.no_pending_penalties,
      readiness.no_active_protests,
      readiness.export_packet_exists,
    ];
    const governanceScore = Math.round((govChecks.filter(Boolean).length / govChecks.length) * 100);

    const governance = {
      score: governanceScore,
      readiness,
      open_incidents: openIncidents.length,
      pending_penalties: pendingPenalties.length,
      active_protests: activeProtests.length,
      draft_results: draftResults.length,
    };

    return Response.json({
      event,
      sessions,
      entries,
      results,
      standings,
      incidents,
      penalties,
      protests,
      officials,
      tech: techRecords,
      grid_lineups: gridLineups,
      media,
      audit_logs: auditLogs,
      readiness,
      governance,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});