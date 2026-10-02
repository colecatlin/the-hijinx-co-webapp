/**
 * repairRacerIdentityRelationships — admin-only relationship repair.
 *
 * Dry-run by default: without an explicit `dry_run: false` this reports every
 * intended change and writes nothing. Idempotent, validates each target before
 * writing, logs applied changes, never deletes, never guesses.
 *
 * Input:  { dry_run?: boolean (default true), limit?: number }
 * Output: repair report — actions with per-record outcomes
 *   REPAIRED · ALREADY_VALID · REVIEW_REQUIRED · MISSING_RACER_PROFILE ·
 *   AMBIGUOUS_RACER_PROFILE · MISSING_CANONICAL_DRIVER · MISSING_PERSON_IDENTITY
 *   · SKIPPED · ERROR
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { repairRacerIdentityRelationships } from '../../shared/racerIdentityRepair.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dry_run !== false;

    const report = await repairRacerIdentityRelationships(base44.asServiceRole, {
      dry_run: dryRun,
      limit: body.limit,
      audit_user_id: user.id,
      audit_user_name: user.full_name,
    });

    return Response.json(report);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}