/**
 * importSheetRefresh — bring the workbook's detail tabs up to date on demand.
 *
 * This is how a tab heals itself after a failed write: the next successful
 * refresh rebuilds it from the platform. The Import Log and Problems tabs keep
 * their own history regardless, because they are only ever appended to.
 *
 * Input:  { tab }  — a domain tab name or key, or 'all' (default).
 * Output: { ok, refreshed: { tab_name: { refreshed_at, rows } } }
 *
 * Admin only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { refreshImportSheet } from '../../shared/importSheetWriter.ts';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });

    const body = await req.json().catch(function () { return {}; });
    const result = await refreshImportSheet(base44, { tab: body.tab || 'all' });

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}