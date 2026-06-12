/**
 * repairDuplicateTeamRecords.js
 *
 * Merges duplicate Team records into a single canonical survivor.
 *
 * Actions:
 *   - Marks duplicate teams Inactive with DUPLICATE_OF:{survivor_id} in notes
 *   - Preserves historical names in notes
 *   - Calls repairTeamReferences to update all linked records
 *   - Writes AuditLog per duplicate
 *   - Writes OperationLog
 *
 * Input:
 * {
 *   survivor_team_id: string,
 *   duplicate_team_ids: string[],
 *   reason: string,
 *   dry_run?: boolean
 * }
 *
 * Output: { report, repairs }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function normalizeName(name) {
  if (!name) return '';
  return name.trim().toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { survivor_team_id, duplicate_team_ids = [], reason, dry_run = false } = body;

    if (!survivor_team_id || !duplicate_team_ids.length || !reason) {
      return Response.json({ error: 'survivor_team_id, duplicate_team_ids[], and reason are required' }, { status: 400 });
    }

    const now = new Date().toISOString();

    // Load survivor
    const survivor = await base44.asServiceRole.entities.Team.filter({ id: survivor_team_id }).catch(() => []);
    if (!survivor.length) return Response.json({ error: 'survivor_team_id not found' }, { status: 404 });
    const survivorRecord = survivor[0];

    const report = {
      dry_run,
      survivor_team_id,
      survivor_name: survivorRecord.name,
      duplicate_team_ids,
      duplicates_marked_inactive: [],
      reference_repairs: null,
      warnings: [],
    };

    // Refresh canonical fields on survivor
    const norm = normalizeName(survivorRecord.name || '');
    const canonicalKey = survivorRecord.external_uid
      ? `team:${survivorRecord.external_uid}`
      : `team:${norm}`;

    if (!dry_run) {
      await base44.asServiceRole.entities.Team.update(survivor_team_id, {
        normalized_name: norm,
        canonical_key: canonicalKey,
        canonical_slug: norm.replace(/\s+/g, '-'),
      }).catch(e => report.warnings.push(`survivor_update_failed: ${e.message}`));
    }

    // Process each duplicate
    for (const dup_id of duplicate_team_ids) {
      if (dup_id === survivor_team_id) continue;

      const dupRecords = await base44.asServiceRole.entities.Team.filter({ id: dup_id }).catch(() => []);
      if (!dupRecords.length) {
        report.warnings.push(`Duplicate team ${dup_id} not found — skipped`);
        continue;
      }
      const dup = dupRecords[0];

      const dupMarker = `DUPLICATE_OF:${survivor_team_id}`;
      const existingNotes = dup.notes || '';
      const historicalNote = `Historical name: "${dup.name}"`;
      const newNotes = existingNotes.includes(dupMarker)
        ? existingNotes
        : [existingNotes, dupMarker, historicalNote].filter(Boolean).join(' | ');

      if (!dry_run) {
        // Mark duplicate inactive
        await base44.asServiceRole.entities.Team.update(dup_id, {
          racing_status: 'Inactive',
          notes: newNotes,
          canonical_key: `team:DUPLICATE_OF:${survivor_team_id}`,
        }).catch(e => report.warnings.push(`dup_update_failed:${dup_id}: ${e.message}`));

        // AuditLog for this merge
        await base44.asServiceRole.entities.AuditLog.create({
          entity_type: 'Team',
          entity_id: dup_id,
          entity_name: dup.name,
          action: 'merged',
          before_data: { name: dup.name, racing_status: dup.racing_status, canonical_key: dup.canonical_key },
          after_data: { racing_status: 'Inactive', notes: newNotes, canonical_key: `team:DUPLICATE_OF:${survivor_team_id}` },
          performed_by: user.id,
          performed_by_name: user.full_name,
          timestamp: now,
          notes: `Merged into survivor team ${survivor_team_id} (${survivorRecord.name}). Reason: ${reason}`,
        }).catch(() => {});
      }

      report.duplicates_marked_inactive.push({
        id: dup_id,
        name: dup.name,
        survivor_id: survivor_team_id,
        action: dry_run ? 'would_mark_inactive' : 'marked_inactive',
      });
    }

    // Call repairTeamReferences
    if (!dry_run && report.duplicates_marked_inactive.length > 0) {
      const repairRes = await base44.asServiceRole.functions.invoke('repairTeamReferences', {
        repairs: [{ survivor_id: survivor_team_id, survivor_name: survivorRecord.name, duplicate_ids: duplicate_team_ids }],
        dry_run: false,
      }).catch(e => ({ data: { error: e.message } }));
      report.reference_repairs = repairRes?.data || null;

      // OperationLog
      await base44.asServiceRole.entities.OperationLog.create({
        operation_type: 'source_duplicate_repaired',
        entity_name: 'Team',
        status: 'success',
        metadata: {
          entity_type: 'team',
          source_path: 'repairDuplicateTeamRecords',
          survivor_team_id,
          duplicate_team_ids,
          marked_count: report.duplicates_marked_inactive.length,
          reason,
        },
      }).catch(() => {});
    }

    return Response.json({ success: true, report });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});