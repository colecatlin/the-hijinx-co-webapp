/**
 * completeTechInspectionRecord
 * R9BP Sprint 1 — Finalizes a tech inspection and mirrors status back to Entry.tech_status.
 * This write-back preserves backward compatibility with EntriesManager and CheckInManager.
 * Permission: admin OR canPerformTechInspection OR canApproveTechResults
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const PERFORM_ROLES = ['Technical Director', 'Technical Inspector', 'Race Director', 'Competition Director'];
const APPROVE_ROLES = ['Technical Director', 'Race Director', 'Competition Director'];

// Map TechInspectionRecord status to Entry.tech_status values
const STATUS_MAP = {
  'Passed': 'Passed',
  'Failed': 'Failed',
  'Conditionally Passed': 'Passed', // treat as passed for entry purposes
  'Recheck Required': 'Recheck Required',
  'Impounded': 'Failed', // treat impound as failed for entry gate purposes
  'Released': 'Passed',
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      record_id, status, checklist, overall_notes, failure_reasons,
      remediation_required, recheck_deadline, weight_in, fuel_sample_taken,
      fuel_result, approved_by_user_id,
    } = body;

    if (!record_id) return Response.json({ error: 'record_id is required' }, { status: 400 });
    if (!status) return Response.json({ error: 'status is required' }, { status: 400 });

    const records = await base44.asServiceRole.entities.TechInspectionRecord.filter({ id: record_id });
    if (!records || records.length === 0) return Response.json({ error: 'TechInspectionRecord not found' }, { status: 404 });
    const record = records[0];

    // Permission check
    if (user.role !== 'admin') {
      const officials = await base44.asServiceRole.entities.EventOfficial.filter({
        event_id: record.event_id, user_id: user.id,
      });
      const canPerform = officials.some(
        (o) => PERFORM_ROLES.includes(o.role) && ['Invited', 'Confirmed', 'Active'].includes(o.status)
      );
      const canApprove = officials.some(
        (o) => APPROVE_ROLES.includes(o.role) && ['Invited', 'Confirmed', 'Active'].includes(o.status)
      );
      if (!canPerform && !canApprove) {
        return Response.json({ error: 'Forbidden: canPerformTechInspection or canApproveTechResults required' }, { status: 403 });
      }
    }

    const updates = {
      status,
      completed_at: new Date().toISOString(),
    };
    if (checklist !== undefined) updates.checklist = checklist;
    if (overall_notes !== undefined) updates.overall_notes = overall_notes;
    if (failure_reasons !== undefined) updates.failure_reasons = failure_reasons;
    if (remediation_required !== undefined) updates.remediation_required = remediation_required;
    if (recheck_deadline !== undefined) updates.recheck_deadline = recheck_deadline;
    if (weight_in !== undefined) updates.weight_in = weight_in;
    if (fuel_sample_taken !== undefined) updates.fuel_sample_taken = fuel_sample_taken;
    if (fuel_result !== undefined) updates.fuel_result = fuel_result;
    if (approved_by_user_id !== undefined) updates.approved_by_user_id = approved_by_user_id;

    const updated = await base44.asServiceRole.entities.TechInspectionRecord.update(record_id, updates);

    // Mirror status back to Entry.tech_status for backward compatibility
    const entryTechStatus = STATUS_MAP[status] || status;
    await base44.asServiceRole.entities.Entry.update(record.entry_id, {
      tech_status: entryTechStatus,
      tech_time: new Date().toISOString(),
      tech_inspector_user_id: user.id,
    });

    base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'tech_inspection_completed',
      status: 'success',
      entity_name: 'TechInspectionRecord',
      entity_id: record_id,
      event_id: record.event_id,
      message: `Tech inspection completed: ${status} for entry ${record.entry_id}`,
      metadata: { entry_id: record.entry_id, inspection_phase: record.inspection_phase, result: status, inspector: user.id },
    }).catch(() => {});

    return Response.json({ record: updated, entry_tech_status_updated: entryTechStatus });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});