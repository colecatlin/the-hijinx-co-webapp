import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { credential_id, requester_user_id, revoke_notes = '' } = payload;

    if (!credential_id || !requester_user_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Load credential
    const credential = await base44.entities.MediaCredential.get(credential_id);
    if (!credential) {
      return Response.json({ error: 'Credential not found' }, { status: 404 });
    }

    // Authority check
    const isAdmin = user.role === 'admin';
    if (!isAdmin) {
      const collaborators = await base44.entities.EntityCollaborator.filter({
        user_id: requester_user_id,
        entity_id: credential.issuer_entity_id,
      });
      const hasAccess = collaborators.some(c => c.role === 'owner');
      if (!hasAccess) {
        return Response.json({ error: 'Not authorized' }, { status: 403 });
      }
    }

    // Revoke credential
    const now = new Date().toISOString();
    const updatedCredential = await base44.entities.MediaCredential.update(credential_id, {
      status: 'revoked',
      revoked_at: now,
      revoked_by_user_id: requester_user_id,
      notes: (credential.notes ? credential.notes + ' | ' : '') + revoke_notes,
    });

    await base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'media_credential_revoked',
      source_type: 'media',
      entity_name: 'MediaCredential',
      entity_id: credential_id,
      status: 'success',
      metadata: {
        credential_id,
        holder_media_user_id: credential.holder_media_user_id,
        issuer_entity_id: credential.issuer_entity_id,
        requester_user_id,
      },
      notes: `Credential revoked by ${user.email}`,
    });

    return Response.json({ credential: updatedCredential });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});