/**
 * createContentSignalFromUpdate
 * ─────────────────────────────────────────────────────────────────
 * Core Story Radar signal detection service.
 *
 * Input payload:
 *   source_entity_type   string   e.g. 'Driver', 'Event', 'Results'
 *   source_entity_id     string   entity record ID
 *   source_entity_name   string   display name
 *   trigger_action       string   e.g. 'result_created', 'event_postponed'
 *   previous_value       any      optional — value before the change
 *   new_value            any      optional — value after the change
 *   related_entity_ids   string[] optional
 *   related_entity_names string[] optional
 *   detected_at          string   optional ISO datetime
 *   metadata             object   optional — extra context (changed_fields, etc.)
 *
 * Returns:
 *   { created, skipped?, deduped?, reason?, signal_id?, signal_type?, importance_level? }
 *
 * Auth: admin users, or unauthenticated internal/service-role calls.
 * Safety: never auto-publishes, never creates StoryRecommendation.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ─── INLINED POLICY ───────────────────────────────────────────────
// Keep in sync with storyRadarTriggerPolicy.js

const SIGNAL_TYPE_BY_TRIGGER = {
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
};

const IMPORTANCE_BY_TRIGGER = {
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
};

const COOLDOWN_WINDOWS = {
  standings_updated: 90,
  points_battle_changed: 90,
  results_updated: 60,
  event_updated: 120,
  announcement_published: 240,
  article_traffic_spike: 180,
  default: 60,
};

const IGNORED_FIELDS = new Set([
  'updated_date', 'created_date', 'sync_last_seen_at', 'data_source',
  'canonical_key', 'canonical_slug', 'normalized_name', 'normalized_result_key',
  'result_identity_key', 'notes', 'processing_notes', 'slug', 'numeric_id',
  'external_uid', 'body', 'author_title', 'photo_credit', 'subtitle',
  'dedupe_key', 'ai_processed', 'ai_processed_at', 'cover_image',
  'headshot_url', 'hero_image_url', 'gallery_urls', 'highlight_video_url',
  'calendar_id', 'owner_user_id',
]);

const SUPPORTED_TRIGGERS = new Set(Object.keys(SIGNAL_TYPE_BY_TRIGGER));

const MONITORED_ENTITIES = new Set([
  'Driver', 'Team', 'Track', 'Series', 'Event', 'Session',
  'Results', 'Standings', 'Entry', 'Announcement', 'OutletStory',
]);

// ─── MEANINGFULNESS CHECK ─────────────────────────────────────────

function isMeaningfulChange(payload) {
  const { source_entity_type, trigger_action, previous_value, new_value, metadata } = payload;

  if (!SUPPORTED_TRIGGERS.has(trigger_action)) {
    return { meaningful: false, reason: 'unsupported_trigger' };
  }
  if (!MONITORED_ENTITIES.has(source_entity_type)) {
    return { meaningful: false, reason: 'unmonitored_entity' };
  }

  // Identical before/after — nothing changed
  if (previous_value !== undefined && new_value !== undefined && previous_value === new_value) {
    return { meaningful: false, reason: 'no_value_change' };
  }

  // If caller tells us which fields changed, skip if all are ignored
  if (Array.isArray(metadata?.changed_fields) && metadata.changed_fields.length > 0) {
    const meaningful = metadata.changed_fields.filter(f => !IGNORED_FIELDS.has(f));
    if (meaningful.length === 0) {
      return { meaningful: false, reason: 'only_ignored_fields_changed' };
    }
  }

  // Event_updated is low-value unless a meaningful field is included
  if (source_entity_type === 'Event' && trigger_action === 'event_updated') {
    const changed = metadata?.changed_fields ?? [];
    const eventKeyFields = ['status', 'start_date', 'track_id', 'series_id'];
    if (changed.length > 0 && !changed.some(f => eventKeyFields.includes(f))) {
      return { meaningful: false, reason: 'event_update_not_meaningful' };
    }
  }

  // Standings updates — only meaningful if position actually shifted
  if (source_entity_type === 'Standings' && trigger_action === 'standings_updated') {
    const posChange = metadata?.position_change;
    if (posChange !== undefined && Math.abs(posChange) < 1) {
      return { meaningful: false, reason: 'standings_position_unchanged' };
    }
  }

  return { meaningful: true };
}

// ─── DEDUPE KEY ───────────────────────────────────────────────────

function computeDedupeKey(payload) {
  const { source_entity_type, source_entity_id, trigger_action } = payload;
  const cooldownMinutes = COOLDOWN_WINDOWS[trigger_action] ?? COOLDOWN_WINDOWS.default;
  const bucketMs = cooldownMinutes * 60 * 1000;
  const timeBucket = Math.floor(Date.now() / bucketMs);
  return `${trigger_action}:${source_entity_type}:${source_entity_id}:${timeBucket}`;
}

// ─── SIGNAL SUMMARY ───────────────────────────────────────────────

function generateSignalSummary(payload) {
  const { source_entity_type, source_entity_name, trigger_action, previous_value, new_value, metadata } = payload;
  const name = source_entity_name || source_entity_type;

  switch (trigger_action) {
    case 'result_created':
      return `New result posted for ${name}${metadata?.session_name ? ` — ${metadata.session_name}` : ''}.`;
    case 'results_updated':
      return `Results updated for ${name}${metadata?.session_name ? ` in ${metadata.session_name}` : ''}.`;
    case 'notable_finish_or_podium':
      return `Notable finish recorded for ${name}${metadata?.position ? ` — finished P${metadata.position}` : ''}.`;
    case 'upset_or_surprise_result':
      return `Unexpected result for ${name}${metadata?.position ? ` — finished P${metadata.position}` : ''}.`;
    case 'standings_updated':
      return `Standings updated${metadata?.class_name ? ` in ${metadata.class_name}` : ''} affecting ${name}${metadata?.position_change ? ` — position shifted by ${metadata.position_change}` : ''}.`;
    case 'points_battle_changed':
      return `Points battle tightened around ${name}${metadata?.points_gap !== undefined ? ` — gap is now ${metadata.points_gap} points` : ''}.`;
    case 'streak_detected':
      return `Win or podium streak detected for ${name}${metadata?.streak_length ? ` — ${metadata.streak_length} consecutive` : ''}.`;
    case 'milestone_reached':
      return `${name} reached a career milestone${metadata?.milestone ? `: ${metadata.milestone}` : ''}.`;
    case 'driver_returned_after_absence':
      return `${name} has returned to competition after a notable absence.`;
    case 'team_change_detected':
      return `Driver team change detected for ${name}${new_value ? ` — now with ${new_value}` : ''}.`;
    case 'team_sponsor_added':
      return `New sponsor added to ${name}, indicating increased commercial momentum.`;
    case 'sponsor_changed':
      return `Sponsorship change detected for ${name}${new_value ? ` — now partnered with ${new_value}` : ''}.`;
    case 'series_partner_added':
      return `New series partner added to ${name}.`;
    case 'event_created':
      return `New event added to schedule: ${name}.`;
    case 'event_updated': {
      const cf = metadata?.changed_fields?.slice(0, 3).join(', ');
      return `Event updated: ${name}${cf ? ` — ${cf} changed` : ''}.`;
    }
    case 'event_postponed':
      return `${name} has been postponed${previous_value ? ` from ${previous_value}` : ''}${new_value ? ` — rescheduled to ${new_value}` : ''}.`;
    case 'event_cancelled':
      return `${name} has been cancelled.`;
    case 'schedule_changed':
      return `Schedule change detected for ${name}.`;
    case 'notable_location_change':
      return `Venue change detected for ${name}${new_value ? ` — now at ${new_value}` : ''}.`;
    case 'announcement_published': {
      const msg = metadata?.message;
      return `New announcement published${msg ? `: "${msg.slice(0, 100)}${msg.length > 100 ? '…' : ''}"` : ''}.`;
    }
    case 'article_traffic_spike':
      return `Published story "${name}" showed an unusual traffic spike.`;
    case 'unusual_growth_or_decline':
      return `Unusual growth or decline detected around ${name}.`;
    case 'controversy_detected':
      return `Potential controversy flagged around ${name}.`;
    case 'rules_or_penalty_update':
      return `Rules or penalty update detected involving ${name}.`;
    default:
      return `Editorial signal detected for ${name} — ${trigger_action}.`;
  }
}

// ─── OP LOG (fire and forget) ─────────────────────────────────────

async function logOp(base44, event_type, meta) {
  try {
    await base44.asServiceRole.entities.OperationLog.create({
      operation_type: event_type,
      entity_name: 'ContentSignal',
      entity_id: meta.signal_id ?? meta.source_entity_id ?? '',
      status: 'success',
      message: event_type,
      metadata: meta,
      function_name: 'createContentSignalFromUpdate',
      source_type: 'api_function',
    });
  } catch (_) { /* fire and forget */ }
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Auth: admin users OR internal/service calls (no user context)
    let isAuthorized = false;
    try {
      const user = await base44.auth.me();
      if (user?.role === 'admin') isAuthorized = true;
    } catch (_) {
      // No user context — treat as internal service call
      isAuthorized = true;
    }
    if (!isAuthorized) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const payload = await req.json();
    const {
      source_entity_type,
      source_entity_id,
      source_entity_name,
      trigger_action,
      previous_value,
      new_value,
      related_entity_ids,
      related_entity_names,
      detected_at,
      metadata,
    } = payload;

    // Validate required fields
    if (!source_entity_type || !source_entity_id || !trigger_action) {
      return Response.json({
        error: 'Missing required fields: source_entity_type, source_entity_id, trigger_action',
      }, { status: 400 });
    }

    // ── Step 1: Meaningfulness check ──
    const { meaningful, reason } = isMeaningfulChange(payload);
    if (!meaningful) {
      await logOp(base44, 'story_radar_signal_skipped', {
        signal_type: SIGNAL_TYPE_BY_TRIGGER[trigger_action] ?? 'other',
        source_entity_type,
        source_entity_id,
        trigger_action,
        reason_skipped: reason,
      });
      return Response.json({ created: false, skipped: true, reason });
    }

    // ── Step 2: Dedupe check ──
    const dedupeKey = computeDedupeKey(payload);
    const cooldownMinutes = COOLDOWN_WINDOWS[trigger_action] ?? COOLDOWN_WINDOWS.default;
    const cutoffMs = Date.now() - cooldownMinutes * 60 * 1000;
    const cutoff = new Date(cutoffMs).toISOString();

    const existingSignals = await base44.asServiceRole.entities.ContentSignal.filter({
      dedupe_key: dedupeKey,
    });

    const recentDupe = existingSignals.find(s => {
      const ts = s.detected_at ?? s.created_date;
      return ts && ts >= cutoff;
    });

    if (recentDupe) {
      await logOp(base44, 'story_radar_signal_deduped', {
        signal_type: SIGNAL_TYPE_BY_TRIGGER[trigger_action] ?? 'other',
        source_entity_type,
        source_entity_id,
        trigger_action,
        dedupe_key: dedupeKey,
        existing_signal_id: recentDupe.id,
      });
      return Response.json({ created: false, deduped: true, existing_id: recentDupe.id });
    }

    // ── Step 3: Build and create signal ──
    const signalType = SIGNAL_TYPE_BY_TRIGGER[trigger_action] ?? 'other';
    const importanceLevel = IMPORTANCE_BY_TRIGGER[trigger_action] ?? 'medium';
    const signalSummary = generateSignalSummary(payload);

    const signalData = {
      source_entity_type,
      source_entity_id,
      source_entity_name: source_entity_name ?? '',
      signal_type: signalType,
      trigger_action,
      importance_level: importanceLevel,
      signal_summary: signalSummary,
      dedupe_key: dedupeKey,
      detected_at: detected_at ?? new Date().toISOString(),
      status: 'new',
      ai_processed: false,
      related_entity_names: related_entity_names ?? [],
    };

    if (previous_value !== undefined) signalData.previous_value = String(previous_value);
    if (new_value !== undefined) signalData.new_value = String(new_value);
    if (related_entity_ids?.length) signalData.recommendation_ids = [];
    if (metadata) signalData.raw_data = JSON.stringify(metadata);

    const signal = await base44.asServiceRole.entities.ContentSignal.create(signalData);

    // ── Step 4: Log creation ──
    await logOp(base44, 'story_radar_signal_created', {
      signal_id: signal.id,
      signal_type: signalType,
      source_entity_type,
      source_entity_id,
      trigger_action,
      importance_level: importanceLevel,
      dedupe_key: dedupeKey,
    });

    return Response.json({
      created: true,
      skipped: false,
      signal_id: signal.id,
      dedupe_key: dedupeKey,
      signal_type: signalType,
      importance_level: importanceLevel,
      signal_summary: signalSummary,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});