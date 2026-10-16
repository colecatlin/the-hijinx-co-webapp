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
 *
 * RaceCore IDs are minted inside a row's own commit, never in a later pass. A
 * racer row is the case that matters: it settles on the racer profile the row
 * produced, and the racer-profile resolver mints that profile's RACR ID as part
 * of the same commit — so this run reads the resolver's result rather than
 * minting a second ID on top of it, and a track row settles on the track it
 * matched, so it carries that track's ID. The other families the workbook creates
 * (teams, series, events, organizations) have no ID family in the platform's
 * RaceCore ID architecture, so those rows are stamped without one.
 */

import {
  WORKBOOK_DOMAINS, requiredColumnNames, rowToObject, stampFromRecord, inputColumnNames, compactPayload,
} from './workbookTemplates.ts';
import {
  getImportSheetConfig, readWorkbookTabs, writeRowStamps, mergeTabState,
} from './importSheetWriter.ts';
import { resolveSponsorOrganization } from './organizationResolution.ts';
import { checkLocationPair } from './countryReference.ts';
import { ensureIdWithDuplicateCheck } from './workbookSyncHelpers.ts';
import { resolveRaceCoreId, isRaceCoreAttempt } from './racecoreRegistry.ts';
import { compensatePartialRacerCreation, shouldCompensatePartialRacer } from './racerCreationCompensation.ts';

const EXTRA_ORGANIZATION_FIELDS = [
  'industry', 'tagline', 'description',
  'location_city', 'location_state', 'location_country',
  'contact_email', 'logo_url', 'website_url',
];

// ── Check mode is structurally read-only ─────────────────────────────────────
// A check run reaches reads only. Every write through this client throws, so
// "a check writes nothing" is enforced by the client the run is handed, not by
// convention: no resolver, and no future edit to one, can mutate the platform
// during a check.
const READ_ONLY_ENTITY_METHODS = ['get', 'filter', 'list', 'count', 'aggregate', 'subscribe'];

export function readOnlyServiceRoleEntities(sr: any) {
  return new Proxy({}, {
    get(_target, modelName) {
      const model = sr.entities[modelName as string];
      if (!model) return model;
      return new Proxy({}, {
        get(_modelTarget, method) {
          if (typeof method !== 'string') return undefined;
          if (READ_ONLY_ENTITY_METHODS.includes(method)) return model[method].bind(model);
          throw new Error('Check mode is read-only: ' + String(modelName) + '.' + method + ' is not permitted.');
        },
      });
    },
  });
}

const REVIEW_NOTE = 'Possible match to a person already on the platform \u2014 needs review before creating.';

/** The review message names how many legitimate candidates stand behind it. */
function reviewNote(identity: any): string {
  const count = (identity && identity.candidate_count) ||
    (identity && identity.eligible_candidates && identity.eligible_candidates.length) || 0;
  if (!count) return REVIEW_NOTE;
  return REVIEW_NOTE + ' (' + count + (count === 1 ? ' candidate identity' : ' candidate identities') + ')';
}

/**
 * Admin/import-audit diagnostics for one identity decision: which identities
 * were eligible, on what signal, and with what score. Returned to the caller
 * only — never written into the workbook.
 */
