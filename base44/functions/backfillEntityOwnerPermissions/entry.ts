import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const CLAIMABLE_TYPES = ['Driver', 'Team', 'Track', 'Series'];

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

function getEntityDisplayName(entity, entityType) {
  if (entityType === 'Driver') return `${entity.first_name || ''} ${entity.last_name || ''}`.trim() || entity.id;
  return entity.name || entity.id;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });

  const { dry_run = false } = await req.json().catch(() => ({}));

  let records_checked = 0;
  let records_created = 0;
  let records_updated = 0;
  let duplicates_skipped = 0;
  const warnings = [];
  const errors = [];

  // Load all existing owner collaborator records for fast lookup
  let allOwnerCollabs = [];
  try {
    allOwnerCollabs = await base44.asServiceRole.entities.EntityCollaborator.filter({ role: 'owner' }) || [];
  } catch (e) {
    return Response.json({ error: `Failed to load EntityCollaborator records: ${e.message}` }, { status: 500 });
  }

  const collabsByEntity = {};
  for (const c of allOwnerCollabs) {
    const key = `${c.entity_type}::${c.entity_id}`;
    if (!collabsByEntity[key]) collabsByEntity[key] = [];
    collabsByEntity[key].push(c);
  }

  for (const entityType of CLAIMABLE_TYPES) {
    let entities = [];
    try {
      entities = await base44.asServiceRole.entities[entityType].list('-created_date', 1000) || [];
    } catch (e) {
      errors.push(`Failed to load ${entityType}: ${e.message}`);
      continue;
    }

    for (const entity of entities) {
      records_checked++;
      if (!entity.owner_user_id) continue; // nothing to sync

      const key = `${entityType}::${entity.id}`;
      const ownerCollabs = collabsByEntity[key] || [];
      const entityName = getEntityDisplayName(entity, entityType);

      // Dedup check: multiple owner collabs for same entity
      if (ownerCollabs.length > 1) {
        duplicates_skipped++;
        warnings.push(`Duplicate owner records for ${entityType} ${entity.id} — skipping, manual review required`);
        continue;
      }

      const matchingOwnerCollab = ownerCollabs.find(c => c.user_id === entity.owner_user_id);

      if (matchingOwnerCollab) {
        // Already in sync — nothing to do
        continue;
      }

      // Owner collab for a different user exists — mismatch, skip with warning
      if (ownerCollabs.length > 0 && ownerCollabs[0].user_id !== entity.owner_user_id) {
        warnings.push(
          `${entityType} ${entity.id} has owner_user_id=${entity.owner_user_id} but owner collab belongs to ${ownerCollabs[0].user_id} — skipping, resolve manually`
        );
        await base44.asServiceRole.entities.OperationLog.create({
          operation_type: 'ownership_conflict_detected',
          entity_name: entityType,
          entity_id: entity.id,
          status: 'failed',
          message: `Ownership conflict: owner_user_id (${entity.owner_user_id}) does not match existing owner collab user (${ownerCollabs[0].user_id})`,
          initiated_by: user.email,
          metadata: {
            entity_type: entityType,
            entity_id: entity.id,
            new_owner_user_id: entity.owner_user_id,
            previous_owner_user_id: ownerCollabs[0].user_id,
            acted_by_user_id: user.id,
            collaborator_record_id: ownerCollabs[0].id,
          },
        });
        continue;
      }

      // No owner collab exists — create one
      if (!dry_run) {
        try {
          // Look up user email
          let userEmail = '';
          try {
            const users = await base44.asServiceRole.entities.User.filter({ id: entity.owner_user_id });
            userEmail = users[0]?.email || '';
          } catch (_) {}

          // Also check all collabs for this entity to reuse access code
          const allEntityCollabs = await base44.asServiceRole.entities.EntityCollaborator.filter({
            entity_type: entityType,
            entity_id: entity.id,
          });
          const existingCode = allEntityCollabs.find(c => c.access_code)?.access_code;
          const accessCode = existingCode || (await generateUniqueCode(base44));

          if (!accessCode) {
            errors.push(`Could not generate access code for ${entityType} ${entity.id}`);
            continue;
          }

          const created = await base44.asServiceRole.entities.EntityCollaborator.create({
            user_id: entity.owner_user_id,
            user_email: userEmail,
            entity_type: entityType,
            entity_id: entity.id,
            entity_name: entityName,
            role: 'owner',
            access_code: accessCode,
          });

          records_created++;

          await base44.asServiceRole.entities.OperationLog.create({
            operation_type: 'entity_owner_backfilled',
            entity_name: entityType,
            entity_id: entity.id,
            status: 'success',
            message: `Owner collaborator backfilled for ${entityName} (${entityType}) → user ${entity.owner_user_id}`,
            initiated_by: user.email,
            metadata: {
              entity_type: entityType,
              entity_id: entity.id,
              new_owner_user_id: entity.owner_user_id,
              acted_by_user_id: user.id,
              collaborator_record_id: created?.id || null,
            },
          });
        } catch (e) {
          errors.push(`Failed to create collaborator for ${entityType} ${entity.id}: ${e.message}`);
        }
      } else {
        records_created++; // dry-run count only
      }
    }
  }

  await base44.asServiceRole.entities.OperationLog.create({
    operation_type: 'entity_owner_permissions_synced',
    entity_name: 'EntityCollaborator',
    entity_id: 'backfill',
    status: errors.length > 0 ? 'completed' : 'success',
    message: `Owner permissions backfill ${dry_run ? '(dry run)' : ''}: ${records_created} created, ${records_updated} updated, ${duplicates_skipped} skipped`,
    initiated_by: user.email,
    metadata: {
      records_checked,
      records_created,
      records_updated,
      duplicates_skipped,
      dry_run,
    },
  });

  return Response.json({
    records_checked,
    records_created,
    records_updated,
    duplicates_skipped,
    warnings,
    errors,
    dry_run,
  });
});