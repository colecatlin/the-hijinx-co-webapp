/**
 * repairSeriesReferences.js
 *
 * Updates linked records that point to inactive duplicate Series IDs
 * so they point to the canonical survivor instead.
 *
 * Repairs these references (where safe and unambiguous):
 *   - Event.series_id
 *   - Driver.primary_series_id
 *   - SeriesClass.series_id
 *   - DriverProgram.series_id
 *   - Standings.series_id
 *
 * Input:
 * {
 *   repairs: [{ survivor_id, survivor_name, duplicate_ids: [] }],
 *   dry_run?: boolean
 * }
 *
 * Output:
 * {
 *   report: {
 *     updated_events, updated_drivers, updated_series_classes,
 *     updated_driver_programs, updated_standings, skipped, warnings
 *   }
 * }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { repairs = [], dry_run = false } = body;

    if (!repairs.length) {
      return Response.json({ success: true, message: 'No repairs provided.', report: {
        dry_run,
        updated_events: 0,
        updated_drivers: 0,
        updated_series_classes: 0,
        updated_driver_programs: 0,
        updated_standings: 0,
        skipped: [],
        warnings: [],
      }});
    }

    const report = {
      dry_run,
      updated_events: 0,
      updated_drivers: 0,
      updated_series_classes: 0,
      updated_driver_programs: 0,
      updated_standings: 0,
      skipped: [],
      warnings: [],
    };

    for (const { survivor_id, survivor_name, duplicate_ids = [] } of repairs) {
      if (!survivor_id || !Array.isArray(duplicate_ids) || !duplicate_ids.length) {
        report.skipped.push({ reason: 'missing_survivor_or_duplicates', survivor_id });
        continue;
      }

      for (const dup_id of duplicate_ids) {
        if (!dup_id || dup_id === survivor_id) {
          report.skipped.push({ reason: 'invalid_dup_id', dup_id });
          continue;
        }

        // ── Events ──────────────────────────────────────────────────────
        const events = await base44.asServiceRole.entities.Event.filter({ series_id: dup_id }).catch(() => []);
        for (const ev of events) {
          if (!dry_run) {
            await base44.asServiceRole.entities.Event.update(ev.id, { series_id: survivor_id })
              .catch(e => report.warnings.push(`event_update_failed:${ev.id}:${e.message}`));
          }
          report.updated_events++;
        }

        // ── Drivers (primary_series_id) ──────────────────────────────────
        const drivers = await base44.asServiceRole.entities.Driver.filter({ primary_series_id: dup_id }).catch(() => []);
        for (const dr of drivers) {
          if (!dry_run) {
            await base44.asServiceRole.entities.Driver.update(dr.id, { primary_series_id: survivor_id })
              .catch(e => report.warnings.push(`driver_update_failed:${dr.id}:${e.message}`));
          }
          report.updated_drivers++;
        }

        // ── SeriesClass ──────────────────────────────────────────────────
        const classes = await base44.asServiceRole.entities.SeriesClass.filter({ series_id: dup_id }).catch(() => []);
        for (const sc of classes) {
          if (!dry_run) {
            await base44.asServiceRole.entities.SeriesClass.update(sc.id, { series_id: survivor_id })
              .catch(e => report.warnings.push(`series_class_update_failed:${sc.id}:${e.message}`));
          }
          report.updated_series_classes++;
        }

        // ── DriverProgram ────────────────────────────────────────────────
        const programs = await base44.asServiceRole.entities.DriverProgram.filter({ series_id: dup_id }).catch(() => []);
        for (const dp of programs) {
          if (!dry_run) {
            await base44.asServiceRole.entities.DriverProgram.update(dp.id, { series_id: survivor_id })
              .catch(e => report.warnings.push(`driver_program_update_failed:${dp.id}:${e.message}`));
          }
          report.updated_driver_programs++;
        }

        // ── Standings ────────────────────────────────────────────────────
        const standings = await base44.asServiceRole.entities.Standings.filter({ series_id: dup_id }).catch(() => []);
        for (const st of standings) {
          if (!dry_run) {
            await base44.asServiceRole.entities.Standings.update(st.id, { series_id: survivor_id })
              .catch(e => report.warnings.push(`standings_update_failed:${st.id}:${e.message}`));
          }
          report.updated_standings++;
        }
      }
    }

    // ── Write OperationLog ─────────────────────────────────────────────────
    if (!dry_run) {
      const totalUpdated =
        report.updated_events +
        report.updated_drivers +
        report.updated_series_classes +
        report.updated_driver_programs +
        report.updated_standings;

      if (totalUpdated > 0) {
        await base44.asServiceRole.entities.OperationLog.create({
          operation_type: 'series_references_repaired',
          entity_name: 'Series',
          status: 'success',
          metadata: {
            source_path: 'repair_series_references',
            repair_groups: repairs.length,
            updated_events: report.updated_events,
            updated_drivers: report.updated_drivers,
            updated_series_classes: report.updated_series_classes,
            updated_driver_programs: report.updated_driver_programs,
            updated_standings: report.updated_standings,
          },
        }).catch(() => {});
      }
    }

    return Response.json({ success: true, report });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});