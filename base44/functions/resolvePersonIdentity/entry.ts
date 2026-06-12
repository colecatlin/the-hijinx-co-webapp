/**
 * resolvePersonIdentity.js
 *
 * Core identity resolution engine for the RaceCore Identity Authority layer.
 *
 * Resolves an incoming raw driver name + contextual signals to a PersonIdentity
 * using a layered matching strategy with confidence scoring.
 *
 * Input:
 *   raw_driver_name, raw_dob, raw_license_number, raw_external_uid,
 *   raw_car_number, raw_team_name, raw_series_name, raw_season,
 *   source_type, source_name, source_record_id, import_run_id
 *
 * Output:
 *   { action, identity_id, review_queue_id, confidence_score,
 *     confidence_level, signals, reason, evidence_id }
 *
 * Actions: ATTACHED | REVIEW | NEW_IDENTITY | BLOCKED
 *
 * Signal weights:
 *   external_uid_exact    = 100
 *   license_exact         = 95
 *   dob_exact             = 90
 *   legal_name_exact      = 85
 *   alias_legal           = 85
 *   alias_abbreviation    = 75
 *   alias_informal        = 70
 *   alias_nickname        = 60
 *   surname_first_match   = 55
 *   team_history          = 25
 *   number_history        = 20
 *   series_history        = 15
 *   manual_verified_bonus = +30
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ── Normalization (inlined — no local imports) ──────────────────────────────

function stripQuotedNicknames(name) {
  if (!name) return name;
  return name.replace(/"[^"]*"/g, '').replace(/'[^']*'/g, '').replace(/\s+/g, ' ').trim();
}

function detectSurnameFirst(name) {
  if (!name) return false;
  return /^[^,]+,\s*.+$/.test(name.trim());
}

function invertSurnameFirst(name) {
  const parts = name.split(',');
  if (parts.length < 2) return name;
  const surname = parts[0].trim();
  const given   = parts.slice(1).join(',').trim();
  return `${given} ${surname}`;
}

function normalizeIdentityName(name) {
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

// ── Confidence level from score ─────────────────────────────────────────────
function confidenceLevelFromScore(score) {
  if (score >= 95) return 'verified';
  if (score >= 80) return 'high';
  if (score >= 60) return 'medium';
  if (score >= 40) return 'low';
  return 'unverified';
}

// ── Generate merge ID ───────────────────────────────────────────────────────
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ── Main handler ────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const {
      raw_driver_name,
      raw_dob,
      raw_license_number,
      raw_external_uid,
      raw_car_number,
      raw_team_name,
      raw_series_name,
      raw_season,
      source_type = 'manual_entry',
      source_name = 'Unknown source',
      source_record_id,
      import_run_id,
    } = body;

    if (!raw_driver_name) {
      return Response.json({ error: 'raw_driver_name is required' }, { status: 400 });
    }

    const normalizedName = normalizeIdentityName(raw_driver_name);
    const signals = [];
    let matchedIdentity = null;
    let action = 'NEW_IDENTITY';
    let confidence = 0;
    let blockReason = null;

    // ────────────────────────────────────────────────────────────────────────
    // PASS 1 — external_uid exact match (score 100, bypasses all fuzzy logic)
    // ────────────────────────────────────────────────────────────────────────
    if (raw_external_uid) {
      const byUid = await base44.asServiceRole.entities.PersonIdentity
        .filter({ external_uid: raw_external_uid }).catch(() => []);
      if (byUid.length > 0) {
        matchedIdentity = byUid[0];
        confidence = 100;
        signals.push('external_uid_exact:100');
        action = 'ATTACHED';
      }
    }

    // ────────────────────────────────────────────────────────────────────────
    // PASS 2 — license_number exact match (score 95)
    // ────────────────────────────────────────────────────────────────────────
    if (!matchedIdentity && raw_license_number) {
      const byLicense = await base44.asServiceRole.entities.PersonIdentity
        .filter({ license_number: raw_license_number }).catch(() => []);
      if (byLicense.length > 0) {
        const candidate = byLicense[0];
        // Hard gate: license matches but name conflicts — flag for review
        confidence = 95;
        signals.push('license_exact:95');
        matchedIdentity = candidate;
        action = 'ATTACHED';
      }
    }

    // ────────────────────────────────────────────────────────────────────────
    // PASS 3-6 — Fuzzy name-based matching (only if no strong match yet)
    // ────────────────────────────────────────────────────────────────────────
    if (!matchedIdentity && normalizedName) {
      let bestScore = 0;
      let bestCandidate = null;

      // Load all active identities for matching (bounded — see scalability note)
      const allIdentities = await base44.asServiceRole.entities.PersonIdentity
        .filter({ status: 'active' }).catch(() => []);

      // Load all active aliases for matching
      const allAliases = await base44.asServiceRole.entities.IdentityAlias
        .filter({ active: true }).catch(() => []);

      // Build alias map: normalized → { identity_id, alias_type, confidence }
      const aliasMap = new Map();
      for (const alias of allAliases) {
        const key = alias.alias_normalized || normalizeIdentityName(alias.alias_name);
        if (!key) continue;
        if (!aliasMap.has(key)) aliasMap.set(key, []);
        aliasMap.get(key).push(alias);
      }

      for (const identity of allIdentities) {
        if (identity.status === 'merged') continue;

        let score = 0;
        const candidateSignals = [];

        // ── DOB hard gate pre-check ──
        if (raw_dob && identity.date_of_birth) {
          if (raw_dob !== identity.date_of_birth) {
            // Hard gate: DOB conflict — block immediately for this candidate
            continue;
          } else {
            score += 90;
            candidateSignals.push('dob_exact:90');
          }
        }

        // ── canonical_name normalized match ──
        const identityNorm = normalizeIdentityName(identity.canonical_name);
        if (identityNorm && normalizedName === identityNorm) {
          score += 55;
          candidateSignals.push('canonical_name_match:55');
        }

        // ── legal_name match ──
        if (identity.legal_name) {
          const legalNorm = normalizeIdentityName(identity.legal_name);
          if (legalNorm && normalizedName === legalNorm) {
            score += 85;
            candidateSignals.push('legal_name_exact:85');
          }
        }

        // ── alias match ──
        const aliasMatches = aliasMap.get(normalizedName) || [];
        for (const alias of aliasMatches) {
          if (alias.identity_id !== identity.id) continue;
          const typeWeights = {
            legal: 85, abbreviation: 75, informal: 70,
            nickname: 60, surname_first: 55, source_variant: 50,
            manual: 50, maiden_name: 45, married_name: 45,
          };
          const w = typeWeights[alias.alias_type] || 50;
          score += w;
          candidateSignals.push(`alias_${alias.alias_type}:${w}`);
          break; // only count best alias match per identity
        }

        // ── contextual signals (weaker) ──
        if (raw_series_name && identity.data_source === raw_series_name) {
          score += 15;
          candidateSignals.push('series_history:15');
        }
        if (identity.confidence_level === 'verified') {
          score += 30;
          candidateSignals.push('manual_verified_bonus:30');
        }

        if (score > bestScore) {
          bestScore = score;
          bestCandidate = { identity, signals: candidateSignals };
        }
      }

      if (bestCandidate && bestScore > 0) {
        confidence = Math.min(bestScore, 100);
        signals.push(...bestCandidate.signals);
        matchedIdentity = bestCandidate.identity;

        if (confidence >= 95) {
          action = 'ATTACHED';
        } else if (confidence >= 80) {
          action = 'REVIEW';
        } else if (confidence >= 60) {
          action = 'NEW_IDENTITY'; // weak candidate — new identity + flag
        } else {
          action = 'NEW_IDENTITY';
        }
      }
    }

    // ────────────────────────────────────────────────────────────────────────
    // DOB CONFLICT HARD GATE (for matched identities via name path)
    // ────────────────────────────────────────────────────────────────────────
    if (matchedIdentity && raw_dob && matchedIdentity.date_of_birth) {
      if (raw_dob !== matchedIdentity.date_of_birth) {
        blockReason = 'DOB_CONFLICT';
        action = 'BLOCKED';
        confidence = 0;
        signals.push('HARD_GATE:DOB_CONFLICT');
      }
    }

    // LICENSE CONFLICT HARD GATE
    if (matchedIdentity && raw_license_number && matchedIdentity.license_number) {
      if (raw_license_number !== matchedIdentity.license_number && action !== 'ATTACHED') {
        blockReason = 'LICENSE_CONFLICT';
        action = 'BLOCKED';
        confidence = 0;
        signals.push('HARD_GATE:LICENSE_CONFLICT');
      }
    }

    const now = new Date().toISOString();

    // ────────────────────────────────────────────────────────────────────────
    // ACTION — CREATE EVIDENCE (always)
    // ────────────────────────────────────────────────────────────────────────
    const evidenceStatus = action === 'ATTACHED' ? 'attached' :
                           action === 'NEW_IDENTITY' ? 'attached' : 'unresolved';

    const evidenceRecord = await base44.asServiceRole.entities.IdentityEvidence.create({
      identity_id:      matchedIdentity?.id || null,
      status:           evidenceStatus,
      source_type,
      source_name,
      source_record_id: source_record_id || null,
      import_run_id:    import_run_id || null,
      raw_driver_name,
      raw_car_number:     raw_car_number || null,
      raw_team_name:      raw_team_name || null,
      raw_series_name:    raw_series_name || null,
      raw_season:         raw_season || null,
      raw_dob:            raw_dob || null,
      raw_license_number: raw_license_number || null,
      raw_external_uid:   raw_external_uid || null,
      confidence_signals: signals,
      confidence_weight:  confidence,
      verified:           action === 'ATTACHED' && confidence >= 95,
    }).catch(e => ({ id: null, _error: e.message }));

    // ────────────────────────────────────────────────────────────────────────
    // ACTION — BLOCKED
    // ────────────────────────────────────────────────────────────────────────
    if (action === 'BLOCKED') {
      // Create review queue item for conflict resolution
      const queueItem = await base44.asServiceRole.entities.IdentityReviewQueue.create({
        status: 'pending',
        priority: 'critical',
        candidate_a_identity_id: matchedIdentity?.id,
        candidate_a_name: matchedIdentity?.canonical_name,
        candidate_a_confidence: confidence,
        evidence_id: evidenceRecord.id,
        confidence_score: 0,
        confidence_signals: signals,
        conflict_type: blockReason === 'DOB_CONFLICT' ? 'dob_conflict' : 'license_conflict',
        import_run_id: import_run_id || null,
        series_context: raw_series_name || null,
        season_context: raw_season || null,
      }).catch(() => ({ id: null }));

      if (evidenceRecord.id) {
        await base44.asServiceRole.entities.IdentityEvidence.update(evidenceRecord.id, {
          review_queue_id: queueItem.id,
        }).catch(() => {});
      }

      return Response.json({
        action: 'BLOCKED',
        identity_id: null,
        review_queue_id: queueItem.id,
        evidence_id: evidenceRecord.id,
        confidence_score: 0,
        confidence_level: 'unverified',
        signals,
        reason: blockReason,
      });
    }

    // ────────────────────────────────────────────────────────────────────────
    // ACTION — REVIEW (80-94 confidence)
    // ────────────────────────────────────────────────────────────────────────
    if (action === 'REVIEW') {
      const queueItem = await base44.asServiceRole.entities.IdentityReviewQueue.create({
        status: 'pending',
        priority: 'normal',
        candidate_a_identity_id: matchedIdentity?.id,
        candidate_a_name: matchedIdentity?.canonical_name,
        candidate_a_confidence: confidence,
        evidence_id: evidenceRecord.id,
        confidence_score: confidence,
        confidence_signals: signals,
        conflict_type: 'none',
        import_run_id: import_run_id || null,
        series_context: raw_series_name || null,
        season_context: raw_season || null,
      }).catch(() => ({ id: null }));

      if (evidenceRecord.id) {
        await base44.asServiceRole.entities.IdentityEvidence.update(evidenceRecord.id, {
          review_queue_id: queueItem.id,
        }).catch(() => {});
      }

      return Response.json({
        action: 'REVIEW',
        identity_id: matchedIdentity?.id || null,
        review_queue_id: queueItem.id,
        evidence_id: evidenceRecord.id,
        confidence_score: confidence,
        confidence_level: confidenceLevelFromScore(confidence),
        signals,
        reason: 'score_below_threshold',
      });
    }

    // ────────────────────────────────────────────────────────────────────────
    // ACTION — NEW_IDENTITY
    // ────────────────────────────────────────────────────────────────────────
    if (action === 'NEW_IDENTITY') {
      const isSurnameFirst = detectSurnameFirst(raw_driver_name);

      const newIdentity = await base44.asServiceRole.entities.PersonIdentity.create({
        status: 'active',
        confidence_level: confidenceLevelFromScore(confidence),
        confidence_score: confidence,
        canonical_name: isSurnameFirst ? invertSurnameFirstPublic(raw_driver_name) : raw_driver_name,
        date_of_birth: raw_dob || null,
        license_number: raw_license_number || null,
        external_uid: raw_external_uid || null,
        data_source: source_name,
      });

      // Primary alias (canonical name)
      await base44.asServiceRole.entities.IdentityAlias.create({
        identity_id: newIdentity.id,
        alias_name: raw_driver_name,
        alias_normalized: normalizedName,
        alias_type: 'source_variant',
        confidence: confidence,
        source: source_name,
        source_type: 'import',
        is_primary: true,
        active: true,
      }).catch(() => {});

      // If surname-first, also store the inverted form as an alias
      if (isSurnameFirst) {
        const inverted = raw_driver_name.split(',').reverse().map(s => s.trim()).join(' ');
        await base44.asServiceRole.entities.IdentityAlias.create({
          identity_id: newIdentity.id,
          alias_name: inverted,
          alias_normalized: normalizeIdentityName(inverted),
          alias_type: 'surname_first',
          confidence: 55,
          source: source_name,
          source_type: 'inferred',
          is_primary: false,
          active: true,
        }).catch(() => {});
      }

      // Attach evidence
      if (evidenceRecord.id) {
        await base44.asServiceRole.entities.IdentityEvidence.update(evidenceRecord.id, {
          identity_id: newIdentity.id,
          status: 'attached',
        }).catch(() => {});
      }

      // AuditLog
      await base44.asServiceRole.entities.AuditLog.create({
        entity_type: 'PersonIdentity',
        entity_id: newIdentity.id,
        entity_name: newIdentity.canonical_name,
        action: 'created',
        after_data: { confidence_score: confidence, source_name, raw_driver_name },
        performed_by: user.id,
        performed_by_name: user.full_name,
        timestamp: now,
        notes: `Identity created via resolvePersonIdentity from ${source_name}`,
      }).catch(() => {});

      return Response.json({
        action: 'NEW_IDENTITY',
        identity_id: newIdentity.id,
        review_queue_id: null,
        evidence_id: evidenceRecord.id,
        confidence_score: confidence,
        confidence_level: confidenceLevelFromScore(confidence),
        signals,
        reason: 'no_match_found',
      });
    }

    // ────────────────────────────────────────────────────────────────────────
    // ACTION — ATTACHED
    // ────────────────────────────────────────────────────────────────────────
    // Ensure the name variant is stored as an alias if not already present
    const existingAliasCheck = await base44.asServiceRole.entities.IdentityAlias
      .filter({ identity_id: matchedIdentity.id, alias_normalized: normalizedName })
      .catch(() => []);

    if (!existingAliasCheck.length && normalizedName) {
      await base44.asServiceRole.entities.IdentityAlias.create({
        identity_id: matchedIdentity.id,
        alias_name: raw_driver_name,
        alias_normalized: normalizedName,
        alias_type: 'source_variant',
        confidence,
        source: source_name,
        source_type: 'import',
        is_primary: false,
        active: true,
      }).catch(() => {});
    }

    // Update identity confidence if this match is stronger
    if (confidence > (matchedIdentity.confidence_score || 0)) {
      await base44.asServiceRole.entities.PersonIdentity.update(matchedIdentity.id, {
        confidence_score: confidence,
        confidence_level: confidenceLevelFromScore(confidence),
      }).catch(() => {});
    }

    // Attach evidence
    if (evidenceRecord.id) {
      await base44.asServiceRole.entities.IdentityEvidence.update(evidenceRecord.id, {
        identity_id: matchedIdentity.id,
        status: 'attached',
        verified: confidence >= 95,
      }).catch(() => {});
    }

    // AuditLog
    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'PersonIdentity',
      entity_id: matchedIdentity.id,
      entity_name: matchedIdentity.canonical_name,
      action: 'updated',
      after_data: { confidence_score: confidence, source_name, raw_driver_name, signals },
      performed_by: user.id,
      performed_by_name: user.full_name,
      timestamp: now,
      notes: `Evidence attached from ${source_name} — score ${confidence}`,
    }).catch(() => {});

    return Response.json({
      action: 'ATTACHED',
      identity_id: matchedIdentity.id,
      review_queue_id: null,
      evidence_id: evidenceRecord.id,
      confidence_score: confidence,
      confidence_level: confidenceLevelFromScore(confidence),
      signals,
      reason: 'matched',
    });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});

// Helper for public display inversion (not exported — local use only)
function invertSurnameFirstPublic(name) {
  const parts = name.split(',');
  if (parts.length < 2) return name;
  return `${parts.slice(1).join(',').trim()} ${parts[0].trim()}`;
}