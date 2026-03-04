import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const {
      request_id,
      issuer_entity_id,
      reviewer_user_id,
      action,
      review_notes = '',
      approved_roles = null,
      approved_access_level = null,
      expires_at = null,
      event_expiry_buffer_hours = 12,
    } = payload;

    // Validate required fields
    if (!request_id || !issuer_entity_id || !reviewer_user_id || !action) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Load the credential request
    const credentialRequest = await base44.entities.CredentialRequest.get(request_id);
    if (!credentialRequest) {
      return Response.json({ error: 'Credential request not found' }, { status: 404 });
    }

    // Authority check: verify reviewer_user_id can act for issuer_entity_id
    const isAdmin = user.role === 'admin';
    if (!isAdmin) {
      const collaborators = await base44.entities.EntityCollaborator.filter({
        user_id: reviewer_user_id,
        entity_id: issuer_entity_id,
      });
      const hasAccess = collaborators.some(c => ['owner', 'editor'].includes(c.role));
      if (!hasAccess) {
        return Response.json({ error: 'Not authorized' }, { status: 403 });
      }
    }

    const now = new Date().toISOString();
    let updatedRequest = null;
    let credential = null;

    if (action === 'under_review') {
      updatedRequest = await base44.entities.CredentialRequest.update(request_id, {
        status: 'under_review',
        reviewed_by_user_id: reviewer_user_id,
        reviewed_at: now,
        review_notes: review_notes,
      });

      await base44.asServiceRole.entities.OperationLog.create({
        operation_type: 'media_request_under_review',
        source_type: 'media',
        entity_name: 'CredentialRequest',
        entity_id: request_id,
        status: 'success',
        metadata: {
          request_id,
          issuer_entity_id,
          reviewer_user_id,
        },
        notes: `Credential request moved to under_review by ${user.email}`,
      });

      return Response.json({ request: updatedRequest });
    }

    if (action === 'request_info') {
      const infoNote = `INFO_REQUEST: ${review_notes}`;
      updatedRequest = await base44.entities.CredentialRequest.update(request_id, {
        status: 'under_review',
        reviewed_by_user_id: reviewer_user_id,
        reviewed_at: now,
        review_notes: infoNote,
      });

      await base44.asServiceRole.entities.OperationLog.create({
        operation_type: 'media_request_info_requested',
        source_type: 'media',
        entity_name: 'CredentialRequest',
        entity_id: request_id,
        status: 'success',
        metadata: {
          request_id,
          issuer_entity_id,
          reviewer_user_id,
        },
        notes: `Info requested for credential request by ${user.email}`,
      });

      return Response.json({ request: updatedRequest });
    }

    if (action === 'deny') {
      updatedRequest = await base44.entities.CredentialRequest.update(request_id, {
        status: 'denied',
        reviewed_by_user_id: reviewer_user_id,
        reviewed_at: now,
        review_notes: review_notes,
      });

      await base44.asServiceRole.entities.OperationLog.create({
        operation_type: 'media_request_denied',
        source_type: 'media',
        entity_name: 'CredentialRequest',
        entity_id: request_id,
        status: 'success',
        metadata: {
          request_id,
          issuer_entity_id,
          reviewer_user_id,
        },
        notes: `Credential request denied by ${user.email}`,
      });

      return Response.json({ request: updatedRequest });
    }

    if (action === 'approve') {
      // Validate request status
      if (!['applied', 'under_review'].includes(credentialRequest.status)) {
        return Response.json(
          { error: `Cannot approve request with status: ${credentialRequest.status}` },
          { status: 400 }
        );
      }

      // Check for unresolved policy change requests
      const policyAcceptances = await base44.entities.PolicyAcceptance.filter({
        request_id,
        status: 'change_requested',
      });
      if (policyAcceptances.length > 0) {
        return Response.json(
          { error: 'Policy change requests must be resolved before approval' },
          { status: 400 }
        );
      }

      // Check waiver requirements
      const waiverTemplates = await base44.entities.WaiverTemplate.filter({
        entity_id: issuer_entity_id,
        active: true,
      });
      if (waiverTemplates.length > 0) {
        const waiverSignatures = await base44.entities.WaiverSignature.filter({
          holder_media_user_id: credentialRequest.holder_media_user_id,
          request_id,
        });
        if (waiverSignatures.length === 0) {
          const eventSigs = credentialRequest.related_event_id
            ? await base44.entities.WaiverSignature.filter({
                holder_media_user_id: credentialRequest.holder_media_user_id,
                event_id: credentialRequest.related_event_id,
              })
            : [];
          if (eventSigs.length === 0) {
            return Response.json({ error: 'Waiver required' }, { status: 400 });
          }
        }
      }

      // Determine scope and expiry
      let scopeEntityId = credentialRequest.target_entity_id;
      let credentialExpiresAt = expires_at;

      if (credentialRequest.related_event_id) {
        scopeEntityId = credentialRequest.related_event_id;
        // Calculate event-based expiry
        const event = await base44.entities.Event.get(credentialRequest.related_event_id);
        if (event) {
          const endDate = event.end_date || event.event_date;
          if (endDate) {
            const endDateTime = new Date(endDate);
            endDateTime.setHours(23, 59, 59, 999);
            endDateTime.setHours(endDateTime.getHours() + event_expiry_buffer_hours);
            credentialExpiresAt = endDateTime.toISOString();
          }
        }
      }

      // Create or update MediaCredential
      const existingCreds = await base44.entities.MediaCredential.filter({
        holder_media_user_id: credentialRequest.holder_media_user_id,
        scope_entity_id: scopeEntityId,
      });

      const credentialData = {
        issuer_entity_id,
        holder_media_user_id: credentialRequest.holder_media_user_id,
        scope_entity_id: scopeEntityId,
        scope_entity_type: credentialRequest.target_entity_type,
        roles: approved_roles || credentialRequest.requested_roles,
        access_level: approved_access_level || credentialRequest.requested_access_level,
        status: 'active',
        issued_at: now,
        expires_at: credentialExpiresAt,
      };

      if (existingCreds.length > 0) {
        // Update existing
        credential = await base44.entities.MediaCredential.update(
          existingCreds[0].id,
          credentialData
        );
      } else {
        // Create new
        credential = await base44.entities.MediaCredential.create(credentialData);
      }

      // Update request
      updatedRequest = await base44.entities.CredentialRequest.update(request_id, {
        status: 'approved',
        reviewed_by_user_id: reviewer_user_id,
        reviewed_at: now,
        review_notes: review_notes,
      });

      await base44.asServiceRole.entities.OperationLog.create({
        operation_type: 'media_request_approved',
        source_type: 'media',
        entity_name: 'CredentialRequest',
        entity_id: request_id,
        status: 'success',
        metadata: {
          request_id,
          credential_id: credential.id,
          issuer_entity_id,
          reviewer_user_id,
          scope_entity_id: scopeEntityId,
          expires_at: credentialExpiresAt,
        },
        notes: `Credential request approved by ${user.email}`,
      });

      return Response.json({ request: updatedRequest, credential });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});