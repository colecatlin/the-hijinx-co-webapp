/**
 * Shared React Query defaults for Index46.
 * Import these constants + helper wherever you call useQuery / prefetchQuery.
 */

export const DEFAULT_STALE_TIME_MS   = 30_000;   // 30 s — operational/RaceCore data
export const DEFAULT_GC_TIME_MS      = 300_000;  // 5 min
export const DEFAULT_RETRY           = 1;
export const DEFAULT_REFETCH_ON_FOCUS = false;

// Sprint 1E: Longer cache durations for mostly-static public content.
// Experience functions are server-aggregated — they don't need frequent refetch.
export const PUBLIC_CONTENT_STALE_TIME_MS = 120_000;  // 2 min — public entity lists, directories
export const EXPERIENCE_STALE_TIME_MS     = 300_000;  // 5 min — experience engine queries
export const SEARCH_STALE_TIME_MS         = 300_000;  // 5 min — global search entity lists

/**
 * Merge defaults into provided options without overriding explicit caller values.
 *
 * @param {object} options - Any useQuery options the caller wants to set.
 * @returns {object} Options with defaults filled in for missing keys.
 */
export function applyDefaultQueryOptions(options = {}) {
  return {
    staleTime:            DEFAULT_STALE_TIME_MS,
    gcTime:               DEFAULT_GC_TIME_MS,
    retry:                DEFAULT_RETRY,
    refetchOnWindowFocus: DEFAULT_REFETCH_ON_FOCUS,
    refetchOnReconnect:   false,
    ...options,
  };
}

/**
 * Sprint 1E: Defaults for experience-engine queries (server-aggregated, mostly static).
 */
export function applyExperienceQueryOptions(options = {}) {
  return {
    staleTime:            EXPERIENCE_STALE_TIME_MS,
    gcTime:               DEFAULT_GC_TIME_MS * 2,  // 10 min gcTime
    retry:                DEFAULT_RETRY,
    refetchOnWindowFocus: DEFAULT_REFETCH_ON_FOCUS,
    refetchOnReconnect:   false,
    ...options,
  };
}

/**
 * Sprint 1E: Defaults for public content queries (directories, lists).
 */
export function applyPublicContentQueryOptions(options = {}) {
  return {
    staleTime:            PUBLIC_CONTENT_STALE_TIME_MS,
    gcTime:               DEFAULT_GC_TIME_MS,
    retry:                DEFAULT_RETRY,
    refetchOnWindowFocus: DEFAULT_REFETCH_ON_FOCUS,
    refetchOnReconnect:   false,
    ...options,
  };
}