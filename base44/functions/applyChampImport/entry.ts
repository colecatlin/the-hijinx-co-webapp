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
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

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
          // Check for existing result to avoid duplication
          const existing = await db.entities.Results.filter({
            driver_id: row.mapped_driver_id,
            event_id: row.mapped_event_id,
            class_id: row.mapped_class_id,
          });

          const resultData = {
            driver_id: row.mapped_driver_id,
            event_id: row.mapped_event_id,
            class_id: row.mapped_class_id,
            finishing_position: row.finishing_position,
            laps_completed: row.laps_completed,
            points: row.points_awarded,
            status: row.status_text,
            best_lap_time: row.best_lap,
            source_name: 'champoffroad',
            source_url: row.source_url,
            import_run_id: importRunId,
            imported_at: now,
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
          // Find existing standing for this driver/class/year
          const existing = await db.entities.Standings.filter({
            driver_id: row.mapped_driver_id,
            class_id: row.mapped_class_id,
            season: row.season_year,
          });

          const standingData = {
            driver_id: row.mapped_driver_id,
            class_id: row.mapped_class_id,
            season: row.season_year,
            position: row.standing_position,
            points: row.total_points,
            wins: row.wins,
            source_name: 'champoffroad',
            source_url: row.source_url,
            import_run_id: importRunId,
            imported_at: now,
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