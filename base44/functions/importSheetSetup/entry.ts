/**
 * importSheetSetup — connect and build the master import workbook.
 *
 * Creates or refreshes the workbook skeleton the platform owns: Read Me,
 * Summary, Import Log, Problems, one tab per import domain, and the reference
 * tabs that feed the dropdowns. Existing tabs are updated in place, never
 * duplicated, and anything the template does not own is left untouched.
 *
 * Input:  { spreadsheet_url }  — the EDITING link, from the address bar.
 * Output: { ok, spreadsheet_title, spreadsheet_id, tabs, refreshed }
 *
 * Admin only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { setupImportSheet } from '../../shared/importSheetWriter.ts';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });

    const body = await req.json().catch(function () { return {}; });
    if (!body.spreadsheet_url && !body.spreadsheet_id) {
      return Response.json({ error: 'spreadsheet_url is required' }, { status: 400 });
    }

    const result = await setupImportSheet(base44, {
      spreadsheet_url: body.spreadsheet_url,
      spreadsheet_id: body.spreadsheet_id,
    });

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}