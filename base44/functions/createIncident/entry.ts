/**
 * createIncident
 * R9BP Sprint 1 — Creates a new Incident record for an event.
 * Permission: admin OR canCreateIncident (EventOfficial role check)
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Generate next sequential number for an event: INC-001, INC-002, etc.
async function nextEventNumber(base44, entityName, field, prefix, eventId) {
  const existing = await base44.asServiceRole.entities[entityName].filter({ event_id: eventId });
  const nums = existing
    .map((r) => {
      const match = (r[field] || '').match(/^[A-Z]+-(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((n) => n > 0);
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `${prefix}-${String(next).padStart(3, '0')}`;
}

async function getUserOfficials(base44, userId, eventId) {
  return base44.asServiceRole.entities.EventOfficial.filter({ event_id: eventId, user_id: userId });
}

function hasCompOpsPermission(officials, permKey) {
  const ROLE_MAP = {
    'Race Director': ['canCreateIncident'],
    'Competition Director': ['canCreateIncident'],
    'Chief Steward': ['canCreateIncident'],
    'Steward': ['canCreateIncident'],
    'Safety Director': ['canCreateIncident'],
    'Technical Director': ['canCreateIncident'],
  };
  return officials.some((o) => {
    const allowed = ROLE_MAP[o.role] || [];
    return allowed.includes(permKey) && ['Invited', 'Confirmed', 'Active'].includes(o.status);
  });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      event_id, session_id, incident_type, severity, description,
      involved_driver_ids, involved_entry_ids, location_description,
      lap_number, is_medical, reporter_role, witness_notes,
      video_evidence_urls, photo_evidence_urls, medical_notes,
    } = body;

    if (!event_id) return Response.json({ error: 'event_id is required' }, { status: 400 });
    if (!incident_type) return Response.json({ error: 'incident_type is required' }, { status: 400 });
    if (!description) return Response.json({ error: 'description is required' }, { status: 400 });
    if (!severity) return Response.json({ error: 'severity is required' }, { status: 400 });

    // Permission check
    if (user.role !== 'admin') {
      const officials = await getUserOfficials(base44, user.id, event_id);
      if (!hasCompOpsPermission(officials, 'canCreateIncident')) {
        return Response.json({ error: 'Forbidden: canCreateIncident required' }, { status: 403 });
      }
    }

    // Verify event exists
    const events = await base44.asServiceRole.entities.Event.filter({ id: event_id });
    if (!events || events.length === 0) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }

    const incident_number = await nextEventNumber(base44, 'Incident', 'incident_number', 'INC', event_id);

    const incident = await base44.asServiceRole.entities.Incident.create({
      event_id,
      session_id: session_id || undefined,
      incident_number,
      incident_type,
      severity,
      status: 'Open',
      description,
      reporter_user_id: user.id,
      reporter_role: reporter_role || '',
      involved_driver_ids: involved_driver_ids || [],
      involved_entry_ids: involved_entry_ids || [],
      location_description: location_description || '',
      lap_number: lap_number || undefined,
      is_medical: is_medical || false,
      medical_notes: (is_medical && medical_notes) ? medical_notes : undefined,
      witness_notes: witness_notes || '',
      video_evidence_urls: video_evidence_urls || [],
      photo_evidence_urls: photo_evidence_urls || [],
    });

    // OperationLog — non-blocking
    base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'incident_created',
      status: 'success',
      entity_name: 'Incident',
      entity_id: incident.id,
      event_id,
      message: `${incident_number} filed: ${incident_type} — ${severity}`,
      metadata: { incident_number, incident_type, severity, reporter_user_id: user.id },
    }).catch(() => {});

    return Response.json({ incident });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});