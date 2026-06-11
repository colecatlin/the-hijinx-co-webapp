/**
 * R9CS — archiveRecord
 * Universal archive handler. Sets is_archived fields and writes AuditLog.
 * Supported entities: Driver, Team, Track, Series, Event, Session, Entry,
 * Results, Standings, EventOfficial, Incident, Penalty, Protest, TechInspectionRecord
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const SUPPORTED_ENTITIES = [
  'Driver', 'Team', 'Track', 'Series', 'Event', 'Session', 'Entry',
  'Results', 'Standings', 'EventOfficial', 'Incident', 'Penalty',
  'Protest', 'TechInspectionRecord',
];

// Entity name field for human-readable label in audit log
const NAME_FIELD = {
  Driver: (r) => `${r.first_name || ''} ${r.last_name || ''}`.trim(),
  Team: (r) => r.name,
  Track: (r) => r.name,
  Series: (r) => r.name,
  Event: (r) => r.name,
  Session: (r) => r.name,
  Entry: (r) => `Entry #${r.car_number || r.id}`,
  Results: (r) => `Result ${r.id}`,
  Standings: (r) => `Standing ${r.id}`,
  EventOfficial: (r) => `Official ${r.role || r.id}`,
  Incident: (r) => r.incident_number || r.id,
  Penalty: (r) => r.penalty_number || r.id,
  Protest: (r) => r.protest_number || r.id,
  TechInspectionRecord: (r) => `Tech ${r.id}`,
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { entity_type, entity_id, reason } = await req.json();

    if (!entity_type || !entity_id) {
      return Response.json({ error: 'entity_type and entity_id required' }, { status: 400 });
    }

    if (!SUPPORTED_ENTITIES.includes(entity_type)) {
      return Response.json({ error: `Unsupported entity type: ${entity_type}` }, { status: 400 });
    }

    const entity = base44.entities[entity_type];
    if (!entity) return Response.json({ error: 'Entity not found in SDK' }, { status: 400 });

    // Fetch current record for before_data
    const record = await entity.get(entity_id);
    if (!record) return Response.json({ error: 'Record not found' }, { status: 404 });

    if (record.is_archived) {
      return Response.json({ error: 'Record is already archived' }, { status: 409 });
    }

    const now = new Date().toISOString();
    const archiveData = {
      is_archived: true,
      archived_at: now,
      archived_by: user.id,
      archive_reason: reason || 'No reason provided',
    };

    // Update the record
    const updated = await entity.update(entity_id, archiveData);

    // Write audit log
    const entityName = NAME_FIELD[entity_type]?.(record) || entity_id;
    await base44.asServiceRole.entities.AuditLog.create({
      entity_type,
      entity_id,
      entity_name: entityName,
      action: 'archived',
      before_data: record,
      after_data: { ...record, ...archiveData },
      performed_by: user.id,
      performed_by_name: user.full_name || user.email || user.id,
      timestamp: now,
      notes: reason || null,
      event_id: record.event_id || null,
    });

    return Response.json({ success: true, entity_type, entity_id, archived_at: now });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});