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

        // ── Storefront order fulfillment ──────────────────────────────────────
        const storefrontOrders = await base44.asServiceRole.entities.Order.filter({ stripe_payment_intent_id: pi.id });
        for (const order of (storefrontOrders || [])) {
          if (order.status === 'pending' || order.status === 'confirmed') {
            await base44.asServiceRole.entities.Order.update(order.id, { status: 'confirmed' });

            // Decrement inventory for each line item
            const orderItems = await base44.asServiceRole.entities.OrderItem.filter({ order_id: order.id });
            for (const item of (orderItems || [])) {
              if (item.variant_id) {
                const variants = await base44.asServiceRole.entities.ProductVariant.filter({ id: item.variant_id });
                const variant = variants?.[0];
                if (variant) {
                  const newInventory = Math.max(0, (variant.inventory || 0) - item.quantity);
                  await base44.asServiceRole.entities.ProductVariant.update(variant.id, {
                    inventory: newInventory,
                    available: newInventory > 0,
                  });
                }
              }
            }
          }
        }

        // ── Media/Creator RevenueEvent sync ───────────────────────────────────
        const revenueEvents = await base44.asServiceRole.entities.RevenueEvent.filter({ stripe_payment_intent_id: pi.id });
        for (const evt of (revenueEvents || [])) {
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

      // ── Subscription lifecycle: Membership sync ──────────────────────────
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = obj;
        const subMeta = sub.metadata || {};
        let subUserId = subMeta.user_id;
        let subTierKey = subMeta.tier_key;

        // If no tier in metadata, resolve from the price ID
        if (!subTierKey && sub.items?.data?.[0]?.price?.id) {
          const priceId = sub.items.data[0].price.id;
          const tiersByPrice = await base44.asServiceRole.entities.SubscriptionTier.filter({ stripe_price_id: priceId });
          if (tiersByPrice?.[0]) subTierKey = tiersByPrice[0].tier_key;
        }

        // If no user_id in metadata, find existing membership by subscription ID
        if (!subUserId) {
          const bySubId = await base44.asServiceRole.entities.Membership.filter({ stripe_subscription_id: sub.id });
          if (bySubId?.[0]) subUserId = bySubId[0].user_id;
        }

        if (!subUserId || !subTierKey) break;

        const stripeStatusMap = {
          active: 'active', trialing: 'active', past_due: 'past_due',
          unpaid: 'past_due', canceled: 'canceled', incomplete: 'past_due',
          incomplete_expired: 'canceled', paused: 'past_due',
        };
        const membershipStatus = stripeStatusMap[sub.status] || 'past_due';

        const existingMems = await base44.asServiceRole.entities.Membership.filter({ user_id: subUserId });
        const existingMem = (existingMems || [])[0];

        const membershipData = {
          tier_key: subTierKey,
          status: membershipStatus,
          stripe_customer_id: sub.customer,
          stripe_subscription_id: sub.id,
          current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
        };

        if (existingMem) {
          await base44.asServiceRole.entities.Membership.update(existingMem.id, membershipData);
        } else {
          const users = await base44.asServiceRole.entities.User.filter({ id: subUserId });
          const targetUser = (users || [])[0];
          await base44.asServiceRole.entities.Membership.create({
            user_id: subUserId,
            user_email: targetUser?.email || subMeta.user_email || null,
            ...membershipData,
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const delSub = obj;
        const bySub = await base44.asServiceRole.entities.Membership.filter({ stripe_subscription_id: delSub.id });
        for (const m of (bySub || [])) {
          await base44.asServiceRole.entities.Membership.update(m.id, {
            status: 'canceled',
            canceled_at: new Date().toISOString(),
          });
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = obj;
        if (invoice.subscription) {
          const bySub = await base44.asServiceRole.entities.Membership.filter({ stripe_subscription_id: invoice.subscription });
          for (const m of (bySub || [])) {
            if (m.status !== 'comp') {
              await base44.asServiceRole.entities.Membership.update(m.id, {
                status: 'active',
                current_period_end: invoice.lines?.data?.[0]?.period?.end
                  ? new Date(invoice.lines.data[0].period.end * 1000).toISOString()
                  : m.current_period_end,
              });
            }
          }
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