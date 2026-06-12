/**
 * R9CU — syncPublicData
 * PHASE 4: Central synchronization pipeline.
 * When results become Official or Locked, automatically propagate to:
 * Driver Profiles, Series Pages, Standings, Public Results, Announcer Feed, Index46 Feed.
 *
 * Trigger paths:
 *   - Called from updateSessionStatus (Official/Locked transitions)
 *   - Called from validateEventCloseout distribution check
 *   - Called directly for manual sync
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { event_id, session_id, trigger } = await req.json();
    if (!event_id) return Response.json({ error: 'event_id required' }, { status: 400 });

    const syncLog = { event_id, session_id, trigger, steps: [], errors: [], timestamp: new Date().toISOString() };

    // ── Fetch base data ──────────────────────────────────────────────────────
    const [event, sessions, results, entries] = await Promise.all([
      base44.asServiceRole.entities.Event.get(event_id),
      base44.asServiceRole.entities.Session.filter({ event_id }),
      session_id
        ? base44.asServiceRole.entities.Results.filter({ event_id, session_id })
        : base44.asServiceRole.entities.Results.filter({ event_id }),
      base44.asServiceRole.entities.Entry.filter({ event_id }),
    ]);

    if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });

    const officialResults = results.filter(r => ['Official', 'Locked'].includes(r.status_state));
    syncLog.steps.push({ step: 'fetch_base_data', status: 'ok', counts: { sessions: sessions.length, results: results.length, official: officialResults.length } });

    // ── STEP 1: Sync Results Visibility ──────────────────────────────────────
    let resultsSynced = 0;
    const sessionsToSync = session_id
      ? sessions.filter(s => s.id === session_id)
      : sessions.filter(s => ['Official', 'Locked'].includes(s.status));

    for (const session of sessionsToSync) {
      const sessionResults = results.filter(r => r.session_id === session.id);
      const isPublic = ['Official', 'Locked'].includes(session.status);
      for (const result of sessionResults) {
        if (result.published !== isPublic || result.is_public !== isPublic) {
          await base44.asServiceRole.entities.Results.update(result.id, {
            published: isPublic,
            is_public: isPublic,
            published_at: isPublic ? (result.published_at || new Date().toISOString()) : null,
          }).catch(() => null);
          resultsSynced++;
        }
      }
    }
    syncLog.steps.push({ step: 'sync_results_visibility', status: 'ok', synced: resultsSynced });

    // ── STEP 2: Sync Standings (trigger recalculation for scoring sessions) ───
    let standingsSynced = 0;
    const scoringSessions = sessionsToSync.filter(s =>
      s.points_enabled || ['Final', 'Feature'].includes(s.session_type)
    );

    // P0-2: recalculateStandings is the sole standings engine.
    // syncSeriesStandings is an external URL scraper — not used here.
    if (scoringSessions.length > 0 && event.series_id && event.season) {
      // Recalculate per class (or unscoped if no class set)
      const classIds = [...new Set(scoringSessions.map(s => s.series_class_id).filter(Boolean))];
      if (classIds.length > 0) {
        for (const classId of classIds) {
          await base44.asServiceRole.functions.invoke('recalculateStandings', {
            series_id: event.series_id,
            season: event.season,
            series_class_id: classId,
            event_id,
          }).catch(e => syncLog.errors.push({ step: 'sync_standings', class_id: classId, error: e.message }));
        }
      } else {
        // No class scoping — recalculate for the whole series
        await base44.asServiceRole.functions.invoke('recalculateStandings', {
          series_id: event.series_id,
          season: event.season,
          series_class_id: null,
          event_id,
        }).catch(e => syncLog.errors.push({ step: 'sync_standings', error: e.message }));
      }
      standingsSynced = scoringSessions.length;
    }
    syncLog.steps.push({ step: 'sync_standings', status: 'ok', scoring_sessions: standingsSynced });

    // ── STEP 3: Update Event public_status ────────────────────────────────────
    const allSessionsDone = sessions.every(s => ['Official', 'Locked'].includes(s.status));
    const hasOfficialResults = officialResults.length > 0;

    if (allSessionsDone && hasOfficialResults && event.status !== 'Completed') {
      await base44.asServiceRole.entities.Event.update(event_id, {
        public_status: 'completed',
      }).catch(() => null);
      syncLog.steps.push({ step: 'update_event_public_status', status: 'ok', new_status: 'completed' });
    } else if (hasOfficialResults) {
      syncLog.steps.push({ step: 'update_event_public_status', status: 'skipped', reason: 'sessions_not_all_done' });
    }

    // ── STEP 4: Activity Feed entry ───────────────────────────────────────────
    if (officialResults.length > 0) {
      await base44.asServiceRole.functions.invoke('createActivityFeedItemSafe', {
        feed_type: 'results_published',
        entity_type: 'Event',
        entity_id: event_id,
        title: `Results published: ${event.name}`,
        body: `${officialResults.length} official result(s) published.`,
        metadata: { event_id, session_id, trigger },
      }).catch(() => null);
      syncLog.steps.push({ step: 'activity_feed', status: 'ok' });
    }

    // ── STEP 5: Write audit log ───────────────────────────────────────────────
    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'Event',
      entity_id: event_id,
      entity_name: event.name,
      action: 'updated',
      performed_by: user.id,
      performed_by_name: user.full_name,
      timestamp: new Date().toISOString(),
      event_id,
      notes: `Public data sync: ${resultsSynced} results, ${standingsSynced} scoring sessions. Trigger: ${trigger || 'manual'}`,
    }).catch(() => null);

    return Response.json({
      success: true,
      event_id,
      sync_log: syncLog,
      summary: {
        results_visibility_synced: resultsSynced,
        standings_sessions_triggered: standingsSynced,
        errors: syncLog.errors,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});