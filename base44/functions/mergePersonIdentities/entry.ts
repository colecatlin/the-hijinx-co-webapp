/**
 * mergePersonIdentities.js — R9EA Phase 3
 *
 * Executes a reversible PersonIdentity merge.
 * Transfers all aliases, evidence, and driver associations from the
 * merged identity into the survivor, marks the merged identity as
 * status=merged, and writes a full IdentityMergeLedger entry.
 *
 * Input:
 *   survivor_identity_id  — the identity that absorbs the other
 *   merged_identity_id    — the identity to be absorbed
 *   reason                — required human-readable reason
 *   review_queue_id       — optional IdentityReviewQueue.id authorizing this merge
 *
 * Output:
 *   { ok, ledger_id, aliases_transferred, evidence_transferred, audit_log_id }
 *
 * Admin only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function generateMergeId() {
  return `merge-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { survivor_identity_id, merged_identity_id, reason, review_queue_id } = body;

    if (!survivor_identity_id || !merged_identity_id) {
      return Response.json({ error: 'survivor_identity_id and merged_identity_id are required' }, { status: 400 });
    }
    if (!reason) {
      return Response.json({ error: 'reason is required' }, { status: 400 });
    }
    if (survivor_identity_id === merged_identity_id) {
      return Response.json({ error: 'survivor and merged must be different identities' }, { status: 400 });
    }

    const sr = base44.asServiceRole;
    const now = new Date().toISOString();

    // ── Load both identities ─────────────────────────────────────────────────
    const [survivorList, mergedList] = await Promise.all([
      sr.entities.PersonIdentity.filter({ id: survivor_identity_id }).catch(() => []),
      sr.entities.PersonIdentity.filter({ id: merged_identity_id }).catch(() => []),
    ]);

    const survivor = survivorList?.[0];
    const merged = mergedList?.[0];

    if (!survivor) return Response.json({ error: `Survivor identity not found: ${survivor_identity_id}` }, { status: 404 });
    if (!merged) return Response.json({ error: `Merged identity not found: ${merged_identity_id}` }, { status: 404 });
    if (merged.status === 'merged') {
      return Response.json({ error: 'Merged identity is already in merged status' }, { status: 409 });
    }

    // ── Snapshot before state ────────────────────────────────────────────────
    const beforeSurvivorState = { ...survivor };
    const beforeMergedState = { ...merged };

    // ── Transfer IdentityAlias records ────────────────────────────────────────
    const mergedAliases = await sr.entities.IdentityAlias.filter({ identity_id: merged_identity_id }).catch(() => []);
    const aliasesTransferred = [];

    for (const alias of mergedAliases) {
      // Check if survivor already has this normalized alias
      const existing = await sr.entities.IdentityAlias.filter({
        identity_id: survivor_identity_id,
        alias_normalized: alias.alias_normalized,
      }).catch(() => []);

      if (existing.length === 0) {
        await sr.entities.IdentityAlias.update(alias.id, {
          identity_id: survivor_identity_id,
          notes: `${alias.notes || ''} [transferred from merged identity ${merged_identity_id}]`.trim(),
        }).catch(() => {});
        aliasesTransferred.push(alias.id);
      } else {
        // Deactivate the duplicate alias on the merged side
        await sr.entities.IdentityAlias.update(alias.id, { active: false }).catch(() => {});
      }
    }

    // ── Transfer IdentityEvidence records ─────────────────────────────────────
    const mergedEvidence = await sr.entities.IdentityEvidence.filter({ identity_id: merged_identity_id }).catch(() => []);
    const evidenceTransferred = [];

    for (const ev of mergedEvidence) {
      await sr.entities.IdentityEvidence.update(ev.id, {
        identity_id: survivor_identity_id,
        status: ev.status === 'unresolved' ? 'attached' : ev.status,
      }).catch(() => {});
      evidenceTransferred.push(ev.id);
    }

    // ── Handle canonical_driver_id transfer ──────────────────────────────────
    const survivorMergedDriverIds = Array.isArray(survivor.merged_driver_ids) ? [...survivor.merged_driver_ids] : [];

    // Add merged identity's canonical_driver_id to survivor's merged_driver_ids list
    if (merged.canonical_driver_id && !survivorMergedDriverIds.includes(merged.canonical_driver_id)) {
      survivorMergedDriverIds.push(merged.canonical_driver_id);
    }
    // Also absorb any driver IDs from the merged identity's merged_driver_ids
    if (Array.isArray(merged.merged_driver_ids)) {
      for (const dId of merged.merged_driver_ids) {
        if (dId && !survivorMergedDriverIds.includes(dId)) {
          survivorMergedDriverIds.push(dId);
        }
      }
    }

    // ── Update survivor identity ─────────────────────────────────────────────
    const survivorUpdate = {
      merged_driver_ids: survivorMergedDriverIds,
      // Upgrade confidence if merged had higher score
      confidence_score: Math.max(survivor.confidence_score || 0, merged.confidence_score || 0),
    };
    // Inherit date_of_birth from merged if survivor lacks it
    if (!survivor.date_of_birth && merged.date_of_birth) {
      survivorUpdate.date_of_birth = merged.date_of_birth;
    }
    // Inherit license_number if missing
    if (!survivor.license_number && merged.license_number) {
      survivorUpdate.license_number = merged.license_number;
    }

    await sr.entities.PersonIdentity.update(survivor_identity_id, survivorUpdate).catch(() => {});

    // ── Mark merged identity as merged ───────────────────────────────────────
    await sr.entities.PersonIdentity.update(merged_identity_id, {
      status: 'merged',
      notes: `${merged.notes || ''} [Merged into ${survivor_identity_id} (${survivor.canonical_name}) on ${now} — ${reason}]`.trim(),
    }).catch(() => {});

    // ── Create IdentityMergeLedger ────────────────────────────────────────────
    const mergeId = generateMergeId();
    const ledger = await sr.entities.IdentityMergeLedger.create({
      merge_id: mergeId,
      status: 'applied',
      survivor_identity_id,
      survivor_name: survivor.canonical_name,
      merged_identity_id,
      merged_name: merged.canonical_name,
      before_survivor_state: beforeSurvivorState,
      before_merged_state: beforeMergedState,
      after_survivor_state: { ...survivor, ...survivorUpdate, merged_driver_ids: survivorMergedDriverIds },
      references_repaired: { IdentityAlias: aliasesTransferred.length, IdentityEvidence: evidenceTransferred.length },
      aliases_transferred: aliasesTransferred,
      evidence_transferred: evidenceTransferred,
      driver_records_absorbed: merged.canonical_driver_id ? [merged.canonical_driver_id] : [],
      performed_by: user.id,
      performed_by_name: user.full_name || user.email,
      performed_at: now,
      reason,
      review_queue_id: review_queue_id || null,
    }).catch(e => ({ id: null, _error: e.message }));

    // Update merge_ledger_ids on survivor
    const survivorLedgerIds = Array.isArray(survivor.merge_ledger_ids) ? [...survivor.merge_ledger_ids] : [];
    if (ledger.id) survivorLedgerIds.push(ledger.id);
    await sr.entities.PersonIdentity.update(survivor_identity_id, { merge_ledger_ids: survivorLedgerIds }).catch(() => {});

    // Update review queue if referenced
    if (review_queue_id) {
      await sr.entities.IdentityReviewQueue.update(review_queue_id, {
        status: 'approved',
        resolution: 'merge_candidates',
        reviewed_by: user.id,
        reviewed_at: now,
      }).catch(() => {});
    }

    // ── AuditLog ─────────────────────────────────────────────────────────────
    const auditLog = await sr.entities.AuditLog.create({
      entity_type: 'PersonIdentity',
      entity_id: survivor_identity_id,
      entity_name: survivor.canonical_name,
      action: 'updated',
      before_data: {
        survivor: { id: survivor_identity_id, name: survivor.canonical_name, merged_driver_ids: survivor.merged_driver_ids },
        merged: { id: merged_identity_id, name: merged.canonical_name, status: merged.status },
      },
      after_data: {
        survivor: { id: survivor_identity_id, merged_driver_ids: survivorMergedDriverIds, aliases_absorbed: aliasesTransferred.length, evidence_absorbed: evidenceTransferred.length },
        merged: { id: merged_identity_id, status: 'merged' },
        ledger_id: ledger.id,
      },
      performed_by: user.id,
      performed_by_name: user.full_name || user.email,
      timestamp: now,
      notes: `PersonIdentity merge: absorbed "${merged.canonical_name}" into "${survivor.canonical_name}" — ${reason}`,
    }).catch(e => ({ id: null, _error: e.message }));

    // ── OperationLog ──────────────────────────────────────────────────────────
    await sr.entities.OperationLog.create({
      operation_type: 'identity_merge_executed',
      entity_name: 'PersonIdentity',
      status: 'success',
      metadata: {
        survivor_identity_id,
        merged_identity_id,
        ledger_id: ledger.id,
        aliases_transferred: aliasesTransferred.length,
        evidence_transferred: evidenceTransferred.length,
        reason,
      },
    }).catch(() => {});

    return Response.json({
      ok: true,
      ledger_id: ledger.id,
      merge_id: mergeId,
      survivor_identity_id,
      merged_identity_id,
      aliases_transferred: aliasesTransferred.length,
      evidence_transferred: evidenceTransferred.length,
      audit_log_id: auditLog.id || null,
    });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});