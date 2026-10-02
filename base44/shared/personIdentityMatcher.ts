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
 * Hard gates: a date-of-birth conflict and a licence conflict both BLOCK.
 * Safety rules added by the canonical-identity build:
 *   · never attach on a name-only match — that returns REVIEW
 *   · never pick between equally-scored candidates — that returns REVIEW
 *   · no candidate at all is the only path to NEW_IDENTITY
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
}

export const TRUSTED_SIGNAL_PREFIXES = [
  'external_uid_exact',
  'license_exact',
  'dob_exact',
];

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

function emptyResult(reason: string, signals: string[]): IdentityMatchResult {
  return {
    action: 'NEW_IDENTITY',
    identity_id: null,
    identity: null,
    confidence: 0,
    confidence_level: 'unverified',
    signals,
    reason,
    candidate_count: 0,
    tied_candidate_ids: [],
  };
}

// ── The engine ───────────────────────────────────────────────────────────────

export async function matchPersonIdentity(sr: any, input: IdentityMatchInput): Promise<IdentityMatchResult> {
  const normalizedName = normalizeIdentityName(input.name);
  const excludeIds = new Set<string>((input.exclude_identity_ids || []).filter(Boolean));
  const signals: string[] = [];

  let matched: any = null;
  let confidence = 0;
  let ambiguous = false;
  let ambiguousIds: string[] = [];
  let blockedReason: string | null = null;
  let candidateCount = 0;

  // ── PASS 1 — external UID (100, bypasses fuzzy logic) ──
  if (input.external_uid) {
    const byUid = await sr.entities.PersonIdentity
      .filter({ external_uid: input.external_uid }).catch(() => []);
    const usable = (byUid || []).filter((i: any) => i && !excludeIds.has(i.id));
    if (usable.length === 1) {
      matched = usable[0];
      confidence = 100;
      signals.push('external_uid_exact:100');
    } else if (usable.length > 1) {
      ambiguous = true;
      ambiguousIds = usable.map((i: any) => i.id);
      signals.push('external_uid_ambiguous');
    }
  }

  // ── PASS 2 — licence number (95) ──
  if (!matched && !ambiguous && input.license_number) {
    const byLicense = await sr.entities.PersonIdentity
      .filter({ license_number: input.license_number }).catch(() => []);
    const usable = (byLicense || []).filter((i: any) => i && !excludeIds.has(i.id));
    if (usable.length === 1) {
      matched = usable[0];
      confidence = 95;
      signals.push('license_exact:95');
    } else if (usable.length > 1) {
      ambiguous = true;
      ambiguousIds = usable.map((i: any) => i.id);
      signals.push('license_ambiguous');
    }
  }

  // ── PASS 3 — candidate scoring ──
  if (!matched && !ambiguous && normalizedName) {
    const allIdentities = await sr.entities.PersonIdentity
      .filter({ status: 'active' }).catch(() => []);
    const allAliases = await sr.entities.IdentityAlias
      .filter({ active: true }).catch(() => []);

    const aliasMap = new Map<string, any[]>();
    for (const alias of (allAliases || [])) {
      const key = alias.alias_normalized || normalizeIdentityName(alias.alias_name);
      if (!key) continue;
      if (!aliasMap.has(key)) aliasMap.set(key, []);
      (aliasMap.get(key) as any[]).push(alias);
    }

    let bestScore = 0;
    let bestCandidate: any = null;
    let bestSignals: string[] = [];
    let bestCount = 0;
    let tied: string[] = [];

    for (const identity of (allIdentities || [])) {
      if (!identity || identity.status === 'merged') continue;
      if (excludeIds.has(identity.id)) continue;

      let score = 0;
      const candidateSignals: string[] = [];
      let disqualified = false;

      // DOB is a gate: a differing date disqualifies the candidate outright.
      if (input.dob && identity.date_of_birth) {
        if (input.dob !== identity.date_of_birth) continue;
        score += 90;
        candidateSignals.push('dob_exact:90');
      }

      // A differing licence disqualifies a name-based candidate.
      if (input.license_number && identity.license_number && input.license_number !== identity.license_number) {
        continue;
      }

      const identityNorm = normalizeIdentityName(identity.canonical_name);
      if (identityNorm && normalizedName === identityNorm) {
        score += 55;
        candidateSignals.push('canonical_name_match:55');
      }

      if (identity.legal_name) {
        const legalNorm = normalizeIdentityName(identity.legal_name);
        if (legalNorm && normalizedName === legalNorm) {
          score += 85;
          candidateSignals.push('legal_name_exact:85');
        }
      }

      const aliasMatches = aliasMap.get(normalizedName) || [];
      for (const alias of aliasMatches) {
        if (alias.identity_id !== identity.id) continue;
        const w = ALIAS_TYPE_WEIGHTS[alias.alias_type] || 50;
        score += w;
        candidateSignals.push('alias_' + alias.alias_type + ':' + w);
        break;
      }

      if (input.series_name && identity.data_source === input.series_name) {
        score += 15;
        candidateSignals.push('series_history:15');
      }
      if (identity.confidence_level === 'verified') {
        score += 30;
        candidateSignals.push('manual_verified_bonus:30');
      }

      if (disqualified) continue;
      if (score <= 0) continue;

      if (score > bestScore) {
        bestScore = score;
        bestCandidate = identity;
        bestSignals = candidateSignals;
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
      // Trusted signals may push a candidate above the attach threshold; a
      // name-only candidate never does, because the name alone is 55/50/45.
      if (bestCount > 1) {
        ambiguous = true;
        ambiguousIds = tied;
        signals.push(...bestSignals, 'ambiguous_candidates:' + bestCount);
      } else if (capped >= 95) {
        matched = bestCandidate;
        confidence = capped;
        signals.push(...bestSignals);
      } else {
        matched = bestCandidate;
        confidence = capped;
        signals.push(...bestSignals);
      }
    }
  }

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
    return {
      action: 'BLOCKED',
      identity_id: null,
      identity: null,
      confidence: 0,
      confidence_level: 'unverified',
      signals,
      reason: blockedReason,
      candidate_count: candidateCount,
      tied_candidate_ids: [],
    };
  }

  if (ambiguous) {
    return {
      action: 'REVIEW',
      identity_id: null,
      identity: null,
      confidence: 0,
      confidence_level: 'unverified',
      signals,
      reason: 'ambiguous_candidates',
      candidate_count: ambiguousIds.length,
      tied_candidate_ids: ambiguousIds,
    };
  }

  if (matched && confidence >= 95 && hasTrustedEvidence(signals)) {
    return {
      action: 'ATTACHED',
      identity_id: matched.id,
      identity: matched,
      confidence,
      confidence_level: confidenceLevelFromScore(confidence),
      signals,
      reason: 'trusted_match',
      candidate_count: candidateCount,
      tied_candidate_ids: [],
    };
  }

  if (matched) {
    // A candidate exists but nothing trusted confirms it. Never attach,
    // never create a duplicate — a human decides.
    return {
      action: 'REVIEW',
      identity_id: matched.id,
      identity: matched,
      confidence,
      confidence_level: confidenceLevelFromScore(confidence),
      signals,
      reason: confidence >= 85 ? 'strong_match_needs_confirmation' : 'name_only_match_needs_review',
      candidate_count: candidateCount,
      tied_candidate_ids: [],
    };
  }

  return emptyResult('no_candidate_found', signals);
}

/** True only for a match that may be written without human review. */
export function isAutoAttachable(result: IdentityMatchResult): boolean {
  return result.action === 'ATTACHED' && result.confidence >= 95 && hasTrustedEvidence(result.signals);
}