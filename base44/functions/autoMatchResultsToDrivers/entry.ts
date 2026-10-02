/**
 * autoMatchResultsToDrivers — result → racer linkage through the shared matcher.
 *
 * Rewritten by the canonical racer build:
 *   · surname-only matching is GONE — a last name can never attach a result
 *   · matching runs through base44/shared/personIdentityMatcher.ts
 *   · a result is only written when the matcher returns a trusted ATTACHED and
 *     a deterministic legacy Driver can be resolved from the identity
 *   · it never creates a PersonIdentity or a Driver — a name in a results file
 *     is not proof of a new human
 *
 * Outcomes: MATCHED | REVIEW_REQUIRED | NO_MATCH | BLOCKED
 *
 * Called by entity automation on Results create, and supports manual batch mode
 * { batch: true }. Admin-authenticated before any service-role access.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { matchPersonIdentity } from '../../shared/personIdentityMatcher.ts';

async function resolveCanonicalDriver(sr: any, identity: any): Promise<any | null> {
  if (identity?.canonical_driver_id) {
    const driver = await sr.entities.Driver.get(identity.canonical_driver_id).catch(() => null);
    if (driver) return driver;
  }
  const profiles = await sr.entities.RacerProfile
    .filter({ person_identity_id: identity.id, is_archived: false }).catch(() => []);
  for (const profile of (profiles || [])) {
    if (!profile || !profile.legacy_driver_id) continue;
    const driver = await sr.entities.Driver.get(profile.legacy_driver_id).catch(() => null);
    if (driver) return driver;
  }
  const links = await sr.entities.DriverImportIdentityLink
    .filter({ person_identity_id: identity.id, is_archived: false }).catch(() => []);
  for (const link of (links || [])) {
    if (!link || !link.legacy_driver_id) continue;
    const driver = await sr.entities.Driver.get(link.legacy_driver_id).catch(() => null);
    if (driver) return driver;
  }
  return null;
}

async function processResult(sr: any, result: any, actor: any) {
  if (result.driver_id && result.normalized_result_key) {
    return { action: 'MATCHED', already: true, result_id: result.id };
  }
  const name = result.driver_name || result.raw_driver_name || null;
  if (!name) {
    return { action: 'NO_MATCH', result_id: result.id, reason: 'no driver name on the result' };
  }

  const match = await matchPersonIdentity(sr, { name });

  if (match.action === 'BLOCKED') {
    await sr.entities.OperationLog.create({
      operation_type: 'result_driver_match_blocked',
      entity_name: 'Results',
      entity_id: result.id,
      status: 'warning',
      message: 'Trusted identity conflict for "' + name + '" (' + match.reason + ')',
      metadata: { result_id: result.id, name, signals: match.signals },
    }).catch(() => null);
    return { action: 'BLOCKED', result_id: result.id, reason: match.reason, signals: match.signals };
  }

  if (match.action === 'REVIEW') {
    await sr.entities.OperationLog.create({
      operation_type: 'result_driver_match_review_required',
      entity_name: 'Results',
      entity_id: result.id,
      status: 'warning',
      message: 'Result for "' + name + '" needs human confirmation (' + match.reason + ')',
      metadata: { result_id: result.id, name, identity_id: match.identity_id, signals: match.signals },
    }).catch(() => null);
    return { action: 'REVIEW_REQUIRED', result_id: result.id, identity_id: match.identity_id, reason: match.reason };
  }

  if (match.action === 'NEW_IDENTITY') {
    await sr.entities.OperationLog.create({
      operation_type: 'result_driver_match_no_match',
      entity_name: 'Results',
      entity_id: result.id,
      status: 'info',
      message: 'No known racer matches "' + name + '" — no identity was created from a results row',
      metadata: { result_id: result.id, name },
    }).catch(() => null);
    return { action: 'NO_MATCH', result_id: result.id, reason: 'no known racer' };
  }

  // ATTACHED — a trusted signal confirmed the human. Resolve the compatibility Driver.
  const driver = await resolveCanonicalDriver(sr, match.identity);
  if (!driver) {
    await sr.entities.OperationLog.create({
      operation_type: 'result_driver_match_review_required',
      entity_name: 'Results',
      entity_id: result.id,
      status: 'warning',
      message: 'Identity matched for "' + name + '" but no legacy Driver could be resolved deterministically',
      metadata: { result_id: result.id, name, identity_id: match.identity_id },
    }).catch(() => null);
    return { action: 'REVIEW_REQUIRED', result_id: result.id, identity_id: match.identity_id, reason: 'no deterministic legacy Driver' };
  }

  const patch: Record<string, any> = { driver_id: driver.id };
  if (match.identity_id) patch.identity_id = match.identity_id;
  // Entry already identifies the racer — derive the rest from it rather than re-matching.
  if (result.entry_id) {
    const entry = await sr.entities.Entry.get(result.entry_id).catch(() => null);
    if (entry) {
      if (!result.participation_id && entry.participation_id) patch.participation_id = entry.participation_id;
      if (!result.series_id && entry.series_id) patch.series_id = entry.series_id;
      if (!result.series_class_id && entry.series_class_id) patch.series_class_id = entry.series_class_id;
      if (!result.team_id && entry.team_id) patch.team_id = entry.team_id;
    }
  }
  if (result.session_id && !result.normalized_result_key) {
    patch.normalized_result_key = 'result:' + result.session_id + ':' + driver.id;
  }

  await sr.entities.Results.update(result.id, patch);
  await sr.entities.OperationLog.create({
    operation_type: 'result_driver_matched',
    entity_name: 'Results',
    entity_id: result.id,
    status: 'success',
    message: 'Result matched to ' + name + ' through the shared identity matcher',
    metadata: { result_id: result.id, driver_id: driver.id, identity_id: match.identity_id, confidence: match.confidence, signals: match.signals },
    performed_by: actor?.id || null,
  }).catch(() => null);

  return {
    action: 'MATCHED', result_id: result.id, driver_id: driver.id,
    identity_id: match.identity_id, confidence: match.confidence, match_type: 'identity_trusted',
  };
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    // ── AUTHORIZATION GATE (before any service-role access) ──
    let user;
    try {
      user = await base44.auth.me();
    } catch {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const sr = base44.asServiceRole;
    const actor = { id: user.id, full_name: user.full_name };

    const entityId = body?.event?.entity_id || body?.data?.id || body?.result_id;

    if (entityId && !body?.batch) {
      const results = await sr.entities.Results.filter({ id: entityId }).catch(() => []);
      const result = (results || [])[0];
      if (!result) return Response.json({ ok: false, error: 'Result not found' }, { status: 404 });
      const outcome = await processResult(sr, result, actor);
      return Response.json({ ok: true, ...outcome });
    }

    const limit = body?.limit || 500;
    const allResults = await sr.entities.Results.list('-created_date', limit);
    const unlinked = (allResults || []).filter((r: any) => !r.driver_id && (r.driver_name || r.raw_driver_name));

    const outcomes: any[] = [];
    for (const result of unlinked) {
      outcomes.push(await processResult(sr, result, actor));
    }

    return Response.json({
      ok: true,
      total_checked: (allResults || []).length,
      unlinked_processed: unlinked.length,
      matched: outcomes.filter((o) => o.action === 'MATCHED').length,
      review_required: outcomes.filter((o) => o.action === 'REVIEW_REQUIRED').length,
      no_match: outcomes.filter((o) => o.action === 'NO_MATCH').length,
      blocked: outcomes.filter((o) => o.action === 'BLOCKED').length,
      outcomes,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}