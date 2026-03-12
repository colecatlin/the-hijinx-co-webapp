/**
 * components/data/invalidationContract.js
 *
 * Deterministic cache invalidation groups.
 * Use invalidateDataGroup(queryClient, groupName) instead of scattering
 * ad-hoc queryClient.invalidateQueries calls with magic strings.
 *
 * Group names map to logical data domains.
 * Each group lists the query key prefixes that should be cleared together.
 */

/**
 * Map of group name → array of query key prefixes to invalidate.
 * Prefixes are matched with { exact: false } so all sub-keys are cleared.
 */
export const INVALIDATION_GROUPS = {
  homepage: [
    ['homepageData'],
  ],

  drivers: [
    ['drivers'],
    ['driver'],
  ],

  teams: [
    ['teams'],
    ['team'],
  ],

  tracks: [
    ['tracks'],
    ['selectedTrack'],
    ['track'],
  ],

  series: [
    ['series'],
    ['selectedSeries'],
    ['seriesClasses'],
  ],

  events: [
    ['events'],
    ['selectedEvent'],
  ],

  results: [
    ['results'],
  ],

  standings: [
    ['standings'],
  ],

  media: [
    ['mediaAssets'],
  ],

  collaborators: [
    ['resolvedEntities'],
    ['myCollaborations'],
    ['userEventCollaborators'],
    ['trackCollaborators'],
    ['seriesCollaborators'],
    ['entityCollaborators'],
    ['entityCollaboratorsAll'],
    ['allCollaborators'],
  ],

  profile: [
    ['currentUser'],
    ['myInvitations'],
    ['myOperationLogs'],
  ],

  /**
   * access: all access lifecycle queries.
   * Use after claim submit/approve, invitation create/revoke/accept, code redemption.
   */
  access: [
    ['currentUser'],
    ['resolvedEntities'],
    ['myCollaborations'],
    ['entityCollaborators'],
    ['entityCollaboratorsAll'],
    ['allCollaborators'],
    ['pendingInvitations'],
    ['myInvitations'],
    ['entityPendingInvitations'],
    ['allInvitations'],
    ['allClaims'],
    ['claimRequests'],
    ['claimCheck_collabs'],
    ['claimCheck_claims'],
    ['entityClaimRequests'],
    ['myOperationLogs'],
  ],

  /**
   * dashboard: everything a user dashboard surface might display.
   * Use sparingly — prefer targeted groups.
   */
  dashboard: [
    ['currentUser'],
    ['resolvedEntities'],
    ['myInvitations'],
    ['myOperationLogs'],
    ['drivers'],
    ['teams'],
    ['tracks'],
    ['series'],
    ['events'],
  ],

  /**
   * racecore_context: the operational data for a Race Core session.
   * Use after event lifecycle changes, results imports, or session mutations.
   */
  racecore_context: [
    ['sessions'],
    ['entries'],
    ['results'],
    ['standings'],
    ['operationLogs'],
  ],
};

/**
 * Invalidate all query keys belonging to a logical group.
 *
 * @param {import('@tanstack/react-query').QueryClient} queryClient
 * @param {keyof typeof INVALIDATION_GROUPS} groupName
 */
export function invalidateDataGroup(queryClient, groupName) {
  const keys = INVALIDATION_GROUPS[groupName];
  if (!keys) {
    console.warn(`[invalidationContract] Unknown group: "${groupName}". ` +
      `Valid groups: ${Object.keys(INVALIDATION_GROUPS).join(', ')}`);
    return;
  }
  for (const queryKey of keys) {
    queryClient.invalidateQueries({ queryKey, exact: false });
  }
}

/**
 * Invalidate multiple groups at once.
 *
 * @param {import('@tanstack/react-query').QueryClient} queryClient
 * @param {Array<keyof typeof INVALIDATION_GROUPS>} groupNames
 */
export function invalidateDataGroups(queryClient, groupNames) {
  for (const name of groupNames) {
    invalidateDataGroup(queryClient, name);
  }
}