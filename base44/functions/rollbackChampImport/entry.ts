/**
 * rollbackChampImport(importRunId)
 * Removes production records created by this import run.
 * Only safe if records have import_run_id set.
 * Resets staging rows back to 'matched' status.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const { importRunId, dry_run = true } = await req.json();
    if (!importRunId) return Response.json({ error: 'importRunId required' }, { status: 400 });

    const db = base44.asServiceRole;
    const summary = { results_removed: 0, standings_removed: 0, dry_run, errors: [] };

    // Find Results created by this run
    const results = await db.entities.Results.filter({ import_run_id: importRunId });
    const standings = await db.entities.Standings.filter({ import_run_id: importRunId });

    if (!dry_run) {
      for (const r of results) {
        try {
          await db.entities.Results.delete(r.id);
          summary.results_removed++;
        } catch (e) {
          summary.errors.push(`Delete result ${r.id}: ${e.message}`);
        }
      }

      for (const s of standings) {
        try {
          await db.entities.Standings.delete(s.id);
          summary.standings_removed++;
        } catch (e) {
          summary.errors.push(`Delete standing ${s.id}: ${e.message}`);
        }
      }

      // Reset staging rows
      const stagedResults = await db.entities.ImportedResultStaging.filter({ import_run_id: importRunId, import_status: 'created' });
      const stagedStandings = await db.entities.ImportedStandingStaging.filter({ import_run_id: importRunId, import_status: 'created' });

      for (const r of stagedResults) {
        await db.entities.ImportedResultStaging.update(r.id, { import_status: 'matched' });
      }
      for (const s of stagedStandings) {
        await db.entities.ImportedStandingStaging.update(s.id, { import_status: 'matched' });
      }

      await db.entities.ImportSourceRun.update(importRunId, { status: 'pending', notes: `Rolled back at ${new Date().toISOString()}` });
    } else {
      summary.results_removed = results.length;
      summary.standings_removed = standings.length;
      summary.message = 'Dry run — no records deleted. Pass dry_run: false to execute.';
    }

    return Response.json(summary);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});