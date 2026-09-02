/**
 * mergeSeriesSafely — Manual two-record Series merge tool.
 *
 * Admin picks any two Series records (survivor + duplicate), optionally
 * chooses field-level overrides, and this function:
 *   1. Marks the duplicate Series inactive with a DUPLICATE_OF marker.
 *   2. Re-points all references to the duplicate onto the survivor.
 *   3. Applies admin-chosen field_overrides to the survivor.
 *   4. Writes an AuditLog + OperationLog entry.
 *
 * Input:
 *   survivor_series_id  — canonical Series record to keep
 *   duplicate_series_id  — Series record to absorb + deactivate
 *   field_overrides      — optional { field: value } applied to survivor
 *   reason               — human-readable reason for the merge (required)
 *
 * Output:
 *   { ok, survivor_id, duplicate_id, references_repaired, audit_log_id }
 *
 * Admin only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { survivor_series_id, duplicate_series_id, field_overrides = {}, reason } = body;

    if (!survivor_series_id) return Response.json({ error: 'survivor_series_id is required' }, { status: 400 });
    if (!duplicate_series_id) return Response.json({ error: 'duplicate_series_id is required' }, { status: 400 });
    if (survivor_series_id === duplicate_series_id) {
      return Response.json({ error: 'Survivor and duplicate must be different records' }, { status: 400 });
    }
    if (!reason) return Response.json({ error: 'reason is required' }, { status: 400 });

    const sr = base44.asServiceRole;
    const now = new Date().toISOString();

    // ── Load survivor + duplicate ───────────────────────────────────────────
    const survivorList = await sr.entities.Series.filter({ id: survivor_series_id }).catch(() => []);
    const survivor = survivorList?.[0];
    if (!survivor) return Response.json({ error: `Survivor series not found: ${survivor_series_id}` }, { status: 404 });

    const dupList = await sr.entities.Series.filter({ id: duplicate_series_id }).catch(() => []);
    const duplicate = dupList?.[0];
    if (!duplicate) return Response.json({ error: `Duplicate series not found: ${duplicate_series_id}` }, { status: 404 });

    const referenceCounts = {
      Event: 0,
      SeriesClass: 0,
      Standings: 0,
      Entry: 0,
      Sponsorship: 0,
    };

    // ── Step 1: Mark duplicate inactive ─────────────────────────────────────
    const dupMarker = `DUPLICATE_OF:${survivor_series_id}`;
    const existingNotes = duplicate.notes || '';
    const newNotes = existingNotes.includes(dupMarker)
      ? existingNotes
      : (existingNotes ? `${existingNotes} | ${dupMarker}` : dupMarker);

    await sr.entities.Series.update(duplicate_series_id, {
      operational_status: 'Inactive',
      visibility_status: 'draft',
      notes: newNotes,
      canonical_key: `series:DUPLICATE_OF:${survivor_series_id}`,
    }).catch(() => {});

    // ── Step 2: Re-point Event.series_id ─────────────────────────────────────
    let offset = 0;
    while (true) {
      const batch = await sr.entities.Event.list('-created_date', 100, offset).catch(() => []);
      if (!batch || batch.length === 0) break;
      const toFix = batch.filter((e) => e.series_id === duplicate_series_id);
      for (const e of toFix) {
        await sr.entities.Event.update(e.id, { series_id: survivor_series_id }).catch(() => {});
        referenceCounts.Event++;
      }
      if (batch.length < 100) break;
      offset += batch.length;
    }

    // ── Step 3: Re-point SeriesClass.series_id ───────────────────────────────
    offset = 0;
    while (true) {
      const batch = await sr.entities.SeriesClass.list('-created_date', 100, offset).catch(() => []);
      if (!batch || batch.length === 0) break;
      const toFix = batch.filter((c) => c.series_id === duplicate_series_id);
      for (const c of toFix) {
        await sr.entities.SeriesClass.update(c.id, { series_id: survivor_series_id }).catch(() => {});
        referenceCounts.SeriesClass++;
      }
      if (batch.length < 100) break;
      offset += batch.length;
    }

    // ── Step 4: Re-point Standings.series_id ─────────────────────────────────
    offset = 0;
    while (true) {
      const batch = await sr.entities.Standings.list('-created_date', 100, offset).catch(() => []);
      if (!batch || batch.length === 0) break;
      const toFix = batch.filter((s) => s.series_id === duplicate_series_id);
      for (const s of toFix) {
        await sr.entities.Standings.update(s.id, { series_id: survivor_series_id }).catch(() => {});
        referenceCounts.Standings++;
      }
      if (batch.length < 100) break;
      offset += batch.length;
    }

    // ── Step 5: Re-point Entry.series_id ─────────────────────────────────────
    offset = 0;
    while (true) {
      const batch = await sr.entities.Entry.list('-created_date', 100, offset).catch(() => []);
      if (!batch || batch.length === 0) break;
      const toFix = batch.filter((en) => en.series_id === duplicate_series_id);
      for (const en of toFix) {
        await sr.entities.Entry.update(en.id, { series_id: survivor_series_id }).catch(() => {});
        referenceCounts.Entry++;
      }
      if (batch.length < 100) break;
      offset += batch.length;
    }

    // ── Step 6: Re-point Sponsorship.target_entity_id (Series targets) ──────
    offset = 0;
    while (true) {
      const batch = await sr.entities.Sponsorship.list('-created_date', 100, offset).catch(() => []);
      if (!batch || batch.length === 0) break;
      const toFix = batch.filter(
        (sp) => sp.target_entity_type === 'Series' && sp.target_entity_id === duplicate_series_id
      );
      for (const sp of toFix) {
        await sr.entities.Sponsorship.update(sp.id, { target_entity_id: survivor_series_id }).catch(() => {});
        referenceCounts.Sponsorship++;
      }
      if (batch.length < 100) break;
      offset += batch.length;
    }

    // ── Step 7: Apply field_overrides to survivor ────────────────────────────
    const overrideKeys = Object.keys(field_overrides || {});
    if (overrideKeys.length > 0) {
      const safeOverrides = {};
      // Never allow id / canonical routing fields to be overridden via merge
      const BLOCKED = new Set(['id', 'created_date', 'updated_date', 'created_by_id', 'canonical_key', 'normalized_name', 'canonical_slug']);
      for (const k of overrideKeys) {
        if (!BLOCKED.has(k)) safeOverrides[k] = field_overrides[k];
      }
      if (Object.keys(safeOverrides).length > 0) {
        await sr.entities.Series.update(survivor_series_id, safeOverrides).catch(() => {});
      }
    }

    // ── AuditLog ─────────────────────────────────────────────────────────────
    const auditLog = await sr.entities.AuditLog.create({
      entity_type: 'Series',
      entity_id: survivor_series_id,
      entity_name: survivor.name || '',
      action: 'updated',
      before_data: {
        survivor_id: survivor_series_id,
        duplicate_id: duplicate_series_id,
        duplicate_name: duplicate.name || '',
        field_overrides: field_overrides || {},
      },
      after_data: {
        survivor_id: survivor_series_id,
        duplicate_deactivated: duplicate_series_id,
        references_repaired: referenceCounts,
      },
      performed_by: user.id,
      performed_by_name: user.full_name || user.email,
      timestamp: now,
      notes: `Manual series merge: "${duplicate.name || ''}" absorbed into "${survivor.name || ''}" — ${reason}`,
    }).catch(() => ({ id: null }));

    // ── OperationLog ──────────────────────────────────────────────────────────
    await sr.entities.OperationLog.create({
      operation_type: 'series_merge_executed',
      entity_name: 'Series',
      status: 'success',
      metadata: {
        source_path: 'mergeSeriesSafely',
        survivor_series_id,
        duplicate_series_id,
        field_overrides: field_overrides || {},
        references_repaired: referenceCounts,
        reason,
      },
    }).catch(() => {});

    return Response.json({
      ok: true,
      survivor_id: survivor_series_id,
      duplicate_id: duplicate_series_id,
      references_repaired: referenceCounts,
      audit_log_id: auditLog.id || null,
    });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});