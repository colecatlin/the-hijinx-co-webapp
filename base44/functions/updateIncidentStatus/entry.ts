/**
 * updateIncidentStatus
 * R9BP Sprint 1 — Updates incident status, assignment, and investigation notes.
 * Permission: admin OR canInvestigateIncident OR canCloseIncident
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const INVESTIGATE_ROLES = ['Race Director', 'Competition Director', 'Chief Steward', 'Steward', 'Safety Director'];
const CLOSE_ROLES = ['Race Director', 'Competition Director', 'Chief Steward'];

function canInvestigate(officials) {
  return officials.some((o) => INVESTIGATE_ROLES.includes(o.role) && ['Invited', 'Confirmed', 'Active'].includes(o.status));
}
function canClose(officials) {
  return officials.some((o) => CLOSE_ROLES.includes(o.role) && ['Invited', 'Confirmed', 'Active'].includes(o.status));
}

const VALID_TRANSITIONS = {
  'Open': ['Under Review', 'Referred to Stewards', 'Closed'],
  'Under Review': ['Referred to Stewards', 'Closed', 'Open'],
  'Referred to Stewards': ['Under Review', 'Closed', 'Appealed'],
  'Closed': ['Open'],
  'Appealed': ['Closed'],
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { incident_id, status, investigation_notes, assigned_to_user_id, resolution } = await req.json();
    if (!incident_id) return Response.json({ error: 'incident_id is required' }, { status: 400 });

    const incidents = await base44.asServiceRole.entities.Incident.filter({ id: incident_id });
    if (!incidents || incidents.length === 0) return Response.json({ error: 'Incident not found' }, { status: 404 });
    const incident = incidents[0];

    // Permission check
    if (user.role !== 'admin') {
      const officials = await base44.asServiceRole.entities.EventOfficial.filter({
        event_id: incident.event_id, user_id: user.id,
      });
      const isClosing = status === 'Closed';
      const permitted = isClosing ? canClose(officials) : canInvestigate(officials);
      if (!permitted) return Response.json({ error: 'Forbidden: insufficient role for this status transition' }, { status: 403 });
    }

    // Validate transition
    if (status && status !== incident.status) {
      const allowed = VALID_TRANSITIONS[incident.status] || [];
      if (!allowed.includes(status)) {
        return Response.json({
          error: `Invalid transition: ${incident.status} → ${status}`,
          allowed_transitions: allowed,
        }, { status: 400 });
      }
    }

    const updates = {};
    if (status) updates.status = status;
    if (investigation_notes !== undefined) updates.investigation_notes = investigation_notes;
    if (assigned_to_user_id !== undefined) updates.assigned_to_user_id = assigned_to_user_id;
    if (resolution !== undefined) updates.resolution = resolution;
    if (status === 'Closed') {
      updates.closed_by_user_id = user.id;
      updates.closed_at = new Date().toISOString();
    }

    const updated = await base44.asServiceRole.entities.Incident.update(incident_id, updates);

    base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'incident_status_changed',
      status: 'success',
      entity_name: 'Incident',
      entity_id: incident_id,
      event_id: incident.event_id,
      message: `${incident.incident_number}: ${incident.status} → ${status || incident.status}`,
      metadata: { before: incident.status, after: status, updated_by: user.id },
    }).catch(() => {});

    return Response.json({ incident: updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});