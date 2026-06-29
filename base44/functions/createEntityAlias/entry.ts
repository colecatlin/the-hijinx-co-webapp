/**
 * createEntityAlias.js — R9EB.1
 *
 * Governed, append-only alias creation for any RaceCore entity.
 *
 * Rules:
 *   - EntityAlias records are NEVER deleted — only deactivated (active=false)
 *   - Every creation writes AuditLog + OperationLog
 *   - Import aliases record import_run_id and imported_from
 *   - Duplicate alias_normalized for the same entity is silently skipped (idempotent)
 *   - Duplicate alias_normalized pointing to DIFFERENT entities returns a conflict error
 *
 * Input:
 *   entity_type       — required
 *   entity_id         — required
 *   alias_name        — required
 *   alias_type        — required (canonical|nickname|abbreviation|surname_first|legal_name|
 *                                 historical_name|sponsor_name|short_name|marketing_name|
 *                                 import_variant|legacy|manual)
 *   confidence        — optional (0-100, default 80)
 *   source            — optional
 *   source_type       — optional
 *   imported_from     — optional
 *   import_run_id     — optional
 *   notes             — optional
 *   active            — optional (default true)
 *
 * Output:
 *   { ok, alias_id, action: 'created'|'already_exists'|'conflict', alias_normalized }
 *
 * Admin only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ── Normalization (inline — matches resolveEntityAlias exactly) ────────────────

function stripQuotedNicknames(name) {
  return name.replace(/"[^"]*"/g, '').replace(/'[^']*'/g, '').replace(/\s+/g, ' ').trim();
}

function detectSurnameFirst(name) {
  return /^[^,]+,\s*.+$/.test(name.trim());
}

function invertSurnameFirst(name) {
  const parts = name.split(',');
  if (parts.length < 2) return name;
  return `${parts.slice(1).join(',').trim()} ${parts[0].trim()}`;
}

function normalizeEntityName(name, entityType) {
  if (!name || typeof name !== 'string') return null;
  let n = name.trim();
  if (!n) return null;

  const isPerson = entityType === 'Driver' || entityType === 'PersonIdentity';
  const isClass = entityType === 'SeriesClass';

  n = stripQuotedNicknames(n);
  if (isPerson && detectSurnameFirst(n)) n = invertSurnameFirst(n);
  n = n.toLowerCase();
  if (isPerson) n = n.replace(/\b(jr\.?|sr\.?|ii|iii|iv)\b/g, '').trim();
  n = n.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (isPerson) {
    let prev = '';
    while (prev !== n) {
      prev = n;
      n = n.replace(/\b([a-z])\s+(?=[a-z](\s|$))/g, '$1');
    }
    n = n.replace(/\s+/g, ' ').trim();
  }
  if (isClass) {
    n = n.replace(/([a-z])(\d)/g, '$1 $2').replace(/(\d)([a-z])/g, '$1 $2').replace(/\s+/g, ' ').trim();
  }
  return n || null;
}

// ── Handler ────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const {
      entity_type,
      entity_id,
      alias_name,
      alias_type,
      confidence = 80,
      source = null,
      source_type = 'manual_admin',
      imported_from = null,
      import_run_id = null,
      notes = null,
      active = true,
    } = body;

    if (!entity_type) return Response.json({ error: 'entity_type is required' }, { status: 400 });
    if (!entity_id)   return Response.json({ error: 'entity_id is required' }, { status: 400 });
    if (!alias_name)  return Response.json({ error: 'alias_name is required' }, { status: 400 });
    if (!alias_type)  return Response.json({ error: 'alias_type is required' }, { status: 400 });

    const alias_normalized = normalizeEntityName(alias_name, entity_type);
    if (!alias_normalized) return Response.json({ error: 'alias_name normalizes to empty string' }, { status: 400 });

    const sr = base44.asServiceRole;

    // ── Idempotency: check if this exact alias already exists for this entity ──
    const existing = await sr.entities.EntityAlias.filter({
      entity_type,
      entity_id,
      alias_normalized,
    }).catch(() => []);

    if (existing.length > 0) {
      return Response.json({
        ok: true,
        alias_id: existing[0].id,
        action: 'already_exists',
        alias_normalized,
      });
    }

    // ── Conflict: same normalized alias already points to a DIFFERENT entity ───
    const conflict = await sr.entities.EntityAlias.filter({
      entity_type,
      alias_normalized,
      active: true,
    }).catch(() => []);

    const differentEntity = conflict.filter(a => a.entity_id !== entity_id);
    if (differentEntity.length > 0) {
      return Response.json({
        ok: false,
        action: 'conflict',
        alias_normalized,
        conflicting_entity_ids: differentEntity.map(a => a.entity_id),
        message: `Alias "${alias_normalized}" already points to a different ${entity_type} entity — manual review required`,
      }, { status: 409 });
    }

    // ── Create the alias ───────────────────────────────────────────────────────
    const record = await sr.entities.EntityAlias.create({
      entity_type,
      entity_id,
      alias_name,
      alias_normalized,
      alias_type,
      confidence,
      active,
      source,
      source_type,
      imported_from,
      import_run_id,
      created_by: user.id,
      notes,
    });

    // ── AuditLog ───────────────────────────────────────────────────────────────
    await sr.entities.AuditLog.create({
      entity_type: 'EntityAlias',
      entity_id: record.id,
      entity_name: alias_name,
      action: 'created',
      before_data: null,
      after_data: { entity_type, entity_id, alias_name, alias_normalized, alias_type, confidence },
      performed_by: user.id,
      performed_by_name: user.full_name || user.email,
      timestamp: new Date().toISOString(),
      notes: `EntityAlias created: ${alias_type} for ${entity_type} ${entity_id}`,
    }).catch(() => {});

    // ── OperationLog ───────────────────────────────────────────────────────────
    await sr.entities.OperationLog.create({
      operation_type: 'entity_alias_created',
      entity_name: 'EntityAlias',
      user_email: user.email || null,
      status: 'completed',
      metadata: {
        entity_type,
        entity_id,
        alias_name,
        alias_normalized,
        alias_type,
        import_run_id,
      },
    }).catch(() => {});

    return Response.json({
      ok: true,
      alias_id: record.id,
      action: 'created',
      alias_normalized,
    });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});