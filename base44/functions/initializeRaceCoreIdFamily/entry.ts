/**
 * initializeRaceCoreIdFamily — admin-only, family-scoped initialization.
 *
 * Runs the explicit per-family backfill operation:
 *   1. Read-only preflight (identify conflicts)
 *   2. If clean, bulk-migrate valid existing IDs into the permanent ledger
 *   3. Reconcile counter (never lower)
 *   4. Post-backfill verification
 *   5. Mark family HEALTHY only if all checks pass; otherwise BLOCKED
 *
 * Idempotent: running again for a HEALTHY family re-verifies without duplicating.
 * Never modifies or reassigns existing source RaceCore IDs.
 * Conflicting or ambiguous IDs are excluded from automatic migration and keep
 * the entire family blocked until resolved manually.
 *
 * Input:  { prefix: "TRCK" }
 * Output:  BackfillResult (preflight, migrated_count, family_status, etc.)
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { initializeFamily, isSupportedPrefix } from '../../shared/racecoreRegistry.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const prefix = String(body.prefix || '').toUpperCase();

    if (!isSupportedPrefix(prefix)) {
      return Response.json({
        success: false,
        error: 'Unsupported prefix: ' + prefix + '. Supported: PERS, RACR, PART, DRVR, ENTR, RSLT, STND, TRCK.',
      }, { status: 400 });
    }

    const result = await initializeFamily(base44, prefix, user.email || user.id || 'admin');

    return Response.json({
      success: result.family_status === 'HEALTHY',
      ...result,
    });
  } catch (error) {
    return Response.json({ success: false, error: error.message, stack: error.stack }, { status: 500 });
  }
}