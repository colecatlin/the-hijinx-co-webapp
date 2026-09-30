/**
 * workbookImportRunner.ts — the workbook import itself.
 *
 * One pass reads every template tab, decides each typed row through the
 * platform's existing read-only resolution engine, and — on Import — commits
 * through the same pipeline the CSV import already uses. No new write path.
 *
 * The clash policy is skip-and-flag, with no update branch anywhere:
 *   - a row matching an existing record is skipped and flagged, never merged;
 *   - a row the resolution engine cannot decide is skipped and flagged;
 *   - a row already carrying a platform ID is left alone entirely.
 *
 * A skipped row is stamped with the record it clashed with, so it settles and
 * is not flagged again on every later run. A row that failed for want of data
 * is not stamped, so it stays waiting and is retried until it is fixed or
 * deleted.
 */

import {
  WORKBOOK_DOMAINS, requiredColumnNames, rowToObject, stampFromRecord, inputColumnNames, compactPayload,
} from './workbookTemplates.ts';
import {
  getImportSheetConfig, readWorkbookTabs, writeRowStamps, mergeTabState,
} from './importSheetWriter.ts';
import { resolveSponsorOrganization } from './organizationResolution.ts';

const EXTRA_ORGANIZATION_FIELDS = [
  'industry', 'tagline', 'description',
  'location_city', 'location_state', 'location_country',
  'contact_email', 'logo_url', 'website_url',
];

/** Decide one typed row for the five core records that share the sync pipeline. */
async function resolveCoreRecord(ctx, domain, payload, sheetRow) {
  const reply = await ctx.base44.functions.invoke('resolveImportRow', {
    row_number: sheetRow,
    raw_row: payload,
    entity_type: domain.engineEntity,
    import_run_id: ctx.importRunId,
    source_name: 'import_workbook',
    source_type: 'workbook',
    is_historical: false,
  });
  const data = reply && reply.data;
  if (!data || data.error) {
    return { action: 'failed', note: (data && data.error) || 'The resolution engine did not answer.' };
  }

  const checks = (data.validation && data.validation.checks) || [];
  const blockedCheck = checks.find(function (c) { return c.status === 'FAIL' || c.status === 'BLOCKED'; });
  if (blockedCheck) {
    return { action: 'skipped', note: blockedCheck.message || 'The row did not pass validation.' };
  }

  const own = (data.entity_resolution || {})[domain.primaryResolutionKey];
  if (own) {
    if (own.action === 'MATCH_EXISTING' || own.action === 'MATCH_ALIAS') {
      return {
        action: 'skipped',
        note: 'Already on the platform — matched by ' + (own.match_type || 'name') + '. Nothing was changed.',
        record: { id: own.entity_id, name: own.entity_name },
      };
    }
    if (own.action === 'REVIEW_REQUIRED') {
      return { action: 'skipped', note: 'More than one possible match — needs a human decision.' };
    }
    if (own.action === 'BLOCK_IMPORT') {
      return { action: 'skipped', note: 'Blocked by the resolution engine.' };
    }
  }

  const identity = data.identity_resolution;
  if (identity) {
    if (identity.action === 'BLOCKED') {
      return { action: 'skipped', note: 'Identity conflict — ' + (identity.reason || 'blocked') + '. Nothing was created.' };
    }
    if (identity.action === 'REVIEW') {
      return { action: 'skipped', note: 'Possible match to a person already on the platform — needs review before creating.' };
    }
  }

  return { action: 'create', note: '' };
}

