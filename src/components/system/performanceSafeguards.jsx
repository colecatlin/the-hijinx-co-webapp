/**
 * HIJINX Performance Safeguards
 *
 * This file documents safe query and data loading patterns across the platform.
 * All public pages follow these principles to ensure fast load times and safe memory usage.
 *
 * PRINCIPLES:
 * 1. Homepage: Limited featured sets only (8-10 drivers, 4-6 tracks, stories snippet)
 * 2. Directories: Paginated or capped listings (50 per page max)
 * 3. Entity pages: Single entity + related items only (no full dataset loads)
 * 4. Results panels: Session/standings filtered by series+season (never load all results)
 * 5. Query timeouts: Implicit via TanStack Query defaults (30s, 1 retry)
 *
 * ENFORCED LIMITS:
 * - Driver profiles: Load 10 results max per session
 * - Team profiles: Load 20 entries per event max
 * - Track profiles: Load 50 events max
 * - Series pages: Load 100 events per season max
 * - Event results: Load only official sessions (not draft/provisional)
 * - Standings: Load top 20 drivers per class
 *
 * MONITORING:
 * Use Analytics.pageView() to track entry points.
 * If load times spike, check query limits in profile data loaders.
 */

// ── Suggested limits by page type ─────────────────────────────────────────────

export const SAFE_LIMITS = {
  // Homepage: featured sets
  featured_drivers_max:  10,
  featured_tracks_max:   6,
  featured_series_max:   8,
  featured_events_max:   12,
  activity_feed_max:     15,

  // Directories: pagination
  directory_page_size:   50,
  directory_max_load:    500, // absolute cap per list

  // Entity pages: related items
  driver_results_max:    10, // official results only
  driver_entries_max:    20,
  team_entries_max:      20,
  track_events_max:      50,
  series_events_max:     100, // per season
  event_sessions_max:    50, // filter to official only

  // Standings & results
  standings_preview_max: 20,
  results_per_session:   500, // absolute cap
};

// ── Example: Safe entity page loader ─────────────────────────────────────────

export function safeLimitResults(results, limit) {
  if (!Array.isArray(results)) return [];
  return results.slice(0, Math.min(limit, results.length));
}

// ── Query helpers for common patterns ─────────────────────────────────────────

export const QueryLimits = {
  /**
   * Official results only (not draft/provisional)
   * Used on driver profiles, team profiles, event results pages
   */
  filterOfficialSessions(sessions = []) {
    return sessions.filter(s => ['Official', 'Locked'].includes(s.status));
  },

  /**
   * Current season filter (prevents loading historical data)
   */
  currentSeasonOnly(events = [], year) {
    if (!year) return events;
    return events.filter(e => e.season === year);
  },

  /**
   * Public visibility filter (don't load draft/unpublished)
   */
  publicOnly(items = []) {
    return items.filter(item =>
      item.status === 'published' || item.published_flag === true || item.profile_status === 'live'
    );
  },
};

export default SAFE_LIMITS;