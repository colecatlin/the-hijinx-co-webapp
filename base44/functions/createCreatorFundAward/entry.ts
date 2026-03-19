import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const VALID_REASONS = [
  'high_performing_story',
  'exceptional_event_coverage',
  'editorial_excellence',
  'community_contribution',
  'milestone_achievement',
  'admin_discretionary'
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });

    const { profileId, amountCents, reason, currency = 'usd', notes } = await req.json();
    if (!profileId || !amountCents || !reason) {
      return Response.json({ error: 'profileId, amountCents, and reason required' }, { status: 400 });
    }

    // Verify profile exists and is creator_fund_eligible
    const profiles = await base44.asServiceRole.entities.MediaProfile.filter({ id: profileId });
    if (!profiles || profiles.length === 0) return Response.json({ error: 'MediaProfile not found' }, { status: 404 });
    const profile = profiles[0];

    if (!profile.creator_fund_eligible) {
      return Response.json({ error: 'Creator is not marked creator_fund_eligible' }, { status: 403 });
    }

    // Get or verify payment account
    const paymentAccounts = await base44.asServiceRole.entities.PaymentAccount.filter({
      owner_type: 'media_profile',
      owner_id: profileId
    });
    const paymentAccount = paymentAccounts && paymentAccounts.length > 0 ? paymentAccounts[0] : null;

    // Create RevenueEvent
    const revenueEvent = await base44.asServiceRole.entities.RevenueEvent.create({
      revenue_type: 'creator_fund_award',
      gross_amount: amountCents,
      platform_amount: 0,
      creator_amount: amountCents,
      outlet_amount: 0,
      currency,
      status: 'payout_pending',
      payment_provider: 'stripe',
      occurred_at: new Date().toISOString(),
      notes: `Reason: ${reason}. ${notes || ''}`
    });

    // Create PayoutRecord
    const payoutRecord = await base44.asServiceRole.entities.PayoutRecord.create({
      payout_recipient_type: 'media_profile',
      payout_recipient_id: profileId,
      linked_revenue_event_id: revenueEvent.id,
      linked_payment_account_id: paymentAccount?.id || null,
      amount: amountCents,
      currency,
      status: 'pending',
      notes: `Creator Fund Award — ${reason}`
    });

    // Log
    await base44.asServiceRole.entities.OperationLog.create({
      entity_type: 'MediaProfile',
      entity_id: profileId,
      action: 'creator_fund_awarded',
      metadata: JSON.stringify({
        media_profile_id: profileId,
        revenue_event_id: revenueEvent.id,
        payout_record_id: payoutRecord.id,
        payment_account_id: paymentAccount?.id,
        amount: amountCents,
        currency,
        reason,
        acted_by_user_id: user.id
      }),
      created_at: new Date().toISOString()
    });

    return Response.json({ revenueEvent, payoutRecord });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});