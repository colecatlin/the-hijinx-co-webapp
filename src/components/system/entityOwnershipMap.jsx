/**
 * Entity Ownership Map - Documents which subsystem owns each entity.
 * 
 * This is a reference for understanding data flow and responsibility.
 * Management = Master Data Studio (drivers, teams, tracks, series, etc.)
 * Race Core = Event Operations Console (events, sessions, entries, results, standings, etc.)
 * 
 * Both systems write to OperationLog, but with different operation_type values.
 */

export const ENTITY_OWNERSHIP = {
  // Management-owned entities (master data)
  Driver: 'management',
  Team: 'management',
  Track: 'management',
  Series: 'management',
  SeriesClass: 'management',
  PointsConfig: 'management',
  TechTemplate: 'management',
  FoodBeverage: 'management',
  Tech: 'management',
  OutletStory: 'management',
  OutletIssue: 'management',
  Announcement: 'management',
  DriverProgram: 'management', // Hybrid: created in Management, updated by Race Core
  Vehicle: 'management',
  
  // Race Core-owned entities (event operations)
  Event: 'racecore',
  Session: 'racecore',
  Entry: 'racecore',
  ComplianceFlag: 'racecore',
  TechInspection: 'racecore',
  Results: 'racecore',
  Standings: 'racecore',
  EventClass: 'racecore',
  
  // Shared (both systems write)
  OperationLog: 'shared',
  EntityCollaborator: 'management', // Manages access
  Invitation: 'management',
};

/**
 * Get the owner of an entity type.
 * @param {string} entityName - Entity name (e.g., 'Driver', 'Event')
 * @returns {string} 'management' | 'racecore' | 'shared'
 */
export function getEntityOwner(entityName) {
  return ENTITY_OWNERSHIP[entityName] || 'unknown';
}

/**
 * Check if entity is managed by Race Core.
 */
export function isRaceCoreEntity(entityName) {
  return getEntityOwner(entityName) === 'racecore';
}

/**
 * Check if entity is managed by Management.
 */
export function isManagementEntity(entityName) {
  return getEntityOwner(entityName) === 'management';
}

export default ENTITY_OWNERSHIP;