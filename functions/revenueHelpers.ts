/**
 * Shared revenue split calculation helpers.
 * Called by other backend functions — not a direct HTTP endpoint.
 */

/**
 * Calculate revenue split from a gross amount and a RevenueAgreement.
 * Returns { platformAmount, creatorAmount, outletAmount } in cents.
 * Throws if percentages are invalid or don't sum to 100.
 */
export function calculateRevenueSplit(grossAmountCents, agreement) {
  if (!agreement) throw new Error('No RevenueAgreement provided — cannot calculate split');

  const { platform_share_percent, creator_share_percent, outlet_share_percent, flat_fee_amount } = agreement;

  // Flat fee case
  if (flat_fee_amount != null && flat_fee_amount > 0) {
    return {
      platformAmount: 0,
      creatorAmount: flat_fee_amount,
      outletAmount: 0,
      grossAmount: flat_fee_amount,
      isFlat: true
    };
  }

  const total = (platform_share_percent || 0) + (creator_share_percent || 0) + (outlet_share_percent || 0);
  if (Math.abs(total - 100) > 0.01) {
    throw new Error(`Revenue split percentages must sum to 100. Got: ${total}`);
  }

  const platformAmount = Math.round(grossAmountCents * (platform_share_percent / 100));
  const outletAmount = Math.round(grossAmountCents * (outlet_share_percent / 100));
  const creatorAmount = grossAmountCents - platformAmount - outletAmount;

  return { platformAmount, creatorAmount, outletAmount, grossAmount: grossAmountCents, isFlat: false };
}

Deno.serve(async () => {
  return Response.json({ message: 'revenueHelpers is a shared module.' });
});