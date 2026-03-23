/**
 * reconcileChampImport(importRunId)
 * Runs matching logic against existing production records.
 * Updates import_status on staging rows.
 * Returns a reconciliation report for admin review.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const { importRunId } = await req.json();
    if (!importRunId) return Response.json({ error: 'importRunId required' }, { status: 400 });

    const db = base44.asServiceRole;

    // Load all staging rows for this run
    const [stagedResults, stagedStandings, stagedEvents, stagedClasses] = await Promise.all([
      db.entities.ImportedResultStaging.filter({ import_run_id: importRunId }),
      db.entities.ImportedStandingStaging.filter({ import_run_id: importRunId }),
      db.entities.ImportedEventStaging.filter({ import_run_id: importRunId }),
      db.entities.ImportedClassStaging.filter({ import_run_id: importRunId }),
    ]);

    // Load production data for matching
    const [allDrivers, allEvents, allSeriesClasses] = await Promise.all([
      db.entities.Driver.list(),
      db.entities.Event.list(),
      db.entities.SeriesClass.list(),
    ]);

    // Build normalized lookup maps
    const driverByName = buildDriverNameMap(allDrivers);
    const eventByName = buildEventNameMap(allEvents);
    const classByName = buildClassNameMap(allSeriesClasses);

    const report = {
      import_run_id: importRunId,
      matched_drivers: [],
      unmatched_drivers: [],
      matched_events: [],
      unmatched_events: [],
      matched_classes: [],
      unmatched_classes: [],
      conflicts: [],
      missing_required: [],
      total_results: stagedResults.length,
      total_standings: stagedStandings.length,
    };

    // --- Match Events ---
    for (const evt of stagedEvents) {
      const match = matchEvent(evt.source_event_name, evt.source_event_date_start, eventByName);
      if (match.type === 'exact' || match.type === 'fuzzy') {
        await db.entities.ImportedEventStaging.update(evt.id, {
          mapped_event_id: match.event.id,
          import_status: 'matched',
        });
        report.matched_events.push({ staged_name: evt.source_event_name, matched_to: match.event.name, match_type: match.type });
      } else if (match.type === 'conflict') {
        await db.entities.ImportedEventStaging.update(evt.id, { import_status: 'conflict' });
        report.conflicts.push({ type: 'event', name: evt.source_event_name, reason: match.reason });
      } else {
        report.unmatched_events.push({ staged_name: evt.source_event_name, date: evt.source_event_date_start });
      }
    }

    // --- Match Classes ---
    for (const cls of stagedClasses) {
      const match = matchClass(cls.source_class_name, classByName);
      if (match) {
        await db.entities.ImportedClassStaging.update(cls.id, {
          mapped_series_class_id: match.id,
          import_status: 'matched',
        });
        report.matched_classes.push({ staged_name: cls.source_class_name, matched_to: match.name });
      } else {
        report.unmatched_classes.push({ staged_name: cls.source_class_name });
      }
    }

    // --- Match Drivers from results ---
    const driverMatchCache = {};
    const allStagedDriverNames = new Set([
      ...stagedResults.map(r => r.driver_name),
      ...stagedStandings.map(s => s.driver_name),
    ]);

    for (const driverName of allStagedDriverNames) {
      if (driverMatchCache[driverName]) continue;
      const match = matchDriver(driverName, driverByName);
      driverMatchCache[driverName] = match;
      if (match.type === 'exact' || match.type === 'normalized') {
        report.matched_drivers.push({ name: driverName, matched_to: match.driver.first_name + ' ' + match.driver.last_name, driver_id: match.driver.id });
      } else if (match.type === 'conflict') {
        report.conflicts.push({ type: 'driver', name: driverName, reason: match.reason });
      } else {
        report.unmatched_drivers.push({ name: driverName });
      }
    }

    // --- Update result staging rows with driver/event/class matches ---
    const eventStagingById = {};
    const updatedEvents = await db.entities.ImportedEventStaging.filter({ import_run_id: importRunId });
    updatedEvents.forEach(e => { eventStagingById[e.source_event_name] = e; });

    const updatedClasses = await db.entities.ImportedClassStaging.filter({ import_run_id: importRunId });
    const classIdByName = {};
    updatedClasses.forEach(c => { classIdByName[c.source_class_name] = c.mapped_series_class_id; });

    for (const result of stagedResults) {
      const dMatch = driverMatchCache[result.driver_name];
      const evtStaging = eventStagingById[result.event_name];
      const classId = classIdByName[result.class_name];
      const updates = { import_status: 'pending' };

      if (dMatch?.driver) updates.mapped_driver_id = dMatch.driver.id;
      if (evtStaging?.mapped_event_id) updates.mapped_event_id = evtStaging.mapped_event_id;
      if (classId) updates.mapped_class_id = classId;

      // Check for missing required fields
      if (!result.finishing_position) {
        report.missing_required.push({ type: 'result', id: result.id, missing: 'finishing_position' });
        updates.import_status = 'conflict';
      } else if (dMatch?.type === 'conflict') {
        updates.import_status = 'conflict';
      } else if (dMatch?.driver || dMatch?.type === 'unmatched') {
        updates.import_status = dMatch?.driver ? 'matched' : 'pending';
      }

      await db.entities.ImportedResultStaging.update(result.id, updates);
    }

    for (const standing of stagedStandings) {
      const dMatch = driverMatchCache[standing.driver_name];
      const classId = classIdByName[standing.class_name];
      const updates = { import_status: 'pending' };

      if (dMatch?.driver) updates.mapped_driver_id = dMatch.driver.id;
      if (classId) updates.mapped_class_id = classId;

      if (dMatch?.type === 'conflict') {
        updates.import_status = 'conflict';
      } else if (dMatch?.driver) {
        updates.import_status = 'matched';
      }

      await db.entities.ImportedStandingStaging.update(standing.id, updates);
    }

    return Response.json(report);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function normalizeName(name) {
  return (name || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
}

function buildDriverNameMap(drivers) {
  const map = {};
  for (const d of drivers) {
    const full = `${d.first_name} ${d.last_name}`.trim();
    const norm = normalizeName(full);
    if (!map[norm]) map[norm] = [];
    map[norm].push(d);
    if (d.normalized_name) {
      const n2 = normalizeName(d.normalized_name);
      if (!map[n2]) map[n2] = [];
      if (!map[n2].includes(d)) map[n2].push(d);
    }
  }
  return map;
}

function buildEventNameMap(events) {
  const map = {};
  for (const e of events) {
    const norm = normalizeName(e.name || '');
    if (!map[norm]) map[norm] = [];
    map[norm].push(e);
  }
  return map;
}

function buildClassNameMap(classes) {
  const map = {};
  for (const c of classes) {
    const norm = normalizeName(c.name || c.class_name || '');
    if (!map[norm]) map[norm] = [];
    map[norm].push(c);
  }
  return map;
}

function matchDriver(name, driverByName) {
  const norm = normalizeName(name);
  const exact = driverByName[norm];
  if (exact?.length === 1) return { type: 'exact', driver: exact[0] };
  if (exact?.length > 1) return { type: 'conflict', reason: `Multiple drivers match "${name}"` };

  // Try last name only
  const parts = norm.split(' ');
  const lastName = parts[parts.length - 1];
  const lastNameMatches = Object.entries(driverByName)
    .filter(([k]) => k.endsWith(lastName))
    .flatMap(([, v]) => v);
  const unique = [...new Map(lastNameMatches.map(d => [d.id, d])).values()];
  if (unique.length === 1) return { type: 'normalized', driver: unique[0] };
  if (unique.length > 1) return { type: 'conflict', reason: `Ambiguous last name match for "${name}"` };

  return { type: 'unmatched' };
}

function matchEvent(name, dateStart, eventByName) {
  const norm = normalizeName(name);
  const exact = eventByName[norm];
  if (exact?.length === 1) return { type: 'exact', event: exact[0] };
  if (exact?.length > 1) return { type: 'conflict', reason: `Multiple events match "${name}"` };

  // Fuzzy: check if any event name contains key words
  const keywords = norm.split(' ').filter(w => w.length > 3);
  const fuzzyMatches = Object.entries(eventByName)
    .filter(([k]) => keywords.some(kw => k.includes(kw)))
    .flatMap(([, v]) => v);
  const unique = [...new Map(fuzzyMatches.map(e => [e.id, e])).values()];
  if (unique.length === 1) return { type: 'fuzzy', event: unique[0] };
  if (unique.length > 1) return { type: 'conflict', reason: `Multiple fuzzy event matches for "${name}"` };

  return { type: 'unmatched' };
}

function matchClass(name, classByName) {
  const norm = normalizeName(name);
  const exact = classByName[norm];
  if (exact?.length >= 1) return exact[0];

  // Try partial match
  for (const [k, v] of Object.entries(classByName)) {
    if (k.includes(norm) || norm.includes(k)) return v[0];
  }
  return null;
}