function identityDiagnostics(identity: any) {
  if (!identity) return null;
  return {
    decision: identity.action || null,
    reason: identity.reason || null,
    confidence: identity.confidence || 0,
    candidate_count: identity.candidate_count || 0,
    eligibility_basis: identity.eligibility_basis || [],
    signals: identity.signals || [],
    candidates: (identity.eligible_candidates || []).map(function (candidate: any) {
      return {
        identity_id: candidate.identity_id,
        racecore_id: candidate.racecore_id,
        canonical_name: candidate.canonical_name,
        eligibility_signals: candidate.eligibility_signals,
        scoring_signals: candidate.scoring_signals,
        score: candidate.score,
      };
    }),
  };
}

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
      // The resolution engine answers with the id and the name alone, so the
      // record itself is read back: the row is stamped with the record it
      // settled on, which is where its slug and RaceCore ID come from.
      let matched = null;
      try {
        matched = await ctx.sr.entities[domain.entity].get(own.entity_id);
      } catch (e) {
        matched = null;
      }
      // If the matched record has no RaceCore ID yet, backfill one now — but
      // only in commit mode and only when no duplicate name or address is
      // found. A conflict is flagged, never silently minted.
      if (matched && !matched.racecore_id && domain.racecoreEntity && ctx.commit) {
        const idResult = await ensureIdWithDuplicateCheck(ctx.base44, domain, matched);
        if (idResult.ok) {
          try { matched = await ctx.sr.entities[domain.entity].get(own.entity_id); }
          catch (e) { /* keep the original read */ }
        }
      }
      return {
        action: 'skipped',
        note: 'Already on the platform — matched by ' + (own.match_type || 'name') + '. Nothing was changed.',
        record: matched || { id: own.entity_id, name: own.entity_name },
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
      // Reached only when the matcher found eligible candidates: an identity
      // with no shared identity-bearing signal is never a candidate.
      return {
        action: 'skipped',
        note: reviewNote(identity),
        identity: identityDiagnostics(identity),
      };
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
 * identity chain stays intact — and then settle on the racer profile the row
 * produced, which is where the row's RaceCore ID comes from.
 */
async function commitCoreRecord(ctx, domain, payload) {
  const isRacer = domain.pipelineType === 'driver';
  const displayName = isRacer
    ? String((payload.first_name || '') + ' ' + (payload.last_name || '')).trim()
    : '';
  let personIdentityId = null;

  // What THIS commit created, so a racer that stops half way can be rolled back
  // instead of leaving an orphan identity behind.
  let createdIdentity: { created: boolean; alias_ids: string[]; evidence_id: string | null } =
    { created: false, alias_ids: [], evidence_id: null };

  if (isRacer) {
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
      // The commit-side decision, reached only for a row the check also let
      // through. The matcher's eligible candidates are the only reason this
      // message can appear.
      return {
        action: 'skipped',
        note: reviewNote(identity),
        identity: identityDiagnostics(identity),
      };
    }
    personIdentityId = identity.identity_id || null;
    createdIdentity = {
      created: identity.created_person_identity === true,
      alias_ids: identity.created_alias_ids || [],
      evidence_id: identity.evidence_id || null,
    };
  }

  /**
   * Roll a racer commit back when it stopped short of a racer profile. Only
   * ever removes what this commit created, and only when the identity owns no
   * profile — an identity that has a profile is real racer state and is never
   * touched.
   */
  const finishPartial = async (note: string, outcome: string = 'failed') => {
    if (!isRacer || !createdIdentity.created) return { rolledBack: false, note: note };
    try {
      const profiles = await ctx.sr.entities.RacerProfile.filter({ person_identity_id: personIdentityId });
      const shouldRollBack = shouldCompensatePartialRacer({
        identityCreated: true,
        outcome: outcome,
        profileExists: (profiles || []).length > 0,
      });
      if (!shouldRollBack) return { rolledBack: false, note: note };
      const result = await compensatePartialRacerCreation(ctx.sr, {
        person_identity_id: personIdentityId,
        created_alias_ids: createdIdentity.alias_ids,
        evidence_id: createdIdentity.evidence_id,
        reason: note,
        import_run_id: ctx.importRunId,
        actor: ctx.user,
      });
      if (result.rolled_back) {
        return {
          rolledBack: true,
          note: note + ' The partial racer record was rolled back — nothing was left behind.',
        };
      }
      return { rolledBack: false, note: note + ' (the partial record could not be rolled back: ' + result.reason + ')' };
    } catch (error) {
      return {
        rolledBack: false,
        note: note + ' (the partial record could not be rolled back: ' + ((error && error.message) || 'unknown error') + ')',
      };
    }
  };

  const prepReply = await ctx.base44.functions.invoke('prepareSourcePayloadForSync', {
    entity_type: domain.pipelineType,
    payload: payload,
  });
  const prepared = prepReply && prepReply.data;
  if (!prepared || !prepared.payload) {
    const guarded = await finishPartial((prepared && prepared.error) || 'The row could not be prepared for import.');
    return { action: 'failed', note: guarded.note };
  }

  const syncReply = await ctx.base44.functions.invoke('syncSourceAndEntityRecord', {
    entity_type: domain.pipelineType,
    payload: prepared.payload,
    user_id: ctx.user.id || null,
    triggered_from: 'import_from_workbook',
  });
  const synced = syncReply && syncReply.data;
  if (!synced || !synced.source_record) {
    const guarded = await finishPartial((synced && synced.error) || 'The import pipeline did not return a record.');
    return { action: 'failed', note: guarded.note };
  }

  // The record the sheet should carry is the record-type itself — Track,
  // Team, Series, Event, Driver — not the internal Entity-layer row, because
  // that is what other records reference (an Event points at a Track id).
  let record = synced.source_record || synced.entity_record;
  const created = synced.source_action === 'created';

  // A racer row settles on the racer profile: it is the public identity, it is
  // the record that carries the RACR ID, and the racer-profile resolver mints
  // that ID as part of this row's own commit. Reading the resolver's result is
  // what keeps this run from minting a second ID on top of the one it assigned.
  if (isRacer) {
    const settled = await settleRacerProfile(ctx, personIdentityId, displayName, record, created);
    if (settled.action === 'created') return settled;
    const guarded = await finishPartial(settled.note, settled.action);
    if (guarded.note !== settled.note) {
      return { action: settled.action, note: guarded.note, record: settled.record };
    }
    return settled;
  }

  // Non-racer records (tracks, teams, series, events): the sync pipeline creates
  // the record but does not mint a RaceCore ID. Without this, a newly created
  // track is stamped with a blank platform_racecore_id. Mint one now — with the
  // same duplicate-name/address guard the outbound sync uses — so the stamp
  // carries the ID the row was waiting for.
  let idNote = '';
  if (domain.racecoreEntity && record && !record.racecore_id && ctx.commit) {
    const idResult = await ensureIdWithDuplicateCheck(ctx.base44, domain, record);
    if (idResult.ok) {
      try { record = await ctx.sr.entities[domain.entity].get(record.id); }
      catch (e) { /* keep the original read */ }
    } else if (!idResult.skipped) {
      idNote = 'RaceCore ID could not be assigned: ' + idResult.reason;
    } else {
      idNote = 'RaceCore ID held back: ' + idResult.reason;
    }
  }

  if (created) {
    return { action: 'created', note: idNote, record: record };
  }
  return {
    action: 'skipped',
    note: 'Matched a record already on the platform — left as it was.' + (idNote ? ' ' + idNote : ''),
    record: record,
  };
}

