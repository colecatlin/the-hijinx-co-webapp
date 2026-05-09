/**
 * createStorefrontCheckoutSession
 * Creates a Stripe Checkout session from a prepared (pending) order.
 * Takes order_id from prepareCheckout and builds line items from OrderItems.
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

    const { order_id, customer_email } = await req.json();

    if (!order_id) {
      return Response.json({ error: 'order_id is required' }, { status: 400 });
    }

    // Fetch the order
    const orders = await base44.asServiceRole.entities.Order.filter({ id: order_id });
    const order = orders?.[0];
    if (!order) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }
    if (order.status !== 'pending') {
      return Response.json({ error: 'Order is no longer pending' }, { status: 400 });
    }

    // Fetch order items
    const orderItems = await base44.asServiceRole.entities.OrderItem.filter({ order_id: order.id });
    if (!orderItems?.length) {
      return Response.json({ error: 'No items found for order' }, { status: 400 });
    }

    // Build Stripe line items from order items (prices already validated by prepareCheckout)
    const lineItems = orderItems.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.product_name,
          description: item.variant_label || undefined,
          images: item.image_url ? [item.image_url] : [],
          metadata: {
            product_id: item.product_id,
            variant_id: item.variant_id,
            sku: item.sku || '',
          },
        },
        unit_amount: Math.round(item.unit_price * 100),
      },
      quantity: item.quantity,
    }));

    const origin = req.headers.get('origin') || 'https://hijinx.co';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      customer_email: customer_email || order.customer_email || user?.email,
      success_url: `${origin}/checkout-success?session_id={CHECKOUT_SESSION_ID}&order_number=${order.order_number}`,
      cancel_url: `${origin}/checkout-cancel`,
      metadata: {
        order_id: order.id,
        order_number: order.order_number,
        user_id: user?.id || '',
      },
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'GB', 'AU'],
      },
    });

    // Store session ID on the order
    await base44.asServiceRole.entities.Order.update(order.id, {
      stripe_session_id: session.id,
    });

    return Response.json({ url: session.url, session_id: session.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});