/**
 * Race Core Deep Link Builder
 * Utility to generate deep links from Management into RegistrationDashboard tabs
 */

import { createPageUrl } from '@/components/utils';

/**
 * Build a deep link URL to RegistrationDashboard with context
 * @param {object} params
 * @param {string} params.orgType - 'track' or 'series'
 * @param {string} params.orgId - Track or Series ID
 * @param {string} params.seasonYear - Season year
 * @param {string} params.eventId - Event ID
 * @param {string} params.tab - Tab name (overview, event_builder, classes_sessions, etc.)
 * @returns {string} URL to RegistrationDashboard with query params
 */
export function buildRaceCoreUrl(params) {
  const { orgType, orgId, seasonYear, eventId, tab } = params;

  const queryParams = {};
  if (orgType) queryParams.orgType = orgType;
  if (orgId) queryParams.orgId = orgId;
  if (seasonYear) queryParams.seasonYear = seasonYear;
  if (eventId) queryParams.eventId = eventId;
  if (tab) queryParams.tab = tab;

  return createPageUrl('RegistrationDashboard', queryParams);
}

/**
 * Derive orgType and orgId from an event
 * @param {object} event - Event entity
 * @returns {object} { orgType, orgId }
 */
export function getOrgContextFromEvent(event) {
  if (event?.series_id) {
    return {
      orgType: 'series',
      orgId: event.series_id,
    };
  }
  if (event?.track_id) {
    return {
      orgType: 'track',
      orgId: event.track_id,
    };
  }
  return { orgType: 'track', orgId: '' };
}

/**
 * Derive season year from an event
 * @param {object} event - Event entity
 * @returns {string} Season year
 */
export function getSeasonFromEvent(event) {
  if (event?.season) {
    return event.season;
  }
  if (event?.event_date) {
    return new Date(event.event_date).getFullYear().toString();
  }
  return '';
}