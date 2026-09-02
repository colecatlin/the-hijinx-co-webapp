/**
 * mergeRecordsSafely — Manual two-record merge tool for any RaceCore entity.
 *
 * Admin picks any two records of the same type (survivor + duplicate), and
 * this function:
 *   1. Marks the duplicate inactive with a DUPLICATE_OF marker.
 *   2. Re-points all references to the duplicate onto the survivor.
 *   3. Applies admin-chosen field_overrides to the survivor.
 *   4. Writes an AuditLog + OperationLog entry.
 *
 * Input:
 *   entity_type       — 'Series' | 'Driver' | 'Team' | 'Track' | 'Event'
 *   survivor_id       — canonical record to keep
 *   duplicate_id      — record to absorb + deactivate
 *   field_overrides   — optional { field: value } applied to survivor
 *   reason            — human-readable reason for the merge (required)
 *
 * Output:
 *   { ok, entity_type, survivor_id, duplicate_id, references_repaired, audit_log_id }
 *
 * Admin only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Per-entity-type configuration: FK references to re-point, deactivation fields,
// and how to derive a display name for the audit log.
const ENTITY_CONFIG = {
  Series: {
    fkFields: [
      { entity: 'Event', field: 'series_id' },
      { entity: 'SeriesClass', field: 'series_id' },
      { entity: 'Standings', field: 'series_id' },
      { entity: 'Entry', field: 'series_id' },
    ],
    sponsorshipType: 'Series',
    deactivate: { operational_status: 'Inactive', visibility_status: 'draft' },
    canonicalPrefix: 'series',
    getName: (r) => r.name || '',
  },
  Driver: {
    fkFields: [
      { entity: 'Results', field: 'driver_id' },
      { entity: 'Entry', field: 'driver_id' },
      { entity: 'Standings', field: 'driver_id' },
      { entity: 'DriverProgram', field: 'driver_id' },
      { entity: 'DriverMedia', field: 'driver_id' },
      { entity: 'Vehicle', field: 'owner_driver_id' },
    ],
    sponsorshipType: null,
    deactivate: { racing_status: 'Inactive' },
    canonicalPrefix: 'driver',
    getName: (r) => `${r.first_name || ''} ${r.last_name || ''}`.trim(),
  },
  Team: {
    fkFields: [
      { entity: 'Driver', field: 'team_id' },
      { entity: 'Entry', field: 'team_id' },
      { entity: 'Vehicle', field: 'owner_team_id' },
    ],
    sponsorshipType: 'Team',
    deactivate: { racing_status: 'Inactive' },
    canonicalPrefix: 'team',
    getName: (r) => r.name || '',
  },
  Track: {
    fkFields: [
      { entity: 'Event', field: 'track_id' },
    ],
    sponsorshipType: 'Track',
    deactivate: { operational_status: 'Inactive', visibility_status: 'draft' },
    canonicalPrefix: 'track',
    getName: (r) => r.name || '',
  },
  Event: {
    fkFields: [
      { entity: 'Entry', field: 'event_id' },
      { entity: 'Session', field: 'event_id' },
      { entity: 'EventClass', field: 'event_id' },
      { entity: 'Results', field: 'event_id' },
    ],
    sponsorshipType: 'Event',
    deactivate: { status: 'Cancelled', published_flag: false },
    canonicalPrefix: 'event',
    getName: (r) => r.name || '',
  },
};

const BLOCKED_OVERRIDE = new Set([
  'id', 'created_date', 'updated_date', 'created_by_id',
  'canonical_key', 'normalized_name', 'canonical_slug',
]);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { entity_type, survivor_id, duplicate_id, field_overrides = {}, reason } = body;

    if (!entity_type || !ENTITY_CONFIG[entity_type]) {
      return Response.json({ error: `entity_type must be one of: ${Object.keys(ENTITY_CONFIG).join(', ')}` }, { status: 400 });
    }
    if (!survivor_id) return Response.json({ error: 'survivor_id is required' }, { status: 400 });
    if (!duplicate_id) return Response.json({ error: 'duplicate_id is required' }, { status: 400 });
    if (survivor_id === duplicate_id) {
      return Response.json({ error: 'Survivor and duplicate must be different records' }, { status: 400 });
    }
    if (!reason) return Response.json({ error: 'reason is required' }, { status: 400 });

    const cfg = ENTITY_CONFIG[entity_type];
    const sr = base44.asServiceRole;
    const now = new Date().toISOString();

    // ── Load survivor + duplicate ───────────────────────────────────────────
    const survivorList = await sr.entities[entity_type].filter({ id: survivor_id }).catch(() => []);
    const survivor = survivorList?.[0];
    if (!survivor) return Response.json({ error: `Survivor ${entity_type} not found: ${survivor_id}` }, { status: 404 });

    const dupList = await sr.entities[entity_type].filter({ id: duplicate_id }).catch(() => []);
    const duplicate = dupList?.[0];
    if (!duplicate) return Response.json({ error: `Duplicate ${entity_type} not found: ${duplicate_id}` }, { status: 404 });

    const referenceCounts = {};

    // ── Step 1: Mark duplicate inactive ─────────────────────────────────────
    const dupMarker = `DUPLICATE_OF:${survivor_id}`;
    const existingNotes = duplicate.notes || '';
    const newNotes = existingNotes.includes(dupMarker)
      ? existingNotes
      : (existingNotes ? `${existingNotes} | ${dupMarker}` : dupMarker);

    await sr.entities[entity_type].update(duplicate_id, {
      ...cfg.deactivate,
      notes: newNotes,
      canonical_key: `${cfg.canonicalPrefix}:DUPLICATE_OF:${survivor_id}`,
    }).catch(() => {});

    // ── Step 2: Re-point all FK references ──────────────────────────────────
    for (const ref of cfg.fkFields) {
      referenceCounts[ref.entity] = 0;
      let offset = 0;
      while (true) {
        const batch = await sr.entities[ref.entity].list('-created_date', 100, offset).catch(() => []);
        if (!batch || batch.length === 0) break;
        const toFix = batch.filter((r) => r[ref.field] === duplicate_id);
        for (const r of toFix) {
          await sr.entities[ref.entity].update(r.id, { [ref.field]: survivor_id }).catch(() => {});
          referenceCounts[ref.entity]++;
        }
        if (batch.length < 100) break;
        offset += batch.length;
      }
    }

    // ── Step 3: Re-point polymorphic Sponsorship references ──────────────────
    if (cfg.sponsorshipType) {
      referenceCounts.Sponsorship = 0;
      let offset = 0;
      while (true) {
        const batch = await sr.entities.Sponsorship.list('-created_date', 100, offset).catch(() => []);
        if (!batch || batch.length === 0) break;
        const toFix = batch.filter(
          (sp) => sp.target_entity_type === cfg.sponsorshipType && sp.target_entity_id === duplicate_id
        );
        for (const sp of toFix) {
          await sr.entities.Sponsorship.update(sp.id, { target_entity_id: survivor_id }).catch(() => {});
          referenceCounts.Sponsorship++;
        }
        if (batch.length < 100) break;
        offset += batch.length;
      }
    }

    // ── Step 4: Apply field_overrides to survivor ───────────────────────────
    const overrideKeys = Object.keys(field_overrides || {});
    if (overrideKeys.length > 0) {
      const safeOverrides = {};
      for (const k of overrideKeys) {
        if (!BLOCKED_OVERRIDE.has(k)) safeOverrides[k] = field_overrides[k];
      }
      if (Object.keys(safeOverrides).length > 0) {
        await sr.entities[entity_type].update(survivor_id, safeOverrides).catch(() => {});
      }
    }

    // ── AuditLog ─────────────────────────────────────────────────────────────
    const survivorName = cfg.getName(survivor);
    const duplicateName = cfg.getName(duplicate);
    const auditLog = await sr.entities.AuditLog.create({
      entity_type: entity_type,
      entity_id: survivor_id,
      entity_name: survivorName,
      action: 'updated',
      before_data: {
        survivor_id: survivor_id,
        duplicate_id: duplicate_id,
        duplicate_name: duplicateName,
        field_overrides: field_overrides || {},
      },
      after_data: {
        survivor_id: survivor_id,
        duplicate_deactivated: duplicate_id,
        references_repaired: referenceCounts,
      },
      performed_by: user.id,
      performed_by_name: user.full_name || user.email,
      timestamp: now,
      notes: `Manual ${entity_type} merge: "${duplicateName}" absorbed into "${survivorName}" — ${reason}`,
    }).catch(() => ({ id: null }));

    // ── OperationLog ──────────────────────────────────────────────────────────
    await sr.entities.OperationLog.create({
      operation_type: `${entity_type.toLowerCase()}_merge_executed`,
      entity_name: entity_type,
      status: 'success',
      metadata: {
        source_path: 'mergeRecordsSafely',
        entity_type,
        survivor_id,
        duplicate_id,
        field_overrides: field_overrides || {},
        references_repaired: referenceCounts,
        reason,
      },
    }).catch(() => {});

    return Response.json({
      ok: true,
      entity_type,
      survivor_id,
      duplicate_id,
      references_repaired: referenceCounts,
      audit_log_id: auditLog.id || null,
    });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});