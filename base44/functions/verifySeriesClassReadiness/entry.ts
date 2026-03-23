/**
 * verifySeriesClassReadiness()
 *
 * Audits the SeriesClass → Series relationship health.
 * Checks:
 *   - SeriesClass records linked to each Series
 *   - Orphan SeriesClass records (series_id missing or pointing to non-existent Series)
 *   - EventClass compatibility (series_class_id back-links valid)
 *   - Series with no classes at all (warning, not failure)
 *
 * Returns:
 *   { series_class_ready, orphan_classes, broken_links, warnings, failures }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const db = base44.asServiceRole;

    const [allSeries, allClasses, allEventClasses] = await Promise.all([
      db.entities.Series.list(),
      db.entities.SeriesClass.list(),
      db.entities.EventClass.list(),
    ]);

    const seriesIdSet = new Set(allSeries.map(s => s.id));
    const classIdSet = new Set(allClasses.map(c => c.id));

    const warnings = [];
    const failures = [];
    const orphan_classes = [];
    const broken_links = [];

    // --- Check 1: SeriesClass records with missing or broken series_id ---
    for (const cls of allClasses) {
      if (!cls.series_id) {
        orphan_classes.push({ id: cls.id, class_name: cls.class_name, reason: 'Missing series_id' });
        failures.push(`SeriesClass "${cls.class_name}" (${cls.id}) has no series_id`);
      } else if (!seriesIdSet.has(cls.series_id)) {
        orphan_classes.push({ id: cls.id, class_name: cls.class_name, series_id: cls.series_id, reason: 'series_id points to non-existent Series' });
        failures.push(`SeriesClass "${cls.class_name}" (${cls.id}) references unknown series_id "${cls.series_id}"`);
      }
    }

    // --- Check 2: Series with no classes ---
    const classCountBySeries = {};
    for (const cls of allClasses) {
      if (cls.series_id) {
        classCountBySeries[cls.series_id] = (classCountBySeries[cls.series_id] || 0) + 1;
      }
    }
    const seriesWithNoClasses = allSeries.filter(s => !classCountBySeries[s.id]);
    for (const s of seriesWithNoClasses) {
      warnings.push(`Series "${s.name}" (${s.id}) has no SeriesClass records`);
    }

    // --- Check 3: EventClass back-links to SeriesClass ---
    for (const ec of allEventClasses) {
      if (ec.series_class_id && !classIdSet.has(ec.series_class_id)) {
        broken_links.push({
          id: ec.id,
          class_name: ec.class_name,
          event_id: ec.event_id,
          series_class_id: ec.series_class_id,
          reason: 'series_class_id points to non-existent SeriesClass',
        });
        warnings.push(`EventClass "${ec.class_name}" (${ec.id}) references unknown series_class_id "${ec.series_class_id}"`);
      }
    }

    // --- Summary per series ---
    const series_summary = allSeries.map(s => ({
      id: s.id,
      name: s.name,
      class_count: classCountBySeries[s.id] || 0,
      status: classCountBySeries[s.id] ? 'ok' : 'no_classes',
    }));

    const series_class_ready = failures.length === 0;

    // Log operation
    try {
      await db.entities.OperationLog.create({
        operation_type: 'series_class_readiness_verified',
        entity_name: 'SeriesClass',
        status: series_class_ready ? 'success' : 'failed',
        message: `Audited ${allClasses.length} SeriesClass records across ${allSeries.length} series. Orphans: ${orphan_classes.length}. Broken EventClass links: ${broken_links.length}.`,
        total_records: allClasses.length,
        metadata: {
          total_series: allSeries.length,
          total_classes: allClasses.length,
          orphan_count: orphan_classes.length,
          broken_event_class_links: broken_links.length,
          series_with_no_classes: seriesWithNoClasses.length,
        },
        initiated_by: user.email,
      });
    } catch (_e) { /* non-fatal */ }

    return Response.json({
      series_class_ready,
      total_series: allSeries.length,
      total_classes: allClasses.length,
      orphan_classes,
      broken_links,
      series_with_no_classes: seriesWithNoClasses.map(s => ({ id: s.id, name: s.name })),
      series_summary,
      warnings,
      failures,
      notes: [
        'SeriesClass.series_id is required — correct link for Series Profile queries.',
        'Series Profile queries via SeriesClass.filter({ series_id }) — clean and direct.',
        'EventClass.series_class_id is optional — used for back-linking to parent class.',
        'Results.series_class_id is denormalized — not affected by this relationship.',
        'Standings match by class_name string — consistent with current Series Profile UI.',
      ],
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});