/**
 * driverResolver.js
 * Shared driver resolution utility for all Race Core import and operational workflows.
 *
 * Resolution order:
 *  1. Exact name match (first+last, case-insensitive, trimmed)
 *     → If exactly 1 result, return id
 *  2. If multiple matches, narrow by primary_number === carNumber (if provided)
 *     → If exactly 1 after narrowing, return id
 *  3. If still ambiguous/none, try matching via Results for the event
 *     (driver name appears in Results for eventId)
 *     → If exactly 1 unique driver_id found, return it
 *  4. Return null — do not guess when ambiguous
 */

import { base44 } from '@/api/base44Client';

/**
 * Normalize a name segment: trim whitespace, collapse double spaces, lowercase.
 * @param {string} str
 * @returns {string}
 */
export function normalizeName(str) {
  if (!str) return '';
  return str.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Build a full-name key for comparison.
 * @param {string} first
 * @param {string} last
 * @returns {string}
 */
function nameKey(first, last) {
  return `${normalizeName(first)} ${normalizeName(last)}`.trim();
}

/**
 * Resolve a driver_id from name (and optionally carNumber and eventId).
 *
 * @param {object} params
 * @param {string} params.firstName
 * @param {string} params.lastName
 * @param {string} [params.carNumber]     - Used to disambiguate multiple name matches
 * @param {string} [params.eventId]       - Used to narrow via Results lookup
 * @param {string} [params.seriesId]      - Reserved for future series-scoped lookups
 * @param {Driver[]} [params.drivers]     - Pre-loaded driver list (avoids extra fetch)
 * @param {Result[]} [params.results]     - Pre-loaded results for event (avoids extra fetch)
 *
 * @returns {Promise<string|null>} Resolved driver_id or null if ambiguous / not found
 */
export async function resolveDriverId({
  firstName,
  lastName,
  carNumber,
  eventId,
  seriesId,
  drivers: driversList,
  results: resultsList,
}) {
  const targetKey = nameKey(firstName, lastName);
  if (!targetKey || targetKey === ' ') return null;

  // ── Step 1: Exact name match ───────────────────────────────────────────────
  let candidates;

  if (driversList && driversList.length > 0) {
    // Use pre-loaded list if provided
    candidates = driversList.filter((d) => nameKey(d.first_name, d.last_name) === targetKey);
  } else {
    // Fetch from API
    try {
      const rows = await base44.entities.Driver.filter({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      });
      // Filter is case-sensitive on the API side, so also do local normalization
      candidates = rows.filter((d) => nameKey(d.first_name, d.last_name) === targetKey);
    } catch {
      return null;
    }
  }

  // Exact single match
  if (candidates.length === 1) return candidates[0].id;

  // Not found
  if (candidates.length === 0) return null;

  // ── Step 2: Multiple matches — try narrowing by carNumber ─────────────────
  if (carNumber && candidates.length > 1) {
    const byNumber = candidates.filter(
      (d) => normalizeName(d.primary_number) === normalizeName(carNumber)
    );
    if (byNumber.length === 1) return byNumber[0].id;
  }

  // ── Step 3: Narrow by Results for this event ───────────────────────────────
  if (eventId && candidates.length > 1) {
    const candidateIds = new Set(candidates.map((d) => d.id));
    let eventResults;

    if (resultsList && resultsList.length > 0) {
      eventResults = resultsList;
    } else {
      try {
        eventResults = await base44.entities.Results.filter({ event_id: eventId });
      } catch {
        return null;
      }
    }

    const idsInResults = eventResults
      .map((r) => r.driver_id)
      .filter((id) => id && candidateIds.has(id));

    const uniqueIdsInResults = [...new Set(idsInResults)];
    if (uniqueIdsInResults.length === 1) return uniqueIdsInResults[0];
  }

  // ── Step 4: Ambiguous — return null ───────────────────────────────────────
  return null;
}

/**
 * Batch resolve driver IDs from a list of rows.
 * Returns { resolved: Map<rowIndex, driverId>, warnings: Array<{index, firstName, lastName, carNumber}> }
 *
 * @param {Array<{firstName, lastName, carNumber}>} rows
 * @param {object} context - { eventId, seriesId, drivers, results }
 */
export async function batchResolveDriverIds(rows, context = {}) {
  const resolved = new Map();
  const warnings = [];

  for (let i = 0; i < rows.length; i++) {
    const { firstName, lastName, carNumber } = rows[i];
    const id = await resolveDriverId({
      firstName,
      lastName,
      carNumber,
      eventId: context.eventId,
      seriesId: context.seriesId,
      drivers: context.drivers,
      results: context.results,
    });

    if (id) {
      resolved.set(i, id);
    } else {
      warnings.push({ index: i, firstName, lastName, carNumber });
    }
  }

  return { resolved, warnings };
}