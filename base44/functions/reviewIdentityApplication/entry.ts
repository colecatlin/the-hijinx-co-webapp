/**
 * reviewIdentityApplication
 *
 * Admin-only backend function that reviews an IdentityApplication.
 * On approval:
 *   - "new" path: creates a new entity (RacerProfile, Team, Track, Series,
 *     MediaProfile, or Organization) owned by the applicant, creates an
 *     approved EntityCollaborator (for entity-backed roles), and grants the
 *     capability to the applicant's User.profile_types.
 *   - "existing" path: creates an approved EntityCollaborator linking the
 *     applicant to the existing entity, and grants the capability.
 *   - capability-only roles (no application_entity_type): grants the
 *     capability without creating an entity or collaborator.
 * On rejection: marks the application as rejected with admin notes.
 * On needs_more_info: marks the application and surfaces admin notes to the applicant.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

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

// Map application_entity_type → EntityCollaborator entity_type
const COLLABORATOR_TYPE_MAP = {
  RacerProfile: 'Driver',
  Team: 'Team',
  Track: 'Track',
  Series: 'Series',
  Organization: null, // set per-role below
};

// Map role_key → Organization type (for EntityCollaborator + Organization creation)
const ORG_TYPE_MAP = {
  sponsor: 'Sponsor',
  vendor: 'Vendor',
  manufacturer: 'Manufacturer',
  partner: 'Sponsor', // default partner to Sponsor
};

// Map application_entity_type → SDK entity name + name field
const ENTITY_CREATE_MAP = {
  RacerProfile: { sdk: 'RacerProfile', nameField: 'display_name' },
  Team: { sdk: 'Team', nameField: 'name' },
  Track: { sdk: 'Track', nameField: 'name' },
  Series: { sdk: 'Series', nameField: 'name' },
  MediaProfile: { sdk: 'MediaProfile', nameField: 'display_name' },
  Organization: { sdk: 'Organization', nameField: 'name' },
};

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { application_id, action, admin_notes } = body || {};

    if (!application_id || !action) {
      return Response.json({ error: 'application_id and action are required' }, { status: 400 });
    }

    const validActions = ['approve', 'reject', 'needs_more_info'];
    if (!validActions.includes(action)) {
      return Response.json({ error: 'action must be approve, reject, or needs_more_info' }, { status: 400 });
    }

    // Load the application
    const apps = await base44.asServiceRole.entities.IdentityApplication.filter({ id: application_id });
    const app = apps?.[0];
    if (!app) return Response.json({ error: 'Application not found' }, { status: 404 });
    if (app.status !== 'pending' && app.status !== 'needs_more_info') {
      return Response.json({ error: 'Application is no longer actionable' }, { status: 400 });
    }

    const now = new Date().toISOString();

    // ── NEEDS MORE INFO ──────────────────────────────────────────────────────
    if (action === 'needs_more_info') {
      await base44.asServiceRole.entities.IdentityApplication.update(application_id, {
        status: 'needs_more_info',
        admin_notes: admin_notes || '',
        reviewed_by: user.id,
        reviewed_at: now,
      });
      return Response.json({ success: true, action, application_id });
    }

    // ── REJECT ───────────────────────────────────────────────────────────────
    if (action === 'reject') {
      await base44.asServiceRole.entities.IdentityApplication.update(application_id, {
        status: 'rejected',
        admin_notes: admin_notes || '',
        reviewed_by: user.id,
        reviewed_at: now,
      });
      return Response.json({ success: true, action, application_id });
    }

    // ── APPROVE ──────────────────────────────────────────────────────────────
    let createdEntityId = null;
    let createdCollaborationId = null;

    // Grant the capability to the applicant's profile_types
    try {
      const applicants = await base44.asServiceRole.entities.User.filter({ id: app.user_id });
      const applicant = applicants?.[0];
      if (applicant) {
        const currentTypes = applicant.profile_types || ['fan'];
        if (!currentTypes.includes(app.capability)) {
          await base44.asServiceRole.entities.User.update(applicant.id, {
            profile_types: [...currentTypes, app.capability],
          });
        }
      }
    } catch (e) {
      // Non-critical — the entity/collaborator is the important part
    }

    // Handle entity creation / linking based on application_mode
    if (app.application_mode === 'new' && app.application_entity_type) {
      const entityConfig = ENTITY_CREATE_MAP[app.application_entity_type];
      if (entityConfig) {
        // Build the entity record
        const entityData = {
          owner_user_id: app.user_id,
          visibility_status: 'draft',
        };
        entityData[entityConfig.nameField] = app.entity_name || app.user_name || 'New Profile';

        // Merge relevant role_fields into the entity (best-effort)
        if (app.role_fields) {
          const rf = app.role_fields;
          if (rf.primary_discipline) entityData.primary_discipline = rf.primary_discipline;
          if (rf.hometown) {
            entityData.hometown_city = rf.hometown;
            entityData.location_city = rf.hometown;
          }
          if (rf.team_discipline) entityData.primary_discipline = rf.team_discipline;
          if (rf.team_hq_location) entityData.location_city = rf.team_hq_location;
        }

        // Organization needs a type
        if (app.application_entity_type === 'Organization') {
          entityData.type = ORG_TYPE_MAP[app.role_key] || 'Sponsor';
        }

        try {
          const created = await base44.asServiceRole.entities[entityConfig.sdk].create(entityData);
          createdEntityId = created?.id || null;
        } catch (e) {
          // If entity creation fails, continue — the capability is still granted
        }

        // Create an approved EntityCollaborator for entity-backed roles
        if (createdEntityId) {
          let collaboratorType = COLLABORATOR_TYPE_MAP[app.application_entity_type];
          if (app.application_entity_type === 'Organization') {
            collaboratorType = ORG_TYPE_MAP[app.role_key] || 'Sponsor';
          }

          if (collaboratorType) {
            try {
              const accessCode = await generateUniqueCode(base44);
              if (accessCode) {
                const collab = await base44.asServiceRole.entities.EntityCollaborator.create({
                  user_id: app.user_id,
                  user_email: app.user_email,
                  entity_type: collaboratorType,
                  entity_id: createdEntityId,
                  entity_name: app.entity_name || app.user_name || 'New Profile',
                  role: 'owner',
                  role_key: app.role_key,
                  status: 'approved',
                  permission_level: 'admin',
                  granted_permissions: [],
                  access_code: accessCode,
                  requested_at: now,
                  reviewed_at: now,
                  reviewed_by: user.id,
                });
                createdCollaborationId = collab?.id || null;
              }
            } catch (e) {
              // Non-critical
            }
          }
        }
      }
    } else if (app.application_mode === 'existing' && app.entity_id && app.application_entity_type) {
      // Link to existing entity via EntityCollaborator
      let collaboratorType = COLLABORATOR_TYPE_MAP[app.application_entity_type];
      if (app.application_entity_type === 'Organization') {
        collaboratorType = ORG_TYPE_MAP[app.role_key] || 'Sponsor';
      }

      if (collaboratorType) {
        try {
          const accessCode = await generateUniqueCode(base44);
          if (accessCode) {
            const collab = await base44.asServiceRole.entities.EntityCollaborator.create({
              user_id: app.user_id,
              user_email: app.user_email,
              entity_type: collaboratorType,
              entity_id: app.entity_id,
              entity_name: app.entity_name || 'Existing Profile',
              role: app.role_key === 'team_member' || app.role_key === 'crew_member' ? 'editor' : 'owner',
              role_key: app.role_key,
              status: 'approved',
              permission_level: app.role_key === 'team_member' || app.role_key === 'crew_member' ? 'staff' : 'admin',
              granted_permissions: [],
              access_code: accessCode,
              requested_at: now,
              reviewed_at: now,
              reviewed_by: user.id,
            });
            createdCollaborationId = collab?.id || null;
          }
        } catch (e) {
          // Non-critical
        }
      }
    }
    // Capability-only roles (no application_entity_type): nothing more to do

    // Update the application
    await base44.asServiceRole.entities.IdentityApplication.update(application_id, {
      status: 'approved',
      admin_notes: admin_notes || '',
      reviewed_by: user.id,
      reviewed_at: now,
      created_entity_id: createdEntityId,
      created_collaboration_id: createdCollaborationId,
    });

    return Response.json({
      success: true,
      action: 'approve',
      application_id,
      created_entity_id: createdEntityId,
      created_collaboration_id: createdCollaborationId,
    });
  } catch (error) {
    return Response.json({ error: error.message || 'Internal error' }, { status: error.statusCode || 500 });
  }
}