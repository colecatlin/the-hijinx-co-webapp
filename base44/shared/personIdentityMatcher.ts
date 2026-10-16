/**
 * personIdentityMatcher.ts — THE single person-identity matching engine.
 *
 * Every path that decides "is this the same human?" calls this module:
 *   resolvePersonIdentity, driverImportHelpers.readOnlyIdentityMatch,
 *   resolveImportRow, autoMatchResultsToDrivers, upsertCanonicalRacer.
 *
 * Trusted priority (unchanged from the original engine):
 *   external_uid 100 · license 95 · dob 90 · legal_name 85 ·
 *   alias 45-85 · canonical_name 55 · series context 15 · verified bonus 30
 *
 * TWO-STAGE MATCHING (the rule this engine is built on):
 *   STAGE 1 — CANDIDATE ELIGIBILITY. A PersonIdentity only becomes a candidate
 *   at all when the incoming row shares a real identity-bearing signal with it:
 *   a normalized canonical-name match, a legal-name match, an active
 *   IdentityAlias match, an exact date of birth, or an exact identity
 *   identifier (external_uid / licence, resolved in their own passes above).
 *   STAGE 2 — CANDIDATE SCORING. Supplemental signals are applied ONLY to a
 *   candidate that already passed stage 1. Nothing else may create a candidate:
 *   not verified status, not manual_verified_bonus, not data source, record
 *   age, completeness, a RacerProfile or Driver existing, platform activity,
 *   creation source, confidence metadata or import history. Those may raise the
 *   confidence of an eligible candidate and never make one.
 *
 *   Consequences of the gate:
 *     · a verified identity with no shared identity information is NOT a
 *       candidate, so it can never be returned as a possible match;
 *     · REVIEW happens only when two or more ELIGIBLE candidates cannot be
 *       safely told apart — never because unrelated records tie on a bonus;
 *     · no eligible candidate at all is the only path to NEW_IDENTITY.
 *
 * FAIL-CLOSED READS: the candidate sets this engine decides on must be complete
 * and must be read successfully. A failed or partial read throws instead of
 * degrading to "no candidates found" — a read error may never be mistaken for
 * evidence that a person is new, because in commit mode that mistake creates a
 * duplicate identity.
 *
 * Hard gates: a date-of-birth conflict and a licence conflict both BLOCK.
 * Safety rules: never attach on a name-only match — that returns REVIEW; never
 * pick between equally-scored eligible candidates — that returns REVIEW.
 */

export interface IdentityMatchInput {
  name?: string | null;
  dob?: string | null;
  license_number?: string | null;
  external_uid?: string | null;
  series_name?: string | null;
  /** Identity ids to ignore entirely (controlled fixtures). */
  exclude_identity_ids?: string[] | null;
}

/** Admin / import-audit diagnostics for one eligible candidate. Never shown publicly. */
export interface IdentityCandidateDiagnostic {
  identity_id: string;
  racecore_id: string | null;
  canonical_name: string | null;
  /** The identity-bearing signals that made this record eligible. */
  eligibility_signals: string[];
  /** The scoring signals applied to it afterwards. */
  scoring_signals: string[];
  score: number;
}

export interface IdentityMatchResult {
  action: 'ATTACHED' | 'REVIEW' | 'NEW_IDENTITY' | 'BLOCKED';
  identity_id: string | null;
  identity: any | null;
  confidence: number;
  confidence_level: string;
  signals: string[];
  reason: string;
  candidate_count: number;
  tied_candidate_ids: string[];
  /** Candidates that passed the eligibility gate, with their signals and scores. */
  eligible_candidates: IdentityCandidateDiagnostic[];
  /** The identity-bearing signals behind this decision. */
  eligibility_basis: string[];
}

export const TRUSTED_SIGNAL_PREFIXES = [
  'external_uid_exact',
  'license_exact',
  'dob_exact',
];

/**
 * The signals that make a PersonIdentity eligible to be a candidate at all.
 * Everything else is a supplemental scoring signal and can never create one.
 */
export const ELIGIBILITY_SIGNAL_PREFIXES = [
  'canonical_name_match',
  'legal_name_exact',
  'alias_',
  'dob_exact',
  'external_uid_exact',
  'license_exact',
];

/** True only for a signal that on its own makes a record an eligible candidate. */
export function isIdentityBearingSignal(signal: any): boolean {
  if (!signal) return false;
  const text = String(signal);
  return ELIGIBILITY_SIGNAL_PREFIXES.some(function (prefix) { return text.startsWith(prefix); });
}

const ALIAS_TYPE_WEIGHTS: Record<string, number> = {
  legal: 85,
  abbreviation: 75,
  informal: 70,
  nickname: 60,
  surname_first: 55,
  source_variant: 50,
  manual: 50,
  maiden_name: 45,
  married_name: 45,
};

