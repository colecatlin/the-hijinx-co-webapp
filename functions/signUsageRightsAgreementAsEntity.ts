import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { agreement_id, signing_user_id } = await req.json();
    if (!agreement_id || !signing_user_id) {
      return Response.json({ error: 'agreement_id and signing_user_id are required' }, { status: 400 });
    }

    const agreements = await base44.asServiceRole.entities.UsageRightsAgreement.filter({ id: agreement_id });
    const agreement = agreements[0];
    if (!agreement) return Response.json({ error: 'Agreement not found' }, { status: 404 });

    // Check authority: admin or EntityCollaborator on this entity
    if (user.role !== 'admin') {
      const collaborators = await base44.asServiceRole.entities.EntityCollaborator.filter({
        entity_id: agreement.entity_id,
        user_id: signing_user_id,
      });
      if (!collaborators.length) {
        return Response.json({ error: 'Forbidden: no authority on this entity' }, { status: 403 });
      }
    }

    if (agreement.status === 'expired') {
      return Response.json({ error: 'Agreement has expired' }, { status: 400 });
    }

    const now = new Date();
    if (agreement.entity_deadline && new Date(agreement.entity_deadline) < now && !agreement.entity_signed_at) {
      await base44.asServiceRole.entities.UsageRightsAgreement.update(agreement.id, { status: 'expired', updated_at: now.toISOString() });
      return Response.json({ error: 'Agreement has expired (entity deadline passed)' }, { status: 400 });
    }

    const newStatus = agreement.media_signed_at ? 'fully_executed' : 'accepted_by_entity';
    const updated = await base44.asServiceRole.entities.UsageRightsAgreement.update(agreement.id, {
      entity_signed_at: now.toISOString(),
      status: newStatus,
      updated_at: now.toISOString(),
    });

    return Response.json({ agreement: updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});