/** Resolve or create one organization. */
async function resolveOrganization(ctx, domain, payload) {
  const result = await resolveSponsorOrganization(ctx.base44, {
    name: payload.name,
    website_url: payload.website_url || null,
    external_uid: payload.external_uid || null,
    organization_type: payload.type || null,
    allow_create: ctx.commit,
  });

  if (result.status === 'resolved') {
    return {
      action: 'skipped',
      note: 'Already on the platform — matched by ' + (result.resolution_path || 'name') + '. Nothing was changed.',
      record: result.organization,
    };
  }
  if (result.status === 'review') {
    return { action: 'skipped', note: (result.warnings && result.warnings[0]) || 'More than one possible match — needs a human decision.' };
  }
  if (result.status === 'error') {
    return { action: 'failed', note: (result.errors && result.errors[0]) || 'The organization could not be read.' };
  }
  if (result.status === 'blocked') {
    // Check mode, no match found — this row is the one that would be created.
    return { action: 'create', note: '' };
  }

  // Created. The resolver stores the identity fields; everything else the admin
  // typed is applied on top so nothing silently disappears.
  const created = result.organization || {};
  const patch = {};
  if (payload.type && payload.type !== created.type) patch.type = payload.type;
  EXTRA_ORGANIZATION_FIELDS.forEach(function (field) {
    if (payload[field] && payload[field] !== created[field]) patch[field] = payload[field];
  });
  if (Object.keys(patch).length > 0) {
    await ctx.sr.entities.Organization.update(created.id, patch);
  }

  return { action: 'created', note: '', record: Object.assign({}, created, patch) };
}

/**
 * Commit one typed row through the established pipeline. Driver rows go through
 * person-identity resolution first, exactly as the CSV import does, so the
 * identity chain stays intact.
 */
async function commitCoreRecord(ctx, domain, payload) {
  if (domain.pipelineType === 'driver') {
    const displayName = String((payload.first_name || '') + ' ' + (payload.last_name || '')).trim();
    const identityReply = await ctx.base44.functions.invoke('resolvePersonIdentity', {
      raw_driver_name: displayName,
      raw_dob: payload.date_of_birth || null,
      raw_external_uid: payload.external_uid || null,
      raw_car_number: payload.primary_number || null,
      source_type: 'workbook_import',
      source_name: 'import_from_workbook',
      import_run_id: ctx.importRunId,
    });
    const identity = identityReply && identityReply.data;
    if (!identity || identity.error) {
      return { action: 'failed', note: (identity && identity.error) || 'Identity resolution failed.' };
    }
    if (identity.action === 'BLOCKED') {
      return { action: 'skipped', note: 'Identity conflict — ' + (identity.reason || 'blocked') + '. Nothing was created.' };
    }
    if (identity.action === 'REVIEW') {
      return { action: 'skipped', note: 'Possible match to a person already on the platform — needs review before creating.' };
    }
  }

  const prepReply = await ctx.base44.functions.invoke('prepareSourcePayloadForSync', {
    entity_type: domain.pipelineType,
    payload: payload,
  });
  const prepared = prepReply && prepReply.data;
  if (!prepared || !prepared.payload) {
    return { action: 'failed', note: (prepared && prepared.error) || 'The row could not be prepared for import.' };
  }

  const syncReply = await ctx.base44.functions.invoke('syncSourceAndEntityRecord', {
    entity_type: domain.pipelineType,
    payload: prepared.payload,
    user_id: ctx.user.id || null,
    triggered_from: 'import_from_workbook',
  });
  const synced = syncReply && syncReply.data;
  if (!synced || !synced.source_record) {
    return { action: 'failed', note: (synced && synced.error) || 'The import pipeline did not return a record.' };
  }

  // The record the sheet should carry is the record-type itself — Track,
  // Team, Series, Event, Driver — not the internal Entity-layer row, because
  // that is what other records reference (an Event points at a Track id).
  const record = synced.source_record || synced.entity_record;
  if (synced.source_action === 'created') {
    return { action: 'created', note: '', record: record };
  }
  return {
    action: 'skipped',
    note: 'Matched a record already on the platform — left as it was.',
    record: record,
  };
}

/** One typed row, all the way through. */
async function processRow(ctx, domain, fields, sheetRow) {
  const missing = requiredColumnNames(domain).filter(function (column) { return !fields[column]; });
  if (missing.length > 0) {
    return { action: 'skipped', note: 'Missing ' + missing.join(', ') + '.' };
  }

  const payload = compactPayload(domain.toPayload(fields));

  if (domain.pipelineType === null) {
    return resolveOrganization(ctx, domain, payload);
  }

  const resolved = await resolveCoreRecord(ctx, domain, payload, sheetRow);
  if (resolved.action !== 'create') return resolved;
  if (!ctx.commit) return { action: 'create', note: '' };

  return commitCoreRecord(ctx, domain, payload);
}

