/**
 * repairTrackReferences.js
 *
 * Updates linked records that point to inactive duplicate Track IDs
 * so they point to the canonical survivor instead.
 *
 * Repairs these references (where safe and unambiguous):
 *   - Event.track_id
 *   - EventCollaboration.track_id
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
 *     updated_events,
 *     updated_event_collaborations,
 *     skipped,
 *     warnings
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
        updated_event_collaborations: 0,
        skipped: [],
        warnings: [],
      }});
    }

    const report = {
      dry_run,
      updated_events: 0,
      updated_event_collaborations: 0,
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

        // ── Events ─────────────────────────────────────────────────────
        const events = await base44.asServiceRole.entities.Event.filter({ track_id: dup_id }).catch(() => []);
        for (const ev of events) {
          if (!dry_run) {
            await base44.asServiceRole.entities.Event.update(ev.id, { track_id: survivor_id })
              .catch(e => report.warnings.push(`event_update_failed:${ev.id}:${e.message}`));
          }
          report.updated_events++;
        }

        // ── EventCollaboration ─────────────────────────────────────────
        const collabs = await base44.asServiceRole.entities.EventCollaboration.filter({ track_id: dup_id }).catch(() => []);
        for (const ec of collabs) {
          if (!dry_run) {
            await base44.asServiceRole.entities.EventCollaboration.update(ec.id, { track_id: survivor_id })
              .catch(e => report.warnings.push(`event_collab_update_failed:${ec.id}:${e.message}`));
          }
          report.updated_event_collaborations++;
        }
      }
    }

    // ── Write OperationLog ────────────────────────────────────────────────
    if (!dry_run) {
      const totalUpdated = report.updated_events + report.updated_event_collaborations;
      if (totalUpdated > 0) {
        await base44.asServiceRole.entities.OperationLog.create({
          operation_type: 'track_references_repaired',
          entity_name: 'Track',
          status: 'success',
          metadata: {
            source_path: 'repair_track_references',
            repair_groups: repairs.length,
            updated_events: report.updated_events,
            updated_event_collaborations: report.updated_event_collaborations,
          },
        }).catch(() => {});
      }
    }

    return Response.json({ success: true, report });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});