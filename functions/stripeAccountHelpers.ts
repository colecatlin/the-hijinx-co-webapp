import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import Stripe from 'npm:stripe@14.25.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

// Shared helper: log a payment operation event
export async function logPaymentOp(base44, entity_type, entity_id, action, metadata = {}) {
  await base44.asServiceRole.entities.OperationLog.create({
    entity_type,
    entity_id,
    action,
    metadata: JSON.stringify(metadata),
    created_at: new Date().toISOString()
  });
}

// Get or create a PaymentAccount record for an owner
export async function getOrCreatePaymentAccount(base44, ownerType, ownerId) {
  const existing = await base44.asServiceRole.entities.PaymentAccount.filter({
    owner_type: ownerType,
    owner_id: ownerId
  });
  if (existing && existing.length > 0) return existing[0];

  const account = await base44.asServiceRole.entities.PaymentAccount.create({
    owner_type: ownerType,
    owner_id: ownerId,
    account_status: 'not_started',
    payouts_enabled: false,
    charges_enabled: false
  });
  return account;
}

// Sync a Stripe connected account status into our PaymentAccount record
export async function syncStripeAccountToRecord(base44, paymentAccount) {
  if (!paymentAccount.stripe_connected_account_id) return paymentAccount;

  const stripeAccount = await stripe.accounts.retrieve(paymentAccount.stripe_connected_account_id);

  let account_status = 'pending_verification';
  if (stripeAccount.payouts_enabled && stripeAccount.charges_enabled) {
    account_status = 'active';
  } else if (stripeAccount.requirements?.disabled_reason) {
    account_status = 'restricted';
  } else if (stripeAccount.details_submitted) {
    account_status = 'pending_verification';
  } else {
    account_status = 'onboarding_started';
  }

  const updated = await base44.asServiceRole.entities.PaymentAccount.update(paymentAccount.id, {
    account_status,
    payouts_enabled: stripeAccount.payouts_enabled || false,
    charges_enabled: stripeAccount.charges_enabled || false,
    last_sync_at: new Date().toISOString(),
    ...(stripeAccount.payouts_enabled && stripeAccount.charges_enabled && !paymentAccount.onboarding_completed_at
      ? { onboarding_completed_at: new Date().toISOString() }
      : {})
  });

  return updated;
}

Deno.serve(async (req) => {
  return Response.json({ message: 'stripeAccountHelpers is a shared module, not a direct endpoint.' }, { status: 200 });
});