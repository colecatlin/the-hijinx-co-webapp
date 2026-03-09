/**
 * components/data/fallbackContracts.js
 *
 * Canonical fallback objects for all major page payloads.
 * Use these as safe empty-state defaults — no undefined fields, consistent shapes.
 * Import from here instead of defining inline fallbacks per page.
 */

// ── Homepage ──────────────────────────────────────────────────────────────────

export const homepageFallbackData = {
  featured_story:    null,
  featured_stories:  [],
  featured_drivers:  [],
  featured_tracks:   [],
  featured_series:   [],
  featured_events:   [],
  upcoming_events:   [],
  recent_results:    [],
  activity_feed:     [],
  featured_media:    [],
  featured_products: [],
  ticker_items:      null,
  spotlight_driver:  null,
  spotlight_event:   null,
};

// ── Driver Profile ────────────────────────────────────────────────────────────

export const driverProfileFallbackData = {
  driver:   null,
  media:    null,
  team:     null,
  programs: [],
  entries:  [],
  results:  [],
  sessions: [],
  series:   [],
  classes:  [],
};

// ── Team Profile ──────────────────────────────────────────────────────────────

export const teamProfileFallbackData = {
  team:           null,
  roster_drivers: [],
  programs:       [],
  entries:        [],
  results:        [],
  events:         [],
  tracks:         [],
};

// ── Track Profile ─────────────────────────────────────────────────────────────

export const trackProfileFallbackData = {
  track:        null,
  events:       [],
  disciplines:  [],
  track_events: [],
  series_links: [],
  media:        null,
  performance:  null,
  operations:   null,
  community:    null,
};

// ── Series Detail ─────────────────────────────────────────────────────────────

export const seriesDetailFallbackData = {
  series:    null,
  classes:   [],
  events:    [],
  tracks:    [],
  sessions:  [],
  results:   [],
  standings: [],
};

// ── Event Profile ─────────────────────────────────────────────────────────────

export const eventProfileFallbackData = {
  event:     null,
  track:     null,
  series:    null,
  sessions:  [],
  classes:   [],
  results:   [],
  standings: [],
};

// ── Managed Entities (Profile / Dashboard) ────────────────────────────────────

export const managedEntitiesFallbackData = {
  entities:      [],
  primary:       null,
  racecore:      [],
  invitations:   [],
  operationLogs: [],
};

// ── Verification helper ───────────────────────────────────────────────────────

/**
 * Verify that a fallback object is structurally valid (no undefined values).
 * Used by Diagnostics page.
 *
 * @param {object} fallback
 * @returns {{ ok: boolean, undefinedKeys: string[] }}
 */
export function verifyFallbackShape(fallback) {
  if (!fallback || typeof fallback !== 'object') return { ok: false, undefinedKeys: ['(root)'] };
  const undefinedKeys = Object.entries(fallback)
    .filter(([, v]) => v === undefined)
    .map(([k]) => k);
  return { ok: undefinedKeys.length === 0, undefinedKeys };
}

export const ALL_FALLBACKS = {
  homepage:      homepageFallbackData,
  driverProfile: driverProfileFallbackData,
  teamProfile:   teamProfileFallbackData,
  trackProfile:  trackProfileFallbackData,
  seriesDetail:  seriesDetailFallbackData,
  eventProfile:  eventProfileFallbackData,
  managedEntities: managedEntitiesFallbackData,
};