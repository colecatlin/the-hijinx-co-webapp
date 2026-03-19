import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * reviewMediaApplication
 *
 * Admin-only backend function to approve, deny, or flag a MediaApplication.
 * On approval: updates MediaApplication.status, grants workspace_access and media_roles on the User.
 *
 * Payload:
 *   application_id  - ID of the MediaApplication
 *   action          - 'approve' | 'deny' | 'needs_more_info'
 *   review_notes    - string (optional)
 *   granted_roles   - string[] (optional, for approve — overrides derived roles)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { application_id, action, review_notes, granted_roles } = await req.json();

    if (!application_id || !action) {
      return Response.json({ error: 'application_id and action are required' }, { status: 400 });
    }

    if (!['approve', 'deny', 'needs_more_info'].includes(action)) {
      return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Fetch the application
    const application = await base44.asServiceRole.entities.MediaApplication.get(application_id);
    if (!application) {
      return Response.json({ error: 'Application not found' }, { status: 404 });
    }

    const previousStatus = application.status;
    const now = new Date().toISOString();

    const statusMap = {
      approve: 'approved',
      deny: 'denied',
      needs_more_info: 'needs_more_info',
    };
    const newStatus = statusMap[action];

    // Build the update payload
    const updatePayload = {
      status: newStatus,
      reviewed_by: user.email,
      reviewed_at: now,
    };
    if (review_notes) updatePayload.review_notes = review_notes;

    let rolesGranted = [];

    if (action === 'approve') {
      // Derive roles from application types if not explicitly provided
      if (granted_roles && granted_roles.length > 0) {
        rolesGranted = granted_roles;
      } else {
        const appTypes = application.application_type || [];
        const roleMap = {
          writer: ['writer', 'contributor'],
          photographer: ['photographer', 'media_member'],
          videographer: ['videographer', 'media_member'],
          journalist: ['writer', 'contributor'],
          press: ['media_member', 'contributor'],
          editor_interest: ['editor', 'contributor'],
          outlet_representative: ['outlet_admin', 'media_member'],
          creator: ['contributor'],
        };
        const roleSet = new Set();
        for (const t of appTypes) {
          (roleMap[t] || []).forEach(r => roleSet.add(r));
        }
        rolesGranted = Array.from(roleSet);
      }
      updatePayload.granted_roles = rolesGranted;

      // Grant workspace_access and media_roles on the User record
      if (application.user_id) {
        const targetUser = await base44.asServiceRole.entities.User.get(application.user_id).catch(() => null);
        if (targetUser) {
          const existingWorkspace = targetUser.workspace_access || [];
          const existingRoles = targetUser.media_roles || [];

          const newWorkspace = Array.from(new Set([...existingWorkspace, 'media_contributor']));
          const newRoles = Array.from(new Set([...existingRoles, ...rolesGranted]));

          await base44.asServiceRole.entities.User.update(application.user_id, {
            workspace_access: newWorkspace,
            media_roles: newRoles,
          });
        }
      }

      // Auto-create MediaProfile for the approved contributor
      if (application.user_id) {
        try {
          const existingProfiles = await base44.asServiceRole.entities.MediaProfile
            .filter({ user_id: application.user_id }, '-created_date', 1).catch(() => []);

          if (existingProfiles.length === 0) {
            // Derive primary_role from application_type
            const roleMap = { writer: 'writer', journalist: 'journalist', photographer: 'photographer', videographer: 'videographer', editor_interest: 'editor', outlet_representative: 'outlet_representative', press: 'journalist', creator: 'creator' };
            const priority = ['editor_interest', 'journalist', 'writer', 'photographer', 'videographer', 'outlet_representative', 'press', 'creator'];
            const appTypes = application.application_type || [];
            let primaryRole = 'creator';
            for (const p of priority) {
              if (appTypes.includes(p)) { primaryRole = roleMap[p]; break; }
            }

            // Generate slug from display_name or email prefix
            const displayName = application.display_name || targetUser?.full_name || application.user_email?.split('@')[0] || 'contributor';
            const baseSlug = displayName.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '') || 'contributor';
            let slug = baseSlug;
            let counter = 1;
            while (true) {
              const existing = await base44.asServiceRole.entities.MediaProfile.filter({ slug }, '-created_date', 1).catch(() => []);
              if (existing.length === 0) break;
              counter++;
              slug = `${baseSlug}-${counter}`;
            }

            const profileData = {
              user_id: application.user_id,
              display_name: displayName,
              slug,
              profile_status: 'draft',
              verification_status: 'pending',
              public_visible: false,
              creator_directory_eligible: false,
              credentialed_media: false,
              primary_role: primaryRole,
              role_tags: appTypes,
              specialties: application.specialties || [],
              bio: application.bio || '',
              location_city: application.location_city || '',
              location_state: application.location_state || '',
              location_country: application.location_country || '',
              website_url: application.website_url || '',
              social_links: application.social_links || {},
              primary_affiliation_type: application.primary_affiliation_type || '',
              primary_outlet_name: application.primary_outlet_name || '',
              creator_terms_accepted: application.terms_accepted === true,
              creator_rights_acknowledged: application.usage_rights_accepted === true,
              availability_status: 'unavailable',
            };

            const newProfile = await base44.asServiceRole.entities.MediaProfile.create(profileData);

            await base44.asServiceRole.entities.OperationLog.create({
              operation_type: 'media_profile_created',
              entity_type: 'MediaProfile',
              entity_id: newProfile.id,
              user_email: application.user_email,
              status: 'success',
              message: `MediaProfile auto-created on approval for ${application.user_email}`,
              metadata: { user_id: application.user_id, media_profile_id: newProfile.id, acted_by_user_id: user.id, slug, source: 'auto_on_approval' },
            }).catch(() => {});

            await base44.asServiceRole.entities.OperationLog.create({
              operation_type: 'media_profile_slug_generated',
              entity_type: 'MediaProfile',
              entity_id: newProfile.id,
              user_email: application.user_email,
              status: 'success',
              message: `Slug "${slug}" generated for MediaProfile ${newProfile.id}`,
              metadata: { user_id: application.user_id, media_profile_id: newProfile.id, slug },
            }).catch(() => {});
          }
        } catch (profileErr) {
          // Non-fatal — log and continue
          console.error('Failed to auto-create MediaProfile:', profileErr.message);
        }
      }

      // Log media_access_granted
      await base44.asServiceRole.entities.OperationLog.create({
        operation_type: 'media_access_granted',
        entity_type: 'MediaApplication',
        entity_id: application_id,
        user_email: application.user_email,
        status: 'success',
        message: `Media contributor access granted to ${application.user_email} by ${user.email}`,
        metadata: {
          user_id: application.user_id,
          media_application_id: application_id,
          acted_by_user_id: user.id,
          granted_roles: rolesGranted,
        },
      }).catch(() => {});
    }

    // Update the application record
    await base44.asServiceRole.entities.MediaApplication.update(application_id, updatePayload);

    // Log the review action
    const opTypeMap = {
      approve: 'media_application_approved',
      deny: 'media_application_denied',
      needs_more_info: 'media_application_marked_needs_more_info',
    };
    await base44.asServiceRole.entities.OperationLog.create({
      operation_type: opTypeMap[action],
      entity_type: 'MediaApplication',
      entity_id: application_id,
      user_email: application.user_email,
      status: 'success',
      message: `Media application ${newStatus} by ${user.email}`,
      metadata: {
        user_id: application.user_id,
        media_application_id: application_id,
        acted_by_user_id: user.id,
        previous_status: previousStatus,
        new_status: newStatus,
        granted_roles: rolesGranted.length ? rolesGranted : undefined,
      },
    }).catch(() => {});

    return Response.json({
      success: true,
      application_id,
      new_status: newStatus,
      granted_roles: rolesGranted,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});