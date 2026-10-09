/**
 * syncPlatformToWorkbook — outbound sync from platform records to the workbook.
 *
 * For each domain whose record family carries a RaceCore ID (racers, tracks):
 *   1. Ensure every platform record has a RaceCore ID — minting one only when
 *      no duplicate name or address is found. Conflicts are flagged, not forced.
 *   2. Read the workbook tab and build a RaceCore-ID → row-number map.
 *   3. For records already present in the workbook: update only the platform-
 *      owned stamp columns (never the admin's input columns).
 *   4. For records not yet in the workbook: append a new row carrying the
 *      record's data and its RaceCore ID, so the next daily import recognises
 *      it and does not create a duplicate.
 *
 * Sheet writes never overwrite admin-entered input columns and never clear a
 * domain tab. The outbound sync is limited to domains with RaceCore IDs.
 *
 * Invoked by the Daily Workbook Sync workflow and manually from the admin
 * Import Workbook page. Admin only.
 *
 * Output: { ok, counts: { synced, appended, skipped, failed, ids_assigned }, problems }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { waitUntil } from 'base44:runtime';
import { getImportSheetConfig, readWorkbookTabs, writeRowStamps, reportImportRun } from '../../shared/importSheetWriter.ts';
import { getSheetsToken, appendValues } from '../../shared/sheetsApi.ts';
import { inputColumnNames, rowToObject, stampFromRecord } from '../../shared/workbookTemplates.ts';
import { SYNCABLE_DOMAINS, ensureIdWithDuplicateCheck, recordToFullRow, pageItems } from '../../shared/workbookSyncHelpers.ts';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });

    const sr = base44.asServiceRole;
    const config = await getImportSheetConfig(base44);
    if (!config) throw new Error('No workbook is connected yet. Connect one first.');

    const token = await getSheetsToken(base44);
    const spreadsheetId = config.spreadsheet_id;

    const counts = { synced: 0, appended: 0, skipped: 0, failed: 0, ids_assigned: 0 };
    const problems = [];

    for (const domain of SYNCABLE_DOMAINS) {
      // ── Read the workbook tab to build a RaceCore-ID → row-number map ──
      const { tabs } = await readWorkbookTabs(base44, config, [domain.key]);
      const tabData = tabs[domain.key];
      if (!tabData || tabData.stale) {
        problems.push({
          reference: domain.tab, action: 'skipped',
          reason: 'Tab is stale or missing — rebuild templates first.',
        });
        continue;
      }

      const workbookMap = {};
      for (const row of tabData.rows) {
        const fields = rowToObject(tabData.columns, row.values);
        if (fields.platform_racecore_id) {
          workbookMap[fields.platform_racecore_id] = row.sheet_row;
        }
      }

      // ── Read all platform records for this domain (paged) ──
      const entityName = domain.racecoreEntity;
      let allRecords = [];
      let page = await sr.entities[entityName].filter(
        { is_archived: { $ne: true } },
        { sort: '-created_date', limit: 500 }
      );
      allRecords = allRecords.concat(pageItems(page));
      while (page && page.has_more && page.next_cursor) {
        page = await sr.entities[entityName].filter(
          { is_archived: { $ne: true } },
          { sort: '-created_date', limit: 500, cursor: page.next_cursor }
        );
        allRecords = allRecords.concat(pageItems(page));
      }

      const stamps = [];
      const appendRows = [];

      for (const record of allRecords) {
        // ── Ensure the record has a RaceCore ID (with duplicate guard) ──
        let workingRecord = record;
        if (!record.racecore_id) {
          const idResult = await ensureIdWithDuplicateCheck(base44, domain, record);
          if (!idResult.ok) {
            counts.skipped++;
            problems.push({
              reference: domain.tab + ' — ' + (record.name || record.display_name || record.id),
              action: 'skipped', reason: idResult.reason,
            });
            continue;
          }
          counts.ids_assigned++;
          try { workingRecord = await sr.entities[entityName].get(record.id); }
          catch (e) { workingRecord = record; }
        }

        const racecoreId = workingRecord.racecore_id;
        if (!racecoreId) {
          counts.skipped++;
          problems.push({
            reference: domain.tab + ' — ' + (workingRecord.name || workingRecord.display_name || workingRecord.id),
            action: 'skipped', reason: 'No RaceCore ID after ensure step.',
          });
          continue;
        }

        // ── Match the workbook row by RaceCore ID ──
        if (workbookMap[racecoreId]) {
          // Update stamp columns only — never touch the admin's input columns
          const stamp = Object.assign({}, stampFromRecord(workingRecord, ''), {
            last_action: 'synced',
            last_run_at: new Date().toISOString(),
            last_note: 'Updated from platform',
          });
          stamps.push({ sheet_row: workbookMap[racecoreId], stamp: stamp });
          counts.synced++;
        } else {
          // Append a new row with the record's data and RaceCore ID
          appendRows.push(recordToFullRow(domain, workingRecord, 'synced', 'Added from platform'));
          counts.appended++;
        }
      }

      // ── Write stamp updates in one batch ──
      if (stamps.length > 0) {
        await writeRowStamps(base44, config, domain, stamps);
      }

      // ── Append new rows in chunks ──
      if (appendRows.length > 0) {
        const CHUNK = 100;
        for (let i = 0; i < appendRows.length; i += CHUNK) {
          await appendValues(token, spreadsheetId, domain.tab, appendRows.slice(i, i + CHUNK));
        }
      }
    }

    // ── Report the sync run ──
    waitUntil(reportImportRun(base44, {
      import_name: 'sync_platform_to_workbook',
      actor: user.email || 'scheduled',
      source: 'platform',
      status: counts.failed > 0 ? 'completed_with_failures' : 'completed',
      counts: {
        read: counts.synced + counts.appended + counts.skipped,
        created: counts.appended,
        updated: counts.synced,
        skipped: counts.skipped,
        failed: counts.failed,
      },
      domains: SYNCABLE_DOMAINS.map(function (d) { return d.key; }),
      problems: problems,
    }));

    return Response.json({ ok: true, counts: counts, problems: problems });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}