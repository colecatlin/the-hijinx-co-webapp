import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/components/utils';

/**
 * Fetch raw EntityCollaborator rows for the given user.
 */
export async function getManagedEntityCollaborations(user) {
  if (!user?.id) return [];
  return base44.entities.EntityCollaborator.filter({ user_id: user.id });
}

/**
 * Fetch collaborations and resolve source records into normalized objects.
 * Safe if source_record is missing (deleted entity).
 */
export async function getManagedEntitiesResolved(user) {
  const collaborations = await getManagedEntityCollaborations(user);
  if (!collaborations.length) return [];

  const types = [...new Set(collaborations.map(c => c.entity_type))];

  // Load source entity lists for each type present
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
    return {
      collaboration_id: collab.id,
      entity_type: collab.entity_type,
      entity_id: collab.entity_id,
      entity_name: source_record?.name || collab.entity_name || 'Unknown Entity',
      role: collab.role,
      access_code: collab.access_code,
      source_record,
    };
  });
}

/**
 * Return the user's primary entity, falling back to first Track/Series, then first entity.
 */
export function getPrimaryManagedEntity(user, resolvedEntities) {
  if (!resolvedEntities?.length) return null;

  if (user?.primary_entity_type && user?.primary_entity_id) {
    const match = resolvedEntities.find(e => e.entity_id === user.primary_entity_id);
    if (match) return match;
  }

  const trackOrSeries = resolvedEntities.find(
    e => e.entity_type === 'Track' || e.entity_type === 'Series'
  );
  return trackOrSeries || resolvedEntities[0];
}

/**
 * Return only Track and Series entities.
 */
export function getRaceCoreEntities(resolvedEntities) {
  return (resolvedEntities || []).filter(
    e => e.entity_type === 'Track' || e.entity_type === 'Series'
  );
}

/**
 * Return the editor URL for the given entity.
 */
export function getEntityEditorUrl(entity) {
  if (entity?.entity_type === 'Driver') {
    return createPageUrl('DriverEditor') + `?id=${entity.entity_id}`;
  }
  return createPageUrl('EntityEditor') + `?id=${entity.access_code}`;
}

/**
 * Return the Race Core URL for the given entity.
 */
export function getRaceCoreUrl(entity, extras = {}) {
  let url =
    createPageUrl('RegistrationDashboard') +
    `?orgType=${entity.entity_type.toLowerCase()}&orgId=${entity.entity_id}`;
  if (extras.seasonYear) url += `&seasonYear=${extras.seasonYear}`;
  if (extras.eventId) url += `&eventId=${extras.eventId}`;
  return url;
}