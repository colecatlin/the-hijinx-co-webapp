/**
 * components/data/linkedRecordResolvers.js
 *
 * Safe helpers for resolving records that are linked from a primary entity.
 *
 * Rules:
 * - Always prefer id-based matching over string matching.
 * - If a name-string fallback is used, a console.warn is emitted.
 * - All functions return null or [] — never throw to UI callers.
 */

import { base44 } from '@/api/base44Client';
import { getRecordById } from './sourceRecordApi';

const safe = (p, fallback) => p.catch(() => fallback);

// ── Single-record resolvers ───────────────────────────────────────────────────

/**
 * Resolve the Team for a Driver using driver.team_id.
 * @param {object|null} driver
 * @returns {Promise<object|null>}
 */
export async function resolveTeamForDriver(driver) {
  if (!driver?.team_id) return null;
  return getRecordById('Team', driver.team_id);
}

/**
 * Resolve the primary Series for a Driver using driver.primary_series_id.
 * @param {object|null} driver
 * @returns {Promise<object|null>}
 */
export async function resolveSeriesForDriver(driver) {
  if (!driver?.primary_series_id) return null;
  return getRecordById('Series', driver.primary_series_id);
}

/**
 * Resolve the Track for an Event using event.track_id.
 * @param {object|null} event
 * @returns {Promise<object|null>}
 */
export async function resolveTrackForEvent(event) {
  if (!event?.track_id) return null;
  return getRecordById('Track', event.track_id);
}

/**
 * Resolve the Series for an Event using event.series_id.
 * @param {object|null} event
 * @returns {Promise<object|null>}
 */
export async function resolveSeriesForEvent(event) {
  if (!event?.series_id) return null;
  return getRecordById('Series', event.series_id);
}

// ── List resolvers ────────────────────────────────────────────────────────────

/**
 * Resolve all Events for a Track using event.track_id.
 * Returns [] on failure.
 *
 * @param {string} trackId
 * @param {object[]} [cachedEvents] - pass a pre-loaded events array to avoid re-fetching
 * @returns {Promise<object[]>}
 */
export async function resolveEventsForTrack(trackId, cachedEvents) {
  if (!trackId) return [];
  if (Array.isArray(cachedEvents)) {
    return cachedEvents.filter(e => e.track_id === trackId);
  }
  return safe(base44.entities.Event.filter({ track_id: trackId }), []);
}

/**
 * Resolve all Events for a Series using event.series_id (id-first).
 * Falls back to series_name string matching only if id-based returns empty
 * AND a seriesName hint is provided — emits a console.warn in that case.
 *
 * @param {string} seriesId
 * @param {object[]} [cachedEvents]
 * @param {string}  [seriesNameHint] - only used for fallback
 * @returns {Promise<object[]>}
 */
export async function resolveEventsForSeries(seriesId, cachedEvents, seriesNameHint) {
  if (!seriesId) return [];

  // Primary: id-based
  let events;
  if (Array.isArray(cachedEvents)) {
    events = cachedEvents.filter(e => e.series_id === seriesId);
  } else {
    events = await safe(base44.entities.Event.filter({ series_id: seriesId }), []);
  }

  if (events.length > 0) return events;

  // Fallback: name string (only if hint provided and cached list available)
  if (seriesNameHint && Array.isArray(cachedEvents) && cachedEvents.length > 0) {
    const needle = seriesNameHint.toLowerCase().trim();
    const nameMatches = cachedEvents.filter(e => {
      const evSeries = (e.series_name || e.series || '').toLowerCase().trim();
      return evSeries === needle;
    });
    if (nameMatches.length > 0) {
      console.warn(
        `[linkedRecordResolvers] resolveEventsForSeries: series "${seriesNameHint}" (${seriesId}) ` +
        `had 0 series_id matches. Fell back to ${nameMatches.length} name-matched events. ` +
        `Backfill event.series_id for these records.`
      );
      return nameMatches;
    }
  }

  return [];
}

/**
 * Resolve all Results for an Event using result.event_id.
 * @param {string} eventId
 * @returns {Promise<object[]>}
 */
export async function resolveResultsForEvent(eventId) {
  if (!eventId) return [];
  return safe(base44.entities.Results.filter({ event_id: eventId }), []);
}

/**
 * Resolve all Results for a Driver using result.driver_id.
 * @param {string} driverId
 * @returns {Promise<object[]>}
 */
export async function resolveResultsForDriver(driverId) {
  if (!driverId) return [];
  return safe(base44.entities.Results.filter({ driver_id: driverId }), []);
}