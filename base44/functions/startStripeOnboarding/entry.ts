import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import Stripe from 'npm:stripe@14.25.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { ownerType, ownerId, returnUrl, refreshUrl } = await req.json();
    if (!ownerType || !ownerId) return Response.json({ error: 'ownerType and ownerId required' }, { status: 400 });

    // Authorization: verify the caller owns/manages the target owner record
    // before touching its PaymentAccount. Admins bypass.
    if (user.role !== 'admin') {
      let authorized = false;
      if (ownerType === 'MediaProfile') {
        const profile = await base44.asServiceRole.entities.MediaProfile.get(ownerId).catch(() => null);
        authorized = !!profile && profile.user_id === user.id;
      } else if (ownerType === 'MediaOutlet') {
        const outlet = await base44.asServiceRole.entities.MediaOutlet.get(ownerId).catch(() => null);
        authorized = !!outlet && (
          outlet.primary_contact_user_id === user.id ||
          Array.isArray(outlet.contributor_user_ids) && outlet.contributor_user_ids.includes(user.id)
        );
      }
      if (!authorized) return Response.json({ error: 'Forbidden: not authorized for this account' }, { status: 403 });
    }

    // Get payment account
    const existing = await base44.asServiceRole.entities.PaymentAccount.filter({ owner_type: ownerType, owner_id: ownerId });
    if (!existing || existing.length === 0) {
      return Response.json({ error: 'No PaymentAccount found. Call createOrGetStripeConnectedAccount first.' }, { status: 404 });
    }
    const paymentAccount = existing[0];

    if (!paymentAccount.stripe_connected_account_id) {
      return Response.json({ error: 'No Stripe connected account ID. Call createOrGetStripeConnectedAccount first.' }, { status: 400 });
    }

    // Create Stripe account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: paymentAccount.stripe_connected_account_id,
      refresh_url: refreshUrl || 'https://hijinx.app/MediaPortal',
      return_url: returnUrl || 'https://hijinx.app/MediaPortal',
      type: 'account_onboarding'
    });

    // Update status
    await base44.asServiceRole.entities.PaymentAccount.update(paymentAccount.id, {
      account_status: 'onboarding_started'
    });

    // Log
    await base44.asServiceRole.entities.OperationLog.create({
      entity_type: 'PaymentAccount',
      entity_id: paymentAccount.id,
      action: 'stripe_onboarding_started',
      metadata: JSON.stringify({
        payment_account_id: paymentAccount.id,
        stripe_connected_account_id: paymentAccount.stripe_connected_account_id,
        owner_type: ownerType,
        owner_id: ownerId,
        acted_by_user_id: user.id
      }),
      created_at: new Date().toISOString()
    });

    return Response.json({ onboarding_url: accountLink.url, expires_at: accountLink.expires_at });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});