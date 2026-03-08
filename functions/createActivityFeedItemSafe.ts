/**
 * createActivityFeedItemSafe
 *
 * Safe, callable ActivityFeed writer. Accepts a feed item payload directly,
 * writes to ActivityFeed, and logs failures to OperationLog.
 *
 * Always returns a response — never throws upward.
 * Returns: { ok: true, record } | { ok: false, error }
 *
 * Intended to be called fire-and-forget from other backend functions:
 *   base44.asServiceRole.functions.invoke('createActivityFeedItemSafe', payload).catch(() => {});
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  let payload = {};

  try {
    payload = await req.json();

    const {
      activity_type,
      title,
      description,
      entity_type,
      entity_id,
      related_driver_id,
      related_event_id,
      related_series_id,
      thumbnail,
      visibility,
    } = payload;

    if (!activity_type || !title) {
      return Response.json({ ok: false, error: 'activity_type and title are required' });
    }

    const record = await base44.asServiceRole.entities.ActivityFeed.create({
      activity_type,
      title,
      description: description || null,
      entity_type: entity_type || null,
      entity_id: entity_id || null,
      related_driver_id: related_driver_id || null,
      related_event_id: related_event_id || null,
      related_series_id: related_series_id || null,
      thumbnail: thumbnail || null,
      visibility: visibility || 'public',
      created_at: new Date().toISOString(),
    });

    return Response.json({ ok: true, record });

  } catch (error) {
    // Log failure silently — never re-throw
    try {
      await base44.asServiceRole.entities.OperationLog.create({
        operation_type: 'activity_feed_write_failed',
        entity_name: 'ActivityFeed',
        status: 'error',
        message: error.message,
        metadata: {
          activity_type: payload?.activity_type || null,
          entity_id: payload?.entity_id || null,
          related_event_id: payload?.related_event_id || null,
          related_driver_id: payload?.related_driver_id || null,
          error: error.message,
        },
      });
    } catch (_) {
      // OperationLog write also failed — absorb silently
    }

    return Response.json({ ok: false, error: error.message });
  }
});