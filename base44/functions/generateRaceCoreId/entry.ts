/**
 * generateRaceCoreId — HTTP handler.
 *
 * Generates a permanent RaceCore ID for the given prefix.
 *
 * Input:  { prefix: "PERS" }
 * Output: { success, prefix, sequence_number, racecore_id }
 *
 * Phase 2 supported prefixes: PERS, RACR, PART
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

    const body = await req.json().catch(() => ({}));

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