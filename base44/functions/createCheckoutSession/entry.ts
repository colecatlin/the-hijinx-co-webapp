import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@14';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { items, success_url, cancel_url } = await req.json();
    // items: [{ product_id, quantity }]

    if (!items?.length) return Response.json({ error: 'No items provided' }, { status: 400 });

    // Fetch all products
    const productRecords = await Promise.all(
      items.map(item => base44.asServiceRole.entities.Product.filter({ id: item.product_id }, '-created_date', 1).then(r => r[0]))
    );

    const lineItems = items.map((item, i) => {
      const p = productRecords[i];
      if (!p) throw new Error(`Product ${item.product_id} not found`);
      if (p.status !== 'active') throw new Error(`Product "${p.name}" is not active`);
      return {
        price_data: {
          currency: (p.currency || 'USD').toLowerCase(),
          product_data: {
            name: p.name,
            description: p.short_description || undefined,
            images: p.cover_image_url ? [p.cover_image_url] : [],
            metadata: {
              product_id: p.id,
              product_type: p.product_type,
              sku: p.sku || '',
            },
          },
          unit_amount: Math.round(p.price * 100),
        },
        quantity: item.quantity || 1,
      };
    });

    const hasPhysical = productRecords.some(p => p.product_type === 'physical');
    const hasDigital = productRecords.some(p => p.product_type === 'digital');
    const orderType = hasPhysical && hasDigital ? 'mixed' : hasPhysical ? 'physical' : 'digital';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      success_url: success_url || `${req.headers.get('origin') || ''}/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancel_url || `${req.headers.get('origin') || ''}/checkout-cancel`,
      customer_email: user.email,
      metadata: {
        user_id: user.id,
        user_email: user.email,
        order_type: orderType,
        items_json: JSON.stringify(items.map((item, i) => ({
          product_id: item.product_id,
          quantity: item.quantity || 1,
          product_name: productRecords[i]?.name,
          product_type: productRecords[i]?.product_type,
          unit_price: productRecords[i]?.price,
          line_total: (item.quantity || 1) * productRecords[i]?.price,
        }))),
      },
    });

    return Response.json({ url: session.url, session_id: session.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});