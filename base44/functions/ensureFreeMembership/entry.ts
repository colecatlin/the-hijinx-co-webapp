import { createClientFromRequest } from 'npm:@base44/sdk@0.8.43';

/**
 * Ensures the current user has a membership record.
 * If none exists, creates a Free tier membership (status active, no Stripe link).
 * Idempotent — safe to call on every app load.
 *
 * Returns the user's active membership.
 */
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Look for an existing membership
    const existing = await base44.asServiceRole.entities.Membership.filter({ user_id: user.id });
    const activeOrComp = (existing || []).find(m =>
      m.status === 'active' || m.status === 'comp' || m.status === 'past_due'
    );

    if (activeOrComp) {
      return Response.json({ membership: activeOrComp, created: false });
    }

    // No active membership — create a Free tier one
    const created = await base44.asServiceRole.entities.Membership.create({
      user_id: user.id,
      user_email: user.email,
      tier_key: 'free',
      status: 'active',
      stripe_customer_id: null,
      stripe_subscription_id: null,
      current_period_end: null,
    });

    return Response.json({ membership: created, created: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}