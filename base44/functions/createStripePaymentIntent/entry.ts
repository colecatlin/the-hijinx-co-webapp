/**
 * createStripePaymentIntent
 * Called after prepareCheckout creates the pending Order.
 * Creates a Stripe PaymentIntent for the order total and links it to the Order record.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow guest checkout
    let user = null;
    try { user = await base44.auth.me(); } catch {}

    const { order_id } = await req.json();
    if (!order_id) return Response.json({ error: 'order_id required' }, { status: 400 });

    // Fetch the order
    const orders = await base44.asServiceRole.entities.Order.filter({ id: order_id });
    const order = orders?.[0];
    if (!order) return Response.json({ error: 'Order not found' }, { status: 404 });
    if (order.status !== 'pending') return Response.json({ error: 'Order is not in pending state' }, { status: 400 });

    // Create Stripe PaymentIntent
    const amountCents = Math.round(order.total * 100);
    if (amountCents < 50) return Response.json({ error: 'Order total too low' }, { status: 400 });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: (order.currency || 'USD').toLowerCase(),
      receipt_email: order.customer_email,
      metadata: {
        order_id: order.id,
        order_number: order.order_number || '',
        customer_email: order.customer_email,
      },
      description: `HIJINX Order ${order.order_number || order.id}`,
    });

    // Link payment intent to the order
    await base44.asServiceRole.entities.Order.update(order.id, {
      stripe_payment_intent_id: paymentIntent.id,
    });

    return Response.json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});