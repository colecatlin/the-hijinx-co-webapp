import { createClientFromRequest } from 'npm:@base44/sdk@0.8.43';

/**
 * Admin-only: revokes a user's membership.
 * For paid memberships, also cancels the Stripe subscription if present.
 * Sets status to 'canceled' (preserves the record for audit).
 */
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const adminUser = await base44.auth.me();
    if (!adminUser) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (adminUser.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const { membership_id } = await req.json();
    if (!membership_id) return Response.json({ error: 'membership_id is required' }, { status: 400 });

    const memberships = await base44.asServiceRole.entities.Membership.filter({ id: membership_id });
    const membership = (memberships || [])[0];
    if (!membership) return Response.json({ error: 'Membership not found' }, { status: 404 });

    // If there's a Stripe subscription, cancel it
    if (membership.stripe_subscription_id) {
      try {
        const { secrets } = await import('base44:runtime');
        const Stripe = (await import('npm:stripe@14')).default;
        const stripe = new Stripe(secrets.get('STRIPE_SECRET_KEY'));
        await stripe.subscriptions.del(membership.stripe_subscription_id);
      } catch (stripeErr) {
        // Log but don't fail — the webhook will handle the deletion event
        console.warn('Stripe cancel failed (webhook will handle):', stripeErr.message);
      }
    }

    const updated = await base44.asServiceRole.entities.Membership.update(membership_id, {
      status: 'canceled',
      canceled_at: new Date().toISOString(),
    });

    return Response.json({ membership: updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}