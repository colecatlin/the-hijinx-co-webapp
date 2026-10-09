/**
 * resolveRaceCoreId — shared exact-one resolver HTTP endpoint.
 *
 * Input:  { racecore_id: "TRCK000000001", expected_family?: "Track" }
 * Output: ResolutionResult (outcome, base44_id, entity, entity_lifecycle, etc.)
 *
 * Outcomes: RESOLVED, INVALID_FORMAT, UNSUPPORTED_FAMILY, WRONG_FAMILY,
 *           NOT_FOUND, DUPLICATE_ID, RETIRED_ID
 *
 * Never falls back to name matching once the input is recognized as a RaceCore ID.
 * Admin only — this is a backend diagnostic and resolution tool.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { resolveRaceCoreId } from '../../shared/racecoreRegistry.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const racecoreId = String(body.racecore_id || '').trim();
    const expectedFamily = body.expected_family ? String(body.expected_family).trim() : undefined;

    if (!racecoreId) {
      return Response.json({ error: 'racecore_id is required' }, { status: 400 });
    }

    const result = await resolveRaceCoreId(base44.asServiceRole, racecoreId, expectedFamily);

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}