/**
 * autoMatchResultsToDrivers.js
 *
 * Called by entity automation on Results create.
 * Also supports manual batch mode: { batch: true }
 *
 * Logic:
 *   1. Skip if result already has a confident driver_id (matched_via != 'unmatched').
 *   2. Try to match driver_name against canonical Driver records.
 *   3. Exact normalized match → link.
 *   4. Single last-name match → link with lower confidence flag.
 *   5. Ambiguous or no match → log, skip, do not write.
 *   6. Never overwrite an existing driver_id that was set via upsertOperationalResult
 *      (these already have normalized_result_key set, indicating confident linkage).
 *
 * Input (automation): { event: { entity_id }, data: { ...result } }
 * Input (batch):      { batch: true, limit?: number }
 *
 * Output: { ok, action, result_id, driver_id? }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function normalizeName(name) {
  return (name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildDriverIndex(drivers) {
  const byFull = {};   // normalized full name → [driver]
  const byLast = {};   // normalized last name → [driver]

  for (const d of drivers) {
    const full = normalizeName(`${d.first_name} ${d.last_name}`);
    if (!byFull[full]) byFull[full] = [];
    byFull[full].push(d);

    // Also index normalized_name if present
    if (d.normalized_name) {
      const norm = normalizeName(d.normalized_name);
      if (!byFull[norm]) byFull[norm] = [];
      if (!byFull[norm].includes(d)) byFull[norm].push(d);
    }

    const last = normalizeName(d.last_name || '');
    if (last) {
      if (!byLast[last]) byLast[last] = [];
      byLast[last].push(d);
    }
  }

  return { byFull, byLast };
}

function matchDriver(driverName, index) {
  if (!driverName) return { type: 'no_name' };
  const norm = normalizeName(driverName);

  // 1. Exact full-name match
  const exact = index.byFull[norm];
  if (exact?.length === 1) return { type: 'exact', driver: exact[0] };
  if (exact?.length > 1)   return { type: 'ambiguous', reason: `Multiple drivers match "${driverName}"` };

  // 2. Last-name-only match (single)
  const parts = norm.split(' ');
  const lastName = parts[parts.length - 1];
  if (lastName && lastName.length > 2) {
    const byLast = index.byLast[lastName];
    if (byLast?.length === 1) return { type: 'last_name', driver: byLast[0] };
    if (byLast?.length > 1)   return { type: 'ambiguous', reason: `Ambiguous last name "${lastName}" for "${driverName}"` };
  }

  return { type: 'unmatched' };
}

async function processResult(db, result, index) {
  // Skip: already has a driver_id AND was set via a confident normalized key path
  if (result.driver_id && result.normalized_result_key) {
    return { action: 'skipped_confident', result_id: result.id };
  }

  // Skip: already has driver_id and no driver_name to improve on
  if (result.driver_id && !result.driver_name) {
    return { action: 'skipped_has_id', result_id: result.id };
  }

  const match = matchDriver(result.driver_name, index);

  if (match.type === 'exact' || match.type === 'last_name') {
    const driver = match.driver;
    await db.entities.Results.update(result.id, {
      driver_id: driver.id,
      // Don't overwrite normalized_result_key if already set
      ...(result.session_id && !result.normalized_result_key && {
        normalized_result_key: `result:${result.session_id}:${driver.id}`,
      }),
    });
    return {
      action: 'linked',
      result_id: result.id,
      driver_id: driver.id,
      match_type: match.type,
      driver_name: result.driver_name,
    };
  }

  if (match.type === 'ambiguous') {
    await db.entities.OperationLog.create({
      operation_type: 'result_driver_match_ambiguous',
      entity_name: 'Results',
      entity_id: result.id,
      status: 'warning',
      message: match.reason,
      metadata: { result_id: result.id, driver_name: result.driver_name, reason: match.reason },
    }).catch(() => {});
    return { action: 'ambiguous', result_id: result.id, driver_name: result.driver_name };
  }

  return { action: 'unmatched', result_id: result.id, driver_name: result.driver_name };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const body = await req.json().catch(() => ({}));

    // Resolve target result id. Batch mode (no id, or body.batch=true) is a
    // powerful bulk operation and MUST require admin auth — do not let a
    // forged `event` field in the body bypass admin authorization for mass
    // service-role writes.
    const entityId = body?.event?.entity_id || body?.data?.id || body?.result_id;
    const isBatch = !entityId || !!body?.batch;

    if (isBatch) {
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const db = base44.asServiceRole;

    // Pre-load all drivers once
    const allDrivers = await db.entities.Driver.list('-created_date', 2000);
    const index = buildDriverIndex(allDrivers);

    // --- Entity automation path (single result) ---
    if (entityId && !body?.batch) {
      const results = await db.entities.Results.filter({ id: entityId }).catch(() => []);
      const result = results?.[0];
      if (!result) return Response.json({ ok: false, error: 'Result not found' }, { status: 404 });

      const outcome = await processResult(db, result, index);
      return Response.json({ ok: true, ...outcome });
    }

    // --- Batch mode: process all unlinked results ---
    const limit = body?.limit || 500;
    const allResults = await db.entities.Results.list('-created_date', limit);
    const unlinked = allResults.filter(r => !r.driver_id && r.driver_name);

    const outcomes = [];
    for (const result of unlinked) {
      const outcome = await processResult(db, result, index);
      outcomes.push(outcome);
    }

    const linked   = outcomes.filter(o => o.action === 'linked').length;
    const ambiguous = outcomes.filter(o => o.action === 'ambiguous').length;
    const unmatched = outcomes.filter(o => o.action === 'unmatched').length;

    return Response.json({
      ok: true,
      total_checked: allResults.length,
      unlinked_processed: unlinked.length,
      linked,
      ambiguous,
      unmatched,
      outcomes,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});