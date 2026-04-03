import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@14';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
const WEBHOOK_SECRET = Deno.env.get('STRIPE_PRODUCT_WEBHOOK_SECRET');

Deno.serve(async (req) => {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  let event;
  try {
    event = WEBHOOK_SECRET
      ? await stripe.webhooks.constructEventAsync(body, sig, WEBHOOK_SECRET)
      : JSON.parse(body);
  } catch (err) {
    return Response.json({ error: `Webhook error: ${err.message}` }, { status: 400 });
  }

  if (event.type !== 'checkout.session.completed') {
    return Response.json({ received: true });
  }

  const session = event.data.object;
  if (session.payment_status !== 'paid') {
    return Response.json({ received: true });
  }

  const base44 = createClientFromRequest(req);

  try {
    const meta = session.metadata || {};
    const userId = meta.user_id;
    const userEmail = meta.user_email || session.customer_email;
    const orderType = meta.order_type || 'physical';
    const itemsRaw = meta.items_json ? JSON.parse(meta.items_json) : [];

    // Create Order
    const order = await base44.asServiceRole.entities.Order.create({
      user_id: userId,
      email: userEmail,
      order_status: 'paid',
      total_amount: session.amount_total / 100,
      currency: session.currency?.toUpperCase() || 'USD',
      payment_provider: 'stripe',
      payment_reference: session.payment_intent || session.id,
      fulfillment_status: orderType === 'digital' ? 'not_applicable' : 'pending',
      order_type: orderType,
      paid_at: new Date().toISOString(),
    });

    // Create OrderItems + DigitalEntitlements
    for (const item of itemsRaw) {
      await base44.asServiceRole.entities.OrderItem.create({
        order_id: order.id,
        product_id: item.product_id,
        product_name_snapshot: item.product_name,
        product_type: item.product_type,
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_total: item.line_total,
      });

      if (item.product_type === 'digital') {
        // Fetch the product to get the current digital_asset_url snapshot
        const products = await base44.asServiceRole.entities.Product.filter({ id: item.product_id }, '-created_date', 1);
        const product = products[0];

        await base44.asServiceRole.entities.DigitalEntitlement.create({
          user_id: userId,
          product_id: item.product_id,
          order_id: order.id,
          access_status: 'active',
          download_url: product?.digital_asset_url || '',
          granted_at: new Date().toISOString(),
        });
      }
    }

    return Response.json({ received: true, order_id: order.id });
  } catch (err) {
    console.error('Order creation failed:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});