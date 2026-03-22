import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const CLAIMABLE_TYPES = ['Driver', 'Team', 'Track', 'Series'];

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });

  const warnings = [];
  const errors = [];
  const missing_owner_sync = [];       // has owner_user_id but no owner EntityCollaborator
  const missing_owner_field = [];      // has owner EntityCollaborator but no owner_user_id
  const duplicate_owner_records = [];  // multiple owner EntityCollaborator for same entity
  const ownership_conflicts = [];      // owner_user_id doesn't match any owner EntityCollaborator

  let entities_checked = 0;

  // Load all owner EntityCollaborator records
  let allOwnerCollabs = [];
  try {
    allOwnerCollabs = await base44.asServiceRole.entities.EntityCollaborator.filter({ role: 'owner' }) || [];
  } catch (e) {
    errors.push(`Failed to load EntityCollaborator records: ${e.message}`);
  }

  // Group collabs by entity
  const collabsByEntity = {};
  for (const c of allOwnerCollabs) {
    const key = `${c.entity_type}::${c.entity_id}`;
    if (!collabsByEntity[key]) collabsByEntity[key] = [];
    collabsByEntity[key].push(c);
  }

  // Check duplicates
  for (const [key, records] of Object.entries(collabsByEntity)) {
    if (records.length > 1) {
      duplicate_owner_records.push({
        entity_key: key,
        entity_type: records[0].entity_type,
        entity_id: records[0].entity_id,
        owner_records: records.map(r => ({ id: r.id, user_id: r.user_id, user_email: r.user_email })),
        count: records.length,
      });
    }
  }

  // Per-entity-type checks
  for (const entityType of CLAIMABLE_TYPES) {
    let entities = [];
    try {
      entities = await base44.asServiceRole.entities[entityType].list('-created_date', 1000) || [];
    } catch (e) {
      errors.push(`Failed to load ${entityType}: ${e.message}`);
      continue;
    }

    entities_checked += entities.length;

    for (const entity of entities) {
      const key = `${entityType}::${entity.id}`;
      const ownerCollabs = collabsByEntity[key] || [];
      const hasOwnerCollab = ownerCollabs.length > 0;
      const hasOwnerUserId = !!entity.owner_user_id;

      // owner_user_id set but no matching owner collaborator
      if (hasOwnerUserId && !hasOwnerCollab) {
        missing_owner_sync.push({
          entity_type: entityType,
          entity_id: entity.id,
          entity_name: entity.name || entity.first_name ? `${entity.first_name} ${entity.last_name}` : entity.id,
          owner_user_id: entity.owner_user_id,
          issue: 'owner_user_id set but no owner EntityCollaborator record',
        });
      }

      // owner collaborator exists but owner_user_id not set
      if (hasOwnerCollab && !hasOwnerUserId) {
        missing_owner_field.push({
          entity_type: entityType,
          entity_id: entity.id,
          entity_name: entity.name || entity.first_name ? `${entity.first_name} ${entity.last_name}` : entity.id,
          owner_collab: ownerCollabs.map(c => ({ id: c.id, user_id: c.user_id, user_email: c.user_email })),
          issue: 'owner EntityCollaborator exists but entity.owner_user_id not set',
        });
      }

      // owner_user_id doesn't match any owner collaborator user_id
      if (hasOwnerUserId && hasOwnerCollab) {
        const matchingCollab = ownerCollabs.find(c => c.user_id === entity.owner_user_id);
        if (!matchingCollab) {
          ownership_conflicts.push({
            entity_type: entityType,
            entity_id: entity.id,
            entity_name: entity.name || entity.first_name ? `${entity.first_name} ${entity.last_name}` : entity.id,
            owner_user_id: entity.owner_user_id,
            owner_collabs: ownerCollabs.map(c => ({ id: c.id, user_id: c.user_id, user_email: c.user_email })),
            issue: 'owner_user_id does not match any owner EntityCollaborator user_id',
          });
        }
      }
    }
  }

  // Log the audit
  await base44.asServiceRole.entities.OperationLog.create({
    operation_type: 'ownership_audit_run',
    entity_name: 'EntityCollaborator',
    entity_id: 'audit',
    status: 'success',
    message: `Ownership audit completed: ${entities_checked} entities checked`,
    initiated_by: user.email,
    metadata: {
      entities_checked,
      missing_owner_sync_count: missing_owner_sync.length,
      missing_owner_field_count: missing_owner_field.length,
      duplicate_owner_records_count: duplicate_owner_records.length,
      ownership_conflicts_count: ownership_conflicts.length,
    },
  });

  return Response.json({
    entities_checked,
    missing_owner_sync,
    missing_owner_field,
    duplicate_owner_records,
    ownership_conflicts,
    warnings,
    errors,
    summary: {
      total_issues: missing_owner_sync.length + missing_owner_field.length + duplicate_owner_records.length + ownership_conflicts.length,
      clean: missing_owner_sync.length === 0 && missing_owner_field.length === 0 && duplicate_owner_records.length === 0 && ownership_conflicts.length === 0,
    },
  });
});