/**
 * Run the workbook import. mode 'check' decides every row and writes nothing;
 * mode 'import' commits and stamps each row in place.
 */
export async function runWorkbookImport(base44, input) {
  const settings = input || {};
  const commit = settings.mode === 'import';

  const user = await base44.auth.me();
  const config = await getImportSheetConfig(base44);
  if (!config) throw new Error('No workbook is connected yet. Connect one first.');

  const requested = settings.tab && settings.tab !== 'all' ? settings.tab : null;
  const selected = requested
    ? WORKBOOK_DOMAINS.find(function (d) { return d.key === requested || d.tab === requested; }) || null
    : null;
  const onlyKeys = selected ? [selected.key] : null;

  const { tabs, stale } = await readWorkbookTabs(base44, config, onlyKeys);
  if (stale.length > 0) {
    throw new Error(
      'These tabs still have the old full-record layout: ' + stale.join(', ') +
      '. Rebuild the templates on this page, then run the import again.'
    );
  }

  const ctx = {
    base44: base44,
    sr: base44.asServiceRole,
    user: user,
    commit: commit,
    importRunId: 'workbook_' + Date.now(),
  };

  const tabResults = [];
  const problems = [];
  const counts = { read: 0, created: 0, skipped: 0, failed: 0 };
  const stateByTab = {};

  for (const key of Object.keys(tabs)) {
    const entry = tabs[key];
    const domainDef = entry.domain;
    const inputCols = inputColumnNames(domainDef);
    const stamps = [];

    let processed = 0;
    let created = 0;
    let skipped = 0;
    let failed = 0;
    let unmatchedSkips = 0;

    for (const row of entry.rows) {
      const fields = rowToObject(entry.columns, row.values);

      const hasInput = inputCols.some(function (column) { return fields[column]; });
      const known = fields.platform_id || fields.platform_slug || fields.platform_racecore_id;
      if (!hasInput || known) continue;

      processed++;

      let outcome;
      try {
        outcome = await processRow(ctx, domainDef, fields, row.sheet_row);
      } catch (error) {
        outcome = { action: 'failed', note: (error && error.message) || 'The row could not be processed.' };
      }

      if (outcome.action === 'created') created++;
      else if (outcome.action === 'failed') failed++;
      else if (outcome.action === 'create') created++;            // check mode: would create
      else {
        skipped++;
        if (!outcome.record) unmatchedSkips++;
      }

      if (outcome.action === 'skipped' || outcome.action === 'failed') {
        problems.push({
          tab: domainDef.tab,
          sheet_row: row.sheet_row,
          action: outcome.action === 'failed' ? 'failed' : 'skipped',
          reason: outcome.note || '',
        });
      }

      if (commit && outcome.action !== 'create') {
        const stamp = Object.assign({}, stampFromRecord(outcome.record || null, fields.name || ''), {
          last_action: outcome.action,
          last_run_at: new Date().toISOString(),
          last_note: outcome.note || '',
        });
        stamps.push({ sheet_row: row.sheet_row, stamp: stamp });
      }
    }

    if (commit && stamps.length > 0) {
      await writeRowStamps(base44, config, domainDef, stamps);
    }

    tabResults.push({
      tab: domainDef.tab,
      key: domainDef.key,
      waiting: processed,
      created: created,
      skipped: skipped,
      failed: failed,
    });

    counts.read += processed;
    counts.created += created;
    counts.skipped += skipped;
    counts.failed += failed;

    stateByTab[domainDef.tab] = {
      waiting: commit ? failed + unmatchedSkips : processed,
      checked_at: new Date().toISOString(),
      last_checked_mode: commit ? 'import' : 'check',
    };
  }

  await mergeTabState(base44, config, stateByTab);

  return {
    mode: commit ? 'import' : 'check',
    counts: counts,
    tabs: tabResults,
    problems: problems,
  };
}