/**
 * Unified publish state helpers.
 * 
 * Normalizes publish checks across the system.
 * Public pages must use these helpers before rendering entities.
 */

/**
 * Check if a Driver entity is publicly visible.
 * @param {object} driver - Driver entity
 * @returns {boolean}
 */
export function isDriverPublic(driver) {
  if (!driver) return false;
  return driver.profile_status === 'live';
}

/**
 * Check if an Event entity is publicly visible.
 * @param {object} event - Event entity
 * @returns {boolean}
 */
export function isEventPublic(event) {
  if (!event) return false;
  const isPublishReady = event.publish_ready === true;
  const isPublishedStatus = ['Published', 'Live', 'Completed'].includes(event.status);
  return isPublishReady && isPublishedStatus;
}

/**
 * Check if a Session is publicly visible (Official or Locked results).
 * @param {object} session - Session entity
 * @returns {boolean}
 */
export function isSessionPublic(session) {
  if (!session) return false;
  return ['Official', 'Locked'].includes(session.status);
}

/**
 * Check if Standings are published.
 * @param {object} standings - Standings entity
 * @returns {boolean}
 */
export function areStandingsPublished(standings) {
  if (!standings) return false;
  return standings.published === true;
}

/**
 * Check if Results are from a public session.
 * @param {object} result - Results entity
 * @param {object} session - Associated Session entity
 * @returns {boolean}
 */
export function isResultPublic(result, session) {
  if (!result || !session) return false;
  return isSessionPublic(session);
}

/**
 * Check if a Team entity is publicly visible.
 * @param {object} team - Team entity
 * @returns {boolean}
 */
export function isTeamPublic(team) {
  if (!team) return false;
  return team.profile_status === 'live';
}

/**
 * Check if a Series entity is publicly visible.
 * @param {object} series - Series entity
 * @returns {boolean}
 */
export function isSeriesPublic(series) {
  if (!series) return false;
  // Series are typically always public once created
  return true;
}

/**
 * Filter an array of entities by public status.
 * @param {array} entities - Array of entities
 * @param {string} entityType - Type: 'Driver', 'Event', 'Session', 'Standings', etc.
 * @returns {array} Filtered entities
 */
export function filterPublic(entities, entityType) {
  if (!Array.isArray(entities)) return [];
  
  switch (entityType) {
    case 'Driver':
      return entities.filter(isDriverPublic);
    case 'Event':
      return entities.filter(isEventPublic);
    case 'Session':
      return entities.filter(isSessionPublic);
    case 'Standings':
      return entities.filter(areStandingsPublished);
    case 'Team':
      return entities.filter(isTeamPublic);
    case 'Series':
      return entities.filter(isSeriesPublic);
    default:
      return entities;
  }
}

export default {
  isDriverPublic,
  isEventPublic,
  isSessionPublic,
  areStandingsPublished,
  isResultPublic,
  isTeamPublic,
  isSeriesPublic,
  filterPublic,
};