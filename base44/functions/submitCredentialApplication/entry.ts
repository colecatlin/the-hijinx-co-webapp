import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * submitCredentialApplication
 * Validates all required waivers are signed before moving request to applied/change_requested.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { request_id } = await req.json();
    if (!request_id) return Response.json({ error: 'request_id required' }, { status: 400 });

    const credReq = await base44.entities.CredentialRequest.get(request_id);
    if (!credReq) return Response.json({ error: 'Request not found' }, { status: 404 });

    // --- Waiver gate ---
    const waiverRes = await base44.functions.invoke('getRequiredWaiversForRequest', { request_id });
    const requiredTemplates = waiverRes?.data?.templates || [];

    if (requiredTemplates.length > 0) {
      const existingSigs = await base44.entities.WaiverSignature.filter({
        holder_media_user_id: credReq.holder_media_user_id,
        request_id,
      });
      const signedTemplateIds = new Set(
        existingSigs.filter(s => s.status === 'valid').map(s => s.template_id)
      );
      const missingTemplateIds = requiredTemplates
        .filter(t => !signedTemplateIds.has(t.id))
        .map(t => t.id);

      if (missingTemplateIds.length > 0) {
        return Response.json({
          error: 'Missing required waiver signatures',
          missing_template_ids: missingTemplateIds,
        }, { status: 422 });
      }
    }

    // --- Deliverable agreement gate ---
    const delivReqs = await base44.functions.invoke('getDeliverableRequirementsForRequest', { request_id });
    const requiredDeliverables = delivReqs?.data?.requirements || [];

    if (requiredDeliverables.length > 0) {
      const existingAgreements = await base44.entities.DeliverableAgreement.filter({ request_id });
      const acceptedReqIds = new Set(
        existingAgreements.filter(a => a.status === 'accepted').map(a => a.requirement_id)
      );
      const missingAgreements = requiredDeliverables
        .filter(r => !acceptedReqIds.has(r.id))
        .map(r => r.id);

      if (missingAgreements.length > 0) {
        return Response.json({
          error: 'Missing required deliverable acknowledgements',
          missing_requirement_ids: missingAgreements,
        }, { status: 422 });
      }
    }

    // --- Policy gate: check for change_requested acceptances ---
    const policyAcceptances = await base44.entities.PolicyAcceptance.filter({ request_id });
    const hasChangeRequested = policyAcceptances.some(pa => pa.status === 'change_requested');
    const newStatus = hasChangeRequested ? 'change_requested' : 'applied';

    const updated = await base44.entities.CredentialRequest.update(request_id, {
      status: newStatus,
      updated_at: new Date().toISOString(),
    });

    return Response.json({ request: updated, status: newStatus });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});