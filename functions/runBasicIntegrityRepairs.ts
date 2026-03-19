/**
 * runBasicIntegrityRepairs.js  (admin only)
 *
 * Safe, non-destructive repairs only:
 *  1. Fill missing normalization fields where source name exists
 *  2. Ensure missing Entity rows for source records
 *  3. Ensure missing Event entity relationships and confirmations
 *  4. Mark expired pending Invitations → expired
 *  5. Ensure owner access codes exist (via ensureEntityOwnerAccessCode)
 *
 * Does NOT:
 *  - Merge or delete duplicates
 *  - Rewrite collaborator references
 *  - Auto-resolve ambiguous cases
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function normalizeName(v) {
  if (!v) return '';
  return v.trim().toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}
function buildSlug(v) { return normalizeName(v).replace(/\s+/g, '-'); }
function buildKey(et, name, external_uid) {
  const type = et.toLowerCase();
  if (external_uid) return `${type}:${external_uid}`;
  return `${type}:${normalizeName(name)}`;
}
function displayName(et, r) {
  if (et === 'driver') return `${r.first_name || ''} ${r.last_name || ''}`.trim();
  return r.name || r.full_name || '';
}

const MODEL_MAP = { driver: 'Driver', team: 'Team', track: 'Track', series: 'Series', event: 'Event' };
const SOURCE_TYPES = ['driver', 'team', 'track', 'series', 'event'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const sr = base44.asServiceRole;
    const skipped = [];

    // ── Repair 1: Fill missing normalization fields ─────────────────────────
    let normalization_filled = 0;
    for (const et of SOURCE_TYPES) {
      const records = await sr.entities[MODEL_MAP[et]].list('-created_date', 2000);
      for (const r of records) {
        const dn = displayName(et, r);
        if (!dn) { skipped.push({ entity_type: et, id: r.id, reason: 'cannot derive display name' }); continue; }

        const patch = {};
        if (!r.normalized_name) patch.normalized_name = normalizeName(dn);
        if (!r.canonical_slug)  patch.canonical_slug  = buildSlug(dn);
        if (!r.canonical_key)   patch.canonical_key   = buildKey(et, dn, r.external_uid);

        if (Object.keys(patch).length > 0) {
          await sr.entities[MODEL_MAP[et]].update(r.id, patch).catch(e => {
            skipped.push({ entity_type: et, id: r.id, reason: e.message });
          });
          normalization_filled++;
        }
      }
    }

    // ── Repair 2: Ensure missing Entity rows for source records ────────────
    let entities_created = 0;
    const existingEntities = await sr.entities.Entity.list('-created_date', 5000);
    const entityBySource = new Set(existingEntities.map(e => e.source_entity_id));

    for (const et of SOURCE_TYPES) {
      const records = await sr.entities[MODEL_MAP[et]].list('-created_date', 2000);
      for (const r of records) {
        if (!entityBySource.has(r.id)) {
          const dn = displayName(et, r);
          if (!dn) { skipped.push({ entity_type: et, id: r.id, reason: 'no display name for Entity creation' }); continue; }
          await sr.entities.Entity.create({
            entity_type: et,
            source_entity_id: r.id,
            name: dn,
            slug: r.canonical_slug || buildSlug(dn),
          }).catch(e => {
            skipped.push({ entity_type: et, id: r.id, reason: `entity create failed: ${e.message}` });
          });
          entityBySource.add(r.id);
          entities_created++;
        }
      }
    }

    // ── Repair 3: Ensure Event entity links via ensureEventEntityLinks ──────
    let event_links_created = 0;
    const allEntities = await sr.entities.Entity.list('-created_date', 5000);
    const eventEntities = allEntities.filter(e => e.entity_type === 'event');

    for (const ee of eventEntities) {
      const res = await base44.functions.invoke('ensureEventEntityLinks', {
        event_id: ee.source_entity_id,
      }).catch(() => null);
      if (res?.data?.relationships_created > 0 || res?.data?.confirmation_created) {
        event_links_created++;
      }
    }

    // ── Repair 4: Mark expired pending invitations ──────────────────────────
    let invitations_expired = 0;
    const now = new Date();
    const invitations = await sr.entities.Invitation.list('-created_date', 2000);
    for (const inv of invitations) {
      const exp = inv.expires_at || inv.expiration_date;
      if (inv.status === 'pending' && exp && new Date(exp) < now) {
        await sr.entities.Invitation.update(inv.id, { status: 'expired' }).catch(e => {
          skipped.push({ entity: 'Invitation', id: inv.id, reason: e.message });
        });
        invitations_expired++;
      }
    }

    // ── Repair 5: Ensure owner access codes ────────────────────────────────
    let owner_codes_created = 0;
    const collaborators = await sr.entities.EntityCollaborator.list('-created_date', 5000);
    for (const c of collaborators) {
      if ((c.role === 'owner' || c.is_owner) && !c.access_code) {
        const res = await base44.functions.invoke('ensureEntityOwnerAccessCode', {
          entity_type: c.entity_type,
          entity_id: c.entity_id,
          user_id: c.user_id,
        }).catch(() => null);
        if (res?.data?.access_code) owner_codes_created++;
      }
    }

    const report = {
      normalization_filled,
      entities_created,
      event_links_created,
      invitations_expired,
      owner_codes_created,
      skipped: skipped.slice(0, 50),
      skipped_count: skipped.length,
    };

    await sr.entities.OperationLog.create({
      operation_type: 'diagnostics_repair_run',
      entity_name: 'Diagnostics',
      status: 'success',
      metadata: { ...report, repaired_by: user.email },
    }).catch(() => {});

    return Response.json(report);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});