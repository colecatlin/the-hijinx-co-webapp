/**
 * findDuplicateClasses.js
 * Groups SeriesClass and EventClass by normalized keys to detect duplicates.
 * 
 * Returns duplicate groups for each class type.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const seriesClassDuplicates = [];
    const eventClassDuplicates = [];
    let seriesTotal = 0, seriesChecked = 0, eventTotal = 0, eventChecked = 0;

    // ── Find duplicate SeriesClasses ──
    const seriesKeyMap = {};
    let offset = 0;
    const limit = 100;

    while (true) {
      const batch = await base44.asServiceRole.entities.SeriesClass.list('-updated_date', limit, offset);
      if (!batch || batch.length === 0) break;
      offset += batch.length;
      seriesTotal += batch.length;

      for (const cls of batch) {
        const key = cls.normalized_series_class_key;
        if (!key) continue;
        seriesChecked++;

        if (!seriesKeyMap[key]) {
          seriesKeyMap[key] = {
            key,
            record_ids: [],
            series_ids: new Set(),
            class_names: new Set(),
          };
        }

        seriesKeyMap[key].record_ids.push(cls.id);
        if (cls.series_id) seriesKeyMap[key].series_ids.add(cls.series_id);
        if (cls.class_name) seriesKeyMap[key].class_names.add(cls.class_name);
      }
    }

    for (const [key, group] of Object.entries(seriesKeyMap)) {
      if (group.record_ids.length > 1) {
        seriesClassDuplicates.push({
          key,
          record_ids: group.record_ids,
          series_ids: Array.from(group.series_ids),
          class_names: Array.from(group.class_names),
        });
      }
    }

    // ── Find duplicate EventClasses ──
    const eventKeyMap = {};
    offset = 0;

    while (true) {
      const batch = await base44.asServiceRole.entities.EventClass.list('-updated_date', limit, offset);
      if (!batch || batch.length === 0) break;
      offset += batch.length;
      eventTotal += batch.length;

      for (const cls of batch) {
        const key = cls.normalized_event_class_key;
        if (!key) continue;
        eventChecked++;

        if (!eventKeyMap[key]) {
          eventKeyMap[key] = {
            key,
            record_ids: [],
            event_ids: new Set(),
            class_names: new Set(),
          };
        }

        eventKeyMap[key].record_ids.push(cls.id);
        if (cls.event_id) eventKeyMap[key].event_ids.add(cls.event_id);
        if (cls.class_name) eventKeyMap[key].class_names.add(cls.class_name);
      }
    }

    for (const [key, group] of Object.entries(eventKeyMap)) {
      if (group.record_ids.length > 1) {
        eventClassDuplicates.push({
          key,
          record_ids: group.record_ids,
          event_ids: Array.from(group.event_ids),
          class_names: Array.from(group.class_names),
        });
      }
    }

    return Response.json({
      success: true,
      total_series_classes: seriesTotal,
      series_class_candidates_checked: seriesChecked,
      series_class_duplicate_groups: seriesClassDuplicates,
      total_event_classes: eventTotal,
      event_class_candidates_checked: eventChecked,
      event_class_duplicate_groups: eventClassDuplicates,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});