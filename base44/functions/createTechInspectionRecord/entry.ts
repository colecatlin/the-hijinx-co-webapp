/**
 * createTechInspectionRecord
 * R9BP Sprint 1 — Starts a new tech inspection for an entry.
 * Optionally pre-populates checklist from matching TechTemplate.
 * Permission: admin OR canPerformTechInspection
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ALLOWED_ROLES = ['Technical Director', 'Technical Inspector', 'Race Director', 'Competition Director'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      event_id, entry_id, driver_id, session_id, inspection_phase,
      weight_required, checklist_override,
    } = body;

    if (!event_id) return Response.json({ error: 'event_id is required' }, { status: 400 });
    if (!entry_id) return Response.json({ error: 'entry_id is required' }, { status: 400 });
    if (!inspection_phase) return Response.json({ error: 'inspection_phase is required' }, { status: 400 });

    // Permission check
    if (user.role !== 'admin') {
      const officials = await base44.asServiceRole.entities.EventOfficial.filter({
        event_id, user_id: user.id,
      });
      const permitted = officials.some(
        (o) => ALLOWED_ROLES.includes(o.role) && ['Invited', 'Confirmed', 'Active'].includes(o.status)
      );
      if (!permitted) return Response.json({ error: 'Forbidden: canPerformTechInspection required' }, { status: 403 });
    }

    // Fetch entry to get series_class_id
    const entries = await base44.asServiceRole.entities.Entry.filter({ id: entry_id });
    if (!entries || entries.length === 0) return Response.json({ error: 'Entry not found' }, { status: 404 });
    const entry = entries[0];

    // Try to load checklist from TechTemplate for this class
    let checklist = checklist_override || [];
    if (checklist.length === 0 && entry.series_class_id) {
      const templates = await base44.asServiceRole.entities.TechTemplate.filter({
        series_class_id: entry.series_class_id,
      });
      if (templates && templates.length > 0) {
        const tmpl = templates[0];
        checklist = (tmpl.checklist_items || []).map((item) => ({
          category: item.category || '',
          item: item.item || '',
          result: 'Pending',
          notes: '',
          required: item.required !== false,
          inspector_initials: '',
        }));
      }
    }

    const record = await base44.asServiceRole.entities.TechInspectionRecord.create({
      event_id,
      entry_id,
      driver_id: driver_id || entry.driver_id || undefined,
      session_id: session_id || undefined,
      inspection_phase,
      status: 'In Progress',
      inspector_user_id: user.id,
      started_at: new Date().toISOString(),
      checklist,
      failure_reasons: [],
      fuel_sample_taken: false,
      fuel_result: 'N/A',
      weight_required: weight_required || undefined,
    });

    base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'tech_inspection_started',
      status: 'success',
      entity_name: 'TechInspectionRecord',
      entity_id: record.id,
      event_id,
      message: `Tech inspection started: ${inspection_phase} for entry ${entry_id}`,
      metadata: { entry_id, inspection_phase, inspector: user.id, checklist_items: checklist.length },
    }).catch(() => {});

    return Response.json({ record });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});