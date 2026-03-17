import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { assignmentId } = await req.json();
    if (!assignmentId) return Response.json({ error: 'assignmentId required' }, { status: 400 });

    const assignments = await base44.asServiceRole.entities.MediaAssignment.filter({ id: assignmentId });
    if (!assignments || assignments.length === 0) return Response.json({ error: 'Assignment not found' }, { status: 404 });
    const assignment = assignments[0];

    if (assignment.compensation_type === 'unpaid') {
      return Response.json({ message: 'Assignment is unpaid — no payment record needed', skipped: true });
    }

    // Determine agreement
    let agreement = null;
    if (assignment.linked_revenue_agreement_id) {
      const agreements = await base44.asServiceRole.entities.RevenueAgreement.filter({ id: assignment.linked_revenue_agreement_id });
      if (agreements && agreements.length > 0) agreement = agreements[0];
    }

    let platform_amount = 0, creator_amount = 0, outlet_amount = 0;
    const gross = assignment.compensation_amount || 0;

    if (agreement && gross > 0) {
      const p = agreement.platform_share_percent || 0;
      const c = agreement.creator_share_percent || 100;
      const o = agreement.outlet_share_percent || 0;
      platform_amount = Math.round(gross * p / 100);
      outlet_amount = Math.round(gross * o / 100);
      creator_amount = gross - platform_amount - outlet_amount;
    } else if (assignment.compensation_type === 'flat_fee') {
      creator_amount = gross;
    }

    // Create RevenueEvent
    const revenueEvent = await base44.asServiceRole.entities.RevenueEvent.create({
      revenue_type: 'assignment_payment_due',
      linked_assignment_id: assignmentId,
      linked_agreement_id: assignment.linked_revenue_agreement_id || null,
      gross_amount: gross,
      platform_amount,
      creator_amount,
      outlet_amount,
      currency: assignment.compensation_currency || 'usd',
      status: 'pending',
      payment_provider: 'stripe',
      occurred_at: new Date().toISOString()
    });

    // Create PayoutRecord if there's a recipient profile
    let payoutRecord = null;
    if (assignment.assigned_to_profile_id && creator_amount > 0) {
      const paymentAccounts = await base44.asServiceRole.entities.PaymentAccount.filter({
        owner_type: 'media_profile',
        owner_id: assignment.assigned_to_profile_id
      });
      const paymentAccountId = paymentAccounts && paymentAccounts.length > 0 ? paymentAccounts[0].id : null;

      payoutRecord = await base44.asServiceRole.entities.PayoutRecord.create({
        payout_recipient_type: 'media_profile',
        payout_recipient_id: assignment.assigned_to_profile_id,
        linked_revenue_event_id: revenueEvent.id,
        linked_payment_account_id: paymentAccountId,
        amount: creator_amount,
        currency: assignment.compensation_currency || 'usd',
        status: 'pending'
      });
    }

    // Update assignment payment_status
    await base44.asServiceRole.entities.MediaAssignment.update(assignmentId, { payment_status: 'pending' });

    // Log
    await base44.asServiceRole.entities.OperationLog.create({
      entity_type: 'MediaAssignment',
      entity_id: assignmentId,
      action: 'assignment_payment_due',
      metadata: JSON.stringify({
        media_assignment_id: assignmentId,
        revenue_event_id: revenueEvent.id,
        payout_record_id: payoutRecord?.id,
        media_profile_id: assignment.assigned_to_profile_id,
        gross_amount: gross,
        acted_by_user_id: user.id
      }),
      created_at: new Date().toISOString()
    });

    return Response.json({ revenueEvent, payoutRecord });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});