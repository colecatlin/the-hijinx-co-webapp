import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { agreement_id, holder_media_user_id } = await req.json();
    if (!agreement_id || !holder_media_user_id) {
      return Response.json({ error: 'agreement_id and holder_media_user_id are required' }, { status: 400 });
    }

    const agreements = await base44.asServiceRole.entities.UsageRightsAgreement.filter({ id: agreement_id });
    const agreement = agreements[0];
    if (!agreement) return Response.json({ error: 'Agreement not found' }, { status: 404 });

    if (agreement.holder_media_user_id !== holder_media_user_id) {
      return Response.json({ error: 'Forbidden: holder_media_user_id mismatch' }, { status: 403 });
    }

    // Verify the authenticated caller actually owns this MediaUser record.
    // Comparing the agreement's holder_media_user_id to a client-supplied
    // value is not enough — an attacker could pass the victim's
    // holder_media_user_id. Admin bypasses; otherwise the MediaUser record
    // must be linked to the authenticated caller.
    if (user.role !== 'admin') {
      const mediaUsers = await base44.asServiceRole.entities.MediaUser.filter({ id: holder_media_user_id });
      const mediaUser = mediaUsers?.[0];
      if (!mediaUser || mediaUser.user_id !== user.id) {
        return Response.json({ error: 'Forbidden: you do not own this media user record' }, { status: 403 });
      }
    }

    if (agreement.status === 'expired') {
      return Response.json({ error: 'Agreement has expired' }, { status: 400 });
    }

    // Check media deadline expiry
    const now = new Date();
    if (agreement.media_deadline && new Date(agreement.media_deadline) < now && !agreement.media_signed_at) {
      await base44.asServiceRole.entities.UsageRightsAgreement.update(agreement.id, { status: 'expired', updated_at: now.toISOString() });
      return Response.json({ error: 'Agreement has expired (media deadline passed)' }, { status: 400 });
    }

    const newStatus = agreement.entity_signed_at ? 'fully_executed' : 'accepted_by_media';
    const updated = await base44.asServiceRole.entities.UsageRightsAgreement.update(agreement.id, {
      media_signed_at: now.toISOString(),
      status: newStatus,
      updated_at: now.toISOString(),
    });

    return Response.json({ agreement: updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});