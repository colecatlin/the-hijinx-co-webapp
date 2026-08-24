import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import Stripe from 'npm:stripe@14.25.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

function calculateRevenueSplit(grossAmountCents, agreement) {
  const { platform_share_percent, creator_share_percent, outlet_share_percent, flat_fee_amount } = agreement;
  if (flat_fee_amount != null && flat_fee_amount > 0) {
    return { platformAmount: 0, creatorAmount: flat_fee_amount, outletAmount: 0, grossAmount: flat_fee_amount };
  }
  const total = (platform_share_percent || 0) + (creator_share_percent || 0) + (outlet_share_percent || 0);
  if (Math.abs(total - 100) > 0.01) throw new Error(`Revenue split must sum to 100. Got: ${total}`);
  const platformAmount = Math.round(grossAmountCents * (platform_share_percent / 100));
  const outletAmount = Math.round(grossAmountCents * (outlet_share_percent / 100));
  const creatorAmount = grossAmountCents - platformAmount - outletAmount;
  return { platformAmount, creatorAmount, outletAmount, grossAmount: grossAmountCents };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // ── SERVER-SIDE PRICING ──────────────────────────────────────────
    // The client NEVER supplies price, currency, fees, or splits. All
    // financial terms are derived exclusively from trusted server-side
    // records (MediaAsset + RevenueAgreement). The request body carries
    // only identifiers and non-financial context.
    const { assetId, agreementId, buyerContext, successUrl, cancelUrl } = await req.json();
    if (!assetId || !agreementId) {
      return Response.json({ error: 'assetId and agreementId are required' }, { status: 400 });
    }

    // 1. Load authoritative MediaAsset
    const assets = await base44.asServiceRole.entities.MediaAsset.filter({ id: assetId });
    if (!assets || assets.length === 0) return Response.json({ error: 'Asset not found' }, { status: 404 });
    const asset = assets[0];

    // 2. Verify asset is available for licensing
    if (asset.status === 'archived') return Response.json({ error: 'Asset is archived and cannot be licensed' }, { status: 403 });
    if (!asset.revenue_eligible) return Response.json({ error: 'Asset is not revenue eligible' }, { status: 403 });
    if (!asset.commercial_usage_allowed) return Response.json({ error: 'Asset does not allow commercial usage/licensing' }, { status: 403 });
    if (asset.rights_status !== 'cleared') return Response.json({ error: 'Asset rights are not cleared for licensing' }, { status: 403 });

    // 3. Load authoritative RevenueAgreement
    const agreements = await base44.asServiceRole.entities.RevenueAgreement.filter({ id: agreementId });
    if (!agreements || agreements.length === 0) return Response.json({ error: 'RevenueAgreement not found' }, { status: 404 });
    const agreement = agreements[0];

    // 4. Verify agreement is active, is an asset-license agreement, and is associated with this asset
    if (agreement.status !== 'active') return Response.json({ error: 'RevenueAgreement is not active' }, { status: 400 });
    if (agreement.agreement_type !== 'media_asset_license') return Response.json({ error: 'Agreement is not a media asset license agreement' }, { status: 400 });
    if (!agreement.linked_asset_id) return Response.json({ error: 'Agreement is not linked to a specific asset' }, { status: 400 });
    if (agreement.linked_asset_id !== assetId) return Response.json({ error: 'Agreement is not associated with this asset' }, { status: 400 });

    // 5. Verify the buyer is permitted (owner cannot license their own asset to themselves)
    if (asset.owner_user_id && asset.owner_user_id === user.id) {
      return Response.json({ error: 'Asset owner cannot purchase their own asset license' }, { status: 403 });
    }

    // 6. Determine license price EXCLUSIVELY from the authoritative agreement
    const licensePriceCents = (typeof agreement.flat_fee_amount === 'number' && agreement.flat_fee_amount > 0)
      ? agreement.flat_fee_amount
      : null;
    if (!licensePriceCents) {
      return Response.json({ error: 'Agreement does not define an authoritative license price' }, { status: 400 });
    }

    // 7. Determine currency EXCLUSIVELY from the authoritative agreement
    const currency = (agreement.currency || 'usd').toLowerCase();

    // 8. Calculate revenue split from the authoritative agreement
    const split = calculateRevenueSplit(licensePriceCents, agreement);

    // 9. Create Stripe Checkout Session using the server-derived price only
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency,
          product_data: {
            name: `License: ${asset.title || asset.file_name || 'Media Asset'}`,
            description: `Asset ID: ${assetId}`,
            metadata: { asset_id: assetId, agreement_id: agreementId }
          },
          unit_amount: licensePriceCents
        },
        quantity: 1
      }],
      mode: 'payment',
      success_url: successUrl || 'https://hijinx.app/MediaHome?license=success',
      cancel_url: cancelUrl || 'https://hijinx.app/MediaHome?license=cancelled',
      metadata: {
        asset_id: assetId,
        agreement_id: agreementId,
        buyer_user_id: user.id,
        buyer_entity_type: buyerContext?.entityType || 'user',
        buyer_entity_id: buyerContext?.entityId || user.id,
        revenue_type: 'asset_license_sale',
        gross_amount: String(licensePriceCents),
        platform_amount: String(split.platformAmount),
        creator_amount: String(split.creatorAmount),
        outlet_amount: String(split.outletAmount),
        currency
      }
    });

    // Log
    await base44.asServiceRole.entities.OperationLog.create({
      entity_type: 'MediaAsset',
      entity_id: assetId,
      action: 'asset_license_checkout_created',
      metadata: JSON.stringify({
        media_asset_id: assetId,
        revenue_agreement_id: agreementId,
        stripe_checkout_session_id: session.id,
        gross_amount: licensePriceCents,
        acted_by_user_id: user.id
      }),
      created_at: new Date().toISOString()
    });

    return Response.json({ checkout_url: session.url, session_id: session.id, split });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});