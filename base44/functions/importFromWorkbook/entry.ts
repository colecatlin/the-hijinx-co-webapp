/**
 * importFromWorkbook — one action pulls the whole master workbook into the platform.
 *
 * The six record tabs are the import templates: an admin types rows into them,
 * and this reads every tab in one pass. Rows without a platform record behind
 * them are resolved by the existing read-only resolution engine and created
 * through the same pipeline the CSV import uses. A row that matches a record
 * the platform already holds is skipped and flagged, never merged over.
 *
 * mode 'check' decides everything and writes nothing — not to the platform, not
 * to the sheet. mode 'import' commits and stamps each row in place.
 *
 * Input:  { mode: 'check' | 'import', tab?: <tab name or key, default 'all'>,
 *           limit?: <max rows per tab — omit for every row> }
 * Output: { mode, counts, tabs, problems }
 *
 * Admin only.
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
    const mode = body.mode === 'import' ? 'import' : 'check';

    const result = await runWorkbookImport(base44, { mode: mode, tab: body.tab || 'all', limit: body.limit });

    if (mode === 'import') {
      const domains = result.tabs.map(function (t) { return t.key; });
      const problems = result.problems.map(function (p) {
        return { reference: p.tab + ' row ' + p.sheet_row, action: p.action, reason: p.reason };
      });
      // Reporting is best-effort and never blocks the response: the import above
      // is already committed.
      waitUntil(reportImportRun(base44, {
        import_name: 'importFromWorkbook',
        actor: user.email,
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
    }

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}