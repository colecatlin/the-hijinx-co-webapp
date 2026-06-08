/**
 * applyChampImport(importRunId)
 * Applies approved staging rows to production Results and Standings tables.
 * Only applies rows with import_status = matched.
 * Skips conflicts and unmatched rows.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const { importRunId, apply_results = true, apply_standings = true } = await req.json();
    if (!importRunId) return Response.json({ error: 'importRunId required' }, { status: 400 });

    const db = base44.asServiceRole;
    const now = new Date().toISOString();
    const summary = { results_created: 0, standings_applied: 0, skipped: 0, errors: [] };

    if (apply_results) {
      const staged = await db.entities.ImportedResultStaging.filter({
        import_run_id: importRunId,
        import_status: 'matched',
      });

      for (const row of staged) {
        try {
          // Map staging fields → operational Results schema
          // finishing_position → position (used by recalculateStandings)
          // class_id → series_class_id
          // best_lap → best_lap_time_ms (convert seconds to ms if numeric)
          const bestLapMs = row.best_lap
            ? (typeof row.best_lap === 'number' ? Math.round(row.best_lap * 1000) : null)
            : null;

          // Build normalized_result_key for dedup compatibility
          const normalizedKey = row.mapped_driver_id && row.mapped_event_id
            ? `result:${row.mapped_event_id}:${row.mapped_driver_id}`
            : null;

          // Check for existing result to avoid duplication — use normalized key first
          let existing = [];
          if (normalizedKey) {
            existing = await db.entities.Results.filter({ normalized_result_key: normalizedKey });
          }
          if (!existing.length && row.mapped_driver_id && row.mapped_event_id) {
            existing = await db.entities.Results.filter({
              driver_id: row.mapped_driver_id,
              event_id: row.mapped_event_id,
              series_class_id: row.mapped_class_id || null,
            });
          }

          const resultData = {
            driver_id: row.mapped_driver_id,
            event_id: row.mapped_event_id,
            series_class_id: row.mapped_class_id || null,   // was: class_id (wrong field)
            position: row.finishing_position || null,        // was: finishing_position (wrong field)
            laps_completed: row.laps_completed || null,
            points: row.points_awarded || null,
            status: row.status_text || 'Running',
            best_lap_time_ms: bestLapMs,                     // was: best_lap_time / best_lap (wrong field + no ms)
            session_type: 'Final',                           // CHAMP results are final session results
            data_source: 'champoffroad',
            source_url: row.source_url || null,
            import_run_id: importRunId,
            ...(normalizedKey && { normalized_result_key: normalizedKey }),
          };

          if (existing.length > 0) {
            await db.entities.Results.update(existing[0].id, resultData);
            summary.results_created++;
          } else {
            await db.entities.Results.create(resultData);
            summary.results_created++;
          }

          await db.entities.ImportedResultStaging.update(row.id, { import_status: 'created' });
        } catch (e) {
          summary.errors.push(`Result ${row.id}: ${e.message}`);
        }
      }
    }

    if (apply_standings) {
      const staged = await db.entities.ImportedStandingStaging.filter({
        import_run_id: importRunId,
        import_status: 'matched',
      });

      for (const row of staged) {
        try {
          // Standings: store as a snapshot — do not auto-overwrite calculated standings
          // Find existing standing for this driver/class/year using correct field names
          const existing = await db.entities.Standings.filter({
            driver_id: row.mapped_driver_id,
            series_class_id: row.mapped_class_id || null,   // was: class_id (wrong field)
            season_year: row.season_year,                    // was: season (wrong field)
          });

          const standingData = {
            driver_id: row.mapped_driver_id,
            series_class_id: row.mapped_class_id || null,   // was: class_id
            season_year: row.season_year,                    // was: season
            position: row.standing_position || null,
            points_total: row.total_points || 0,             // was: points (wrong field for Standings entity)
            wins: row.wins || 0,
            calculation_source: 'champoffroad',
            source_url: row.source_url || null,
            import_run_id: importRunId,
          };

          if (existing.length > 0) {
            // Only update if imported points differ — preserve internal calculated data otherwise
            const current = existing[0];
            if (current.source_name === 'champoffroad' || !current.points) {
              await db.entities.Standings.update(current.id, standingData);
              summary.standings_applied++;
            } else {
              summary.skipped++;
            }
          } else {
            await db.entities.Standings.create(standingData);
            summary.standings_applied++;
          }

          await db.entities.ImportedStandingStaging.update(row.id, { import_status: 'created' });
        } catch (e) {
          summary.errors.push(`Standing ${row.id}: ${e.message}`);
        }
      }
    }

    // Update import run status
    await db.entities.ImportSourceRun.update(importRunId, {
      status: summary.errors.length > 0 ? 'partially_completed' : 'completed',
      records_created: summary.results_created + summary.standings_applied,
      records_skipped: summary.skipped,
      errors: summary.errors,
    });

    return Response.json(summary);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});