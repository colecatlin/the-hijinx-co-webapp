import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { assignmentId, stripePaymentIntentId, notes } = await req.json();
    if (!assignmentId) return Response.json({ error: 'assignmentId required' }, { status: 400 });

    // Find the RevenueEvent for this assignment
    const events = await base44.asServiceRole.entities.RevenueEvent.filter({ linked_assignment_id: assignmentId });
    if (!events || events.length === 0) return Response.json({ error: 'No RevenueEvent found for this assignment' }, { status: 404 });
    const revenueEvent = events[0];

    // Update RevenueEvent to paid
    const prevStatus = revenueEvent.status;
    await base44.asServiceRole.entities.RevenueEvent.update(revenueEvent.id, {
      status: 'paid',
      stripe_payment_intent_id: stripePaymentIntentId || revenueEvent.stripe_payment_intent_id,
      notes
    });

    // Update PayoutRecord to payout_pending
    const payouts = await base44.asServiceRole.entities.PayoutRecord.filter({ linked_revenue_event_id: revenueEvent.id });
    for (const payout of (payouts || [])) {
      await base44.asServiceRole.entities.PayoutRecord.update(payout.id, { status: 'approved', approved_by: user.email, approved_at: new Date().toISOString() });
    }

    // Update assignment payment_status
    await base44.asServiceRole.entities.MediaAssignment.update(assignmentId, { payment_status: 'paid' });

    // Log
    await base44.asServiceRole.entities.OperationLog.create({
      entity_type: 'MediaAssignment',
      entity_id: assignmentId,
      action: 'assignment_payment_paid',
      metadata: JSON.stringify({
        media_assignment_id: assignmentId,
        revenue_event_id: revenueEvent.id,
        stripe_payment_intent_id: stripePaymentIntentId,
        previous_status: prevStatus,
        new_status: 'paid',
        acted_by_user_id: user.id
      }),
      created_at: new Date().toISOString()
    });

    return Response.json({ success: true, revenueEvent: { ...revenueEvent, status: 'paid' } });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});