/**
 * Settle one racer row on its racer profile.
 *
 * The driver record above comes first — entries and results point at it — and the
 * profile is resolved against the same person identity. A row is only stamped
 * once the profile exists and carries its RaceCore ID: anything less and the row
 * is left unstamped, so it stays waiting for the next run rather than being
 * marked settled with a blank ID.
 */
async function settleRacerProfile(ctx, personIdentityId, displayName, driverRecord, driverCreated) {
  if (!personIdentityId) {
    return { action: 'failed', note: 'The row’s person identity could not be determined, so no racer profile was resolved.' };
  }

  const reply = await ctx.base44.functions.invoke('resolveRacerProfile', {
    person_identity_id: personIdentityId,
    creation_reason: 'racer_import',
    allow_create: true,
    display_name: displayName || null,
    legacy_driver_id: (driverRecord && driverRecord.id) || null,
  });
  const profile = reply && reply.data;

  if (!profile || profile.error) {
    return { action: 'failed', note: (profile && profile.error) || 'The racer profile resolver did not answer.' };
  }
  if (profile.resolution_status === 'review') {
    return { action: 'skipped', note: 'This racer already has more than one profile — needs a human decision before this row can settle.' };
  }
  if (profile.resolution_status === 'blocked' || profile.resolution_status === 'not_found') {
    return { action: 'skipped', note: profile.error || 'The racer profile resolver held this row back.' };
  }
  if (!profile.racecore_id) {
    return { action: 'failed', note: 'The racer profile was resolved but its RaceCore ID could not be assigned. The row is left waiting so the next run tries again.' };
  }

  const racerRecord = {
    id: profile.racer_profile_id,
    display_name: displayName || '',
    slug: profile.slug || '',
    racecore_id: profile.racecore_id,
  };

  if (driverCreated || profile.resolution_status === 'created') {
    return { action: 'created', note: '', record: racerRecord };
  }
  return {
    action: 'skipped',
    note: 'Matched a racer already on the platform — the row is stamped with their profile.',
    record: racerRecord,
  };
}

/**
 * Judge a row's country/region pairs, and settle both on the platform's own
 * spelling while we are here.
 *
 * A country or a region the list does not hold holds the whole row back — with
 * the value and the column named, so the row can be corrected and run again. The
 * rest of the run is untouched by it, and the row is left unstamped so it is
 * reconsidered rather than forgotten.
 */
function checkLocations(domain, fields) {
  for (const pair of domain.locationPairs || []) {
    const verdict = checkLocationPair(fields[pair.country], fields[pair.state]);
    if (!verdict.ok) {
      return {
        ok: false,
        note: pair.label + ' — ' + verdict.reason +
          ' (' + (verdict.field === 'country' ? pair.country : pair.state) + ')',
      };
    }
    if (verdict.country) fields[pair.country] = verdict.country;
    if (verdict.state) fields[pair.state] = verdict.state;
  }
  return { ok: true, note: '' };
}

/**
 * Resolve RaceCore ID cross-references in an event payload to platform entity
 * IDs. A recognized RaceCore ID attempt (4 letters + digits) is resolved via the
 * shared exact-one resolver with expected family TRCK — never name fallback.
 * Legacy Base44 Track IDs (24-hex-char strings) are left untouched.
 *
 * Returns { payload, error } — if error is set the Event row must be blocked.
 */
