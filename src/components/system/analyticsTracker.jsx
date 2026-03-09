/**
 * HIJINX Analytics Tracker
 * Lightweight wrapper around base44.analytics for consistent event naming.
 * All events are fire-and-forget — never throws.
 */
import { base44 } from '@/api/base44Client';

function track(eventName, properties = {}) {
  try {
    base44.analytics.track({ eventName, properties: { ...properties, _ts: Date.now() } });
  } catch (_) {
    // Silently swallow — analytics must never break the UI
  }
}

// ── Page-level views ─────────────────────────────────────────────────────────

export const Analytics = {

  /** Generic page view */
  pageView(pageName, props = {}) {
    track('page_view', { page: pageName, ...props });
  },

  // ── Entity profile views ─────────────────────────────────────────────────

  profileViewDriver(driverId, driverName, discipline) {
    track('profile_view_driver', {
      driver_id:   driverId   || null,
      driver_name: driverName || null,
      discipline:  discipline || null,
    });
  },

  profileViewTeam(teamId, teamName) {
    track('profile_view_team', {
      team_id:   teamId   || null,
      team_name: teamName || null,
    });
  },

  profileViewTrack(trackId, trackName, state) {
    track('profile_view_track', {
      track_id:   trackId   || null,
      track_name: trackName || null,
      state:      state     || null,
    });
  },

  profileViewSeries(seriesId, seriesName, discipline) {
    track('profile_view_series', {
      series_id:   seriesId   || null,
      series_name: seriesName || null,
      discipline:  discipline || null,
    });
  },

  profileViewEvent(eventId, eventName, status) {
    track('profile_view_event', {
      event_id:   eventId   || null,
      event_name: eventName || null,
      status:     status    || null,
    });
  },

  // ── Platform feature actions ─────────────────────────────────────────────

  racecoreLaunch(entityType, entityId) {
    track('racecore_launch', { entity_type: entityType || null, entity_id: entityId || null });
  },

  mediaApplyClick(source) {
    track('media_apply_click', { source: source || 'unknown' });
  },

  outletStoryView(storyId, storyTitle, category) {
    track('outlet_story_view', {
      story_id:    storyId    || null,
      story_title: storyTitle || null,
      category:    category   || null,
    });
  },

  // ── Homepage interactions ────────────────────────────────────────────────

  heroCTAClick(ctaLabel, destination) {
    track('hero_cta_click', { label: ctaLabel || null, destination: destination || null });
  },

  spotlightClick(entityType, entityId) {
    track('spotlight_click', { entity_type: entityType || null, entity_id: entityId || null });
  },

  trendingClick(entityType, entityId, section) {
    track('trending_click', {
      entity_type: entityType || null,
      entity_id:   entityId   || null,
      section:     section    || null,
    });
  },

  // ── Discovery interactions ───────────────────────────────────────────────

  directorySearch(entityType, query) {
    track('directory_search', { entity_type: entityType || null, query: query || null });
  },

  registrationStart(source) {
    track('registration_start', { source: source || null });
  },

  newsletterSignup(source) {
    track('newsletter_signup', { source: source || null });
  },
};

export default Analytics;