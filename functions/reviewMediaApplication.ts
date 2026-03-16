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