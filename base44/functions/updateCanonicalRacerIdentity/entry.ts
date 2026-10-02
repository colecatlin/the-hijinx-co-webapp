/**
 * updateCanonicalRacerIdentity — admin governance for canonical name, hometown
 * and public slug.
 *
 * Name and hometown are owned by the PersonIdentity; the RacerProfile and the
 * legacy Driver compatibility copies are updated in the same audited operation,
 * so three independently editable values cannot drift apart. A name or hometown
 * change never touches the slug, and a slug change retains the previous address
 * as an alias so it keeps resolving.
 *
 * Input:
 *   { action: 'name',     person_identity_id | racer_profile_id, canonical_name }
 *   { action: 'hometown', person_identity_id | racer_profile_id, hometown_city, hometown_state, hometown_country }
 *   { action: 'slug',     racer_profile_id, new_slug }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  updateCanonicalRacerName,
  updateCanonicalRacerHometown,
  changeRacerSlug,
} from '../../shared/canonicalRacerService.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const actor = { id: user.id, full_name: user.full_name };

    if (body.action === 'hometown') {
      return Response.json(await updateCanonicalRacerHometown(base44, body, actor));
    }
    if (body.action === 'slug') {
      return Response.json(await changeRacerSlug(base44, body, actor));
    }
    return Response.json(await updateCanonicalRacerName(base44, body, actor));
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}