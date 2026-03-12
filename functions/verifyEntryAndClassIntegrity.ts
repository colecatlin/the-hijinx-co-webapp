/**
 * verifyEntryAndClassIntegrity.js
 * Comprehensive integrity verification for Entry, SeriesClass, and EventClass.
 * 
 * Verifies:
 * - all entries have normalized_entry_key
 * - all series classes have normalized_series_class_key
 * - all event classes have normalized_event_class_key
 * - no duplicate entry groups
 * - no duplicate class groups
 * - registration imports are idempotent
 * 
 * Returns detailed status report.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const details = {
      total_entries: 0,
      entries_with_key: 0,
      total_series_classes: 0,
      series_classes_with_key: 0,
      total_event_classes: 0,
      event_classes_with_key: 0,
    };

    const failures = [];
    const warnings = [];

    // ── Check Entry normalization ──
    let offset = 0, limit = 100;
    while (true) {
      const batch = await base44.asServiceRole.entities.Entry.list('-updated_date', limit, offset);
      if (!batch || batch.length === 0) break;
      offset += batch.length;
      details.total_entries += batch.length;

      for (const entry of batch) {
        if (entry.normalized_entry_key) details.entries_with_key++;
      }
    }

    if (details.entries_with_key < details.total_entries) {
      failures.push(`${details.total_entries - details.entries_with_key} Entries missing normalized_entry_key`);
    }

    // ── Check SeriesClass normalization ──
    offset = 0;
    while (true) {
      const batch = await base44.asServiceRole.entities.SeriesClass.list('-updated_date', limit, offset);
      if (!batch || batch.length === 0) break;
      offset += batch.length;
      details.total_series_classes += batch.length;

      for (const cls of batch) {
        if (cls.normalized_series_class_key) details.series_classes_with_key++;
      }
    }

    if (details.series_classes_with_key < details.total_series_classes) {
      failures.push(`${details.total_series_classes - details.series_classes_with_key} SeriesClasses missing normalized_series_class_key`);
    }

    // ── Check EventClass normalization ──
    offset = 0;
    while (true) {
      const batch = await base44.asServiceRole.entities.EventClass.list('-updated_date', limit, offset);
      if (!batch || batch.length === 0) break;
      offset += batch.length;
      details.total_event_classes += batch.length;

      for (const cls of batch) {
        if (cls.normalized_event_class_key) details.event_classes_with_key++;
      }
    }

    if (details.event_classes_with_key < details.total_event_classes) {
      failures.push(`${details.total_event_classes - details.event_classes_with_key} EventClasses missing normalized_event_class_key`);
    }

    // ── Check for duplicates ──
    const dupEntriesRes = await base44.asServiceRole.functions.invoke('findDuplicateEntries', {});
    const dupEntries = dupEntriesRes?.data?.duplicate_groups || [];
    if (dupEntries.length > 0) {
      failures.push(`${dupEntries.length} duplicate Entry groups detected`);
    }

    const dupClassesRes = await base44.asServiceRole.functions.invoke('findDuplicateClasses', {});
    const dupClasses = dupClassesRes?.data || {};
    const dupSeriesClasses = (dupClasses.series_class_duplicate_groups || []).length;
    const dupEventClasses = (dupClasses.event_class_duplicate_groups || []).length;
    if (dupSeriesClasses > 0) failures.push(`${dupSeriesClasses} duplicate SeriesClass groups detected`);
    if (dupEventClasses > 0) failures.push(`${dupEventClasses} duplicate EventClass groups detected`);

    return Response.json({
      success: true,
      entry_normalization_ok: details.entries_with_key === details.total_entries,
      series_class_normalization_ok: details.series_classes_with_key === details.total_series_classes,
      event_class_normalization_ok: details.event_classes_with_key === details.total_event_classes,
      duplicate_entries_remaining: dupEntries.length,
      duplicate_series_classes_remaining: dupSeriesClasses,
      duplicate_event_classes_remaining: dupEventClasses,
      import_idempotence_ok: dupEntries.length === 0,
      builder_class_reuse_ok: dupSeriesClasses === 0 && dupEventClasses === 0,
      failures: failures,
      warnings: warnings,
      details: details,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});