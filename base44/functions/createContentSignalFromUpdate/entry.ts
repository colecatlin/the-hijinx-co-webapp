/**
 * createContentSignalFromUpdate
 * ─────────────────────────────────────────────────────────────────
 * Public HTTP entry point for the Story Radar signal detection service.
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
 * Auth: admin only. The core creation logic lives in the shared
 * contentSignalCore module (server-side only) so there is no shared
 * internal token and no cross-function HTTP invoke.
 * Safety: never auto-publishes, never creates StoryRecommendation.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { createContentSignal } from '../../shared/contentSignalCore.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    // Auth: admin only. No unauthenticated fallback — unauthenticated
    // requests are rejected.
    let isAuthorized = false;
    try {
      const user = await base44.auth.me();
      if (user?.role === 'admin') isAuthorized = true;
    } catch (_) { /* no user context — not authorized */ }
    if (!isAuthorized) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Validate required fields
    const { source_entity_type, source_entity_id, trigger_action } = payload;
    if (!source_entity_type || !source_entity_id || !trigger_action) {
      return Response.json({
        error: 'Missing required fields: source_entity_type, source_entity_id, trigger_action',
      }, { status: 400 });
    }

    const result = await createContentSignal(base44, payload);
    return Response.json(result);

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});