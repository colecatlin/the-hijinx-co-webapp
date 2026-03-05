import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { entity_id, holder_media_user_id, event_id, request_id } = await req.json();
    if (!entity_id || !holder_media_user_id) {
      return Response.json({ error: 'entity_id and holder_media_user_id are required' }, { status: 400 });
    }

    const filter = { entity_id, holder_media_user_id };
    if (event_id) filter.event_id = event_id;
    if (request_id) filter.request_id = request_id;

    const list = await base44.asServiceRole.entities.UsageRightsAgreement.filter(filter);
    if (!list.length) return Response.json({ status: 'none', agreement: null });

    const agreement = list[0];
    const now = new Date();

    // Check deadline expiry
    if (agreement.status !== 'fully_executed' && agreement.status !== 'expired') {
      const mediaExpired = agreement.media_deadline && !agreement.media_signed_at && new Date(agreement.media_deadline) < now;
      const entityExpired = agreement.entity_deadline && !agreement.entity_signed_at && new Date(agreement.entity_deadline) < now;
      if (mediaExpired || entityExpired) {
        const updated = await base44.asServiceRole.entities.UsageRightsAgreement.update(agreement.id, {
          status: 'expired',
          updated_at: now.toISOString(),
        });
        return Response.json({ status: 'expired', agreement: updated });
      }
    }

    return Response.json({ status: agreement.status, agreement });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});