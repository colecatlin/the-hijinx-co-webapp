/**
 * publicEntityResolver.js
 *
 * Shared resolver helpers for all public-facing motorsports pages.
 * Centralizes entity resolution by route param: id → slug → name fallback.
 * Use these instead of repeating full-list + find patterns in each page.
 */

import { base44 } from '@/api/base44Client';
import { getSourceEntityByTypeAndId } from '@/components/entities/sourceEntityApi';
import { buildProfileUrl } from '@/components/utils/routingContract';

const ENTITY_MODELS = {
  Driver: 'Driver',
  Team: 'Team',
  Track: 'Track',
  Series: 'Series',
  Event: 'Event',
};

/**
 * Resolve an entity by route params.
 * Priority: A. id exact  →  B. slug filter  →  C. Driver first+last fallback
 * Returns null if not found.
 *
 * @param {{ entityType: string, id?: string, slug?: string, first?: string, last?: string }}
 * @returns {Promise<object|null>}
 */
export async function resolveEntityByRouteParam({ entityType, id, slug, first, last }) {
  const model = ENTITY_MODELS[entityType];
  if (!model) return null;

  // A. Try by ID (direct get – most efficient)
  if (id) {
    const record = await getSourceEntityByTypeAndId(entityType, id);
    if (record) return record;
  }

  // B. Try by slug via filter, with list+find as fallback
  if (slug) {
    try {
      const results = await base44.entities[model].filter({ slug });
      if (Array.isArray(results) && results.length > 0) return results[0];
    } catch {
      // filter not supported or failed – fall through to list+find
    }
    try {
      const all = await base44.entities[model].list();
      const found = (all || []).find(
        r => r.slug === slug || r.canonical_slug === slug
      );
      if (found) return found;
    } catch {
      return null;
    }
  }

  // C. Driver only: first + last name fallback (for legacy URLs)
  if (entityType === 'Driver' && first && last) {
    try {
      const all = await base44.entities.Driver.list();
      return (all || []).find(
        d =>
          d.first_name?.toLowerCase() === first.toLowerCase() &&
          d.last_name?.toLowerCase() === last.toLowerCase()
      ) || null;
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Resolve a single linked entity by ID safely.
 * Returns null if entityId is missing or record not found.
 *
 * @param {{ entityType: string, entityId: string }}
 * @returns {Promise<object|null>}
 */
export async function resolveLinkedEntityById({ entityType, entityId }) {
  if (!entityId) return null;
  return getSourceEntityByTypeAndId(entityType, entityId);
}

/**
 * Resolve multiple linked entities by their IDs safely.
 * Missing IDs are silently skipped.
 * Returns [] if none provided or none found.
 *
 * @param {{ entityType: string, entityIds: string[] }}
 * @returns {Promise<object[]>}
 */
export async function resolveLinkedEntitiesByIds({ entityType, entityIds }) {
  if (!entityIds || entityIds.length === 0) return [];
  const model = ENTITY_MODELS[entityType];
  if (!model) return [];
  const settled = await Promise.allSettled(
    entityIds.map(id => getSourceEntityByTypeAndId(entityType, id))
  );
  return settled
    .filter(r => r.status === 'fulfilled' && r.value != null)
    .map(r => r.value);
}

/**
 * Get a safe display name for any entity record.
 * Tries: name → full_name → title → first_name + last_name → "Unknown {entityType}"
 *
 * @param {object|null} record
 * @param {string} [entityType]
 * @returns {string}
 */
export function safeDisplayName(record, entityType = '') {
  if (!record) return entityType ? `Unknown ${entityType}` : 'Unknown';
  if (record.name) return record.name;
  if (record.full_name) return record.full_name;
  if (record.title) return record.title;
  if (record.first_name) return `${record.first_name} ${record.last_name || ''}`.trim();
  return entityType ? `Unknown ${entityType}` : 'Unknown';
}

/**
 * Get a safe profile href for an entity using the routing contract.
 * Returns null if the entity type is unsupported or identifier is missing.
 *
 * @param {{ entityType: string, entityId?: string, slug?: string }}
 * @returns {string|null}
 */
export function safeProfileHref({ entityType, entityId, slug }) {
  const identifier = slug || entityId;
  if (!identifier) return null;
  try {
    return buildProfileUrl(entityType, identifier);
  } catch {
    return null;
  }
}