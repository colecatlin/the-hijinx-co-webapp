import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * acknowledgeDeliverableRequirement
 * Creates or updates a DeliverableAgreement for a given requirement + request.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { request_id, requirement_id, holder_media_user_id } = await req.json();
    if (!request_id || !requirement_id || !holder_media_user_id) {
      return Response.json({ error: 'request_id, requirement_id, holder_media_user_id required' }, { status: 400 });
    }

    // Validate requirement is active
    const requirement = await base44.entities.DeliverableRequirement.get(requirement_id);
    if (!requirement || !requirement.active) {
      return Response.json({ error: 'Requirement not found or inactive' }, { status: 404 });
    }

    const now = new Date().toISOString();

    // Check for existing agreement for this request + requirement
    const existing = await base44.entities.DeliverableAgreement.filter({
      request_id,
      requirement_id,
      holder_media_user_id,
    });

    let agreement;
    if (existing.length > 0) {
      agreement = await base44.entities.DeliverableAgreement.update(existing[0].id, {
        status: 'accepted',
        accepted_at: now,
      });
    } else {
      agreement = await base44.entities.DeliverableAgreement.create({
        requirement_id,
        holder_media_user_id,
        request_id,
        status: 'accepted',
        accepted_at: now,
        created_at: now,
      });
    }

    return Response.json({ agreement });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});