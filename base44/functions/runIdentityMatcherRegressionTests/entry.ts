/**
 * runIdentityMatcherRegressionTests — regression suite for the identity
 * matching gate, the read-only check path and the racer rollback rule.
 *
 * Read-only: it runs the real matcher, the real check path and the real
 * compensation rule against live data, and writes nothing. The only mutations it
 * could ever make are refused by the code under test — proving the guard works.
 *
 * Tests:
 *   A  an unrelated verified identity is never a candidate
 *   B  four unrelated verified identities cause no tie and no REVIEW
 *   C  a canonical-name match makes the identity an eligible candidate
 *   D  an active alias match makes the identity an eligible candidate
 *   E  two legitimate eligible candidates still produce REVIEW
 *   F  a check run performs zero database mutations
 *   G  a partial racer creation is rolled back, and real racer state is not
 *
 * Admin only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { matchPersonIdentity, normalizeIdentityName } from '../../shared/personIdentityMatcher.ts';
import { shouldCompensatePartialRacer, compensatePartialRacerCreation } from '../../shared/racerCreationCompensation.ts';
import { runWorkbookImport, readOnlyServiceRoleEntities } from '../../shared/workbookImportRunner.ts';
import { getImportSheetConfig } from '../../shared/importSheetWriter.ts';

const FIXTURE_PERS_IDS = ['PERS000000002', 'PERS000000004', 'PERS000000006', 'PERS000000007'];
const SYNTHETIC_UNRELATED_NAME = 'Zzyzx Quarrelby';
const COUNTED_ENTITIES = [
  'PersonIdentity', 'RacerProfile', 'Driver', 'IdentityAlias',
  'IdentityEvidence', 'IdentityReviewQueue', 'RaceCoreIdIssuance', 'RaceCoreIdCounter',
];

async function listAll(sr, model, query) {
  const out = [];
  let cursor;
  for (let page = 0; page < 5; page++) {
    const result = await sr.entities[model].filter(query, cursor ? { limit: 1000, cursor } : { limit: 1000 });
    const items = Array.isArray(result) ? result : ((result && result.items) || []);
    for (const item of items) if (item) out.push(item);
    if (Array.isArray(result) || !result || result.has_more !== true) return out;
    cursor = result.next_cursor;
    if (!cursor) return out;
  }
  return out;
}

function candidateSummary(candidates) {
  return (candidates || []).map(function (c) {
    return {
      identity_id: c.identity_id,
      racecore_id: c.racecore_id,
      canonical_name: c.canonical_name,
      eligibility_signals: c.eligibility_signals,
      scoring_signals: c.scoring_signals,
      score: c.score,
    };
  });
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: admin only' }, { status: 403 });

    const sr = base44.asServiceRole;
    const results = [];

    // Controlled fixtures: the four verified seed identities behind the false warnings.
    const fixtureIds = [];
    for (const racecoreId of FIXTURE_PERS_IDS) {
      const rows = await listAll(sr, 'PersonIdentity', { racecore_id: racecoreId });
      for (const row of rows) fixtureIds.push(row.id);
    }

    const identities = await listAll(sr, 'PersonIdentity', { status: 'active' });
    const aliases = await listAll(sr, 'IdentityAlias', { active: true });

    const leakageOf = (match) => ({
      fixtures: (match.eligible_candidates || []).filter((c) => fixtureIds.includes(c.identity_id)),
      withoutEligibility: (match.eligible_candidates || []).filter((c) => !c.eligibility_signals || c.eligibility_signals.length === 0),
    });

    // ── TEST A — one unrelated verified identity ──────────────────────────
    const a = await matchPersonIdentity(sr, { name: 'Reed Klinger' });
    const aLeak = leakageOf(a);
    results.push({
      test: 'A — unrelated verified identity',
      expected: 'Test RacerP3 (and the other verified fixtures) are not candidates for "Reed Klinger"; no candidate without an identity-bearing signal; no REVIEW caused by the verified bonus.',
      action: a.action,
      eligible_candidates: candidateSummary(a.eligible_candidates),
      fixture_identities_as_candidates: aLeak.fixtures.length,
      candidates_without_eligibility_signal: aLeak.withoutEligibility.length,
      signals: a.signals,
      pass: aLeak.fixtures.length === 0 && aLeak.withoutEligibility.length === 0,
    });

    // ── TEST B — four unrelated verified identities ───────────────────────
    const b = await matchPersonIdentity(sr, { name: SYNTHETIC_UNRELATED_NAME });
    results.push({
      test: 'B — four unrelated verified identities',
      expected: 'A name shared with nobody yields 0 eligible candidates and no ambiguous tie, even with four verified identities on the platform.',
      action: b.action,
      eligible_candidate_count: (b.eligible_candidates || []).length,
      candidate_count: b.candidate_count,
      reason: b.reason,
      signals: b.signals,
      pass: b.action === 'NEW_IDENTITY' && (b.eligible_candidates || []).length === 0 && b.candidate_count === 0,
    });

    // ── TEST C — canonical name match ────────────────────────────────────
    const canonicalSource = identities.find((i) => i.canonical_name && normalizeIdentityName(i.canonical_name));
    let testC;
    if (!canonicalSource) {
      testC = { test: 'C — canonical name match', skipped: true, reason: 'No active PersonIdentity with a usable canonical name.' };
    } else {
      const c = await matchPersonIdentity(sr, { name: canonicalSource.canonical_name });
      const hit = (c.eligible_candidates || []).filter((x) => x.identity_id === canonicalSource.id);
      testC = {
        test: 'C — canonical name match',
        expected: 'The identity becomes eligible on canonical_name_match and scoring runs; the verified bonus may then raise its confidence.',
        input: canonicalSource.canonical_name,
        action: c.action,
        matched_candidate: candidateSummary(hit),
        pass: hit.length === 1 && hit[0].eligibility_signals.includes('canonical_name_match') && c.action !== 'NEW_IDENTITY',
      };
    }
    results.push(testC);

    // ── TEST D — active alias match ──────────────────────────────────────
    const aliasSource = aliases.find((a) => a.alias_name && a.identity_id && normalizeIdentityName(a.alias_name));
    let testD;
    if (!aliasSource) {
      testD = { test: 'D — active alias match', skipped: true, reason: 'No active IdentityAlias available to probe.' };
    } else {
      const d = await matchPersonIdentity(sr, { name: aliasSource.alias_name });
      const hit = (d.eligible_candidates || []).filter((x) => x.identity_id === aliasSource.identity_id);
      testD = {
        test: 'D — active alias match',
        expected: 'The aliased identity becomes eligible on an alias_ signal.',
        input: aliasSource.alias_name,
        action: d.action,
        matched_candidate: candidateSummary(hit),
        pass: hit.length === 1 && hit[0].eligibility_signals.some((s) => String(s).startsWith('alias_')),
      };
    }
    results.push(testD);

    // ── TEST E — true ambiguity ──────────────────────────────────────────
    const byNormalized = new Map();
    const addKey = (key, id) => {
      if (!key || !id) return;
      if (!byNormalized.has(key)) byNormalized.set(key, new Set());
      byNormalized.get(key).add(id);
    };
    for (const identity of identities) addKey(normalizeIdentityName(identity.canonical_name), identity.id);
    for (const alias of aliases) addKey(alias.alias_normalized || normalizeIdentityName(alias.alias_name), alias.identity_id);
    const ambiguousKey = Array.from(byNormalized.keys()).find((k) => byNormalized.get(k).size > 1);
    let testE;
    if (!ambiguousKey) {
      testE = {
        test: 'E — true ambiguity',
        skipped: true,
        reason: 'No two live identities currently share a normalized name or alias, so genuine ambiguity cannot be constructed from live data without creating records.',
      };
    } else {
      const e = await matchPersonIdentity(sr, { name: ambiguousKey });
      testE = {
        test: 'E — true ambiguity',
        expected: 'Two legitimate eligible candidates that cannot be told apart produce REVIEW.',
        input: ambiguousKey,
        action: e.action,
        candidate_count: e.candidate_count,
        tied_candidate_ids: e.tied_candidate_ids,
        eligible_candidates: candidateSummary(e.eligible_candidates),
        pass: e.action === 'REVIEW' && e.candidate_count > 1 &&
          (e.eligible_candidates || []).length > 1 &&
          (e.eligible_candidates || []).every((c) => c.eligibility_signals.length > 0),
      };
    }
    results.push(testE);

    // ── TEST F — check mode writes nothing ───────────────────────────────
    const countState = async () => {
      const state = {};
      for (const model of COUNTED_ENTITIES) state[model] = await sr.entities[model].count({});
      return state;
    };
    const configBefore = await getImportSheetConfig(base44);
    const before = await countState();
    const checkRun = await runWorkbookImport(base44, { mode: 'check', tab: 'racers', limit: 2 });
    const after = await countState();
    const configAfter = await getImportSheetConfig(base44);
    let guardBlockedWrite = false;
    try {
      await readOnlyServiceRoleEntities(sr).PersonIdentity.create({ canonical_name: 'read-only guard probe' });
    } catch (error) {
      guardBlockedWrite = true;
    }
    const stateUnchanged = COUNTED_ENTITIES.every((model) => before[model] === after[model]);
    const configUnchanged =
      JSON.stringify(configBefore.tab_refresh_state || {}) === JSON.stringify(configAfter.tab_refresh_state || {}) &&
      configBefore.last_refresh_at === configAfter.last_refresh_at;
    results.push({
      test: 'F — check mode',
      expected: 'A check run mutates nothing: no identities, profiles, drivers, aliases, evidence, review-queue items, RaceCore counters or issuance records, and no workbook bookkeeping. A write through the check client throws.',
      counted_entities: COUNTED_ENTITIES,
      counts_before: before,
      counts_after: after,
      workbook_config_unchanged: configUnchanged,
      check_response: { mode: checkRun.mode, read_only: checkRun.read_only, counts: checkRun.counts, tabs: checkRun.tabs.length },
      write_through_check_client_blocked: guardBlockedWrite,
      pass: stateUnchanged && configUnchanged && guardBlockedWrite && checkRun.mode === 'check' && checkRun.read_only === true,
    });

    // ── TEST G — failed commit does not leave an unintended racer ────────
    const decisionTable = [
      { case: 'identity created by this commit, row failed, no profile', expect: true, got: shouldCompensatePartialRacer({ identityCreated: true, outcome: 'failed', profileExists: false }) },
      { case: 'identity created by this commit, row skipped, no profile', expect: true, got: shouldCompensatePartialRacer({ identityCreated: true, outcome: 'skipped', profileExists: false }) },
      { case: 'identity reused, not created by this commit', expect: false, got: shouldCompensatePartialRacer({ identityCreated: false, outcome: 'failed', profileExists: false }) },
      { case: 'identity owns a racer profile', expect: false, got: shouldCompensatePartialRacer({ identityCreated: true, outcome: 'failed', profileExists: true }) },
      { case: 'row settled as created', expect: false, got: shouldCompensatePartialRacer({ identityCreated: true, outcome: 'created', profileExists: true }) },
    ];
    const profiles = await listAll(sr, 'RacerProfile', {});
    const realProfile = profiles.find((p) => p.person_identity_id);
    let refusal = { rolled_back: null, reason: 'no racer profile available to probe' };
    let racerStateIntact = true;
    if (realProfile) {
      const identityBefore = await sr.entities.PersonIdentity.get(realProfile.person_identity_id).catch(() => null);
      refusal = await compensatePartialRacerCreation(sr, {
        person_identity_id: realProfile.person_identity_id,
        reason: 'regression test — this must refuse',
      });
      const identityAfter = await sr.entities.PersonIdentity.get(realProfile.person_identity_id).catch(() => null);
      racerStateIntact = !!identityBefore && !!identityAfter;
    }
    const noOp = await compensatePartialRacerCreation(sr, { person_identity_id: null });
    results.push({
      test: 'G — failed commit',
      expected: 'A racer commit that created the identity but never established a profile is rolled back; a real racer (identity with a profile) is never touched.',
      decision_table: decisionTable,
      live_refusal: { rolled_back: refusal.rolled_back, reason: refusal.reason },
      real_racer_state_intact: racerStateIntact,
      empty_call: noOp,
      pass: decisionTable.every((row) => row.got === row.expect) &&
        refusal.rolled_back === false && racerStateIntact && noOp.rolled_back === false,
    });

    const ran = results.filter((r) => !r.skipped);
    const failed = ran.filter((r) => r.pass !== true);

    return Response.json({
      suite: 'racecore_identity_matcher_regression',
      fixtures: { racecore_ids: FIXTURE_PERS_IDS, resolved_identity_ids: fixtureIds },
      passed: failed.length === 0,
      summary: {
        tests: results.length,
        ran: ran.length,
        passed: ran.length - failed.length,
        failed: failed.length,
        skipped: results.filter((r) => r.skipped).length,
      },
      failed_tests: failed.map((r) => r.test),
      results,
    });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}