import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import Stripe from 'npm:stripe@14.25.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { ownerType, ownerId } = await req.json();
    if (!ownerType || !ownerId) return Response.json({ error: 'ownerType and ownerId required' }, { status: 400 });

    const existing = await base44.asServiceRole.entities.PaymentAccount.filter({ owner_type: ownerType, owner_id: ownerId });
    if (!existing || existing.length === 0) {
      return Response.json({ error: 'No PaymentAccount found' }, { status: 404 });
    }
    let paymentAccount = existing[0];

    if (!paymentAccount.stripe_connected_account_id) {
      return Response.json({ paymentAccount, synced: false, reason: 'No Stripe account ID yet' });
    }

    const stripeAccount = await stripe.accounts.retrieve(paymentAccount.stripe_connected_account_id);

    let account_status = 'onboarding_started';
    if (stripeAccount.payouts_enabled && stripeAccount.charges_enabled) {
      account_status = 'active';
    } else if (stripeAccount.requirements?.disabled_reason) {
      account_status = 'restricted';
    } else if (stripeAccount.details_submitted) {
      account_status = 'pending_verification';
    }

    const prevStatus = paymentAccount.account_status;
    const updateData = {
      account_status,
      payouts_enabled: stripeAccount.payouts_enabled || false,
      charges_enabled: stripeAccount.charges_enabled || false,
      last_sync_at: new Date().toISOString()
    };

    if (account_status === 'active' && !paymentAccount.onboarding_completed_at) {
      updateData.onboarding_completed_at = new Date().toISOString();
    }

    paymentAccount = await base44.asServiceRole.entities.PaymentAccount.update(paymentAccount.id, updateData);

    // If payout_profile_ready changed, update MediaProfile
    if (ownerType === 'media_profile' && account_status === 'active') {
      await base44.asServiceRole.entities.MediaProfile.update(ownerId, { payout_profile_ready: true });
    }

    // Log
    await base44.asServiceRole.entities.OperationLog.create({
      entity_type: 'PaymentAccount',
      entity_id: paymentAccount.id,
      action: 'stripe_account_synced',
      metadata: JSON.stringify({
        payment_account_id: paymentAccount.id,
        stripe_connected_account_id: paymentAccount.stripe_connected_account_id,
        previous_status: prevStatus,
        new_status: account_status,
        owner_type: ownerType,
        owner_id: ownerId,
        acted_by_user_id: user.id
      }),
      created_at: new Date().toISOString()
    });

    return Response.json({ paymentAccount, synced: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});