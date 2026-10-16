/**
 * verifyRacerIdentityImportRepair — read-only verification of the racer import fix.
 *
 * Runs the previously flagged workbook rows through the workbook's own check
 * decision-maker (resolveImportRow — the exact probe the runner calls in check
 * mode, which writes nothing) and reports, per row, the identity decision, the
 * eligible candidates behind it, and whether any of the four verified fixture
 * identities still appears. Database mutation and RaceCore issuance counts are
 * taken before and after, and must be identical.
 *
 * It never commits, never creates an identity, never assigns a RaceCore ID and
 * never writes to the workbook.
 *
 * Admin only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { readWorkbookTabs, getImportSheetConfig } from '../../shared/importSheetWriter.ts';
import { rowToObject, compactPayload, inputColumnNames } from '../../shared/workbookTemplates.ts';

const FLAGGED_ROWS = [91, 92, 93, 94, 95, 114, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127];
const FIXTURE_PERS_IDS = ['PERS000000002', 'PERS000000004', 'PERS000000006', 'PERS000000007'];
const COUNTED_ENTITIES = [
  'PersonIdentity', 'RacerProfile', 'Driver', 'IdentityAlias',
  'IdentityEvidence', 'IdentityReviewQueue', 'RaceCoreIdIssuance', 'RaceCoreIdCounter',
];

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: admin only' }, { status: 403 });

    const sr = base44.asServiceRole;
    const config = await getImportSheetConfig(base44);
    if (!config) return Response.json({ error: 'No workbook is connected.' }, { status: 400 });

    const fixtureIds = [];
    for (const racecoreId of FIXTURE_PERS_IDS) {
      const rows = await sr.entities.PersonIdentity.filter({ racecore_id: racecoreId });
      for (const row of (rows || [])) fixtureIds.push(row.id);
    }

    const countState = async () => {
      const state = {};
      for (const model of COUNTED_ENTITIES) state[model] = await sr.entities[model].count({});
      return state;
    };

    const configBefore = await getImportSheetConfig(base44);
    const before = await countState();

    const { tabs, stale } = await readWorkbookTabs(base44, config, ['racers']);
    const entry = Object.values(tabs).find((t) => t.domain && t.domain.key === 'racers');
    if (!entry) return Response.json({ error: 'The Racers tab was not readable.' }, { status: 400 });

    const domain = entry.domain;
    const inputCols = inputColumnNames(domain);
    const rows = [];

    for (const row of entry.rows) {
      if (!FLAGGED_ROWS.includes(row.sheet_row)) continue;
      const fields = rowToObject(entry.columns, row.values);
      const name = `${fields.first_name || ''} ${fields.last_name || ''}`.trim();
      const payload = compactPayload(domain.toPayload(fields));
      const hasInput = inputCols.some((column) => fields[column]);

      if (!hasInput) {
        rows.push({ workbook_row: row.sheet_row, racer: name, skipped: 'the row has no input left to check' });
        continue;
      }

      const reply = await base44.functions.invoke('resolveImportRow', {
        row_number: row.sheet_row,
        raw_row: payload,
        entity_type: domain.engineEntity,
        import_run_id: 'verification_readonly',
        source_name: 'import_workbook',
        source_type: 'workbook',
        is_historical: false,
      });
      const data = reply && reply.data;
      if (!data || data.error) {
        rows.push({ workbook_row: row.sheet_row, racer: name, failed: (data && data.error) || 'no answer from the resolution engine' });
        continue;
      }

      const identity = data.identity_resolution || null;
      const candidates = ((identity && identity.eligible_candidates) || []).map((c) => ({
        identity_id: c.identity_id,
        racecore_id: c.racecore_id,
        canonical_name: c.canonical_name,
        eligibility_signals: c.eligibility_signals,
        scoring_signals: c.scoring_signals,
        score: c.score,
      }));
      const fixtureCandidates = candidates.filter((c) => fixtureIds.includes(c.identity_id));

      const blockedCheck = ((data.validation && data.validation.checks) || [])
        .find((c) => c.status === 'FAIL' || c.status === 'BLOCKED');
      const wouldBe = blockedCheck ? 'skipped: ' + (blockedCheck.message || 'failed validation')
        : (identity && identity.action === 'REVIEW') ? 'skipped: review'
          : (identity && identity.action === 'BLOCKED') ? 'skipped: identity conflict'
            : (data.entity_resolution && data.entity_resolution.driver &&
               (data.entity_resolution.driver.action === 'MATCH_EXISTING' || data.entity_resolution.driver.action === 'MATCH_ALIAS'))
              ? 'skipped: already on the platform'
              : 'create';

      rows.push({
        workbook_row: row.sheet_row,
        racer: name,
        identity_action: identity ? identity.action : null,
        identity_reason: identity ? identity.reason : null,
        eligible_candidate_count: identity ? identity.candidate_count : 0,
        eligibility_basis: (identity && identity.eligibility_basis) || [],
        eligible_candidates: candidates,
        fixture_identities_as_candidates: fixtureCandidates.length,
        would_be: wouldBe,
        validation_overall: data.validation ? data.validation.overall : null,
        stamped_before_run: {
          last_action: fields.last_action || null,
          last_run_at: fields.last_run_at || null,
          last_note: fields.last_note || null,
          platform_id: fields.platform_id || null,
        },
      });
    }

    const after = await countState();
    const configAfter = await getImportSheetConfig(base44);
    const checked = rows.filter((r) => r.identity_action !== undefined);
    const unchanged = COUNTED_ENTITIES.every((model) => before[model] === after[model]);

    return Response.json({
      verification: 'racecore_racer_identity_import_repair',
      mode: 'check_only',
      workbook: config.spreadsheet_title || config.spreadsheet_id,
      tabs_with_old_layout: stale,
      mutations: {
        counted_entities: COUNTED_ENTITIES,
        counts_before: before,
        counts_after: after,
        unchanged: unchanged,
        workbook_linkage_untouched:
          JSON.stringify(configBefore.tab_refresh_state || {}) === JSON.stringify(configAfter.tab_refresh_state || {}),
      },
      summary: {
        flagged_rows_checked: checked.length,
        rows_now_no_eligible_candidate: checked.filter((r) => r.eligible_candidate_count === 0).length,
        rows_still_needing_review: checked.filter((r) => r.identity_action === 'REVIEW').length,
        rows_would_create: checked.filter((r) => r.would_be === 'create').length,
        fixture_identities_still_flagged: checked.filter((r) => r.fixture_identities_as_candidates > 0).length,
      },
      rows,
    });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}