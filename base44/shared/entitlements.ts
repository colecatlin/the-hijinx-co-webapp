/**
 * Shared Entitlement Helpers
 * ═════════════════════════════════════════════════════════════
 * Used by backend functions to enforce subscription-tier-based access.
 *
 * Every gated backend function calls requireEntitlement(base44, user, key)
 * before performing its action. Admins bypass all entitlement checks.
 *
 * The check loads the user's active Membership, then the SubscriptionTier,
 * and verifies the tier's features array includes the entitlement key.
 */

/**
 * Returns the set of entitlement keys the user's active membership grants.
 * Admins receive ['*'] (all entitlements).
 * Returns [] if no active membership, expired, or tier inactive.
 */
export async function getUserEntitlements(base44, user) {
  if (!user) return [];
  if (user.role === 'admin') return ['*'];

  const memberships = await base44.asServiceRole.entities.Membership.filter({ user_id: user.id });
  const now = new Date();

  // Find an active or comp membership that hasn't expired.
  const membership = (memberships || []).find((m) => {
    if (m.status === 'comp') return true;
    if (m.status === 'active') {
      if (m.current_period_end && new Date(m.current_period_end) < now) return false;
      return true;
    }
    return false;
  });

  if (!membership) return [];

  const tiers = await base44.asServiceRole.entities.SubscriptionTier.filter({ tier_key: membership.tier_key });
  const tier = (tiers || [])[0];
  if (!tier || tier.is_active === false) return [];

  return tier.features || [];
}

/**
 * Throws an Error if the user's tier does not include the entitlement.
 * Admins always pass.
 *
 * Usage in a backend function:
 *   const user = await base44.auth.me();
 *   await requireEntitlement(base44, user, 'racecore:publish_results');
 */
export async function requireEntitlement(base44, user, entitlementKey) {
  const entitlements = await getUserEntitlements(base44, user);
  if (entitlements.includes('*') || entitlements.includes(entitlementKey)) return true;
  const err = new Error(`Subscription entitlement '${entitlementKey}' required`);
  err.status = 403;
  throw err;
}

/**
 * Boolean check — no throw. Useful for conditional logic.
 */
export async function hasEntitlement(base44, user, entitlementKey) {
  const entitlements = await getUserEntitlements(base44, user);
  return entitlements.includes('*') || entitlements.includes(entitlementKey);
}