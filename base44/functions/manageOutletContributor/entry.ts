import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * manageOutletContributor
 *
 * Admin-only in V1. Adds or removes a contributor from a MediaOutlet,
 * and syncs the affiliation back onto the contributor's MediaProfile.
 *
 * Payload:
 *   outlet_id         - required
 *   profile_id        - required (MediaProfile ID)
 *   action            - 'add' | 'remove'
 *   affiliation_type  - 'primary' | 'secondary' (default: 'secondary')
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { outlet_id, profile_id, action, affiliation_type = 'secondary' } = await req.json();
    if (!outlet_id || !profile_id || !action) {
      return Response.json({ error: 'outlet_id, profile_id, and action are required' }, { status: 400 });
    }
    if (!['add', 'remove'].includes(action)) {
      return Response.json({ error: 'action must be add or remove' }, { status: 400 });
    }

    const [outlet, profile] = await Promise.all([
      base44.asServiceRole.entities.MediaOutlet.get(outlet_id).catch(() => null),
      base44.asServiceRole.entities.MediaProfile.get(profile_id).catch(() => null),
    ]);

    if (!outlet) return Response.json({ error: 'MediaOutlet not found' }, { status: 404 });
    if (!profile) return Response.json({ error: 'MediaProfile not found' }, { status: 404 });

    const profileIds = outlet.contributor_profile_ids || [];
    const userIds = outlet.contributor_user_ids || [];
    const previousPrimaryOutlet = profile.primary_outlet_id;

    let newProfileIds, newUserIds;
    let profileUpdate = {};

    if (action === 'add') {
      newProfileIds = Array.from(new Set([...profileIds, profile_id]));
      newUserIds = profile.user_id ? Array.from(new Set([...userIds, profile.user_id])) : userIds;

      if (affiliation_type === 'primary') {
        profileUpdate.primary_outlet_id = outlet_id;
        profileUpdate.primary_outlet_name = outlet.name;
        profileUpdate.primary_affiliation_type = outlet.outlet_type === 'team_media' ? 'team_media'
          : outlet.outlet_type === 'series_media' ? 'series_media'
          : outlet.outlet_type === 'track_media' ? 'track_media'
          : 'outlet';
      } else {
        const secondaryIds = profile.secondary_outlet_ids || [];
        profileUpdate.secondary_outlet_ids = Array.from(new Set([...secondaryIds, outlet_id]));
      }
    } else {
      newProfileIds = profileIds.filter(id => id !== profile_id);
      newUserIds = userIds.filter(id => id !== profile.user_id);

      // Remove outlet reference from profile
      if (profile.primary_outlet_id === outlet_id) {
        profileUpdate.primary_outlet_id = null;
        profileUpdate.primary_outlet_name = null;
      }
      const secondaryIds = profile.secondary_outlet_ids || [];
      if (secondaryIds.includes(outlet_id)) {
        profileUpdate.secondary_outlet_ids = secondaryIds.filter(id => id !== outlet_id);
      }
    }

    // Apply both updates in parallel
    await Promise.all([
      base44.asServiceRole.entities.MediaOutlet.update(outlet_id, {
        contributor_profile_ids: newProfileIds,
        contributor_user_ids: newUserIds,
      }),
      Object.keys(profileUpdate).length > 0
        ? base44.asServiceRole.entities.MediaProfile.update(profile_id, profileUpdate)
        : Promise.resolve(),
    ]);

    const opType = action === 'add' ? 'media_outlet_contributor_added' : 'media_outlet_contributor_removed';
    await base44.asServiceRole.entities.OperationLog.create({
      operation_type: opType,
      entity_type: 'MediaOutlet',
      entity_id: outlet_id,
      user_email: user.email,
      status: 'success',
      message: `Contributor profile ${profile_id} ${action === 'add' ? 'added to' : 'removed from'} outlet "${outlet.name}" by ${user.email}`,
      metadata: {
        media_outlet_id: outlet_id,
        media_profile_id: profile_id,
        user_id: profile.user_id,
        acted_by_user_id: user.id,
        affiliation_type,
      },
    }).catch(() => {});

    if (affiliation_type === 'primary' && action === 'add' && previousPrimaryOutlet !== outlet_id) {
      await base44.asServiceRole.entities.OperationLog.create({
        operation_type: 'media_outlet_primary_affiliation_changed',
        entity_type: 'MediaProfile',
        entity_id: profile_id,
        user_email: user.email,
        status: 'success',
        message: `Primary outlet affiliation changed to "${outlet.name}" for profile ${profile_id}`,
        metadata: {
          media_outlet_id: outlet_id,
          media_profile_id: profile_id,
          user_id: profile.user_id,
          acted_by_user_id: user.id,
          previous_affiliation: previousPrimaryOutlet,
          new_affiliation: outlet_id,
        },
      }).catch(() => {});
    }

    return Response.json({ success: true, outlet_id, profile_id, action, affiliation_type });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});