import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { credential_id, reason } = await req.json();

    if (!credential_id) {
      return Response.json(
        { error: 'Missing credential_id' },
        { status: 400 }
      );
    }

    // Fetch the credential
    const credential = await base44.entities.MediaCredential.list().then(
      (all) => all.find((c) => c.id === credential_id)
    );

    if (!credential) {
      return Response.json(
        { error: 'Credential not found' },
        { status: 404 }
      );
    }

    // Revoke the credential
    const updated = await base44.entities.MediaCredential.update(credential_id, {
      status: 'revoked',
      revoked_at: new Date().toISOString(),
      revoked_by_user_id: user.id,
      notes: reason || 'Revoked by user',
    });

    // Write operation log
    await base44.entities.OperationLog.create({
      operation_type: 'media_revoke_credential',
      entity_name: 'MediaCredential',
      entity_id: credential_id,
      status: 'success',
      performed_by_user_id: user.id,
      metadata_json: JSON.stringify({
        reason,
        holder_media_user_id: credential.holder_media_user_id,
      }),
    });

    return Response.json({
      credential_id,
      status: 'revoked',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});