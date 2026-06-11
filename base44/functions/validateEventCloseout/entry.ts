import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { event_id } = await req.json();
    if (!event_id) return Response.json({ error: 'event_id required' }, { status: 400 });

    // Fetch all relevant data
    const [event, sessions, results, incidents, penalties, protests, officials, techRecords, standings] = await Promise.all([
      base44.entities.Event.get(event_id),
      base44.entities.Session.filter({ event_id }),
      base44.entities.Results.filter({ event_id }),
      base44.entities.Incident.filter({ event_id }).catch(() => []),
      base44.entities.Penalty.filter({ event_id }).catch(() => []),
      base44.entities.Protest.filter({ event_id }).catch(() => []),
      base44.entities.EventOfficial.filter({ event_id }).catch(() => []),
      base44.entities.TechInspectionRecord.filter({ event_id }).catch(() => []),
      base44.entities.Standings.filter({ event_id }).catch(() => []),
    ]);

    // Officials checks
    const confirmedOfficials = officials.filter(o => ['Confirmed', 'Active'].includes(o.status));
    const raceDirAssigned = confirmedOfficials.some(o => o.role === 'Race Director');
    const stewardAssigned = confirmedOfficials.some(o => ['Chief Steward', 'Steward'].includes(o.role));
    const techDirAssigned = confirmedOfficials.some(o => o.role === 'Technical Director');

    // Tech checks
    const failedTechRecords = techRecords.filter(t => t.status === 'Failed');
    const recheckRequired = techRecords.filter(t => t.status === 'Recheck Required');

    // Standings check
    const hasCurrentStandings = standings.length > 0;

    const openIncidents = incidents.filter(i => ['Open', 'Under Review'].includes(i.status));
    const pendingPenalties = penalties.filter(p => p.status === 'Proposed');
    const activeProtests = protests.filter(p => ['Filed', 'Under Review', 'Hearing Scheduled'].includes(p.status));
    const sessionsOnHold = sessions.filter(s => s.results_on_hold === true);
    const sessionsWithoutResults = sessions.filter(
      s => ['Official', 'Locked', 'Completed'].includes(s.status) && !results.some(r => r.session_id === s.id)
    );
    const draftOrProvisionalResults = results.filter(r => !r.status_state || r.status_state === 'Draft' || r.status_state === 'Provisional');
    const allSessionsComplete = sessions.length === 0 || sessions.every(s => ['Official', 'Locked', 'Completed'].includes(s.status));
    const allResultsOfficial = results.length === 0 || results.every(r => ['Official', 'Locked'].includes(r.status_state));
    const eventLiveOrPublished = ['Live', 'Published'].includes(event?.status || '');

    const checklist = [
      {
        id: 'sessions_complete',
        label: 'All sessions completed or locked',
        passed: allSessionsComplete && sessions.length > 0,
        is_blocker: true,
      },
      {
        id: 'results_official',
        label: 'All results official or locked',
        passed: allResultsOfficial && results.length > 0,
        is_blocker: true,
      },
      {
        id: 'no_missing_results',
        label: 'No completed sessions missing results',
        passed: sessionsWithoutResults.length === 0,
        is_blocker: true,
      },
      {
        id: 'no_incidents',
        label: 'No active incidents',
        passed: openIncidents.length === 0,
        is_blocker: true,
      },
      {
        id: 'no_pending_penalties',
        label: 'No pending penalties',
        passed: pendingPenalties.length === 0,
        is_blocker: true,
      },
      {
        id: 'no_protests',
        label: 'No active protests',
        passed: activeProtests.length === 0,
        is_blocker: true,
      },
      {
        id: 'no_tech_holds',
        label: 'No tech holds on sessions',
        passed: sessionsOnHold.length === 0,
        is_blocker: true,
      },
      {
        id: 'event_status',
        label: 'Event is currently Live or Published',
        passed: eventLiveOrPublished,
        is_blocker: true,
      },
      // Phase 10: Officials checks (blockers)
      {
        id: 'race_director_assigned',
        label: 'Race Director assigned and confirmed',
        passed: raceDirAssigned,
        is_blocker: true,
      },
      {
        id: 'steward_assigned',
        label: 'Chief Steward or Steward assigned and confirmed',
        passed: stewardAssigned,
        is_blocker: true,
      },
      {
        id: 'no_failed_tech',
        label: 'No failed tech inspection records',
        passed: failedTechRecords.length === 0,
        is_blocker: true,
      },
      {
        id: 'no_tech_recheck',
        label: 'No tech re-checks pending',
        passed: recheckRequired.length === 0,
        is_blocker: false,
      },
      {
        id: 'standings_current',
        label: 'Standings calculated for this event',
        passed: hasCurrentStandings,
        is_blocker: false,
      },
      // Warnings only
      {
        id: 'tech_director_assigned',
        label: 'Technical Director assigned',
        passed: techDirAssigned,
        is_blocker: false,
      },
      {
        id: 'no_draft_results',
        label: 'No draft or provisional results remaining',
        passed: draftOrProvisionalResults.length === 0,
        is_blocker: false,
      },
      {
        id: 'event_published',
        label: 'Event has been published publicly',
        passed: !!event?.published_flag,
        is_blocker: false,
      },
    ];

    const blockers = checklist.filter(c => c.is_blocker && !c.passed);
    const warnings = checklist.filter(c => !c.is_blocker && !c.passed);

    return Response.json({
      can_close: blockers.length === 0,
      blockers: blockers.map(b => ({ id: b.id, message: b.label })),
      warnings: warnings.map(w => ({ id: w.id, message: w.label })),
      checklist,
      event_name: event?.name,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});