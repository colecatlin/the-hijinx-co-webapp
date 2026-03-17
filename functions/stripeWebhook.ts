import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import Stripe from 'npm:stripe@14.25.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const signature = req.headers.get('stripe-signature');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    const body = await req.text();

    // Verify webhook signature
    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      return Response.json({ error: `Webhook signature verification failed: ${err.message}` }, { status: 400 });
    }

    const { type, data } = event;
    const obj = data.object;

    switch (type) {

      // --- Checkout completed ---
      case 'checkout.session.completed': {
        const meta = obj.metadata || {};
        if (meta.revenue_type === 'asset_license_sale') {
          // Create RevenueEvent for the completed license sale
          const revenueEvent = await base44.asServiceRole.entities.RevenueEvent.create({
            revenue_type: 'asset_license_sale',
            linked_asset_id: meta.asset_id,
            linked_agreement_id: meta.agreement_id,
            linked_buyer_entity_type: meta.buyer_entity_type,
            linked_buyer_entity_id: meta.buyer_entity_id,
            gross_amount: parseInt(meta.gross_amount || obj.amount_total || 0),
            platform_amount: parseInt(meta.platform_amount || 0),
            creator_amount: parseInt(meta.creator_amount || 0),
            outlet_amount: parseInt(meta.outlet_amount || 0),
            currency: meta.currency || obj.currency || 'usd',
            status: 'paid',
            stripe_checkout_session_id: obj.id,
            stripe_payment_intent_id: obj.payment_intent || null,
            payment_provider: 'stripe',
            occurred_at: new Date().toISOString(),
            notes: 'Created via Stripe checkout.session.completed webhook'
          });

          // Create payout record for creator
          if (meta.agreement_id) {
            const agreements = await base44.asServiceRole.entities.RevenueAgreement.filter({ id: meta.agreement_id });
            if (agreements && agreements.length > 0) {
              const agreement = agreements[0];
              const creatorAmount = parseInt(meta.creator_amount || 0);
              if (agreement.creator_profile_id && creatorAmount > 0) {
                const paymentAccounts = await base44.asServiceRole.entities.PaymentAccount.filter({
                  owner_type: 'media_profile',
                  owner_id: agreement.creator_profile_id
                });
                await base44.asServiceRole.entities.PayoutRecord.create({
                  payout_recipient_type: 'media_profile',
                  payout_recipient_id: agreement.creator_profile_id,
                  linked_revenue_event_id: revenueEvent.id,
                  linked_payment_account_id: paymentAccounts?.[0]?.id || null,
                  amount: creatorAmount,
                  currency: meta.currency || 'usd',
                  status: 'pending'
                });
              }
            }
          }

          await base44.asServiceRole.entities.OperationLog.create({
            entity_type: 'RevenueEvent',
            entity_id: revenueEvent.id,
            action: 'asset_license_sale_completed',
            metadata: JSON.stringify({ media_asset_id: meta.asset_id, stripe_checkout_session_id: obj.id, revenue_event_id: revenueEvent.id }),
            created_at: new Date().toISOString()
          });
        }
        break;
      }

      // --- Payment Intent succeeded ---
      case 'payment_intent.succeeded': {
        const pi = obj;
        // Find RevenueEvent by stripe_payment_intent_id
        const events = await base44.asServiceRole.entities.RevenueEvent.filter({ stripe_payment_intent_id: pi.id });
        for (const evt of (events || [])) {
          if (evt.status !== 'paid') {
            await base44.asServiceRole.entities.RevenueEvent.update(evt.id, { status: 'paid' });
          }
        }
        break;
      }

      // --- Payment Intent failed ---
      case 'payment_intent.payment_failed': {
        const pi = obj;
        const events = await base44.asServiceRole.entities.RevenueEvent.filter({ stripe_payment_intent_id: pi.id });
        for (const evt of (events || [])) {
          await base44.asServiceRole.entities.RevenueEvent.update(evt.id, {
            status: 'cancelled',
            notes: `Payment failed: ${pi.last_payment_error?.message || 'unknown'}`
          });
        }
        break;
      }

      // --- Refund issued ---
      case 'charge.refunded': {
        const charge = obj;
        if (charge.payment_intent) {
          const events = await base44.asServiceRole.entities.RevenueEvent.filter({ stripe_payment_intent_id: charge.payment_intent });
          for (const evt of (events || [])) {
            await base44.asServiceRole.entities.RevenueEvent.update(evt.id, { status: 'refunded' });
          }
          // Mark any payout records as reversed
          const eventIds = (events || []).map(e => e.id);
          for (const eid of eventIds) {
            const payouts = await base44.asServiceRole.entities.PayoutRecord.filter({ linked_revenue_event_id: eid });
            for (const p of (payouts || [])) {
              if (['pending', 'approved'].includes(p.status)) {
                await base44.asServiceRole.entities.PayoutRecord.update(p.id, { status: 'reversed' });
              }
            }
          }
        }
        break;
      }

      // --- Stripe Connect account updated ---
      case 'account.updated': {
        const acct = obj;
        const paymentAccounts = await base44.asServiceRole.entities.PaymentAccount.filter({ stripe_connected_account_id: acct.id });
        for (const pa of (paymentAccounts || [])) {
          let account_status = pa.account_status;
          if (acct.payouts_enabled && acct.charges_enabled) account_status = 'active';
          else if (acct.requirements?.disabled_reason) account_status = 'restricted';
          else if (acct.details_submitted) account_status = 'pending_verification';

          await base44.asServiceRole.entities.PaymentAccount.update(pa.id, {
            account_status,
            payouts_enabled: acct.payouts_enabled || false,
            charges_enabled: acct.charges_enabled || false,
            last_sync_at: new Date().toISOString(),
            ...(account_status === 'active' && !pa.onboarding_completed_at ? { onboarding_completed_at: new Date().toISOString() } : {})
          });

          // Update payout_profile_ready on MediaProfile
          if (pa.owner_type === 'media_profile' && account_status === 'active') {
            await base44.asServiceRole.entities.MediaProfile.update(pa.owner_id, { payout_profile_ready: true });
          }
        }
        break;
      }

      // --- Transfer events (payouts to connected accounts) ---
      case 'transfer.created': {
        const transfer = obj;
        const payouts = await base44.asServiceRole.entities.PayoutRecord.filter({ stripe_transfer_id: transfer.id });
        for (const p of (payouts || [])) {
          await base44.asServiceRole.entities.PayoutRecord.update(p.id, { status: 'processing' });
        }
        break;
      }

      default:
        // Unhandled event type — acknowledge receipt
        break;
    }

    return Response.json({ received: true, type });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});