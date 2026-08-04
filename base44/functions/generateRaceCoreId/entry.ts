/**
 * generateRaceCoreId — HTTP handler (RESTRICTED).
 *
 * Standalone RaceCore ID generation is restricted in Phase 2B.
 * Normal application code must use ensureRaceCoreId to assign IDs
 * to specific records.
 *
 * This handler rejects all calls by default. To generate a
 * reservation-only ID for controlled testing, both parameters
 * must be explicitly provided:
 *
 *   {
 *     "prefix": "RACR",
 *     "reservation_only": true,
 *     "acknowledge_burned_id": true
 *   }
 *
 * reservation_only: true acknowledges that the generated ID may
 * be permanently burned if not assigned to a record.
 *
 * acknowledge_burned_id: true acknowledges that the caller
 * understands the ID will never be reused if unassigned.
 *
 * The handler must reject reservation-only calls by default
 * (when these parameters are absent or false).
 *
 * Admin only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { generateRaceCoreId as doGenerate } from '../../shared/racecoreId.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });

    const body = await req.json().catch(function() { return {}; });

    // ── Restrict standalone generation ───────────────────────────────────
    if (!body.reservation_only || !body.acknowledge_burned_id) {
      return Response.json({
        success: false,
        error: 'Standalone RaceCore ID generation is restricted. Use ensureRaceCoreId to assign IDs to specific records. To generate a reservation-only ID for testing, both reservation_only: true and acknowledge_burned_id: true must be explicitly provided.',
      }, { status: 403 });
    }

    if (!body.prefix) {
      return Response.json({ success: false, error: 'prefix is required' }, { status: 400 });
    }

    const result = await doGenerate(base44, body.prefix);

    if (!result.success) {
      return Response.json(result, { status: 400 });
    }

    return Response.json(result);
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}