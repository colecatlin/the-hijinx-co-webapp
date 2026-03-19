import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { asset_id, target_type, target_entity_id, scheduled_at, admin_override, override_reason } = await req.json();
    if (!asset_id || !target_type) {
      return Response.json({ error: 'asset_id and target_type are required' }, { status: 400 });
    }

    // Check gate unless admin override
    let gateResult = { allow: true, reason: 'skipped' };
    if (!admin_override) {
      const gateRes = await base44.functions.invoke('canPublishAsset', { asset_id, target_type, target_entity_id });
      gateResult = gateRes?.data || { allow: false, reason: 'gate_check_failed' };
    } else {
      // Admin override requires admin role
      if (user.role !== 'admin') {
        return Response.json({ error: 'Forbidden: only admins can override publish gate' }, { status: 403 });
      }
    }

    if (!gateResult.allow) {
      return Response.json({
        error: 'Publish blocked',
        reason: gateResult.reason,
        agreement_id: gateResult.agreement_id,
        review_id: gateResult.review_id,
        review_status: gateResult.review_status,
      }, { status: 422 });
    }

    const now = new Date().toISOString();
    const isScheduled = !!scheduled_at;

    const metadata = admin_override ? {
      override: true,
      override_by: user.id,
      override_reason: override_reason || 'admin_override',
    } : undefined;

    const publishTarget = await base44.asServiceRole.entities.PublishTarget.create({
      asset_id,
      target_type,
      target_entity_id: target_entity_id || null,
      status: isScheduled ? 'scheduled' : 'published',
      scheduled_at: isScheduled ? scheduled_at : null,
      published_at: isScheduled ? null : now,
      override_allowed: !!admin_override,
      override_by_user_id: admin_override ? user.id : null,
      override_reason: admin_override ? (override_reason || 'admin_override') : null,
      created_at: now,
      updated_at: now,
      ...(metadata ? { metadata_json: metadata } : {}),
    });

    return Response.json({ publish_target: publishTarget });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});