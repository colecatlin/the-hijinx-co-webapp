import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Find all active event credentials that have expired
    const allCredentials = await base44.entities.MediaCredential.filter({
      status: 'active',
    });

    const now = new Date().toISOString();
    let expiredCount = 0;

    for (const cred of allCredentials) {
      if (
        cred.scope_entity_type === 'event' &&
        cred.expires_at &&
        cred.expires_at < now
      ) {
        await base44.entities.MediaCredential.update(cred.id, {
          status: 'expired',
        });
        expiredCount++;
      }
    }

    // Write operation log
    await base44.entities.OperationLog.create({
      operation_type: 'media_expire_event_credentials',
      entity_name: 'MediaCredential',
      status: 'success',
      metadata_json: JSON.stringify({
        expired_count: expiredCount,
      }),
    });

    return Response.json({
      expired_count: expiredCount,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});