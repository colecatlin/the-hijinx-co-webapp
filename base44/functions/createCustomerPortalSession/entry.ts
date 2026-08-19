import { createClientFromRequest } from 'npm:@base44/sdk@0.8.43';
import Stripe from 'npm:stripe@14';
import { secrets } from 'base44:runtime';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Find the user's membership to get stripe_customer_id
    const memberships = await base44.asServiceRole.entities.Membership.filter({ user_id: user.id });
    const membership = (memberships || []).find(m =>
      m.status === 'active' && m.stripe_customer_id
    );

    if (!membership || !membership.stripe_customer_id) {
      return Response.json({ error: 'No active paid subscription found' }, { status: 404 });
    }

    const stripe = new Stripe(secrets.get('STRIPE_SECRET_KEY'));
    const origin = req.headers.get('origin') || '';

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: membership.stripe_customer_id,
      return_url: `${origin}/membership`,
    });

    return Response.json({ url: portalSession.url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}