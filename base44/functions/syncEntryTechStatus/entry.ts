/**
 * R9CR — syncEntryTechStatus
 * Called after any TechInspectionRecord create/update.
 * Derives Entry.tech_status from the authoritative TechInspectionRecord.
 * TechInspectionRecord is the single source of truth for tech state.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const RECORD_TO_ENTRY_STATUS = {
  'Passed':             'Passed',
  'Failed':             'Failed',
  'Recheck Required':   'Recheck Required',
  'Conditionally Passed': 'Passed',
  'In Progress':        'Not Inspected',
  'Impounded':          'Not Inspected',
  'Released':           'Passed',
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { entry_id, event_id, status, notes, inspector_user_id, inspection_phase, checklist, weight_in, fuel_result } = await req.json();

    if (!entry_id || !event_id) {
      return Response.json({ error: 'entry_id and event_id required' }, { status: 400 });
    }

    // Find existing TechInspectionRecord for this entry+event (Pre-Race phase)
    const existing = await base44.asServiceRole.entities.TechInspectionRecord.filter({
      entry_id,
      event_id,
      inspection_phase: inspection_phase || 'Pre-Race',
    });

    const now = new Date().toISOString();
    const recordData = {
      event_id,
      entry_id,
      status: status || 'In Progress',
      inspection_phase: inspection_phase || 'Pre-Race',
      inspector_user_id: inspector_user_id || user.id,
      overall_notes: notes || '',
      completed_at: status && status !== 'In Progress' ? now : undefined,
    };

    if (checklist) recordData.checklist = checklist;
    if (weight_in !== undefined) recordData.weight_in = weight_in;
    if (fuel_result) recordData.fuel_result = fuel_result;

    let techRecord;
    if (existing.length > 0) {
      techRecord = await base44.asServiceRole.entities.TechInspectionRecord.update(existing[0].id, recordData);
    } else {
      recordData.started_at = now;
      techRecord = await base44.asServiceRole.entities.TechInspectionRecord.create(recordData);
    }

    // Derive and sync Entry.tech_status AND Entry.entry_status (P0-5 fix)
    const derivedTechStatus = RECORD_TO_ENTRY_STATUS[status] || 'Not Inspected';

    // Map tech outcome → operational entry_status
    const TECH_TO_ENTRY_STATUS = {
      'Passed':           'Teched',
      'Failed':           'Tech Failed',
      'Recheck Required': 'Tech Hold',
      'Not Inspected':    'Registered',
    };
    const derivedEntryStatus = TECH_TO_ENTRY_STATUS[derivedTechStatus] || 'Registered';

    await base44.asServiceRole.entities.Entry.update(entry_id, {
      tech_status: derivedTechStatus,
      entry_status: derivedEntryStatus,
      tech_time: now,
      tech_inspector_user_id: inspector_user_id || user.id,
    });

    return Response.json({
      success: true,
      tech_record_id: techRecord.id,
      tech_status_synced: derivedTechStatus,
      entry_status_synced: derivedEntryStatus,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});