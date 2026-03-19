/**
 * repairDuplicateEntries.js
 * Marks duplicate entries inactive and appends DUPLICATE_OF marker.
 * 
 * For each duplicate group:
 * 1. Choose canonical row (oldest, most complete)
 * 2. Mark others inactive
 * 3. Append DUPLICATE_OF:{survivor_id} to notes
 * 
 * Returns count of groups processed and duplicates marked.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { keys = [] } = body;

    let groupsProcessed = 0, duplicatesMarked = 0;
    const warnings = [];

    if (keys.length === 0) {
      // Auto-detect duplicates if no keys provided
      const duplicateRes = await base44.asServiceRole.functions.invoke('findDuplicateEntries', {});
      const duplicates = duplicateRes?.data?.duplicate_groups || [];
      keys.push(...duplicates.map(g => g.key));
    }

    for (const key of keys) {
      const entries = await base44.asServiceRole.entities.Entry.filter({
        normalized_entry_key: key,
      }).catch(() => []);

      if (entries.length < 2) continue;
      groupsProcessed++;

      // Choose canonical: oldest record, then most complete (most fields set)
      const canonical = entries.sort((a, b) => {
        const aScore = (a.notes ? 1 : 0) + (a.payment_status && a.payment_status !== 'Unpaid' ? 1 : 0);
        const bScore = (b.notes ? 1 : 0) + (b.payment_status && b.payment_status !== 'Unpaid' ? 1 : 0);
        if (aScore !== bScore) return bScore - aScore;
        return new Date(a.created_date) - new Date(b.created_date);
      })[0];

      // Mark duplicates
      for (const entry of entries) {
        if (entry.id === canonical.id) continue;

        const dupeNote = `DUPLICATE_OF:${canonical.id}`;
        const updatedNotes = (entry.notes || '')
          .split('\n')
          .filter(line => !line.includes('DUPLICATE_OF:'))
          .join('\n')
          .trim();
        const finalNote = updatedNotes ? `${updatedNotes}\n${dupeNote}` : dupeNote;

        await base44.asServiceRole.entities.Entry.update(entry.id, {
          entry_status: 'Withdrawn',
          notes: finalNote,
        }).catch((err) => {
          warnings.push(`Entry ${entry.id}: mark failed — ${err.message}`);
        });
        duplicatesMarked++;
      }

      // Log repair
      await base44.asServiceRole.entities.OperationLog.create({
        operation_type: 'operational_duplicate_repaired',
        entity_name: 'Entry',
        status: 'success',
        metadata: {
          normalized_entry_key: key,
          canonical_id: canonical.id,
          duplicate_count: entries.length - 1,
        },
      }).catch(() => {});
    }

    return Response.json({
      success: true,
      groups_processed: groupsProcessed,
      duplicates_marked_inactive: duplicatesMarked,
      warnings: warnings,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});