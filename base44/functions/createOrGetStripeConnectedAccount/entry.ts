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
    if (!['media_profile', 'media_outlet'].includes(ownerType)) {
      return Response.json({ error: 'Invalid ownerType' }, { status: 400 });
    }

    // Authorization: caller must own/manage the target entity or be a platform admin
    if (user.role !== 'admin') {
      if (ownerType === 'media_profile') {
        const profiles = await base44.asServiceRole.entities.MediaProfile.filter({ id: ownerId }).catch(() => []);
        if (!profiles.length || profiles[0].user_id !== user.id) {
          return Response.json({ error: 'Forbidden: only the profile owner or a platform admin can manage payment accounts' }, { status: 403 });
        }
      } else if (ownerType === 'media_outlet') {
        const outlets = await base44.asServiceRole.entities.MediaOutlet.filter({ id: ownerId }).catch(() => []);
        if (!outlets.length) {
          return Response.json({ error: 'Forbidden: target outlet not found' }, { status: 403 });
        }
        const outlet = outlets[0];
        const isPrimary = outlet.primary_contact_user_id === user.id;
        const isContributor = Array.isArray(outlet.contributor_user_ids) && outlet.contributor_user_ids.includes(user.id);
        if (!isPrimary && !isContributor) {
          return Response.json({ error: 'Forbidden: only an outlet manager or a platform admin can manage payment accounts' }, { status: 403 });
        }
      }
    }

    // Find or create PaymentAccount record
    const existing = await base44.asServiceRole.entities.PaymentAccount.filter({ owner_type: ownerType, owner_id: ownerId });
    let paymentAccount = existing && existing.length > 0 ? existing[0] : null;

    if (!paymentAccount) {
      paymentAccount = await base44.asServiceRole.entities.PaymentAccount.create({
        owner_type: ownerType,
        owner_id: ownerId,
        account_status: 'not_started',
        payouts_enabled: false,
        charges_enabled: false
      });
    }

    // If already has a Stripe account, return it
    if (paymentAccount.stripe_connected_account_id) {
      return Response.json({ paymentAccount, already_existed: true });
    }

    // Determine email for the connected account
    let email = user.email;
    if (ownerType === 'media_outlet') {
      const outlet = await base44.asServiceRole.entities.MediaOutlet.filter({ id: ownerId });
      // use primary contact email if available via user lookup
    }

    // Create Stripe Express connected account
    const stripeAccount = await stripe.accounts.create({
      type: 'express',
      email,
      capabilities: {
        transfers: { requested: true }
      },
      metadata: {
        owner_type: ownerType,
        owner_id: ownerId,
        platform: 'hijinx'
      }
    });

    // Update PaymentAccount with Stripe account ID
    paymentAccount = await base44.asServiceRole.entities.PaymentAccount.update(paymentAccount.id, {
      stripe_connected_account_id: stripeAccount.id,
      account_status: 'onboarding_started'
    });

    // Log operation
    await base44.asServiceRole.entities.OperationLog.create({
      entity_type: 'PaymentAccount',
      entity_id: paymentAccount.id,
      action: 'stripe_connected_account_created',
      metadata: JSON.stringify({
        stripe_connected_account_id: stripeAccount.id,
        owner_type: ownerType,
        owner_id: ownerId,
        acted_by_user_id: user.id
      }),
      created_at: new Date().toISOString()
    });

    return Response.json({ paymentAccount, stripe_account_id: stripeAccount.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});