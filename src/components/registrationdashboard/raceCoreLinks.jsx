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

  // Build query string directly — /racecore handles params natively.
  // Previously pointed to /RegistrationDashboard which dropped query params via Navigate redirect.
  const qs = new URLSearchParams();
  if (orgType) qs.set('orgType', orgType);
  if (orgId) qs.set('orgId', orgId);
  if (seasonYear) qs.set('seasonYear', seasonYear);
  if (eventId) qs.set('eventId', eventId);
  if (tab) qs.set('tab', tab);
  const queryString = qs.toString();
  return queryString ? `/racecore?${queryString}` : '/racecore';
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