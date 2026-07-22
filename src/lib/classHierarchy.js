/**
 * classHierarchy.js
 *
 * Canonical sort for SeriesClass records so every view — public series/event
 * profiles, driver program timelines, and the series-class management UI —
 * renders classes in the exact hierarchy set via Series > Class settings.
 *
 * Rule (matches the SeriesClass.sort_order field description):
 *   1. Primary:   sort_order ascending  (lower number = displayed first)
 *   2. Secondary: competition_level descending (premier classes first)
 *   3. Stability: original input order (stable sort)
 *
 * A null sort_order is treated as "un-set": set items sort before unset ones
 * so explicitly ordered classes lead, then unset items fall back to
 * competition_level descending.
 */

/**
 * Returns a new array of SeriesClass records sorted by the platform hierarchy.
 * Does not mutate the input.
 *
 * @param {Array<object>} classes - SeriesClass records (may be null/undefined)
 * @returns {Array<object>}
 */
export function sortSeriesClassesByHierarchy(classes) {
  if (!Array.isArray(classes)) return [];
  return [...classes].sort((a, b) => {
    const aHasOrder = a?.sort_order != null;
    const bHasOrder = b?.sort_order != null;
    if (aHasOrder && bHasOrder) return a.sort_order - b.sort_order;
    if (aHasOrder) return -1;
    if (bHasOrder) return 1;
    return (b?.competition_level || 0) - (a?.competition_level || 0);
  });
}