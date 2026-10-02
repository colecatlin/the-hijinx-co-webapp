/**
 * upsertCanonicalRacer — the canonical racer creation / update endpoint.
 *
 * Admin-authenticated. Every modern racer creation surface calls this (or the
 * shared service behind it): Quick Add, workbook racers tab, identity-first CSV,
 * Smart CSV and legacy admin creation. Creation order and all identifier
 * generation live in base44/shared/canonicalRacerService.ts.
 *
 * Input:  { racer: { ... } }  or the racer fields flat on the body
 * Output: status, canonical ids, RaceCore ids, public slug, warnings,
 *         review_required and review_reasons
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { upsertCanonicalRacer } from '../../shared/canonicalRacerService.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const racer = body && typeof body.racer === 'object' && body.racer !== null ? body.racer : body;

    const result = await upsertCanonicalRacer(base44, racer, { id: user.id, full_name: user.full_name });
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}