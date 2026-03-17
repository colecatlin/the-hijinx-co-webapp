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

    const { assetId, agreementId, buyerContext, successUrl, cancelUrl, priceInCents, currency = 'usd' } = await req.json();
    if (!assetId || !agreementId || !priceInCents) {
      return Response.json({ error: 'assetId, agreementId, and priceInCents required' }, { status: 400 });
    }

    // Verify asset exists and is license-eligible
    const assets = await base44.asServiceRole.entities.MediaAsset.filter({ id: assetId });
    if (!assets || assets.length === 0) return Response.json({ error: 'Asset not found' }, { status: 404 });
    const asset = assets[0];

    if (!asset.revenue_eligible) return Response.json({ error: 'Asset is not revenue eligible' }, { status: 403 });
    if (!asset.commercial_usage_allowed) return Response.json({ error: 'Asset does not allow commercial usage/licensing' }, { status: 403 });
    if (asset.rights_status !== 'cleared') return Response.json({ error: 'Asset rights are not cleared for licensing' }, { status: 403 });

    // Load agreement
    const agreements = await base44.asServiceRole.entities.RevenueAgreement.filter({ id: agreementId });
    if (!agreements || agreements.length === 0) return Response.json({ error: 'RevenueAgreement not found' }, { status: 404 });
    const agreement = agreements[0];
    if (agreement.status !== 'active') return Response.json({ error: 'RevenueAgreement is not active' }, { status: 400 });

    // Calculate split
    const split = calculateRevenueSplit(priceInCents, agreement);

    // Create Stripe Checkout Session
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
          unit_amount: priceInCents
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
        gross_amount: priceInCents,
        platform_amount: split.platformAmount,
        creator_amount: split.creatorAmount,
        outlet_amount: split.outletAmount,
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
        gross_amount: priceInCents,
        acted_by_user_id: user.id
      }),
      created_at: new Date().toISOString()
    });

    return Response.json({ checkout_url: session.url, session_id: session.id, split });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});