/**
 * ensureRaceCoreId — HTTP handler.
 *
 * Assigns a RaceCore ID to an existing record only when racecore_id is empty.
 * If the record already has a racecore_id, returns it without generating a new one.
 *
 * Input:  { entity_type: "PersonIdentity", entity_id: "internal-id" }
 * Output: { success, entity_type, entity_id, racecore_id, generated }
 *
 * Phase 2 supported entity types: PersonIdentity, RacerProfile, SeasonParticipation
 *
 * Admin only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { ensureRaceCoreId as doEnsure } from '../../shared/racecoreId.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));

    if (!body.entity_type) {
      return Response.json({ success: false, error: 'entity_type is required' }, { status: 400 });
    }
    if (!body.entity_id) {
      return Response.json({ success: false, error: 'entity_id is required' }, { status: 400 });
    }

    const result = await doEnsure(base44, body.entity_type, body.entity_id);

    if (!result.success) {
      return Response.json(result, { status: 400 });
    }

    return Response.json(result);
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}