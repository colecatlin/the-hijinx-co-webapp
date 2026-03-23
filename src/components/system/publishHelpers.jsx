/**
 * Unified Publish State Helpers
 * 
 * Centralizes the logic for determining if entities are published/public.
 * Used across Management, Race Core, and Public Motorsports subsystems.
 * 
 * SINGLE SOURCE OF TRUTH for publish state rules.
 */

/**
 * Check if a Driver is publicly visible
 */
export function isDriverPublic(driver) {
  if (!driver) return false;
  return driver.profile_status === 'live';
}

/**
 * Check if an Event is publicly visible
 * Requires publish_ready gate (both sides accepted and published per planning_rights)
 * AND status in publishable state
 */
export function isEventPublic(event) {
  if (!event) return false;
  // If publish_ready flag exists, use it; otherwise fall back to status check
  if (event.publish_ready === false) return false;
  return ['Published', 'Live', 'Completed'].includes(event.status);
}

/**
 * Check if a Session is officially published (results locked)
 */
export function isSessionOfficial(session) {
  if (!session) return false;
  return ['Official', 'Locked'].includes(session.status);
}

/**
 * Check if Standings are published
 */
export function isStandingsPublished(standings) {
  if (!standings) return false;
  return standings.published === true;
}

/**
 * Check if Results are publicly visible (session must be official)
 */
export function areResultsPublic(result, session) {
  if (!result || !session) return false;
  return isSessionOfficial(session);
}

/**
 * Check if a Team is publicly visible
 */
export function isTeamPublic(team) {
  if (!team) return false;
  return team.profile_status === 'live';
}

/**
 * Check if a Track is publicly visible
 */
export function isTrackPublic(track) {
  if (!track) return false;
  return track.profile_status === 'live';
}

/**
 * Check if a Series is publicly visible
 */
export function isSeriesPublic(series) {
  if (!series) return false;
  return series.profile_status === 'live';
}

/**
 * Check if an Outlet Story is published
 */
export function isStoryPublished(story) {
  if (!story) return false;
  return story.status === 'published';
}

/**
 * Filter array of entities by public status
 */
export function filterPublic(entities, entityType) {
  if (!entities || !Array.isArray(entities)) return [];
  
  return entities.filter(entity => {
    switch (entityType) {
      case 'Driver':
        return isDriverPublic(entity);
      case 'Event':
        return isEventPublic(entity);
      case 'Session':
        return isSessionOfficial(entity);
      case 'Team':
        return isTeamPublic(entity);
      case 'Track':
        return isTrackPublic(entity);
      case 'Series':
        return isSeriesPublic(entity);
      case 'OutletStory':
        return isStoryPublished(entity);
      case 'Standings':
        return isStandingsPublished(entity);
      default:
        return true;
    }
  });
}

/**
 * Get publish state summary for an entity
 * Returns: { isPublic: boolean, reason: string }
 */
export function getPublishStatus(entity, entityType) {
  const status = { isPublic: false, reason: '' };
  
  if (!entity) {
    status.reason = 'Entity not found';
    return status;
  }
  
  switch (entityType) {
    case 'Driver':
      status.isPublic = isDriverPublic(entity);
      status.reason = status.isPublic ? 'Profile live' : `Profile status: ${entity.profile_status}`;
      break;
      
    case 'Event':
      const statusOk = ['Published', 'Live', 'Completed'].includes(entity.status);
      const publishBlocked = entity.publish_ready === false;
      status.isPublic = statusOk && !publishBlocked;
      status.reason = publishBlocked ? 'Not publish ready' : statusOk ? 'Published' : `Status: ${entity.status}`;
      break;
      
    case 'Session':
      status.isPublic = isSessionOfficial(entity);
      status.reason = status.isPublic ? 'Official/Locked' : `Status: ${entity.status}`;
      break;
      
    case 'Standings':
      status.isPublic = isStandingsPublished(entity);
      status.reason = status.isPublic ? 'Published' : 'Not published';
      break;
      
    default:
      status.reason = 'Unknown entity type';
  }
  
  return status;
}