/**
 * verifyIdentityDriverLinkage.js — R9EA Phase 8
 *
 * Checks that:
 *   1. Every imported Driver has a corresponding PersonIdentity
 *   2. Every PersonIdentity created during import has canonical_driver_id set
 *   3. Every IdentityEvidence record is attached to an identity or review queue
 *
 * Input:  { sample_size?: number }
 * Output: { issues[], warnings[], pass }
 *
 * Admin only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { sample_size = 200 } = body;

    const sr = base44.asServiceRole;
    const issues = [];
    const warnings = [];

    // ── Check 1: Drivers without PersonIdentity ──────────────────────────────
    const allDrivers = await sr.entities.Driver.list('-created_date', sample_size).catch(() => []);
    const allIdentities = await sr.entities.PersonIdentity.list('-created_date', 500).catch(() => []);

    // Build lookup: canonical_driver_id → identity
    const identityByDriverId = new Map();
    for (const identity of allIdentities) {
      if (identity.canonical_driver_id) identityByDriverId.set(identity.canonical_driver_id, identity);
      if (Array.isArray(identity.merged_driver_ids)) {
        for (const did of identity.merged_driver_ids) {
          if (did) identityByDriverId.set(did, identity);
        }
      }
    }

    for (const driver of allDrivers) {
      if (!identityByDriverId.has(driver.id)) {
        issues.push({
          type: 'driver_without_identity',
          severity: 'error',
          driver_id: driver.id,
          driver_name: `${driver.first_name || ''} ${driver.last_name || ''}`.trim(),
          message: `Driver "${driver.first_name} ${driver.last_name}" (${driver.id}) has no linked PersonIdentity`,
        });
      }
    }

    // ── Check 2: PersonIdentity without canonical_driver_id ──────────────────
    for (const identity of allIdentities) {
      if (identity.status === 'merged') continue; // merged identities don't need canonical_driver_id
      if (!identity.canonical_driver_id) {
        warnings.push({
          type: 'identity_without_driver',
          severity: 'warning',
          identity_id: identity.id,
          identity_name: identity.canonical_name,
          message: `PersonIdentity "${identity.canonical_name}" (${identity.id}) has no canonical_driver_id`,
        });
      }
    }

    // ── Check 3: IdentityEvidence not attached ────────────────────────────────
    const allEvidence = await sr.entities.IdentityEvidence.list('-created_date', sample_size).catch(() => []);
    for (const ev of allEvidence) {
      if (ev.status === 'unresolved' && !ev.review_queue_id) {
        issues.push({
          type: 'evidence_unresolved_no_queue',
          severity: 'error',
          evidence_id: ev.id,
          raw_name: ev.raw_driver_name,
          message: `IdentityEvidence for "${ev.raw_driver_name}" is unresolved but has no review_queue_id — orphaned evidence`,
        });
      }
    }

    return Response.json({
      pass: issues.length === 0,
      issues,
      warnings,
      checks_run: ['driver_identity_linkage', 'identity_canonical_driver', 'evidence_resolution'],
      drivers_checked: allDrivers.length,
      identities_checked: allIdentities.length,
      evidence_checked: allEvidence.length,
    });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});