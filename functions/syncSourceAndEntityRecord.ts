/**
 * syncSourceAndEntityRecord.js
 *
 * The single approved sync sequence:
 *   1. upsertSourceEntity  (normalize + dedupe + save source)
 *   2. ensureEntityForRecord (sync common Entity layer)
 *   3. ensureEventEntityLinks (sync relationships + confirmation for events only)
 *   4. Log entity_sync_completed to OperationLog
 *
 * NEVER create a common Entity record before the deduped source record exists.
 *
 * Input  { entity_type, payload, user_id? }
 * Output { source_action, source_record, entity_record, relationship_summary? }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { entity_type, payload = {}, user_id } = body;

    if (!entity_type || !payload) {
      return Response.json({ error: 'entity_type and payload are required' }, { status: 400 });
    }

    const sr = base44.asServiceRole;
    const now = new Date().toISOString();

    // ── STEP 1: upsertSourceEntity ───────────────────────────────────────────
    const upsertRes = await base44.functions.invoke('upsertSourceEntity', {
      entity_type,
      payload,
    });

    if (!upsertRes?.data?.record) {
      return Response.json({
        error: 'upsertSourceEntity failed or returned no record',
        details: upsertRes?.data,
      }, { status: 500 });
    }

    const source_record = upsertRes.data.record;
    const source_action = upsertRes.data.action; // 'created' | 'updated'

    // Log source operation if newly created
    if (source_action === 'created') {
      await sr.entities.OperationLog.create({
        operation_type: 'source_entity_created',
        entity_name: entity_type,
        entity_id: source_record.id,
        user_email: user?.email || null,
        status: 'success',
        metadata: { entity_type, record_id: source_record.id },
      }).catch(() => {});
    }

    // ── STEP 2: ensureEntityForRecord (common Entity layer) ──────────────────
    const resolvedName =
      source_record.name ||
      source_record.full_name ||
      (source_record.first_name
        ? `${source_record.first_name} ${source_record.last_name || ''}`.trim()
        : null) ||
      payload.name ||
      entity_type;

    const ensureRes = await base44.functions.invoke('ensureEntityForRecord', {
      entity_type,
      source_entity_id: source_record.id,
      name: resolvedName,
      slug: source_record.canonical_slug || null,
      ...(user_id && { owner_user_id: user_id }),
    });

    if (!ensureRes?.data?.entity) {
      return Response.json({
        error: 'ensureEntityForRecord failed or returned no entity',
        details: ensureRes?.data,
      }, { status: 500 });
    }

    const entity_record = ensureRes.data.entity;

    // ── STEP 3: if event, sync relationships + confirmation ──────────────────
    let relationship_summary = null;
    if (entity_type === 'event') {
      const linkRes = await base44.functions.invoke('ensureEventEntityLinks', {
        event_id: source_record.id,
      });
      relationship_summary = linkRes?.data || null;
    }

    // ── STEP 4: Log entity_sync_completed ────────────────────────────────────
    await sr.entities.OperationLog.create({
      operation_type: 'entity_sync_completed',
      entity_name: entity_type,
      entity_id: entity_record.id,
      user_email: user?.email || null,
      status: 'success',
      metadata: {
        source_record_id: source_record.id,
        entity_record_id: entity_record.id,
        source_action,
      },
    }).catch(() => {});

    return Response.json({
      source_action,
      source_record,
      entity_record,
      ...(relationship_summary && { relationship_summary }),
    });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});