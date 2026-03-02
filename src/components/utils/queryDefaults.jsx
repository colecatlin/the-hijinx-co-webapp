/**
 * Shared React Query defaults for Index46.
 * Import these constants + helper wherever you call useQuery / prefetchQuery.
 */

export const DEFAULT_STALE_TIME_MS   = 30_000;   // 30 s
export const DEFAULT_GC_TIME_MS      = 300_000;  // 5 min
export const DEFAULT_RETRY           = 1;
export const DEFAULT_REFETCH_ON_FOCUS = false;

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