/**
 * sourceEntityApi.js
 * Single shared API for looking up source entity records (Driver, Team, Track, Series, Event).
 * All Race Core, Profile, MyDashboard, and Media modules should import from here.
 */
import { base44 } from '@/api/base44Client';

const MODEL_MAP = {
  driver: 'Driver',
  team:   'Team',
  track:  'Track',
  series: 'Series',
  event:  'Event',
  // accept capitalized variants too
  Driver: 'Driver',
  Team:   'Team',
  Track:  'Track',
  Series: 'Series',
  Event:  'Event',
};

/**
 * Get a single source entity record by type + id.
 * Returns null if not found or type is unknown.
 */
export async function getSourceEntityByTypeAndId(entityType, entityId) {
  const modelName = MODEL_MAP[entityType];
  if (!modelName || !entityId) return null;
  try {
    const record = await base44.entities[modelName].get(entityId);
    return record || null;
  } catch {
    return null;
  }
}

/**
 * List all source entities of a given type.
 * Returns empty array for unknown types.
 */
export async function listSourceEntitiesByType(entityType) {
  const modelName = MODEL_MAP[entityType];
  if (!modelName) return [];
  try {
    return await base44.entities[modelName].list() || [];
  } catch {
    return [];
  }
}

/**
 * Returns a { [id]: record } map for a given entity type.
 */
export async function getSourceEntitiesMap(entityType) {
  const records = await listSourceEntitiesByType(entityType);
  const map = {};
  for (const r of records) {
    if (r?.id) map[r.id] = r;
  }
  return map;
}

/**
 * Given a common Entity record (from entities/Entity), resolve its source record
 * and return a merged context object.
 *
 * Returns:
 * {
 *   entity,          // the Entity record
 *   source_record,   // the Driver/Team/Track/Series/Event record (null if missing)
 *   resolved_name,   // best available name
 *   resolved_slug,   // best available slug
 * }
 */
export async function resolveEntityRecord(entity) {
  if (!entity) return null;

  const source_record = await getSourceEntityByTypeAndId(
    entity.entity_type,
    entity.source_entity_id
  );

  const resolved_name =
    source_record?.name ||
    source_record?.full_name ||
    entity.name ||
    '(Unknown)';

  const resolved_slug =
    source_record?.canonical_slug ||
    entity.slug ||
    null;

  return {
    entity,
    source_record,
    resolved_name,
    resolved_slug,
  };
}