import { createClientFromRequest } from 'npm:@base44/sdk@0.8.43';
import Stripe from 'npm:stripe@14';
import { secrets } from 'base44:runtime';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { tier_key, success_url, cancel_url } = await req.json();
    if (!tier_key) return Response.json({ error: 'tier_key is required' }, { status: 400 });

    // Look up the tier
    const tiers = await base44.asServiceRole.entities.SubscriptionTier.filter({ tier_key, is_active: true });
    const tier = (tiers || [])[0];
    if (!tier) return Response.json({ error: 'Tier not found or inactive' }, { status: 404 });
    if (tier.tier_key === 'free' || !tier.stripe_price_id) {
      return Response.json({ error: 'This tier does not require a paid subscription' }, { status: 400 });
    }

    const stripe = new Stripe(secrets.get('STRIPE_SECRET_KEY'));
    const origin = req.headers.get('origin') || '';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: tier.stripe_price_id, quantity: 1 }],
      success_url: success_url || `${origin}/membership?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancel_url || `${origin}/membership?status=canceled`,
      customer_email: user.email,
      subscription_data: {
        metadata: {
          user_id: user.id,
          user_email: user.email,
          tier_key: tier.tier_key,
        },
      },
      metadata: {
        user_id: user.id,
        tier_key: tier.tier_key,
        membership_flow: 'true',
      },
    });

    return Response.json({ url: session.url, session_id: session.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}