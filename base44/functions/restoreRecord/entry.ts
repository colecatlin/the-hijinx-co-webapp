/**
 * R9CS — restoreRecord
 * Restores an archived record and writes AuditLog.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const SUPPORTED_ENTITIES = [
  'Driver', 'Team', 'Track', 'Series', 'Event', 'Session', 'Entry',
  'Results', 'Standings', 'EventOfficial', 'Incident', 'Penalty',
  'Protest', 'TechInspectionRecord',
];

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

    const { entity_type, entity_id, notes } = await req.json();

    if (!entity_type || !entity_id) {
      return Response.json({ error: 'entity_type and entity_id required' }, { status: 400 });
    }

    if (!SUPPORTED_ENTITIES.includes(entity_type)) {
      return Response.json({ error: `Unsupported entity type: ${entity_type}` }, { status: 400 });
    }

    const entity = base44.entities[entity_type];
    if (!entity) return Response.json({ error: 'Entity not found in SDK' }, { status: 400 });

    const record = await entity.get(entity_id);
    if (!record) return Response.json({ error: 'Record not found' }, { status: 404 });

    if (!record.is_archived) {
      return Response.json({ error: 'Record is not archived' }, { status: 409 });
    }

    const now = new Date().toISOString();
    const restoreData = {
      is_archived: false,
      archived_at: null,
      archived_by: null,
      archive_reason: null,
    };

    await entity.update(entity_id, restoreData);

    const entityName = NAME_FIELD[entity_type]?.(record) || entity_id;
    await base44.asServiceRole.entities.AuditLog.create({
      entity_type,
      entity_id,
      entity_name: entityName,
      action: 'restored',
      before_data: record,
      after_data: { ...record, ...restoreData },
      performed_by: user.id,
      performed_by_name: user.full_name || user.email || user.id,
      timestamp: now,
      notes: notes || 'Restored from archive',
      event_id: record.event_id || null,
    });

    return Response.json({ success: true, entity_type, entity_id, restored_at: now });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});