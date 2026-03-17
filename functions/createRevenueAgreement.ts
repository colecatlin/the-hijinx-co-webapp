import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });

    const body = await req.json();
    const {
      agreement_type, creator_profile_id, media_outlet_id,
      platform_share_percent, creator_share_percent, outlet_share_percent,
      flat_fee_amount, currency = 'usd',
      linked_asset_id, linked_assignment_id, linked_story_id,
      linked_outlet_id, linked_profile_id, linked_request_id,
      effective_start_date, effective_end_date, notes
    } = body;

    if (!agreement_type) return Response.json({ error: 'agreement_type required' }, { status: 400 });

    // Validate percentages (unless flat fee)
    if (!flat_fee_amount) {
      const total = (platform_share_percent || 0) + (creator_share_percent || 0) + (outlet_share_percent || 0);
      if (Math.abs(total - 100) > 0.01) {
        return Response.json({ error: `Revenue split percentages must sum to 100. Got: ${total}` }, { status: 400 });
      }
    }

    const agreement = await base44.asServiceRole.entities.RevenueAgreement.create({
      agreement_type,
      creator_profile_id,
      media_outlet_id,
      platform_share_percent: platform_share_percent || 0,
      creator_share_percent: creator_share_percent || 100,
      outlet_share_percent: outlet_share_percent || 0,
      flat_fee_amount,
      currency,
      linked_asset_id,
      linked_assignment_id,
      linked_story_id,
      linked_outlet_id,
      linked_profile_id,
      linked_request_id,
      effective_start_date,
      effective_end_date,
      notes,
      status: 'active'
    });

    await base44.asServiceRole.entities.OperationLog.create({
      entity_type: 'RevenueAgreement',
      entity_id: agreement.id,
      action: 'revenue_agreement_created',
      metadata: JSON.stringify({
        revenue_agreement_id: agreement.id,
        agreement_type,
        creator_profile_id,
        media_outlet_id,
        acted_by_user_id: user.id
      }),
      created_at: new Date().toISOString()
    });

    return Response.json({ agreement });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});