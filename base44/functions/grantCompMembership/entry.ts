import { createClientFromRequest } from 'npm:@base44/sdk@0.8.43';

/**
 * Admin-only: grants a complimentary membership to a user.
 * Creates or updates a Membership with status='comp' and the given tier.
 * No Stripe link — comp memberships don't expire.
 */
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const adminUser = await base44.auth.me();
    if (!adminUser) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (adminUser.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const { user_id, tier_key, notes } = await req.json();
    if (!user_id || !tier_key) {
      return Response.json({ error: 'user_id and tier_key are required' }, { status: 400 });
    }

    // Validate tier exists
    const tiers = await base44.asServiceRole.entities.SubscriptionTier.filter({ tier_key });
    if (!(tiers || [])[0]) return Response.json({ error: 'Tier not found' }, { status: 404 });

    // Look up target user's email
    const users = await base44.asServiceRole.entities.User.filter({ id: user_id });
    const targetUser = (users || [])[0];
    const targetEmail = targetUser?.email || null;

    // Check for existing membership
    const existing = await base44.asServiceRole.entities.Membership.filter({ user_id });
    const existingMembership = (existing || [])[0];

    if (existingMembership) {
      const updated = await base44.asServiceRole.entities.Membership.update(existingMembership.id, {
        tier_key,
        status: 'comp',
        stripe_customer_id: null,
        stripe_subscription_id: null,
        current_period_end: null,
        granted_by: adminUser.id,
        notes: notes || existingMembership.notes,
      });
      return Response.json({ membership: updated, created: false });
    }

    const created = await base44.asServiceRole.entities.Membership.create({
      user_id,
      user_email: targetEmail,
      tier_key,
      status: 'comp',
      stripe_customer_id: null,
      stripe_subscription_id: null,
      current_period_end: null,
      granted_by: adminUser.id,
      notes: notes || null,
    });

    return Response.json({ membership: created, created: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}