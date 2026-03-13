/**
 * storyRadarTriggerPolicy
 * ─────────────────────────────────────────────────────────────────
 * Returns the Story Radar trigger policy config.
 * Admin-only. Use this to inspect or tune signal detection rules
 * without rewriting logic.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ─── POLICY DEFINITION ────────────────────────────────────────────
// This is the source of truth for what Story Radar monitors and how
// it scores signals. Keep in sync with createContentSignalFromUpdate.

export const TRIGGER_POLICY = {
  version: '1.0.0',

  // Entity types the signal detector is allowed to process
  monitoredEntityTypes: [
    'Driver', 'Team', 'Track', 'Series', 'Event', 'Session',
    'Results', 'Standings', 'Entry', 'Announcement', 'OutletStory',
  ],

  // All trigger actions this system understands
  supportedTriggerActions: [
    // Competition
    'result_created', 'results_updated', 'standings_updated',
    'streak_detected', 'milestone_reached', 'points_battle_changed',
    'upset_or_surprise_result', 'driver_returned_after_absence', 'notable_finish_or_podium',
    // Business / Team
    'team_sponsor_added', 'sponsor_changed', 'team_change_detected', 'series_partner_added',
    // Schedule / Event
    'event_created', 'event_updated', 'event_postponed', 'event_cancelled',
    'schedule_changed', 'notable_location_change',
    // Editorial / Audience
    'announcement_published', 'article_traffic_spike',
    'unusual_growth_or_decline', 'controversy_detected', 'rules_or_penalty_update',
  ],

  // Maps trigger_action → ContentSignal.signal_type enum value
  signalTypeByTrigger: {
    result_created: 'result_posted',
    results_updated: 'result_posted',
    notable_finish_or_podium: 'result_posted',
    upset_or_surprise_result: 'result_posted',
    standings_updated: 'standings_change',
    points_battle_changed: 'standings_change',
    streak_detected: 'standings_change',
    driver_returned_after_absence: 'milestone',
    milestone_reached: 'milestone',
    team_change_detected: 'team_change',
    team_sponsor_added: 'partnership',
    sponsor_changed: 'partnership',
    series_partner_added: 'partnership',
    event_created: 'event_published',
    event_updated: 'event_published',
    event_postponed: 'event_published',
    event_cancelled: 'event_published',
    schedule_changed: 'event_published',
    notable_location_change: 'event_published',
    controversy_detected: 'controversy',
    rules_or_penalty_update: 'controversy',
    announcement_published: 'other',
    article_traffic_spike: 'other',
    unusual_growth_or_decline: 'other',
  },

  // Default importance level assigned per trigger action
  importanceByTrigger: {
    result_created: 'medium',
    results_updated: 'medium',
    standings_updated: 'medium',
    streak_detected: 'high',
    milestone_reached: 'high',
    points_battle_changed: 'high',
    upset_or_surprise_result: 'high',
    driver_returned_after_absence: 'medium',
    notable_finish_or_podium: 'medium',
    team_sponsor_added: 'medium',
    sponsor_changed: 'medium',
    team_change_detected: 'medium',
    series_partner_added: 'medium',
    event_created: 'medium',
    event_updated: 'low',
    event_postponed: 'high',
    event_cancelled: 'high',
    schedule_changed: 'medium',
    notable_location_change: 'medium',
    announcement_published: 'medium',
    article_traffic_spike: 'high',
    unusual_growth_or_decline: 'medium',
    controversy_detected: 'critical',
    rules_or_penalty_update: 'high',
  },

  // Fields that signal a meaningful change per entity type
  meaningfulFieldsByEntity: {
    Driver: ['career_status', 'status', 'team_id', 'primary_series_id', 'primary_number', 'manufacturer'],
    Team: ['status', 'manufacturer'],
    Event: ['status', 'start_date', 'track_id', 'series_id'],
    Results: ['position', 'status', 'points', 'laps_completed'],
    Standings: ['position', 'points', 'wins'],
    Announcement: ['message', 'active'],
    OutletStory: ['status', 'featured'],
  },

  // These field-only changes should never trigger a signal
  ignoredFields: [
    'updated_date', 'created_date', 'sync_last_seen_at', 'data_source',
    'canonical_key', 'canonical_slug', 'normalized_name', 'normalized_result_key',
    'result_identity_key', 'notes', 'processing_notes', 'slug', 'numeric_id',
    'external_uid', 'body', 'author_title', 'photo_credit', 'subtitle',
    'dedupe_key', 'ai_processed', 'ai_processed_at', 'cover_image',
    'headshot_url', 'hero_image_url', 'gallery_urls', 'highlight_video_url',
    'calendar_id', 'owner_user_id',
  ],

  // Cooldown window in minutes — prevents duplicate signals in this window
  cooldownWindowByTrigger: {
    standings_updated: 90,
    points_battle_changed: 90,
    results_updated: 60,
    event_updated: 120,
    announcement_published: 240,
    article_traffic_spike: 180,
    default: 60,
  },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: admin only' }, { status: 403 });
    }
    return Response.json({ success: true, policy: TRIGGER_POLICY });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});