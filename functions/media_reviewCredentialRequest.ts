import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      request_id,
      decision,
      review_notes,
      issuer_entity_id,
      buffer_hours = 12,
    } = await req.json();

    if (!request_id || !decision) {
      return Response.json(
        { error: 'Missing request_id or decision' },
        { status: 400 }
      );
    }

    // Fetch the credential request
    const credRequest = await base44.entities.CredentialRequest.list().then(
      (all) => all.find((cr) => cr.id === request_id)
    );

    if (!credRequest) {
      return Response.json(
        { error: 'CredentialRequest not found' },
        { status: 404 }
      );
    }

    // Update request status
    await base44.entities.CredentialRequest.update(request_id, {
      status: decision,
      reviewed_by_user_id: user.id,
      reviewed_at: new Date().toISOString(),
      review_notes,
    });

    let credential_id = null;

    // If approved, issue credential
    if (decision === 'approved') {
      // Calculate expiry for event scopes
      let expires_at = null;
      if (credRequest.target_entity_type === 'event') {
        const event = await base44.entities.Event.list().then((all) =>
          all.find((e) => e.id === credRequest.target_entity_id)
        );
        if (event) {
          const eventDate = new Date(event.end_date || event.event_date);
          const expiryDate = new Date(
            eventDate.getTime() + buffer_hours * 3600000
          );
          expires_at = expiryDate.toISOString();
        }
      }

      // Check for existing credential (one per media user per scope)
      const existing = await base44.entities.MediaCredential.filter({
        holder_media_user_id: credRequest.holder_media_user_id,
        scope_entity_type: credRequest.target_entity_type,
        scope_entity_id: credRequest.target_entity_id,
      });

      let credential;
      if (existing.length > 0) {
        // Update existing
        credential = await base44.entities.MediaCredential.update(
          existing[0].id,
          {
            status: 'active',
            issued_at: new Date().toISOString(),
            expires_at,
            roles: credRequest.requested_roles || [],
            access_level: credRequest.requested_access_level || 'general',
            issuer_entity_id,
          }
        );
      } else {
        // Create new
        credential = await base44.entities.MediaCredential.create({
          holder_media_user_id: credRequest.holder_media_user_id,
          scope_entity_type: credRequest.target_entity_type,
          scope_entity_id: credRequest.target_entity_id,
          issuer_entity_id,
          roles: credRequest.requested_roles || [],
          access_level: credRequest.requested_access_level || 'general',
          status: 'active',
          issued_at: new Date().toISOString(),
          expires_at,
        });
      }
      credential_id = credential.id;
    }

    // Write operation log
    await base44.entities.OperationLog.create({
      operation_type: 'media_review_credential_request',
      entity_name: 'CredentialRequest',
      entity_id: request_id,
      status: 'success',
      performed_by_user_id: user.id,
      metadata_json: JSON.stringify({
        decision,
        credential_id,
        issuer_entity_id,
      }),
    });

    return Response.json({
      request_id,
      decision,
      credential_id,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});