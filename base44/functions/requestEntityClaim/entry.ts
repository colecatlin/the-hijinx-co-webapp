import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const VALID_ENTITY_TYPES = ['Driver', 'Team', 'Track', 'Series'];

const DISPUTE_REASON_LABELS = {
  rightful_owner: 'I am the rightful owner of this profile',
  incorrect_current_claim: 'This profile was incorrectly claimed by someone else',
  should_have_management_access: 'I should have management access to this profile',
  ownership_review_requested: 'I am requesting an admin review of current ownership',
  other: 'Other reason',
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const {
    entity_type,
    entity_id,
    message,
    claim_mode,
    claim_type, // legacy support
    dispute_reason,
  } = await req.json();

  if (!entity_type || !entity_id) {
    return Response.json({ error: 'entity_type and entity_id are required' }, { status: 400 });
  }

  if (!VALID_ENTITY_TYPES.includes(entity_type)) {
    return Response.json({ error: 'Invalid entity_type' }, { status: 400 });
  }

  // Normalize claim_mode (support old claim_type field too)
  const resolvedMode = claim_mode || (claim_type === 'dispute' ? 'dispute' : 'claim');
  const validModes = ['claim', 'dispute', 'access_request'];
  if (!validModes.includes(resolvedMode)) {
    return Response.json({ error: 'Invalid claim_mode' }, { status: 400 });
  }

  // Look up entity
  let entityName = '';
  let existingOwnerUserId = null;

  try {
    const entityMap = {
      Driver: base44.asServiceRole.entities.Driver,
      Team: base44.asServiceRole.entities.Team,
      Track: base44.asServiceRole.entities.Track,
      Series: base44.asServiceRole.entities.Series,
    };
    const found = await entityMap[entity_type].get(entity_id).catch(() => null);
    if (!found) return Response.json({ error: 'Entity not found' }, { status: 404 });
    entityName = found.first_name ? `${found.first_name} ${found.last_name}` : found.name || entity_id;

    // Capture current owner for dispute context
    if (resolvedMode === 'dispute' || resolvedMode === 'access_request') {
      const owners = await base44.asServiceRole.entities.EntityCollaborator.filter({
        entity_type, entity_id, role: 'owner',
      });
      if (owners && owners.length > 0) {
        existingOwnerUserId = owners[0].user_id || null;
      }
    }
  } catch (err) {
    return Response.json({ error: 'Could not verify entity' }, { status: 500 });
  }

  // Prevent duplicate pending claim
  const existing = await base44.asServiceRole.entities.EntityClaimRequest.filter({
    user_id: user.id,
    entity_type,
    entity_id,
    status: 'pending',
  });
  if (existing && existing.length > 0) {
    return Response.json({ error: 'You already have a pending claim for this entity.' }, { status: 409 });
  }

  // Check if user already has collaborator access
  const collabs = await base44.asServiceRole.entities.EntityCollaborator.filter({
    user_id: user.id,
    entity_type,
    entity_id,
  });
  if (collabs && collabs.length > 0) {
    return Response.json({ error: 'You already have access to this entity.' }, { status: 409 });
  }

  // For standard claims only: block if entity already has an owner
  if (resolvedMode === 'claim') {
    const owners = await base44.asServiceRole.entities.EntityCollaborator.filter({
      entity_type, entity_id, role: 'owner',
    });
    if (owners && owners.length > 0) {
      return Response.json({
        error: 'This entity already has an owner. Use "Request ownership review" if you believe there is an error.',
      }, { status: 409 });
    }
  }

  // Build justification string
  let justification = message || '';
  if ((resolvedMode === 'dispute' || resolvedMode === 'access_request') && dispute_reason) {
    const reasonLabel = DISPUTE_REASON_LABELS[dispute_reason] || dispute_reason;
    justification = message ? `${reasonLabel} — ${message}` : reasonLabel;
  }

  const now = new Date().toISOString();

  const claim = await base44.asServiceRole.entities.EntityClaimRequest.create({
    user_id: user.id,
    user_email: user.email,
    entity_type,
    entity_id,
    entity_name: entityName,
    justification,
    claim_mode: resolvedMode,
    claim_type: resolvedMode === 'dispute' ? 'dispute' : 'claim', // legacy compat
    dispute_reason: dispute_reason || null,
    existing_owner_user_id: existingOwnerUserId,
    status: 'pending',
  });

  const opTypeMap = {
    claim: 'entity_claim_submitted',
    dispute: 'entity_claim_dispute_submitted',
    access_request: 'entity_claim_access_request_submitted',
  };

  await base44.asServiceRole.entities.OperationLog.create({
    operation_type: opTypeMap[resolvedMode] || 'entity_claim_submitted',
    entity_name: 'EntityClaimRequest',
    entity_id: claim.id,
    status: 'success',
    message: `${resolvedMode} submitted for ${entityName} (${entity_type}) by ${user.email}`,
    initiated_by: user.email,
    metadata: {
      claim_request_id: claim.id,
      entity_type,
      entity_id,
      entity_name: entityName,
      claimant_user_id: user.id,
      claim_mode: resolvedMode,
      dispute_reason: dispute_reason || null,
      existing_owner_user_id: existingOwnerUserId,
    },
  });

  return Response.json({ ok: true, claim_id: claim.id, entity_name: entityName });
});