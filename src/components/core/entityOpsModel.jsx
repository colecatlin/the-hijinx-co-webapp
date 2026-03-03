/**
 * Entity Operations Model
 * 
 * Centralized rules engine that standardizes how all entities behave across
 * Management and Race Core systems. Defines creation, editing, publishing, and visibility rules.
 * 
 * NOT a schema change. This is a logic definition layer only.
 */

export const ENTITY_OPS_CONFIG = {
  Driver: {
    created_in: 'Management',
    editable_in: ['Management'],
    publish_controlled_in: 'Management',
    requires_publish_state: true,
    uses_profile_status: true,
    inherits_access_from: null,
  },
  Team: {
    created_in: 'Management',
    editable_in: ['Management'],
    publish_controlled_in: 'Management',
    requires_publish_state: true,
    uses_profile_status: true,
    inherits_access_from: null,
  },
  Track: {
    created_in: 'Management',
    editable_in: ['Management'],
    publish_controlled_in: 'Management',
    requires_publish_state: true,
    uses_profile_status: true,
    inherits_access_from: null,
  },
  Series: {
    created_in: 'Management',
    editable_in: ['Management'],
    publish_controlled_in: 'Management',
    requires_publish_state: true,
    uses_profile_status: true,
    inherits_access_from: null,
  },
  Event: {
    created_in: 'Management',
    editable_in: ['Management', 'RaceCore'],
    publish_controlled_in: 'RaceCore',
    requires_publish_state: true,
    uses_profile_status: false,
    inherits_access_from: ['Track', 'Series'],
  },
  Session: {
    created_in: 'RaceCore',
    editable_in: ['RaceCore'],
    publish_controlled_in: 'RaceCore',
    requires_publish_state: true,
    uses_profile_status: false,
    inherits_access_from: ['Event'],
  },
  Results: {
    created_in: 'RaceCore',
    editable_in: ['RaceCore'],
    publish_controlled_in: 'RaceCore',
    requires_publish_state: true,
    uses_profile_status: false,
    inherits_access_from: ['Event'],
  },
  Standings: {
    created_in: 'Management',
    editable_in: ['Management', 'RaceCore'],
    publish_controlled_in: 'RaceCore',
    requires_publish_state: true,
    uses_profile_status: false,
    inherits_access_from: ['Series'],
  },
};

/**
 * Get the operations config for a specific entity
 * @param {string} entityName - Name of the entity (e.g., 'Driver', 'Event')
 * @returns {object|null} Entity ops config or null if not found
 */
export function getEntityOpsConfig(entityName) {
  return ENTITY_OPS_CONFIG[entityName] || null;
}

/**
 * Check if an entity is editable in a specific context
 * @param {string} entityName - Name of the entity
 * @param {string} context - Context ('Management' or 'RaceCore')
 * @returns {boolean} True if entity is editable in the context
 */
export function isEditableInContext(entityName, context) {
  const config = getEntityOpsConfig(entityName);
  if (!config) return false;
  return config.editable_in.includes(context);
}

/**
 * Check if an entity's publish state is controlled in a specific context
 * @param {string} entityName - Name of the entity
 * @param {string} context - Context ('Management' or 'RaceCore')
 * @returns {boolean} True if publish is controlled in the context
 */
export function isPublishControlledInContext(entityName, context) {
  const config = getEntityOpsConfig(entityName);
  if (!config) return false;
  return config.publish_controlled_in === context;
}

/**
 * Get the entities this entity inherits access/permissions from
 * @param {string} entityName - Name of the entity
 * @returns {array|null} Array of entity names or null
 */
export function inheritsFrom(entityName) {
  const config = getEntityOpsConfig(entityName);
  if (!config) return null;
  return config.inherits_access_from;
}