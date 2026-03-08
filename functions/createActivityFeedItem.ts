/**
 * createActivityFeedItem
 *
 * Entity automation handler — called automatically when key platform entities
 * are created or updated. Writes a record to ActivityFeed to power the
 * homepage live feed.
 *
 * Triggered by automations on:
 *   Driver (create), OutletStory (create, update), Event (create),
 *   Results (create), Track (create), Series (update)
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data, old_data } = body;

    if (!event || !data) {
      return Response.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const entityName = event.entity_name;
    const eventType  = event.type;
    let feedItem     = null;

    // ── Driver created ───────────────────────────────────────────────────
    if (entityName === 'Driver' && eventType === 'create') {
      const name = [data.first_name, data.last_name].filter(Boolean).join(' ');
      feedItem = {
        activity_type: 'driver_registered',
        title: `${name || 'New driver'} joined the platform`,
        description: data.primary_discipline || 'Driver profile created',
        entity_type: 'driver',
        entity_id: event.entity_id,
        related_driver_id: event.entity_id,
        thumbnail: null,
        visibility: 'public',
        created_at: new Date().toISOString(),
      };
    }

    // ── Story created ────────────────────────────────────────────────────
    else if (entityName === 'OutletStory' && eventType === 'create') {
      feedItem = {
        activity_type: 'story_published',
        title: data.title || 'New story published',
        description: data.category || 'The Outlet',
        entity_type: 'story',
        entity_id: event.entity_id,
        thumbnail: data.cover_image || null,
        visibility: 'public',
        created_at: new Date().toISOString(),
      };
    }

    // ── Story published (status change) ──────────────────────────────────
    else if (entityName === 'OutletStory' && eventType === 'update') {
      if (data.status === 'published' && old_data?.status !== 'published') {
        feedItem = {
          activity_type: 'story_published',
          title: data.title || 'Story published',
          description: data.category || 'The Outlet',
          entity_type: 'story',
          entity_id: event.entity_id,
          thumbnail: data.cover_image || null,
          visibility: 'public',
          created_at: new Date().toISOString(),
        };
      }
    }

    // ── Event created ────────────────────────────────────────────────────
    else if (entityName === 'Event' && eventType === 'create') {
      feedItem = {
        activity_type: 'event_created',
        title: data.name || 'New event added',
        description: data.series_name || 'Motorsports event',
        entity_type: 'event',
        entity_id: event.entity_id,
        related_event_id: event.entity_id,
        related_series_id: data.series_id || null,
        thumbnail: null,
        visibility: 'public',
        created_at: new Date().toISOString(),
      };
    }

    // ── Results posted ───────────────────────────────────────────────────
    else if (entityName === 'Results' && eventType === 'create') {
      feedItem = {
        activity_type: 'results_posted',
        title: 'Results posted',
        description: 'Official race results available',
        entity_type: 'results',
        entity_id: event.entity_id,
        related_event_id: data.event_id || null,
        related_series_id: data.series_id || null,
        thumbnail: null,
        visibility: 'public',
        created_at: new Date().toISOString(),
      };
    }

    // ── Track added ──────────────────────────────────────────────────────
    else if (entityName === 'Track' && eventType === 'create') {
      feedItem = {
        activity_type: 'track_added',
        title: data.name || 'New track added',
        description: [data.location_city, data.location_state].filter(Boolean).join(', ') || 'Track database',
        entity_type: 'track',
        entity_id: event.entity_id,
        thumbnail: data.image_url || data.logo_url || null,
        visibility: 'public',
        created_at: new Date().toISOString(),
      };
    }

    // ── Series updated ───────────────────────────────────────────────────
    else if (entityName === 'Series' && eventType === 'update') {
      // Throttle: only fire if name/season changed (avoid noise on minor updates)
      const scheduleChanged = old_data && (
        data.season_year !== old_data.season_year ||
        data.name !== old_data.name
      );
      if (scheduleChanged) {
        feedItem = {
          activity_type: 'series_updated',
          title: `${data.name || 'Series'} updated`,
          description: data.discipline || 'Racing series',
          entity_type: 'series',
          entity_id: event.entity_id,
          related_series_id: event.entity_id,
          thumbnail: data.logo_url || null,
          visibility: 'public',
          created_at: new Date().toISOString(),
        };
      }
    }

    if (!feedItem) {
      return Response.json({ skipped: true, reason: 'No feed item needed for this event' });
    }

    const created = await base44.asServiceRole.entities.ActivityFeed.create(feedItem);
    return Response.json({ success: true, id: created.id });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});