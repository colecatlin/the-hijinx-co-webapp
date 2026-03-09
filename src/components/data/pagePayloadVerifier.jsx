/**
 * components/data/pagePayloadVerifier.js
 *
 * Lightweight verifiers for page-level data payloads.
 * Each function returns { ok, missing, warnings } — never throws.
 *
 * Rules:
 * - Only check the minimum fields needed for safe rendering.
 * - Warnings are soft issues (data present but degraded).
 * - Missing are hard issues (page cannot render correctly without them).
 */

function result(missing = [], warnings = []) {
  return { ok: missing.length === 0, missing, warnings };
}

function checkField(obj, path, label, missing) {
  const keys = path.split('.');
  let cur = obj;
  for (const k of keys) {
    if (cur == null || typeof cur !== 'object') { missing.push(label); return; }
    cur = cur[k];
  }
  if (cur == null || cur === '') missing.push(label);
}

// ── Driver ────────────────────────────────────────────────────────────────────

export function verifyDriverProfilePayload(payload) {
  const missing = [];
  const warnings = [];

  if (!payload?.driver) { missing.push('driver'); return result(missing, warnings); }

  const d = payload.driver;
  if (!d.id)         missing.push('driver.id');
  if (!d.first_name && !d.last_name) missing.push('driver displayable name (first_name or last_name)');

  if (!d.slug && !d.canonical_slug) warnings.push('driver has no slug — public URL will fall back to id');
  if (!d.profile_status || d.profile_status === 'draft') warnings.push('driver.profile_status is draft — not publicly visible');
  if (!payload.programs || payload.programs.length === 0) warnings.push('no driver programs');
  if (!payload.media)  warnings.push('no driver media record');

  return result(missing, warnings);
}

// ── Team ──────────────────────────────────────────────────────────────────────

export function verifyTeamProfilePayload(payload) {
  const missing = [];
  const warnings = [];

  if (!payload?.team) { missing.push('team'); return result(missing, warnings); }

  const t = payload.team;
  if (!t.id)   missing.push('team.id');
  if (!t.name) missing.push('team.name');

  if (!t.slug && !t.canonical_slug) warnings.push('team has no slug — public URL will fall back to id');
  if (!payload.roster_drivers || payload.roster_drivers.length === 0) warnings.push('no roster drivers');

  return result(missing, warnings);
}

// ── Track ─────────────────────────────────────────────────────────────────────

export function verifyTrackProfilePayload(payload) {
  const missing = [];
  const warnings = [];

  if (!payload?.track) { missing.push('track'); return result(missing, warnings); }

  const t = payload.track;
  if (!t.id)   missing.push('track.id');
  if (!t.name) missing.push('track.name');

  if (!t.slug && !t.canonical_slug) warnings.push('track has no slug — public URL will fall back to id');
  if (!t.location_city && !t.location_state) warnings.push('track has no location info');
  if (!payload.events || payload.events.length === 0) warnings.push('no events linked to track');

  return result(missing, warnings);
}

// ── Series ────────────────────────────────────────────────────────────────────

export function verifySeriesDetailPayload(payload) {
  const missing = [];
  const warnings = [];

  if (!payload?.series) { missing.push('series'); return result(missing, warnings); }

  const s = payload.series;
  if (!s.id)   missing.push('series.id');
  if (!s.name) missing.push('series.name');

  if (!s.slug && !s.canonical_slug) warnings.push('series has no slug — public URL will fall back to id');
  if (!s.discipline) warnings.push('series.discipline missing');
  if (!payload.classes || payload.classes.length === 0) warnings.push('no series classes defined');
  if (!payload.events  || payload.events.length  === 0) warnings.push('no events linked to series');

  return result(missing, warnings);
}

// ── Event ─────────────────────────────────────────────────────────────────────

export function verifyEventProfilePayload(payload) {
  const missing = [];
  const warnings = [];

  if (!payload?.event) { missing.push('event'); return result(missing, warnings); }

  const e = payload.event;
  if (!e.id)   missing.push('event.id');
  if (!e.name) missing.push('event.name');
  if (!e.event_date) warnings.push('event.event_date missing');
  if (!e.track_id)   warnings.push('event.track_id missing — track context unavailable');
  if (!e.series_id)  warnings.push('event.series_id missing — series context unavailable');

  const status = e.public_status || e.status || '';
  if (!status || status === 'draft') warnings.push(`event is not publicly visible (status: "${status}")`);

  return result(missing, warnings);
}

// ── Homepage ──────────────────────────────────────────────────────────────────

// Keys must match what getHomepageData actually returns (upcoming_events, not featured_events)
const HOMEPAGE_REQUIRED_KEYS = ['featured_story', 'featured_drivers', 'upcoming_events', 'featured_series', 'featured_tracks'];
const HOMEPAGE_ARRAY_KEYS    = ['featured_drivers', 'upcoming_events', 'featured_series', 'featured_tracks'];

export function verifyHomepagePayload(payload) {
  const missing = [];
  const warnings = [];

  if (!payload) { missing.push('payload'); return result(missing, warnings); }

  // Top-level shape
  for (const key of HOMEPAGE_REQUIRED_KEYS) {
    if (!(key in payload)) missing.push(`homepage.${key}`);
  }

  // Arrays must be arrays (null is acceptable — means no data)
  for (const key of HOMEPAGE_ARRAY_KEYS) {
    if (key in payload && payload[key] !== null && !Array.isArray(payload[key])) {
      warnings.push(`homepage.${key} is not an array or null — unexpected shape`);
    }
  }

  // Soft warnings on empty arrays
  for (const key of HOMEPAGE_ARRAY_KEYS) {
    if (Array.isArray(payload[key]) && payload[key].length === 0) {
      warnings.push(`homepage.${key} is empty`);
    }
  }

  if (!payload.featured_story) warnings.push('homepage.featured_story is null — no story will display');

  return result(missing, warnings);
}