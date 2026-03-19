import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    const {
      holder_user_id,
      applicant,
      target,
      requested,
      policy_responses,
      waiver_payloads,
      deliverable_responses,
    } = await req.json();

    // Validate required inputs
    if (!applicant?.full_name || !applicant?.legal_name || !applicant?.email) {
      return Response.json(
        { error: 'Missing required applicant fields' },
        { status: 400 }
      );
    }
    if (!target?.target_entity_id || !target?.target_entity_type) {
      return Response.json(
        { error: 'Missing target entity' },
        { status: 400 }
      );
    }

    // Create or update MediaUser
    let mediaUser;
    if (holder_user_id) {
      const existing = await base44.entities.MediaUser.filter({
        user_id: holder_user_id,
      });
      if (existing.length > 0) {
        mediaUser = await base44.entities.MediaUser.update(existing[0].id, {
          full_name: applicant.full_name,
          legal_name: applicant.legal_name,
          email: applicant.email,
          phone: applicant.phone,
          portfolio_url: applicant.portfolio_url,
          instagram_url: applicant.instagram_url,
          website_url: applicant.website_url,
        });
      } else {
        mediaUser = await base44.entities.MediaUser.create({
          user_id: holder_user_id,
          full_name: applicant.full_name,
          legal_name: applicant.legal_name,
          email: applicant.email,
          phone: applicant.phone,
          portfolio_url: applicant.portfolio_url,
          instagram_url: applicant.instagram_url,
          website_url: applicant.website_url,
          organization_id: applicant.organization_id,
          status: 'pending',
        });
      }
    } else {
      mediaUser = await base44.entities.MediaUser.create({
        full_name: applicant.full_name,
        legal_name: applicant.legal_name,
        email: applicant.email,
        phone: applicant.phone,
        portfolio_url: applicant.portfolio_url,
        instagram_url: applicant.instagram_url,
        website_url: applicant.website_url,
        organization_id: applicant.organization_id,
        status: 'pending',
      });
    }

    // Create CredentialRequest
    let requestStatus = 'applied';
    const credRequest = await base44.entities.CredentialRequest.create({
      holder_media_user_id: mediaUser.id,
      target_entity_type: target.target_entity_type,
      target_entity_id: target.target_entity_id,
      related_event_id: target.related_event_id,
      requested_access_level: requested?.requested_access_level || 'general',
      requested_roles: requested?.requested_roles || [],
      assignment_description: requested?.assignment_description,
      status: requestStatus,
    });

    // Process policy responses
    let policyCount = 0;
    if (policy_responses?.length > 0) {
      for (const pr of policy_responses) {
        const acceptance = await base44.entities.PolicyAcceptance.create({
          policy_id: pr.policy_id,
          holder_media_user_id: mediaUser.id,
          request_id: credRequest.id,
          status: pr.status,
          change_category: pr.change_category,
          change_details: pr.change_details,
        });
        policyCount++;
        if (pr.status === 'change_requested') {
          requestStatus = 'change_requested';
        }
      }
    }

    // Process waiver payloads
    let waiverCount = 0;
    if (waiver_payloads?.length > 0) {
      for (const wp of waiver_payloads) {
        const signature = await base44.entities.WaiverSignature.create({
          template_id: wp.template_id,
          holder_media_user_id: mediaUser.id,
          request_id: credRequest.id,
          event_id: target.related_event_id,
          signed_name: wp.signed_name,
          signed_email: wp.signed_email,
          signed_phone: wp.signed_phone,
          signed_pdf_drive_file_id: wp.signed_pdf_drive_file_id,
          signed_at: wp.signed_at || new Date().toISOString(),
          status: wp.signed_pdf_drive_file_id ? 'valid' : 'valid',
        });
        waiverCount++;
      }
    }

    // Process deliverable responses
    let deliverableCount = 0;
    if (deliverable_responses?.length > 0) {
      for (const dr of deliverable_responses) {
        const agreement = await base44.entities.DeliverableAgreement.create({
          requirement_id: dr.requirement_id,
          holder_media_user_id: mediaUser.id,
          request_id: credRequest.id,
          status: dr.status,
        });
        deliverableCount++;
      }
    }

    // Update request status if needed
    if (requestStatus !== 'applied') {
      await base44.entities.CredentialRequest.update(credRequest.id, {
        status: requestStatus,
      });
    }

    // Write operation log
    await base44.entities.OperationLog.create({
      operation_type: 'media_apply_for_credential',
      entity_name: 'CredentialRequest',
      entity_id: credRequest.id,
      status: 'success',
      performed_by_user_id: user?.id,
      metadata_json: JSON.stringify({
        media_user_id: mediaUser.id,
        target_entity: `${target.target_entity_type}:${target.target_entity_id}`,
        policies: policyCount,
        waivers: waiverCount,
        deliverables: deliverableCount,
      }),
    });

    return Response.json({
      request_id: credRequest.id,
      final_status: requestStatus,
      media_user_id: mediaUser.id,
      counts: {
        policies: policyCount,
        waivers: waiverCount,
        deliverables: deliverableCount,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});