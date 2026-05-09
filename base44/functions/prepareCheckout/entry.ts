/**
 * prepareCheckout — server-side cart validation and Order creation.
 * Validates prices, inventory, discount codes, then creates a pending Order + OrderItems.
 * Frontend never sends final prices — this function resolves them from the DB.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow guest checkout — user may be null
    let user = null;
    try { user = await base44.auth.me(); } catch {}

    const body = await req.json();
    const { items, discountCode, shippingInfo, email } = body;

    if (!items || !items.length) {
      return Response.json({ error: 'Cart is empty' }, { status: 400 });
    }

    const customerEmail = email || user?.email;
    if (!customerEmail) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    // ── 1. Validate each item server-side ────────────────────────────────────
    const validatedItems = [];
    const errors = [];

    for (const cartItem of items) {
      const variant = await base44.asServiceRole.entities.ProductVariant.filter(
        { id: cartItem.variantId }
      );
      const v = variant?.[0];
      if (!v) { errors.push(`Variant not found: ${cartItem.variantId}`); continue; }
      if (!v.available) { errors.push(`${cartItem.name} (${v.size || ''} ${v.color || ''}) is no longer available`); continue; }
      if ((v.inventory ?? 0) < cartItem.quantity) {
        errors.push(`Not enough stock for ${cartItem.name} — only ${v.inventory} left`);
        continue;
      }

      const product = await base44.asServiceRole.entities.Product.filter({ id: v.product_id });
      const p = product?.[0];
      if (!p || p.status === 'archived' || p.status === 'sold_out') {
        errors.push(`${cartItem.name} is no longer available`);
        continue;
      }

      // Resolve authoritative price: variant price overrides product base
      const unitPrice = v.price ?? p.price;

      validatedItems.push({
        product_id: v.product_id,
        variant_id: v.id,
        product_name: p.name,
        variant_label: [v.color, v.size].filter(Boolean).join(' / '),
        sku: v.sku || p.sku,
        quantity: cartItem.quantity,
        unit_price: unitPrice,
        line_total: unitPrice * cartItem.quantity,
        image_url: v.image_url || p.cover_image_url,
      });
    }

    if (errors.length) {
      return Response.json({ error: errors.join('; '), errors }, { status: 422 });
    }

    // ── 2. Subtotal ───────────────────────────────────────────────────────────
    const subtotal = validatedItems.reduce((s, i) => s + i.line_total, 0);

    // ── 3. Discount code validation ───────────────────────────────────────────
    let discountAmount = 0;
    let appliedCode = null;

    if (discountCode) {
      const codes = await base44.asServiceRole.entities.DiscountCode.filter({
        code: discountCode.toUpperCase(),
        active: true,
      });
      const dc = codes?.[0];
      if (!dc) {
        return Response.json({ error: 'Invalid or expired discount code' }, { status: 422 });
      }
      const now = new Date();
      if (dc.starts_at && new Date(dc.starts_at) > now) {
        return Response.json({ error: 'Discount code is not yet active' }, { status: 422 });
      }
      if (dc.expires_at && new Date(dc.expires_at) < now) {
        return Response.json({ error: 'Discount code has expired' }, { status: 422 });
      }
      if (dc.usage_limit && dc.usage_count >= dc.usage_limit) {
        return Response.json({ error: 'Discount code has reached its usage limit' }, { status: 422 });
      }
      if (dc.minimum_order_amount && subtotal < dc.minimum_order_amount) {
        return Response.json({
          error: `Minimum order of $${dc.minimum_order_amount.toFixed(2)} required for this code`
        }, { status: 422 });
      }
      if (dc.type === 'percentage') {
        discountAmount = subtotal * (dc.value / 100);
      } else if (dc.type === 'fixed_amount') {
        discountAmount = Math.min(dc.value, subtotal);
      }
      appliedCode = dc.code;
    }

    // ── 4. Shipping (placeholder — $0 until Stripe shipping rates) ────────────
    const shippingAmount = 0;
    const taxAmount = 0;
    const total = Math.max(0, subtotal - discountAmount + shippingAmount + taxAmount);

    // ── 5. Create pending Order ───────────────────────────────────────────────
    const orderNumber = `HJX-${Date.now().toString(36).toUpperCase().slice(-6)}`;

    const order = await base44.asServiceRole.entities.Order.create({
      order_number: orderNumber,
      customer_email: customerEmail,
      customer_name: shippingInfo?.name || '',
      customer_id: user?.id || null,
      status: 'pending',
      subtotal,
      discount_amount: discountAmount,
      discount_code: appliedCode,
      shipping_amount: shippingAmount,
      tax_amount: taxAmount,
      total,
      currency: 'USD',
      shipping_name: shippingInfo?.name || '',
      shipping_address_line1: shippingInfo?.address_line1 || '',
      shipping_address_line2: shippingInfo?.address_line2 || '',
      shipping_city: shippingInfo?.city || '',
      shipping_state: shippingInfo?.state || '',
      shipping_zip: shippingInfo?.zip || '',
      shipping_country: shippingInfo?.country || 'US',
    });

    // ── 6. Create OrderItems ──────────────────────────────────────────────────
    for (const item of validatedItems) {
      await base44.asServiceRole.entities.OrderItem.create({
        order_id: order.id,
        ...item,
      });
    }

    return Response.json({
      success: true,
      order_id: order.id,
      order_number: orderNumber,
      subtotal,
      discount_amount: discountAmount,
      shipping_amount: shippingAmount,
      tax_amount: taxAmount,
      total,
      validated_items: validatedItems,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});