/**
 * verifyEntryAndClassIntegrity.js
 *
 * Verifies that Entries and class records are deterministic and duplicate-resistant.
 * Admin only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function normalizeClassName(name) {
  return (name || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}
function buildEntryKey(event_id, driver_id, class_id) {
  return `entry:${event_id || 'none'}:${driver_id || 'none'}:${class_id || 'none'}`;
}
function buildSeriesClassKey(series_id, class_name) {
  return `series_class:${series_id || 'none'}:${normalizeClassName(class_name)}`;
}
function buildEventClassKey(event_id, class_name) {
  return `event_class:${event_id || 'none'}:${normalizeClassName(class_name)}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const [allEntries, allSeriesClasses, allEventClasses] = await Promise.all([
      base44.asServiceRole.entities.Entry.list('-created_date', 10000),
      base44.asServiceRole.entities.SeriesClass.list('-created_date', 5000),
      base44.asServiceRole.entities.EventClass.list('-created_date', 5000),
    ]);

    // ── Entries ──────────────────────────────────────────────────────────────
    const activeEntries = allEntries.filter(e => !e.notes?.includes('DUPLICATE_OF:') && e.entry_status !== 'Withdrawn');
    let entryMissingKey = 0, entryMissingDriver = 0, entryMissingEvent = 0, entryMissingClass = 0;
    const entryKeyMap = new Map();

    for (const e of activeEntries) {
      if (!e.entry_identity_key) entryMissingKey++;
      if (!e.driver_id) entryMissingDriver++;
      if (!e.event_id) entryMissingEvent++;
      if (!e.event_class_id && !e.series_class_id) entryMissingClass++;
      const class_id = e.event_class_id || e.series_class_id || null;
      const k = e.entry_identity_key || buildEntryKey(e.event_id, e.driver_id, class_id);
      const a = entryKeyMap.get(k) || []; a.push(e.id); entryKeyMap.set(k, a);
    }
    const entryDupGroups = [...entryKeyMap.values()].filter(ids => ids.length > 1).length;

    // ── SeriesClass ───────────────────────────────────────────────────────────
    const activeSeriesClasses = allSeriesClasses.filter(c => c.active !== false);
    let scMissingKey = 0;
    const scKeyMap = new Map();
    for (const c of activeSeriesClasses) {
      if (!c.series_class_identity_key) scMissingKey++;
      const k = c.series_class_identity_key || buildSeriesClassKey(c.series_id, c.class_name);
      const a = scKeyMap.get(k) || []; a.push(c.id); scKeyMap.set(k, a);
    }
    const scDupGroups = [...scKeyMap.values()].filter(ids => ids.length > 1).length;

    // ── EventClass ───────────────────────────────────────────────────────────
    const activeEventClasses = allEventClasses.filter(c => c.class_status !== 'Closed');
    let ecMissingKey = 0;
    const ecKeyMap = new Map();
    for (const c of activeEventClasses) {
      if (!c.event_class_identity_key) ecMissingKey++;
      const k = c.event_class_identity_key || buildEventClassKey(c.event_id, c.class_name);
      const a = ecKeyMap.get(k) || []; a.push(c.id); ecKeyMap.set(k, a);
    }
    const ecDupGroups = [...ecKeyMap.values()].filter(ids => ids.length > 1).length;

    // ── Checks ───────────────────────────────────────────────────────────────
    const checks = [
      { label: 'Entries: all have identity keys',           pass: entryMissingKey === 0,    val: entryMissingKey,   severity: 'high' },
      { label: 'Entries: no active duplicate groups',       pass: entryDupGroups === 0,     val: entryDupGroups,    severity: 'high' },
      { label: 'Entries: all have driver_id',               pass: entryMissingDriver === 0, val: entryMissingDriver, severity: 'high' },
      { label: 'Entries: all have event_id',                pass: entryMissingEvent === 0,  val: entryMissingEvent, severity: 'high' },
      { label: 'Entries: all have class reference',         pass: entryMissingClass === 0,  val: entryMissingClass, severity: 'medium' },
      { label: 'SeriesClasses: all have identity keys',     pass: scMissingKey === 0,       val: scMissingKey,      severity: 'high' },
      { label: 'SeriesClasses: no active duplicate groups', pass: scDupGroups === 0,        val: scDupGroups,       severity: 'high' },
      { label: 'EventClasses: all have identity keys',      pass: ecMissingKey === 0,       val: ecMissingKey,      severity: 'high' },
      { label: 'EventClasses: no active duplicate groups',  pass: ecDupGroups === 0,        val: ecDupGroups,       severity: 'high' },
    ];

    const failures = checks.filter(c => !c.pass && c.severity === 'high').length;
    const warnings = checks.filter(c => !c.pass && c.severity === 'medium').length;
    const passed   = checks.filter(c => c.pass).length;

    return Response.json({
      generated_at: new Date().toISOString(),
      entries: { total: allEntries.length, active: activeEntries.length, missing_identity_key: entryMissingKey, missing_driver_ref: entryMissingDriver, missing_event_ref: entryMissingEvent, missing_class_ref: entryMissingClass, duplicate_groups_count: entryDupGroups },
      series_classes: { total: allSeriesClasses.length, active: activeSeriesClasses.length, missing_identity_key: scMissingKey, duplicate_groups_count: scDupGroups },
      event_classes: { total: allEventClasses.length, active: activeEventClasses.length, missing_identity_key: ecMissingKey, duplicate_groups_count: ecDupGroups },
      checks,
      summary: { total_checks: checks.length, passed, warnings, failures, verdict: failures > 0 ? 'failed' : warnings > 0 ? 'warning' : 'passed' },
    });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});