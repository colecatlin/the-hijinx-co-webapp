import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import Stripe from 'npm:stripe@14.25.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });

    const { payoutRecordId, executeTransfer = false } = await req.json();
    if (!payoutRecordId) return Response.json({ error: 'payoutRecordId required' }, { status: 400 });

    const records = await base44.asServiceRole.entities.PayoutRecord.filter({ id: payoutRecordId });
    if (!records || records.length === 0) return Response.json({ error: 'PayoutRecord not found' }, { status: 404 });
    let payoutRecord = records[0];

    if (!['pending'].includes(payoutRecord.status)) {
      return Response.json({ error: `Cannot approve payout in status: ${payoutRecord.status}` }, { status: 400 });
    }

    // Mark approved
    payoutRecord = await base44.asServiceRole.entities.PayoutRecord.update(payoutRecordId, {
      status: 'approved',
      approved_by: user.email,
      approved_at: new Date().toISOString()
    });

    let stripeTransferId = null;

    // Optionally execute the Stripe transfer immediately
    if (executeTransfer) {
      const paymentAccounts = await base44.asServiceRole.entities.PaymentAccount.filter({ id: payoutRecord.linked_payment_account_id });
      const paymentAccount = paymentAccounts && paymentAccounts.length > 0 ? paymentAccounts[0] : null;

      if (!paymentAccount?.stripe_connected_account_id) {
        return Response.json({ error: 'Recipient has no Stripe connected account' }, { status: 400 });
      }
      if (!paymentAccount.payouts_enabled) {
        return Response.json({ error: 'Payouts not yet enabled for this account' }, { status: 400 });
      }

      const transfer = await stripe.transfers.create({
        amount: payoutRecord.amount,
        currency: payoutRecord.currency || 'usd',
        destination: paymentAccount.stripe_connected_account_id,
        metadata: {
          payout_record_id: payoutRecordId,
          revenue_event_id: payoutRecord.linked_revenue_event_id
        }
      });
      stripeTransferId = transfer.id;

      payoutRecord = await base44.asServiceRole.entities.PayoutRecord.update(payoutRecordId, {
        status: 'paid',
        stripe_transfer_id: transfer.id,
        paid_at: new Date().toISOString()
      });

      // Update linked RevenueEvent
      await base44.asServiceRole.entities.RevenueEvent.update(payoutRecord.linked_revenue_event_id, { status: 'payout_sent' });
    }

    // Log
    await base44.asServiceRole.entities.OperationLog.create({
      entity_type: 'PayoutRecord',
      entity_id: payoutRecordId,
      action: executeTransfer ? 'payout_record_paid' : 'payout_record_approved',
      metadata: JSON.stringify({
        payout_record_id: payoutRecordId,
        revenue_event_id: payoutRecord.linked_revenue_event_id,
        payment_account_id: payoutRecord.linked_payment_account_id,
        stripe_transfer_id: stripeTransferId,
        amount: payoutRecord.amount,
        acted_by_user_id: user.id
      }),
      created_at: new Date().toISOString()
    });

    return Response.json({ payoutRecord, stripe_transfer_id: stripeTransferId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});