import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { entity_id, holder_media_user_id, event_id, request_id, rights_text, entity_deadline, media_deadline } = await req.json();

    if (!entity_id || !holder_media_user_id || !rights_text) {
      return Response.json({ error: 'entity_id, holder_media_user_id, and rights_text are required' }, { status: 400 });
    }

    const now = new Date().toISOString();

    // Find existing active agreement for this combo
    const existingList = await base44.asServiceRole.entities.UsageRightsAgreement.filter({
      entity_id,
      holder_media_user_id,
      ...(event_id ? { event_id } : {}),
    });

    const existing = existingList[0] || null;

    if (existing?.status === 'fully_executed') {
      return Response.json({ agreement: existing });
    }

    let agreement;
    if (existing) {
      agreement = await base44.asServiceRole.entities.UsageRightsAgreement.update(existing.id, {
        rights_text,
        entity_deadline: entity_deadline || null,
        media_deadline: media_deadline || null,
        status: 'proposed',
        updated_at: now,
      });
    } else {
      agreement = await base44.asServiceRole.entities.UsageRightsAgreement.create({
        entity_id,
        holder_media_user_id,
        event_id: event_id || null,
        request_id: request_id || null,
        rights_text,
        entity_deadline: entity_deadline || null,
        media_deadline: media_deadline || null,
        status: 'proposed',
        created_at: now,
        updated_at: now,
      });
    }

    return Response.json({ agreement });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});