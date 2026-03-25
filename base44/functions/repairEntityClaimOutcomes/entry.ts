import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

function generateNumericCode() {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}

async function generateUniqueCode(base44) {
  for (let i = 0; i < 20; i++) {
    const candidate = generateNumericCode();
    const existing = await base44.asServiceRole.entities.EntityCollaborator.filter({ access_code: candidate });
    if (!existing || existing.length === 0) return candidate;
  }
  return null;
}

const ENTITY_SDK_MAP = { Driver: 'Driver', Team: 'Team', Track: 'Track', Series: 'Series' };

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });

  const { dry_run = true } = await req.json().catch(() => ({}));

  const warnings = [];
  const errors = [];
  let claims_checked = 0;
  let claims_repaired = 0;
  let conflicts_skipped = 0;

  const [allClaims, allCollabs] = await Promise.all([
    base44.asServiceRole.entities.EntityClaimRequest.list('-created_date', 1000),
    base44.asServiceRole.entities.EntityCollaborator.list('-created_date', 2000),
  ]);

  const approvedClaims = allClaims.filter(c => c.status === 'approved');
  claims_checked = approvedClaims.length;

  for (const claim of approvedClaims) {
    const role = claim.granted_role || (
      ['approved_as_owner', 'ownership_overridden'].includes(claim.admin_resolution_type) ? 'owner' :
      claim.admin_resolution_type === 'approved_as_editor' ? 'editor' : 'owner'
    );

    const existingCollab = allCollabs.find(c =>
      c.user_id === claim.user_id &&
      c.entity_type === claim.entity_type &&
      c.entity_id === claim.entity_id
    );

    if (!existingCollab) {
      // Check for conflicting owners before creating
      const entityOwners = allCollabs.filter(c =>
        c.entity_type === claim.entity_type &&
        c.entity_id === claim.entity_id &&
        c.role === 'owner'
      );

      if (role === 'owner' && entityOwners.length > 0) {
        conflicts_skipped++;
        warnings.push(`Skipped repair for ${claim.entity_name} (${claim.entity_type}) — entity already has owner(s), manual review needed. Claim: ${claim.id}`);
        continue;
      }

      if (!dry_run) {
        const accessCode = await generateUniqueCode(base44);
        if (!accessCode) {
          errors.push(`Could not generate access code for claim ${claim.id}`);
          continue;
        }
        await base44.asServiceRole.entities.EntityCollaborator.create({
          user_id: claim.user_id,
          user_email: claim.user_email,
          entity_type: claim.entity_type,
          entity_id: claim.entity_id,
          entity_name: claim.entity_name,
          role,
          access_code: accessCode,
        });

        // Sync owner_user_id if owner role
        if (role === 'owner') {
          try {
            const entitySdk = base44.asServiceRole.entities[ENTITY_SDK_MAP[claim.entity_type]];
            if (entitySdk) await entitySdk.update(claim.entity_id, { owner_user_id: claim.user_id });
          } catch (_) {}
        }

        await base44.asServiceRole.entities.OperationLog.create({
          operation_type: 'entity_claim_repair_run',
          entity_name: 'EntityClaimRequest',
          entity_id: claim.id,
          status: 'success',
          message: `Repaired missing collaborator for ${claim.entity_name} (${claim.entity_type}) — ${claim.user_email} as ${role}`,
          initiated_by: user.email,
          metadata: {
            claim_request_id: claim.id,
            entity_type: claim.entity_type,
            entity_id: claim.entity_id,
            claimant_user_id: claim.user_id,
            granted_role: role,
            acted_by_user_id: user.id,
            dry_run: false,
          },
        });
      }

      claims_repaired++;
      warnings.push(`${dry_run ? '[DRY RUN] Would repair' : 'Repaired'}: missing collaborator for ${claim.entity_name} (${claim.entity_type}) — ${claim.user_email} as ${role}`);
    }
  }

  return Response.json({
    dry_run,
    claims_checked,
    claims_repaired,
    conflicts_skipped,
    warnings,
    errors,
  });
});