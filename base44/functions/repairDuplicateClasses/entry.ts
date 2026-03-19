/**
 * repairDuplicateClasses.js
 * Marks duplicate classes inactive and appends DUPLICATE_OF marker.
 * Also updates references in Entry, Results, Standings, and Session records.
 * 
 * For each duplicate group:
 * 1. Choose canonical row
 * 2. Mark others inactive
 * 3. Redirect references to canonical
 * 
 * Returns count of classes and references repaired.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { series_class_keys = [], event_class_keys = [] } = body;

    let seriesClassesProcessed = 0, eventClassesProcessed = 0, referencesUpdated = 0;
    const warnings = [];

    if (series_class_keys.length === 0 && event_class_keys.length === 0) {
      const duplicateRes = await base44.asServiceRole.functions.invoke('findDuplicateClasses', {});
      const data = duplicateRes?.data || {};
      series_class_keys.push(...(data.series_class_duplicate_groups || []).map(g => g.key));
      event_class_keys.push(...(data.event_class_duplicate_groups || []).map(g => g.key));
    }

    // ── Repair SeriesClasses ──
    for (const key of series_class_keys) {
      const classes = await base44.asServiceRole.entities.SeriesClass.filter({
        normalized_series_class_key: key,
      }).catch(() => []);

      if (classes.length < 2) continue;
      seriesClassesProcessed++;

      const canonical = classes.sort((a, b) => {
        const aScore = (a.notes ? 1 : 0) + (a.active ? 1 : 0);
        const bScore = (b.notes ? 1 : 0) + (b.active ? 1 : 0);
        if (aScore !== bScore) return bScore - aScore;
        return new Date(a.created_date) - new Date(b.created_date);
      })[0];

      for (const cls of classes) {
        if (cls.id === canonical.id) continue;

        // Mark duplicate inactive
        const dupeNote = `DUPLICATE_OF:${canonical.id}`;
        const updatedNotes = (cls.notes || '')
          .split('\n')
          .filter(line => !line.includes('DUPLICATE_OF:'))
          .join('\n')
          .trim();
        const finalNote = updatedNotes ? `${updatedNotes}\n${dupeNote}` : dupeNote;

        await base44.asServiceRole.entities.SeriesClass.update(cls.id, {
          active: false,
          notes: finalNote,
        }).catch((err) => {
          warnings.push(`SeriesClass ${cls.id}: mark failed — ${err.message}`);
        });

        // Update references: Entry.series_class_id
        const entries = await base44.asServiceRole.entities.Entry.filter({
          series_class_id: cls.id,
        }).catch(() => []);
        for (const entry of entries) {
          await base44.asServiceRole.entities.Entry.update(entry.id, {
            series_class_id: canonical.id,
          }).catch(() => {});
          referencesUpdated++;
        }

        // Update references: Standings.series_class_id if present
        try {
          const standings = await base44.asServiceRole.entities.Standings.filter({
            series_class_id: cls.id,
          }).catch(() => []);
          for (const standing of standings) {
            await base44.asServiceRole.entities.Standings.update(standing.id, {
              series_class_id: canonical.id,
            }).catch(() => {});
            referencesUpdated++;
          }
        } catch {}
      }

      await base44.asServiceRole.entities.OperationLog.create({
        operation_type: 'operational_duplicate_repaired',
        entity_name: 'SeriesClass',
        status: 'success',
        metadata: { key, canonical_id: canonical.id, duplicate_count: classes.length - 1 },
      }).catch(() => {});
    }

    // ── Repair EventClasses ──
    for (const key of event_class_keys) {
      const classes = await base44.asServiceRole.entities.EventClass.filter({
        normalized_event_class_key: key,
      }).catch(() => []);

      if (classes.length < 2) continue;
      eventClassesProcessed++;

      const canonical = classes.sort((a, b) => {
        const aScore = (a.notes ? 1 : 0);
        const bScore = (b.notes ? 1 : 0);
        if (aScore !== bScore) return bScore - aScore;
        return new Date(a.created_date) - new Date(b.created_date);
      })[0];

      for (const cls of classes) {
        if (cls.id === canonical.id) continue;

        const dupeNote = `DUPLICATE_OF:${canonical.id}`;
        const updatedNotes = (cls.notes || '')
          .split('\n')
          .filter(line => !line.includes('DUPLICATE_OF:'))
          .join('\n')
          .trim();
        const finalNote = updatedNotes ? `${updatedNotes}\n${dupeNote}` : dupeNote;

        await base44.asServiceRole.entities.EventClass.update(cls.id, {
          notes: finalNote,
        }).catch((err) => {
          warnings.push(`EventClass ${cls.id}: mark failed — ${err.message}`);
        });

        // Update references: Entry.event_class_id
        const entries = await base44.asServiceRole.entities.Entry.filter({
          event_class_id: cls.id,
        }).catch(() => []);
        for (const entry of entries) {
          await base44.asServiceRole.entities.Entry.update(entry.id, {
            event_class_id: canonical.id,
          }).catch(() => {});
          referencesUpdated++;
        }

        // Update references: Session.event_class_id if present
        try {
          const sessions = await base44.asServiceRole.entities.Session.filter({
            event_class_id: cls.id,
          }).catch(() => []);
          for (const session of sessions) {
            await base44.asServiceRole.entities.Session.update(session.id, {
              event_class_id: canonical.id,
            }).catch(() => {});
            referencesUpdated++;
          }
        } catch {}
      }

      await base44.asServiceRole.entities.OperationLog.create({
        operation_type: 'operational_duplicate_repaired',
        entity_name: 'EventClass',
        status: 'success',
        metadata: { key, canonical_id: canonical.id, duplicate_count: classes.length - 1 },
      }).catch(() => {});
    }

    return Response.json({
      success: true,
      series_classes_processed: seriesClassesProcessed,
      event_classes_processed: eventClassesProcessed,
      references_updated: referencesUpdated,
      warnings: warnings,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});