// ── Normalization ────────────────────────────────────────────────────────────

export function stripQuotedNicknames(name: string): string {
  if (!name) return name;
  return name.replace(/"[^"]*"/g, '').replace(/'[^']*'/g, '').replace(/\s+/g, ' ').trim();
}

export function detectSurnameFirst(name: string): boolean {
  if (!name) return false;
  return /^[^,]+,\s*.+$/.test(name.trim());
}

export function invertSurnameFirst(name: string): string {
  const parts = name.split(',');
  if (parts.length < 2) return name;
  return parts.slice(1).join(',').trim() + ' ' + parts[0].trim();
}

export function normalizeIdentityName(name: string): string | null {
  if (!name || typeof name !== 'string') return null;
  let n = name.trim();
  if (!n) return null;
  n = stripQuotedNicknames(n);
  if (detectSurnameFirst(n)) n = invertSurnameFirst(n);
  n = n.toLowerCase();
  n = n.replace(/\b(jr\.?|sr\.?|ii|iii|iv|v)\b/g, '').trim();
  n = n.replace(/[^a-z0-9\s]/g, ' ');
  n = n.replace(/\s+/g, ' ').trim();
  let prev = '';
  while (prev !== n) {
    prev = n;
    n = n.replace(/\b([a-z])\s+(?=[a-z](\s|$))/g, '$1');
  }
  return n.replace(/\s+/g, ' ').trim() || null;
}

export function confidenceLevelFromScore(score: number): string {
  if (score >= 95) return 'verified';
  if (score >= 80) return 'high';
  if (score >= 60) return 'medium';
  if (score >= 40) return 'low';
  return 'unverified';
}

export function hasTrustedEvidence(signals: any): boolean {
  if (!signals || !Array.isArray(signals)) return false;
  for (const signal of signals) {
    for (const prefix of TRUSTED_SIGNAL_PREFIXES) {
      if (String(signal).startsWith(prefix)) return true;
    }
  }
  return false;
}

// ── Fail-closed reads ────────────────────────────────────────────────────────

const READ_PAGE_SIZE = 1000;
const READ_MAX_PAGES = 5;

/**
 * Read every matching record, or throw. A failed read is never allowed to look
 * like an empty result: "I could not read the candidates" and "there are no
 * candidates" must never be the same answer.
 */
async function readAll(sr: any, model: string, query: Record<string, any>, what: string): Promise<any[]> {
  const out: any[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < READ_MAX_PAGES; page++) {
    const result = await sr.entities[model].filter(query, cursor ? { limit: READ_PAGE_SIZE, cursor } : { limit: READ_PAGE_SIZE });
    const items = Array.isArray(result) ? result : (result && result.items) || [];
    for (const item of items) if (item) out.push(item);
    const hasMore = !Array.isArray(result) && result && result.has_more === true;
    if (!hasMore) return out;
    cursor = (result && result.next_cursor) || undefined;
    if (!cursor) return out;
  }
  throw new Error('Could not read the complete ' + what + ' set — refusing to decide identity on a partial candidate list.');
}

function candidateSignal(candidate: IdentityCandidateDiagnostic): string {
  const id = candidate.racecore_id || candidate.identity_id;
  return 'eligible_candidate:' + id + ':score=' + candidate.score +
    ':signals=' + candidate.eligibility_signals.join('+');
}

function resultFrom(
  base: { signals: string[]; eligible_candidates: IdentityCandidateDiagnostic[]; eligibility_basis: string[] },
  fields: Partial<IdentityMatchResult> & { action: IdentityMatchResult['action']; reason: string },
): IdentityMatchResult {
  return {
    action: fields.action,
    identity_id: fields.identity_id === undefined ? null : fields.identity_id,
    identity: fields.identity === undefined ? null : fields.identity,
    confidence: fields.confidence === undefined ? 0 : fields.confidence,
    confidence_level: fields.confidence_level || 'unverified',
    signals: base.signals,
    reason: fields.reason,
    candidate_count: fields.candidate_count === undefined ? 0 : fields.candidate_count,
    tied_candidate_ids: fields.tied_candidate_ids || [],
    eligible_candidates: base.eligible_candidates,
    eligibility_basis: base.eligibility_basis,
  };
}

// ── The engine ───────────────────────────────────────────────────────────────

