/**
 * components/data/sourceRecordApi.js
 *
 * Centralized, safe fetch helpers for all five source entity types.
 * All functions return null / [] instead of throwing to UI callers.
 *
 * Supported entity types: Driver | Team | Track | Series | Event
 */

import { base44 } from '@/api/base44Client';

const MODELS = ['Driver', 'Team', 'Track', 'Series', 'Event'];

function assertModel(entityType) {
  const t = entityType?.charAt(0).toUpperCase() + entityType?.slice(1).toLowerCase();
  const canon = MODELS.find(m => m.toLowerCase() === entityType?.toLowerCase());
  if (!canon) throw new Error(`sourceRecordApi: unsupported entity type "${entityType}"`);
  return canon;
}

/**
 * Fetch a single record by its id.
 * Returns null if the record is not found or the call fails.
 *
 * @param {string} entityType
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export async function getRecordById(entityType, id) {
  if (!id) return null;
  const model = assertModel(entityType);
  try {
    return await base44.entities[model].get(id);
  } catch {
    return null;
  }
}

/**
 * Fetch a single record by its slug field.
 * Tries filter({ slug }) first, then falls back to list + find.
 * Returns null if not found.
 *
 * @param {string} entityType
 * @param {string} slug
 * @returns {Promise<object|null>}
 */
export async function getRecordBySlug(entityType, slug) {
  if (!slug) return null;
  const model = assertModel(entityType);
  try {
    const results = await base44.entities[model].filter({ slug });
    if (Array.isArray(results) && results.length > 0) return results[0];
  } catch {
    // filter not supported — fall through
  }
  try {
    const all = await base44.entities[model].list();
    return (all || []).find(r => r.slug === slug || r.canonical_slug === slug) ?? null;
  } catch {
    return null;
  }
}

/**
 * List records for an entity type, with optional sort and limit.
 * Returns [] on failure.
 *
 * @param {string} entityType
 * @param {string} [sort='-created_date']
 * @param {number} [limit]
 * @returns {Promise<object[]>}
 */
export async function listRecords(entityType, sort = '-created_date', limit) {
  const model = assertModel(entityType);
  try {
    if (limit) return await base44.entities[model].list(sort, limit);
    return await base44.entities[model].list(sort);
  } catch {
    return [];
  }
}

/**
 * Fetch multiple records by their ids in parallel.
 * Missing or errored ids are silently dropped.
 *
 * @param {string} entityType
 * @param {string[]} ids
 * @returns {Promise<object[]>}
 */
export async function getRecordsByIds(entityType, ids) {
  if (!ids || ids.length === 0) return [];
  const model = assertModel(entityType);
  const settled = await Promise.allSettled(
    ids.map(id => base44.entities[model].get(id).catch(() => null))
  );
  return settled
    .filter(r => r.status === 'fulfilled' && r.value != null)
    .map(r => r.value);
}

/**
 * Safe find helper — runs a matcher over an array without throwing.
 * Returns null if nothing matches.
 *
 * @param {object[]} records
 * @param {(record: object) => boolean} matcher
 * @returns {object|null}
 */
export function safeFindRecord(records, matcher) {
  if (!Array.isArray(records) || typeof matcher !== 'function') return null;
  try {
    return records.find(matcher) ?? null;
  } catch {
    return null;
  }
}