/**
 * runDailyWorkbookImport — the scheduled daily import of the master workbook.
 *
 * Reads every connected workbook tab, processes eligible un-stamped rows
 * through the existing resolution and canonical import pipeline, stamps each
 * row with its result and platform IDs, and reports the run to the workbook
 * and the in-app OperationLog.
 *
 * RaceCore IDs are minted during each row's own commit (racer profiles and
 * tracks). For rows that MATCH an existing record with no ID, the runner
 * backfills the ID — but only when no duplicate name or address is found.
 *
 * Bounded: at most 100 rows per tab per run, so a large backlog is worked
 * through over successive daily runs without risking a timeout.
 *
 * Invoked by the Daily Workbook Sync workflow and manually from the admin
 * Import Workbook page. Admin only.
 *
 * Input:  { limit?: <max rows per tab, default 100> }
 * Output: { mode, counts, tabs, problems }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { waitUntil } from 'base44:runtime';
import { runWorkbookImport } from '../../shared/workbookImportRunner.ts';
import { reportImportRun } from '../../shared/importSheetWriter.ts';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });

    const body = await req.json().catch(function () { return {}; });
    const limit = Number.isFinite(Number(body.limit)) && Number(body.limit) > 0
      ? Number(body.limit) : 100;

    const result = await runWorkbookImport(base44, { mode: 'import', tab: 'all', limit: limit });

    const domains = result.tabs.map(function (t) { return t.key; });
    const problems = result.problems.map(function (p) {
      return { reference: p.tab + ' row ' + p.sheet_row, action: p.action, reason: p.reason };
    });

    waitUntil(reportImportRun(base44, {
      import_name: 'daily_workbook_import',
      actor: user.email || 'scheduled',
      source: 'master_workbook',
      status: result.counts.failed > 0 ? 'completed_with_failures' : 'completed',
      counts: {
        read: result.counts.read,
        created: result.counts.created,
        updated: 0,
        skipped: result.counts.skipped,
        failed: result.counts.failed,
      },
      domains: domains,
      problems: problems,
    }));

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}