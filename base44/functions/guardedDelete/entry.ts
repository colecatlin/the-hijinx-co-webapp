/**
 * P0-3 — guardedDelete
 * Cascade-safe delete guard. Checks for dependent records before allowing deletion.
 * If any dependencies exist, blocks the delete and returns a dependency summary.
 * If no dependencies, hard-deletes the record.
 *
 * Supported entity types: Driver, Series, Track, Event, Session, SeriesClass, EventClass
 *
 * Input:  { entity_type, entity_id }
 * Output: { allowed: bool, entity_type, entity_id, dependencies?, deleted? }
 *
 * Admin only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Dependency map: for each entity type, list the child entities that reference it
// Format: [childEntityName, foreignKeyField, humanLabel]
const DEPENDENCY_MAP = {
  Driver: [
    ['Results',       'driver_id',  'Results'],
    ['Entry',         'driver_id',  'Entries'],
    ['Standings',     'driver_id',  'Standings'],
    ['DriverProgram', 'driver_id',  'Driver Programs'],
    ['DriverMedia',   'driver_id',  'Driver Media'],
  ],
  Series: [
    ['Event',         'series_id',        'Events'],
    ['SeriesClass',   'series_id',        'Series Classes'],
    ['Standings',     'series_id',        'Standings'],
    ['DriverProgram', 'series_id',        'Driver Programs'],
  ],
  Track: [
    ['Event',         'track_id',   'Events'],
  ],
  Event: [
    ['Session',       'event_id',   'Sessions'],
    ['Entry',         'event_id',   'Entries'],
    ['Results',       'event_id',   'Results'],
    ['EventClass',    'event_id',   'Event Classes'],
    ['EventDay',      'event_id',   'Event Days'],
    ['EventOfficial', 'event_id',   'Event Officials'],
    ['GridLineup',    'event_id',   'Grid Lineups'],
    ['Incident',      'event_id',   'Incidents'],
    ['Penalty',       'event_id',   'Penalties'],
    ['Protest',       'event_id',   'Protests'],
  ],
  Session: [
    ['Results',       'session_id', 'Results'],
    ['GridLineup',    'session_id', 'Grid Lineups'],
    ['SessionNote',   'session_id', 'Session Notes'],
  ],
  SeriesClass: [
    ['Entry',         'series_class_id', 'Entries'],
    ['Results',       'series_class_id', 'Results'],
    ['Standings',     'series_class_id', 'Standings'],
    ['Session',       'series_class_id', 'Sessions'],
    ['DriverProgram', 'series_class_id', 'Driver Programs'],
  ],
  EventClass: [
    ['Entry',         'event_class_id',  'Entries'],
    ['Session',       'event_class_id',  'Sessions'],
  ],
};

const NAME_FIELD = {
  Driver:      (r) => `${r.first_name || ''} ${r.last_name || ''}`.trim(),
  Series:      (r) => r.name,
  Track:       (r) => r.name,
  Event:       (r) => r.name,
  Session:     (r) => r.name,
  SeriesClass: (r) => r.class_name || r.name || r.id,
  EventClass:  (r) => r.class_name || r.name || r.id,
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const { entity_type, entity_id } = await req.json();

    if (!entity_type || !entity_id) {
      return Response.json({ error: 'entity_type and entity_id required' }, { status: 400 });
    }

    const depChecks = DEPENDENCY_MAP[entity_type];
    if (!depChecks) {
      return Response.json({
        error: `Guarded delete not configured for entity type: ${entity_type}. ` +
          `Supported: ${Object.keys(DEPENDENCY_MAP).join(', ')}`,
      }, { status: 400 });
    }

    const sr = base44.asServiceRole;

    // Fetch the record to confirm existence and get human label
    const model = sr.entities[entity_type];
    if (!model) return Response.json({ error: `Entity type not found in SDK: ${entity_type}` }, { status: 400 });

    const records = await model.filter({ id: entity_id }).catch(() => []);
    const record = records?.[0];
    if (!record) return Response.json({ error: 'Record not found' }, { status: 404 });

    const entityName = NAME_FIELD[entity_type]?.(record) || entity_id;

    // Check all dependency groups in parallel
    const depResults = await Promise.all(
      depChecks.map(async ([childEntity, fkField, label]) => {
        const childModel = sr.entities[childEntity];
        if (!childModel) return { label, count: 0, entity: childEntity };
        const children = await childModel.filter({ [fkField]: entity_id }).catch(() => []);
        return { label, count: children.length, entity: childEntity, fk: fkField };
      })
    );

    const blocking = depResults.filter(d => d.count > 0);

    if (blocking.length > 0) {
      // Build human-readable dependency summary
      const dependencyList = blocking.map(d => `${d.count} ${d.label}`).join(', ');
      return Response.json({
        allowed: false,
        entity_type,
        entity_id,
        entity_name: entityName,
        reason: `Cannot delete ${entity_type} "${entityName}". Dependencies exist: ${dependencyList}. Archive the record instead, or reassign dependents before deletion.`,
        dependencies: blocking.reduce((acc, d) => { acc[d.entity] = d.count; return acc; }, {}),
        dependency_summary: dependencyList,
        suggestion: 'Use archiveRecord to soft-delete, or use the repair functions to reassign dependents.',
      });
    }

    // No dependencies — safe to delete
    await model.delete(entity_id);

    // Write audit log
    await sr.entities.AuditLog.create({
      entity_type,
      entity_id,
      entity_name: entityName,
      action: 'deleted',
      before_data: record,
      after_data: null,
      performed_by: user.id,
      performed_by_name: user.full_name || user.email || user.id,
      timestamp: new Date().toISOString(),
      notes: `Hard delete via guardedDelete — no dependencies found`,
      event_id: record.event_id || null,
    }).catch(() => {});

    return Response.json({
      allowed: true,
      deleted: true,
      entity_type,
      entity_id,
      entity_name: entityName,
      message: `${entity_type} "${entityName}" successfully deleted.`,
    });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});