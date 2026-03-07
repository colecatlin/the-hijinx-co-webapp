import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function generateNumericCode() {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { entity_type, entity_id } = await req.json();

  if (!entity_type || !entity_id) {
    return Response.json({ error: 'Missing required fields: entity_type, entity_id' }, { status: 400 });
  }

  // Find owner collaborator
  const owners = await base44.asServiceRole.entities.EntityCollaborator.filter({
    entity_type,
    entity_id,
    role: 'owner',
  });

  if (!owners || owners.length === 0) {
    return Response.json({ error: 'No owner collaborator found for this entity.' }, { status: 404 });
  }

  const ownerRecord = owners[0];

  // Already has a code — return it
  if (ownerRecord.access_code) {
    return Response.json({ collaborator: ownerRecord, generated: false });
  }

  // Generate unique 8-digit code
  let code;
  let attempts = 0;
  while (attempts < 20) {
    const candidate = generateNumericCode();
    const existing = await base44.asServiceRole.entities.EntityCollaborator.filter({
      access_code: candidate,
    });
    if (!existing || existing.length === 0) {
      code = candidate;
      break;
    }
    attempts++;
  }

  if (!code) {
    return Response.json({ error: 'Failed to generate a unique access code. Please try again.' }, { status: 500 });
  }

  const updated = await base44.asServiceRole.entities.EntityCollaborator.update(ownerRecord.id, {
    access_code: code,
  });

  return Response.json({ collaborator: updated, generated: true });
});