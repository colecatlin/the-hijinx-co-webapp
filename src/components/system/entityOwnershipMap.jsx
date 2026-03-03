/**
 * Entity Ownership Map
 * 
 * Defines which subsystem owns each entity type for the unified Race Core and Management system.
 * This is the single source of truth for data ownership boundaries.
 * 
 * Management Studio = Master Data (drivers, teams, tracks, series, configs)
 * Race Core Console = Event Operations (events, sessions, entries, results, compliance)
 * Public Motorsports = Read-only published views
 */

export const ENTITY_OWNERSHIP = {
  // Management Studio (Master Data Ownership)
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
  Advertisement: 'management',

  // Race Core Console (Event Operations Ownership)
  Event: 'racecore',
  Session: 'racecore',
  Entry: 'racecore',
  ComplianceFlag: 'racecore',
  TechInspection: 'racecore',
  Results: 'racecore',
  Standings: 'racecore',
  OperationLog: 'shared', // Written by both systems
  DriverProgram: 'management', // Owned by management, used by race core

  // System entities (read-only or meta)
  User: 'system',
  EntityCollaborator: 'system',
  Invitation: 'system',
  ImportLog: 'system',
};

/**
 * Get the owner of an entity type
 */
export function getEntityOwner(entityType) {
  return ENTITY_OWNERSHIP[entityType] || null;
}

/**
 * Check if entity type is owned by Management Studio
 */
export function isManagementOwned(entityType) {
  return getEntityOwner(entityType) === 'management';
}

/**
 * Check if entity type is owned by Race Core
 */
export function isRaceCoreOwned(entityType) {
  return getEntityOwner(entityType) === 'racecore';
}

/**
 * Get all entities owned by a subsystem
 */
export function getEntitiesByOwner(owner) {
  return Object.entries(ENTITY_OWNERSHIP)
    .filter(([_, ownerType]) => ownerType === owner)
    .map(([entityType, _]) => entityType);
}