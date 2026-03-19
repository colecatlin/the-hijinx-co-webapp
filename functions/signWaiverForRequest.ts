import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const {
      request_id,
      template_id,
      holder_media_user_id,
      signed_name,
      signed_email,
      signed_phone,
      date_of_birth,
      emergency_contact_name,
      emergency_contact_phone,
      signature_image,
      user_agent,
      ip_address,
    } = await req.json();

    if (!request_id || !template_id || !holder_media_user_id || !signed_name || !signed_email) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate the request exists and belongs to this media user
    const credReq = await base44.entities.CredentialRequest.get(request_id);
    if (!credReq) return Response.json({ error: 'Request not found' }, { status: 404 });
    if (credReq.holder_media_user_id !== holder_media_user_id) {
      return Response.json({ error: 'Request does not belong to this media user' }, { status: 403 });
    }

    // Validate the template is active and required
    const template = await base44.entities.WaiverTemplate.get(template_id);
    if (!template || !template.active) {
      return Response.json({ error: 'Template not found or inactive' }, { status: 404 });
    }

    // Verify template is in the required list
    const requiredRes = await base44.functions.invoke('getRequiredWaiversForRequest', { request_id });
    const requiredTemplateIds = (requiredRes?.data?.templates || []).map(t => t.id);
    if (!requiredTemplateIds.includes(template_id)) {
      return Response.json({ error: 'Template not required for this request' }, { status: 400 });
    }

    const now = new Date().toISOString();

    // Check for existing signature to upsert
    const existing = await base44.entities.WaiverSignature.filter({
      holder_media_user_id,
      template_id,
      request_id,
    });

    let signature;
    const sigData = {
      template_id,
      holder_media_user_id,
      request_id,
      event_id: credReq.related_event_id || undefined,
      signed_name,
      signed_email,
      signed_phone: signed_phone || undefined,
      date_of_birth: date_of_birth || undefined,
      emergency_contact_name: emergency_contact_name || undefined,
      emergency_contact_phone: emergency_contact_phone || undefined,
      signature_image: signature_image || undefined,
      ip_address: ip_address || undefined,
      user_agent: user_agent || undefined,
      signed_at: now,
      status: 'valid',
    };

    if (existing.length > 0) {
      signature = await base44.entities.WaiverSignature.update(existing[0].id, sigData);
    } else {
      signature = await base44.entities.WaiverSignature.create({ ...sigData, created_at: now });
    }

    return Response.json({ signature });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});