/**
 * entityResolver.js
 * Single source of truth for managed entity resolution and Race Core routing.
 * All pages that launch Race Core or resolve managed entities must use these helpers.
 * Never read legacy user.driver_id / user.team_id / user.series_id / user.track_id.
 */

import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/components/utils';

// ─── Raw collaborations ──────────────────────────────────────────────────────

/**
 * Fetch raw EntityCollaborator rows for the given user.
 * Returns [] if user is missing or has no id.
 */
export async function getManagedCollaborations(user) {
  if (!user?.id) return [];
  return base44.entities.EntityCollaborator.filter({ user_id: user.id });
}

// ─── Resolved entities ───────────────────────────────────────────────────────

/**
 * Fetch collaborations and resolve source records into normalized objects.
 * Always safe – if the source record is deleted the entity is still returned
 * with a fallback name so the user can still see and manage access codes.
 *
 * Returns array of:
 * {
 *   collaboration_id, entity_type, entity_id, entity_name,
 *   role, access_code, source_record, is_racecore_entity
 * }
 */
export async function getResolvedManagedEntities(user) {
  const collaborations = await getManagedCollaborations(user);
  if (!collaborations.length) return [];

  const types = [...new Set(collaborations.map(c => c.entity_type))];

  const sourceMap = {};
  await Promise.all(
    types.map(async (type) => {
      try {
        if (type === 'Driver')  sourceMap.Driver  = await base44.entities.Driver.list();
        if (type === 'Team')    sourceMap.Team    = await base44.entities.Team.list();
        if (type === 'Track')   sourceMap.Track   = await base44.entities.Track.list();
        if (type === 'Series')  sourceMap.Series  = await base44.entities.Series.list();
      } catch {
        sourceMap[type] = [];
      }
    })
  );

  return collaborations.map(collab => {
    const records = sourceMap[collab.entity_type] || [];
    const source_record = records.find(r => r.id === collab.entity_id) || null;
    const is_racecore_entity = collab.entity_type === 'Track' || collab.entity_type === 'Series';
    return {
      collaboration_id: collab.id,
      entity_type: collab.entity_type,
      entity_id: collab.entity_id,
      entity_name: source_record?.name || collab.entity_name || 'Unknown Entity',
      role: collab.role,
      access_code: collab.access_code,
      source_record,
      is_racecore_entity,
    };
  });
}

// ─── Primary entity selection ─────────────────────────────────────────────────

/**
 * Return the user's primary entity using this priority:
 * 1. user.primary_entity_type + user.primary_entity_id match in resolvedEntities
 * 2. First Track or Series entity
 * 3. First entity of any type
 * 4. null
 */
export function getPrimaryResolvedEntity(user, resolvedEntities) {
  if (!resolvedEntities?.length) return null;

  if (user?.primary_entity_id) {
    const explicit = resolvedEntities.find(e => e.entity_id === user.primary_entity_id);
    if (explicit) return explicit;
  }

  const trackOrSeries = resolvedEntities.find(e => e.is_racecore_entity);
  return trackOrSeries || resolvedEntities[0] || null;
}

// ─── Filtering helpers ────────────────────────────────────────────────────────

/**
 * Return only Track and Series resolved entities (Race Core eligible).
 */
export function getRaceCoreEntities(resolvedEntities) {
  return (resolvedEntities || []).filter(e => e.is_racecore_entity);
}

// ─── URL builders ─────────────────────────────────────────────────────────────

/**
 * Build the Race Core (RegistrationDashboard) launch URL for a resolved entity.
 * extras: { seasonYear?, eventId?, tab? }
 */
export function buildRaceCoreLaunchUrl(entity, extras = {}) {
  if (!entity?.entity_type || !entity?.entity_id) return createPageUrl('RegistrationDashboard');
  let url =
    createPageUrl('RegistrationDashboard') +
    `?orgType=${entity.entity_type.toLowerCase()}&orgId=${entity.entity_id}`;
  if (extras.seasonYear) url += `&seasonYear=${encodeURIComponent(extras.seasonYear)}`;
  if (extras.eventId)    url += `&eventId=${encodeURIComponent(extras.eventId)}`;
  if (extras.tab)        url += `&tab=${encodeURIComponent(extras.tab)}`;
  return url;
}

/**
 * Build the entity editor URL for a resolved entity.
 * Driver  -> DriverEditor?id=<entity_id>
 * Others  -> EntityEditor?id=<access_code>  (falls back to entity_id if no access_code)
 */
export function buildEditorUrl(entity) {
  if (!entity) return createPageUrl('Profile');
  if (entity.entity_type === 'Driver') {
    return createPageUrl('DriverEditor') + `?id=${entity.entity_id}`;
  }
  const code = entity.access_code || entity.entity_id;
  return createPageUrl('EntityEditor') + `?id=${code}`;
}