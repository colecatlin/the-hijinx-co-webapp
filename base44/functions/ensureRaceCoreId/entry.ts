/**
 * ensureRaceCoreId — HTTP handler.
 *
 * Assigns a RaceCore ID to an existing record using registry-backed issuance.
 * Checks family health, reserves a sequence in the permanent issuance ledger,
 * then attaches it to the source entity. Fail-closed on any conflict.
 *
 * Input:  { entity_type: "PersonIdentity", entity_id: "internal-id" }
 * Output: IssuanceResult (success, racecore_id, generated, error, blocked, etc.)
 *
 * Supported entity types: PersonIdentity, RacerProfile, SeasonParticipation,
 * Driver, Entry, Results, Standings, Track.
 *
 * Admin only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { ensureRaceCoreId as doEnsure } from '../../shared/racecoreRegistry.ts';

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
      const status = result.blocked ? 423 : 400; // 423 Locked for blocked families
      return Response.json(result, { status });
    }

    return Response.json(result);
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}