export async function matchPersonIdentity(sr: any, input: IdentityMatchInput): Promise<IdentityMatchResult> {
  const normalizedName = normalizeIdentityName(input.name);
  const excludeIds = new Set<string>((input.exclude_identity_ids || []).filter(Boolean));
  const signals: string[] = [];
  let eligibleCandidates: IdentityCandidateDiagnostic[] = [];
  let eligibilityBasis: string[] = [];

  let matched: any = null;
  let confidence = 0;
  let ambiguous = false;
  let ambiguousIds: string[] = [];
  let blockedReason: string | null = null;
  let candidateCount = 0;

  // ── PASS 1 — external UID (100, bypasses fuzzy logic) ──
  if (input.external_uid) {
    const byUid = await readAll(sr, 'PersonIdentity', { external_uid: input.external_uid }, 'person identity by external UID');
    const usable = byUid.filter((i: any) => !excludeIds.has(i.id));
    if (usable.length === 1) {
      matched = usable[0];
      confidence = 100;
      signals.push('external_uid_exact:100');
      eligibilityBasis = ['external_uid_exact'];
    } else if (usable.length > 1) {
      ambiguous = true;
      ambiguousIds = usable.map((i: any) => i.id);
      signals.push('external_uid_ambiguous');
      eligibilityBasis = ['external_uid_exact'];
      eligibleCandidates = usable.map((i: any) => ({
        identity_id: i.id,
        racecore_id: i.racecore_id || null,
        canonical_name: i.canonical_name || null,
        eligibility_signals: ['external_uid_exact'],
        scoring_signals: ['external_uid_exact:100'],
        score: 100,
      }));
    }
  }

  // ── PASS 2 — licence number (95) ──
  if (!matched && !ambiguous && input.license_number) {
    const byLicense = await readAll(sr, 'PersonIdentity', { license_number: input.license_number }, 'person identity by licence');
    const usable = byLicense.filter((i: any) => !excludeIds.has(i.id));
    if (usable.length === 1) {
      matched = usable[0];
      confidence = 95;
      signals.push('license_exact:95');
      eligibilityBasis = ['license_exact'];
    } else if (usable.length > 1) {
      ambiguous = true;
      ambiguousIds = usable.map((i: any) => i.id);
      signals.push('license_ambiguous');
      eligibilityBasis = ['license_exact'];
      eligibleCandidates = usable.map((i: any) => ({
        identity_id: i.id,
        racecore_id: i.racecore_id || null,
        canonical_name: i.canonical_name || null,
        eligibility_signals: ['license_exact'],
        scoring_signals: ['license_exact:95'],
        score: 95,
      }));
    }
  }

  // ── PASS 3 — two-stage candidate matching: eligibility, then scoring ──
  if (!matched && !ambiguous && normalizedName) {
    const allIdentities = await readAll(sr, 'PersonIdentity', { status: 'active' }, 'active person identity');
    const allAliases = await readAll(sr, 'IdentityAlias', { active: true }, 'active identity alias');

    const aliasMap = new Map<string, any[]>();
    for (const alias of allAliases) {
      const key = alias.alias_normalized || normalizeIdentityName(alias.alias_name);
      if (!key) continue;
      if (!aliasMap.has(key)) aliasMap.set(key, []);
      (aliasMap.get(key) as any[]).push(alias);
    }

    let bestScore = 0;
    let bestCandidate: any = null;
    let bestScoring: string[] = [];
    let bestEligibility: string[] = [];
    let bestCount = 0;
    let tied: string[] = [];

    for (const identity of allIdentities) {
      if (identity.status === 'merged') continue;
      if (excludeIds.has(identity.id)) continue;

      // ── STAGE 1 — eligibility. Collect identity-bearing signals only. ──
      const eligibilitySignals: string[] = [];
      const scoringSignals: string[] = [];
      let score = 0;

      // DOB is a gate: a differing date disqualifies the candidate outright.
      if (input.dob && identity.date_of_birth) {
        if (input.dob !== identity.date_of_birth) continue;
        eligibilitySignals.push('dob_exact');
        scoringSignals.push('dob_exact:90');
        score += 90;
      }

      // A differing licence disqualifies a name-based candidate.
      if (input.license_number && identity.license_number && input.license_number !== identity.license_number) {
        continue;
      }

      const identityNorm = normalizeIdentityName(identity.canonical_name);
      if (identityNorm && normalizedName === identityNorm) {
        eligibilitySignals.push('canonical_name_match');
        scoringSignals.push('canonical_name_match:55');
        score += 55;
      }

      if (identity.legal_name) {
        const legalNorm = normalizeIdentityName(identity.legal_name);
        if (legalNorm && normalizedName === legalNorm) {
          eligibilitySignals.push('legal_name_exact');
          scoringSignals.push('legal_name_exact:85');
          score += 85;
        }
      }

      const aliasMatches = aliasMap.get(normalizedName) || [];
      for (const alias of aliasMatches) {
        if (alias.identity_id !== identity.id) continue;
        const weight = ALIAS_TYPE_WEIGHTS[alias.alias_type] || 50;
        eligibilitySignals.push('alias_' + alias.alias_type);
        scoringSignals.push('alias_' + alias.alias_type + ':' + weight);
        score += weight;
        break;
      }

      // The gate: without a shared identity-bearing signal this record is not a
      // candidate. No amount of scoring can change that.
      if (eligibilitySignals.length === 0) continue;

      // ── STAGE 2 — scoring, for an eligible candidate only. ──
      if (input.series_name && identity.data_source === input.series_name) {
        score += 15;
        scoringSignals.push('series_history:15');
      }
      if (identity.confidence_level === 'verified') {
        score += 30;
        scoringSignals.push('manual_verified_bonus:30');
      }

      const diagnostic: IdentityCandidateDiagnostic = {
        identity_id: identity.id,
        racecore_id: identity.racecore_id || null,
        canonical_name: identity.canonical_name || null,
        eligibility_signals: eligibilitySignals,
        scoring_signals: scoringSignals,
        score: Math.min(score, 100),
      };
      eligibleCandidates.push(diagnostic);

      if (score > bestScore) {
        bestScore = score;
        bestCandidate = identity;
        bestScoring = scoringSignals;
        bestEligibility = eligibilitySignals;
        bestCount = 1;
        tied = [identity.id];
      } else if (score === bestScore) {
        bestCount += 1;
        tied.push(identity.id);
      }
    }

    candidateCount = bestCount;

    if (bestCandidate && bestScore > 0) {
      const capped = Math.min(bestScore, 100);
      if (bestCount > 1) {
        // Two or more ELIGIBLE candidates that cannot safely be told apart.
        ambiguous = true;
        ambiguousIds = tied;
        signals.push(...bestScoring, 'ambiguous_candidates:' + bestCount);
        for (const candidate of eligibleCandidates) {
          if (tied.includes(candidate.identity_id)) signals.push(candidateSignal(candidate));
        }
        eligibilityBasis = Array.from(new Set(eligibleCandidates
          .filter((c) => tied.includes(c.identity_id))
          .flatMap((c) => c.eligibility_signals)));
      } else {
        matched = bestCandidate;
        confidence = capped;
        signals.push(...bestScoring);
        eligibilityBasis = bestEligibility;
        signals.push(candidateSignal({
          identity_id: bestCandidate.id,
          racecore_id: bestCandidate.racecore_id || null,
          canonical_name: bestCandidate.canonical_name || null,
          eligibility_signals: bestEligibility,
          scoring_signals: bestScoring,
          score: capped,
        }));
      }
    }
  }

  const base = { signals, eligible_candidates: eligibleCandidates, eligibility_basis: eligibilityBasis };

  // ── Hard gates on the matched identity ──
  if (matched && input.dob && matched.date_of_birth && input.dob !== matched.date_of_birth) {
    blockedReason = 'DOB_CONFLICT';
    signals.push('HARD_GATE:DOB_CONFLICT');
  }
  if (!blockedReason && matched && input.license_number && matched.license_number
      && input.license_number !== matched.license_number) {
    blockedReason = 'LICENSE_CONFLICT';
    signals.push('HARD_GATE:LICENSE_CONFLICT');
  }

  if (blockedReason) {
    return resultFrom(base, {
      action: 'BLOCKED',
      reason: blockedReason,
      candidate_count: candidateCount,
    });
  }

  if (ambiguous) {
    return resultFrom(base, {
      action: 'REVIEW',
      reason: 'ambiguous_candidates',
      candidate_count: ambiguousIds.length,
      tied_candidate_ids: ambiguousIds,
    });
  }

  if (matched && confidence >= 95 && hasTrustedEvidence(signals)) {
    return resultFrom(base, {
      action: 'ATTACHED',
      identity_id: matched.id,
      identity: matched,
      confidence,
      confidence_level: confidenceLevelFromScore(confidence),
      reason: 'trusted_match',
      candidate_count: candidateCount,
    });
  }

  if (matched) {
    // An eligible candidate exists but nothing trusted confirms it. Never attach,
    // never create a duplicate — a human decides.
    return resultFrom(base, {
      action: 'REVIEW',
      identity_id: matched.id,
      identity: matched,
      confidence,
      confidence_level: confidenceLevelFromScore(confidence),
      reason: confidence >= 85 ? 'strong_match_needs_confirmation' : 'name_only_match_needs_review',
      candidate_count: candidateCount,
    });
  }

  return resultFrom(base, {
    action: 'NEW_IDENTITY',
    reason: 'no_eligible_candidate_found',
  });
}

/** True only for a match that may be written without human review. */
export function isAutoAttachable(result: IdentityMatchResult): boolean {
  return result.action === 'ATTACHED' && result.confidence >= 95 && hasTrustedEvidence(result.signals);
}