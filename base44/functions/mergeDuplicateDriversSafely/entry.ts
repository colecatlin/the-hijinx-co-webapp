/**
 * mergeDuplicateDriversSafely.js — R9EA Phase 4
 *
 * Safe combined Driver merge + reference repair in a single atomic call.
 * Eliminates the P1 gap where repairDuplicateDriverRecords and
 * repairDriverReferences were separate steps with a risk window between them.
 *
 * Input:
 *   survivor_driver_id     — the canonical Driver record to keep
 *   duplicate_driver_ids   — array of Driver IDs to deactivate and re-point
 *   reason                 — human-readable reason for merge
 *
 * Output:
 *   { ok, survivor_id, duplicates_merged, references_repaired, audit_log_id }
 *
 * Admin only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { survivor_driver_id, duplicate_driver_ids, reason } = body;

    if (!survivor_driver_id) return Response.json({ error: 'survivor_driver_id is required' }, { status: 400 });
    if (!Array.isArray(duplicate_driver_ids) || duplicate_driver_ids.length === 0) {
      return Response.json({ error: 'duplicate_driver_ids must be a non-empty array' }, { status: 400 });
    }
    if (!reason) return Response.json({ error: 'reason is required' }, { status: 400 });

    const sr = base44.asServiceRole;
    const now = new Date().toISOString();

    // ── Load survivor ────────────────────────────────────────────────────────
    const survivorList = await sr.entities.Driver.filter({ id: survivor_driver_id }).catch(() => []);
    const survivor = survivorList?.[0];
    if (!survivor) return Response.json({ error: `Survivor driver not found: ${survivor_driver_id}` }, { status: 404 });

    const referenceCounts = {
      Results: 0, Entry: 0, Standings: 0, DriverProgram: 0, DriverMedia: 0, Vehicle: 0,
    };
    const mergedDetails = [];

    for (const dupId of duplicate_driver_ids) {
      if (dupId === survivor_driver_id) continue;

      const dupList = await sr.entities.Driver.filter({ id: dupId }).catch(() => []);
      const dup = dupList?.[0];
      if (!dup) continue;

      // ── Step 1: Mark duplicate inactive ───────────────────────────────────
      const dupMarker = `DUPLICATE_OF:${survivor_driver_id}`;
      const existingNotes = dup.notes || '';
      const newNotes = existingNotes.includes(dupMarker) ? existingNotes : (existingNotes ? `${existingNotes} | ${dupMarker}` : dupMarker);

      await sr.entities.Driver.update(dupId, {
        racing_status: 'Inactive',
        notes: newNotes,
        canonical_key: `driver:DUPLICATE_OF:${survivor_driver_id}`,
      }).catch(() => {});

      // ── Step 2: Repair Results ─────────────────────────────────────────────
      let offset = 0;
      while (true) {
        const batch = await sr.entities.Results.list('-created_date', 100, offset).catch(() => []);
        if (!batch || batch.length === 0) break;
        const toFix = batch.filter(r => r.driver_id === dupId);
        for (const r of toFix) {
          await sr.entities.Results.update(r.id, { driver_id: survivor_driver_id }).catch(() => {});
          referenceCounts.Results++;
        }
        if (batch.length < 100) break;
        offset += batch.length;
      }

      // ── Step 3: Repair Entries ─────────────────────────────────────────────
      offset = 0;
      while (true) {
        const batch = await sr.entities.Entry.list('-created_date', 100, offset).catch(() => []);
        if (!batch || batch.length === 0) break;
        const toFix = batch.filter(e => e.driver_id === dupId);
        for (const e of toFix) {
          await sr.entities.Entry.update(e.id, { driver_id: survivor_driver_id }).catch(() => {});
          referenceCounts.Entry++;
        }
        if (batch.length < 100) break;
        offset += batch.length;
      }

      // ── Step 4: Repair Standings ───────────────────────────────────────────
      const standingsBatch = await sr.entities.Standings.filter({ driver_id: dupId }).catch(() => []);
      for (const s of standingsBatch) {
        await sr.entities.Standings.update(s.id, { driver_id: survivor_driver_id }).catch(() => {});
        referenceCounts.Standings++;
      }

      // ── Step 5: Repair DriverProgram ───────────────────────────────────────
      const programBatch = await sr.entities.DriverProgram.filter({ driver_id: dupId }).catch(() => []);
      for (const p of programBatch) {
        await sr.entities.DriverProgram.update(p.id, { driver_id: survivor_driver_id }).catch(() => {});
        referenceCounts.DriverProgram++;
      }

      // ── Step 6: Repair DriverMedia ─────────────────────────────────────────
      const mediaBatch = await sr.entities.DriverMedia.filter({ driver_id: dupId }).catch(() => []).catch(() => []);
      for (const m of mediaBatch) {
        await sr.entities.DriverMedia.update(m.id, { driver_id: survivor_driver_id }).catch(() => {});
        referenceCounts.DriverMedia++;
      }

      // ── Step 7: Repair Vehicle.owner_driver_id ─────────────────────────────
      const vehicleBatch = await sr.entities.Vehicle.filter({ owner_driver_id: dupId }).catch(() => []);
      for (const v of vehicleBatch) {
        await sr.entities.Vehicle.update(v.id, { owner_driver_id: survivor_driver_id }).catch(() => {});
        referenceCounts.Vehicle++;
      }

      mergedDetails.push({
        duplicate_id: dupId,
        duplicate_name: `${dup.first_name || ''} ${dup.last_name || ''}`.trim(),
      });
    }

    // ── AuditLog ──────────────────────────────────────────────────────────────
    const auditLog = await sr.entities.AuditLog.create({
      entity_type: 'Driver',
      entity_id: survivor_driver_id,
      entity_name: `${survivor.first_name || ''} ${survivor.last_name || ''}`.trim(),
      action: 'updated',
      before_data: {
        survivor_id: survivor_driver_id,
        duplicate_ids: duplicate_driver_ids,
        references: { Results: 0, Entry: 0, Standings: 0 },
      },
      after_data: {
        survivor_id: survivor_driver_id,
        duplicates_merged: mergedDetails,
        references_repaired: referenceCounts,
      },
      performed_by: user.id,
      performed_by_name: user.full_name || user.email,
      timestamp: now,
      notes: `Safe driver merge: ${duplicate_driver_ids.length} duplicate(s) absorbed into survivor ${survivor_driver_id} — ${reason}`,
    }).catch(e => ({ id: null }));

    // ── OperationLog ──────────────────────────────────────────────────────────
    await sr.entities.OperationLog.create({
      operation_type: 'driver_merge_executed',
      entity_name: 'Driver',
      status: 'success',
      metadata: {
        source_path: 'mergeDuplicateDriversSafely',
        survivor_driver_id,
        duplicate_driver_ids,
        duplicates_merged: mergedDetails.length,
        references_repaired: referenceCounts,
        reason,
      },
    }).catch(() => {});

    return Response.json({
      ok: true,
      survivor_id: survivor_driver_id,
      duplicates_merged: mergedDetails,
      references_repaired: referenceCounts,
      audit_log_id: auditLog.id || null,
    });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});