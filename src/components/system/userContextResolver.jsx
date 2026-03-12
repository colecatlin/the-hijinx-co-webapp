/**
 * User Context Resolver
 * 
 * Establishes EntityCollaborator as the source of truth for access.
 * Establishes primary_entity_type/primary_entity_id as the source of truth for context.
 * Treats legacy user.data entity fields as compatibility only.
 */

/**
 * Resolve all entities the user can manage
 * @param {Object} user - User record
 * @param {Array} collaborators - EntityCollaborator records for this user
 * @returns {Array} Managed entities sorted by role and type
 */
export function resolveUserManagedEntities(user, collaborators = []) {
  if (!user || !collaborators) return [];
  
  // Access truth comes from EntityCollaborator only
  const managed = collaborators
    .filter(c => c.user_id === user.id || c.user_email === user.email)
    .map(c => ({
      entity_id: c.entity_id,
      entity_type: c.entity_type,
      entity_name: c.entity_name,
      role: c.role,
      access_code: c.access_code,
    }))
    .sort((a, b) => {
      // Owners first, then editors; within each, sort by type
      if (a.role !== b.role) return a.role === 'owner' ? -1 : 1;
      return a.entity_type.localeCompare(b.entity_type);
    });

  return managed;
}

/**
 * Resolve primary entity for dashboard context
 * @param {Object} user - User record with primary_entity_type and primary_entity_id
 * @param {Array} collaborators - EntityCollaborator records
 * @returns {Object} { primary_entity, is_valid, suggested_primary }
 */
export function resolvePrimaryEntity(user, collaborators = []) {
  const managed = resolveUserManagedEntities(user, collaborators);
  
  // If primary entity is set and user still has valid access, use it
  if (user?.primary_entity_type && user?.primary_entity_id) {
    const hasPrimaryAccess = managed.some(
      m => m.entity_type === user.primary_entity_type && m.entity_id === user.primary_entity_id
    );
    
    if (hasPrimaryAccess) {
      const primary = managed.find(
        m => m.entity_type === user.primary_entity_type && m.entity_id === user.primary_entity_id
      );
      return {
        primary_entity: primary,
        is_valid: true,
        suggested_primary: null,
      };
    }
  }

  // Primary is invalid or unset. Choose a sensible fallback.
  // Priority: owned Track/Series > owned other > editor Track/Series > first editor
  
  const owned = managed.filter(m => m.role === 'owner');
  const edited = managed.filter(m => m.role === 'editor');
  
  const ownedTrackSeries = owned.find(m => ['Track', 'Series'].includes(m.entity_type));
  const ownedOther = owned[0];
  const editedTrackSeries = edited.find(m => ['Track', 'Series'].includes(m.entity_type));
  const editedFirst = edited[0];
  
  const suggestedPrimary = ownedTrackSeries || ownedOther || editedTrackSeries || editedFirst || null;
  
  return {
    primary_entity: user?.primary_entity_type && user?.primary_entity_id ? {
      entity_type: user.primary_entity_type,
      entity_id: user.primary_entity_id,
    } : null,
    is_valid: false,
    suggested_primary: suggestedPrimary,
  };
}

/**
 * Read legacy entity fields for diagnostics only
 * @param {Object} user - User record
 * @returns {Object} Legacy entity links
 */
export function resolveLegacyEntityLinks(user) {
  if (!user || !user.data) return {};
  
  return {
    legacy_driver_id: user.data.driver_id || null,
    legacy_team_id: user.data.team_id || null,
    legacy_series_id: user.data.series_id || null,
    legacy_track_id: user.data.track_id || null,
  };
}

/**
 * Detect conflicts between legacy fields and actual collaborator access
 * @param {Object} user - User record
 * @param {Array} collaborators - EntityCollaborator records
 * @returns {Array} Conflict objects with type and description
 */
export function detectUserContextConflicts(user, collaborators = []) {
  const conflicts = [];
  const managed = resolveUserManagedEntities(user, collaborators);
  const legacy = resolveLegacyEntityLinks(user);
  
  // Check each legacy field
  if (legacy.legacy_driver_id) {
    const hasDriverAccess = managed.some(
      m => m.entity_type === 'Driver' && m.entity_id === legacy.legacy_driver_id
    );
    if (!hasDriverAccess) {
      conflicts.push({
        type: 'legacy_driver_id_not_managed',
        legacy_value: legacy.legacy_driver_id,
        description: `User has legacy driver_id but no EntityCollaborator record for that driver`,
      });
    }
  }
  
  if (legacy.legacy_team_id) {
    const hasTeamAccess = managed.some(
      m => m.entity_type === 'Team' && m.entity_id === legacy.legacy_team_id
    );
    if (!hasTeamAccess) {
      conflicts.push({
        type: 'legacy_team_id_not_managed',
        legacy_value: legacy.legacy_team_id,
        description: `User has legacy team_id but no EntityCollaborator record for that team`,
      });
    }
  }
  
  if (legacy.legacy_series_id) {
    const hasSeriesAccess = managed.some(
      m => m.entity_type === 'Series' && m.entity_id === legacy.legacy_series_id
    );
    if (!hasSeriesAccess) {
      conflicts.push({
        type: 'legacy_series_id_not_managed',
        legacy_value: legacy.legacy_series_id,
        description: `User has legacy series_id but no EntityCollaborator record for that series`,
      });
    }
  }
  
  if (legacy.legacy_track_id) {
    const hasTrackAccess = managed.some(
      m => m.entity_type === 'Track' && m.entity_id === legacy.legacy_track_id
    );
    if (!hasTrackAccess) {
      conflicts.push({
        type: 'legacy_track_id_not_managed',
        legacy_value: legacy.legacy_track_id,
        description: `User has legacy track_id but no EntityCollaborator record for that track`,
      });
    }
  }
  
  // Check primary entity
  if (user?.primary_entity_type && user?.primary_entity_id) {
    const hasPrimaryAccess = managed.some(
      m => m.entity_type === user.primary_entity_type && m.entity_id === user.primary_entity_id
    );
    if (!hasPrimaryAccess) {
      conflicts.push({
        type: 'primary_entity_invalid',
        primary_type: user.primary_entity_type,
        primary_id: user.primary_entity_id,
        description: `User has primary entity set but no corresponding EntityCollaborator record`,
      });
    }
  } else if (managed.length > 0) {
    conflicts.push({
      type: 'primary_entity_missing',
      description: `User has managed entities but primary_entity_type/id not set`,
    });
  }
  
  return conflicts;
}

/**
 * Comprehensive user context snapshot
 * @param {Object} user - User record
 * @param {Array} collaborators - EntityCollaborator records
 * @returns {Object} Complete context with managed entities, primary entity, and conflicts
 */
export function resolveUserContext(user, collaborators = []) {
  const managed_entities = resolveUserManagedEntities(user, collaborators);
  const { primary_entity, is_valid, suggested_primary } = resolvePrimaryEntity(user, collaborators);
  const legacy_links = resolveLegacyEntityLinks(user);
  const conflicts = detectUserContextConflicts(user, collaborators);
  
  return {
    managed_entities,
    primary_entity,
    primary_entity_valid: is_valid,
    suggested_primary_entity: suggested_primary,
    legacy_links,
    conflicts,
    has_managed_entities: managed_entities.length > 0,
    needs_primary_entity_setup: managed_entities.length > 0 && !is_valid,
  };
}