/**
 * Publish Model
 * 
 * Centralized rules for publish state and public visibility across all entities.
 * Ensures public motorsports pages never leak draft or internal operational data.
 * 
 * Does not change entity schemas—applies rules to existing data structures.
 */

/**
 * Normalize an entity's publish state to a standard string
 * @param {string} entityName - Entity type (Driver, Team, Event, Session, Results, etc.)
 * @param {object} record - The entity record
 * @returns {string} One of: "Draft", "Published", "Live", "Completed", "Cancelled"
 */
export function normalizePublishState(entityName, record) {
  if (!record) return 'Draft';

  switch (entityName) {
    case 'Driver':
    case 'Team':
    case 'Track':
    case 'Series':
      // These use profile_status
      if (record.profile_status === 'live') return 'Live';
      return 'Draft';

    case 'Event':
      // Event uses status with specific mapping
      if (record.status === 'upcoming') return 'Published';
      if (record.status === 'in_progress') return 'Live';
      if (record.status === 'completed') return 'Completed';
      if (record.status === 'cancelled') return 'Cancelled';
      return 'Draft';

    case 'Session':
      // Session uses status field directly
      if (record.status === 'Official' || record.status === 'Locked') return 'Live';
      if (record.status === 'Provisional' || record.status === 'Draft') return 'Draft';
      return 'Draft';

    case 'Results':
      // Results publish state is derived from session, but normalize as Draft for now
      // (actual visibility check happens in isPublicVisible with session lookup)
      return 'Draft';

    case 'Standings':
      // Standings publish state not yet in schema; treat as Draft unless explicit publish flag
      if (record.publish_date || record.published) return 'Published';
      return 'Draft';

    default:
      return 'Draft';
  }
}

/**
 * Check if an entity record is visible to the public
 * @param {string} entityName - Entity type
 * @param {object} record - The entity record
 * @param {object} options - Optional dependencies (e.g., relatedSession for Results)
 * @returns {boolean} True if publicly visible
 */
export function isPublicVisible(entityName, record, options = {}) {
  if (!record) return false;

  switch (entityName) {
    case 'Driver':
    case 'Team':
    case 'Track':
    case 'Series':
      // These are public only if profile_status === "live"
      return record.profile_status === 'live';

    case 'Event':
      // Public if status is upcoming, in_progress, or completed
      return ['upcoming', 'in_progress', 'completed'].includes(record.status);

    case 'Session':
      // Public only if Official or Locked
      return record.status === 'Official' || record.status === 'Locked';

    case 'Results':
      // Results public visibility depends on the linked session's status
      const relatedSession = options.relatedSession;
      if (!relatedSession) return false;
      return relatedSession.status === 'Official' || relatedSession.status === 'Locked';

    case 'Standings':
      // Standings not public until publish field is added to schema
      // For now, treat as private (Race Core only)
      return false;

    default:
      return false;
  }
}

/**
 * Get a display-friendly status label for an entity
 * @param {string} entityName - Entity type
 * @param {object} record - The entity record
 * @returns {string} Display status label
 */
export function getDisplayStatus(entityName, record) {
  const normalized = normalizePublishState(entityName, record);

  switch (normalized) {
    case 'Draft':
      return 'Draft';
    case 'Published':
      return 'Published';
    case 'Live':
      return 'Live';
    case 'Completed':
      return 'Completed';
    case 'Cancelled':
      return 'Cancelled';
    default:
      return 'Unknown';
  }
}