async function resolveEventRaceCoreRefs(ctx, payload) {
  const out = Object.assign({}, payload);

  if (out.track_id && isRaceCoreAttempt(String(out.track_id))) {
    const result = await resolveRaceCoreId(ctx.sr, String(out.track_id), 'Track');
    if (result.outcome === 'RESOLVED' && result.base44_id) {
      out.track_id = result.base44_id;
    } else {
      // Any resolution failure blocks the Event row. Do NOT fall back to
      // name matching, do NOT set track_id = null and continue.
      return {
        payload: out,
        error: 'Track RaceCore ID resolution failed: ' + (result.error || result.outcome) +
          ' (input: ' + out.track_id + ')',
      };
    }
  }
  // Legacy Base44 Track IDs (not RaceCore attempts) are left untouched.
  return { payload: out, error: null };
}

/** One typed row, all the way through. */
async function processRow(ctx, domain, fields, sheetRow) {
  const missing = requiredColumnNames(domain).filter(function (column) { return !fields[column]; });
  if (missing.length > 0) {
    return { action: 'skipped', note: 'Missing ' + missing.join(', ') + '.' };
  }

  const locations = checkLocations(domain, fields);
  if (!locations.ok) return { action: 'skipped', note: locations.note };

  let payload = compactPayload(domain.toPayload(fields));

  if (domain.pipelineType === 'event') {
    const refResult = await resolveEventRaceCoreRefs(ctx, payload);
    if (refResult.error) {
      return { action: 'skipped', note: refResult.error };
    }
    payload = refResult.payload;
  }

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
 *
 * CHECK means CHECK: the reader is handed a read-only client, every create is
 * disabled, and the tab bookkeeping is not persisted either. COMMIT means
 * COMMIT: the mutation-capable client, the racer chain with rollback, and the
 * row stamps.
 *
 * settings.limit caps how many waiting rows each tab processes in one run, so a
 * large tab can be tried out on a handful of rows first. Omitted = every row.
 */
export async function runWorkbookImport(base44, input) {
  const settings = input || {};
  const commit = settings.mode === 'import';
  const requestedLimit = Number(settings.limit);
  const limit = Number.isFinite(requestedLimit) && requestedLimit > 0 ? Math.floor(requestedLimit) : null;

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
    // A check run is handed a read-only client: any write through it throws.
    sr: commit ? base44.asServiceRole : readOnlyServiceRoleEntities(base44.asServiceRole),
    user: user,
    commit: commit,
    importRunId: 'workbook_' + Date.now(),
  };

  const tabResults = [];
  const problems = [];
  const counts = { read: 0, created: 0, skipped: 0, failed: 0, racecore_ids: 0 };
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
    let racecoreIds = 0;

    for (const row of entry.rows) {
      if (limit && processed >= limit) break;
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

      if (outcome.action === 'created') {
        created++;
        if (outcome.record && outcome.record.racecore_id) racecoreIds++;
      } else if (outcome.action === 'failed') failed++;
      else if (outcome.action === 'create') {                     // check mode: would create
        created++;
        // A racer row is settled on its racer profile, and the resolver mints
        // that profile's RaceCore ID as part of the row's commit — so this is
        // what the run would stamp, families with no ID family excluded.
        if (domainDef.racecoreEntity) racecoreIds++;
      } else {
        skipped++;
        if (!outcome.record) unmatchedSkips++;
      }

      if (outcome.action === 'skipped' || outcome.action === 'failed') {
        const problem: any = {
          tab: domainDef.tab,
          sheet_row: row.sheet_row,
          action: outcome.action === 'failed' ? 'failed' : 'skipped',
          reason: outcome.note || '',
        };
        // Which identities were considered, on which signal, and at what score.
        // Returned to the caller for admin audit; never written into the sheet.
        if (outcome.identity) problem.identity = outcome.identity;
        problems.push(problem);
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
      racecore_ids: racecoreIds,
    });

    counts.read += processed;
    counts.created += created;
    counts.skipped += skipped;
    counts.failed += failed;
    counts.racecore_ids += racecoreIds;

    stateByTab[domainDef.tab] = {
      waiting: commit ? failed + unmatchedSkips : processed,
      checked_at: new Date().toISOString(),
      last_checked_mode: commit ? 'import' : 'check',
    };
  }

  // A check records nothing — not even the tab bookkeeping it used to write.
  // The state it observed is returned to the caller instead.
  if (commit) {
    await mergeTabState(base44, config, stateByTab);
  }

  return {
    mode: commit ? 'import' : 'check',
    read_only: !commit,
    counts: counts,
    tabs: tabResults,
    tab_state: stateByTab,
    problems: problems,
  };
}