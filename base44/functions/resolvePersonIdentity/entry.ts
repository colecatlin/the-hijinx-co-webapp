/**
 * resolvePersonIdentity — HTTP handler.
 *
 * Identity resolution entry point. All matching now runs through the single
 * shared engine (base44/shared/personIdentityMatcher.ts) so this path, the
 * dry-run matcher, the import-row probe and the result auto-matcher can never
 * disagree about who is who.
 *
 * Trusted priority: external UID → licence → DOB → verified relationships →
 * canonical / alias name → contextual evidence. DOB and licence conflicts are
 * hard gates. A name-only match is never attached — it returns REVIEW.
 *
 * Input:  raw_driver_name (required), raw_dob, raw_license_number,
 *         raw_external_uid, raw_car_number, raw_team_name, raw_series_name,
 *         raw_season, source_type, source_name, source_record_id, import_run_id
 * Output: { action, identity_id, review_queue_id, evidence_id,
 *           confidence_score, confidence_level, signals, reason }
 *
 * Actions: ATTACHED | REVIEW | NEW_IDENTITY | BLOCKED — admin only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  matchPersonIdentity,
  normalizeIdentityName,
  detectSurnameFirst,
  invertSurnameFirst,
  confidenceLevelFromScore,
} from '../../shared/personIdentityMatcher.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: admin only' }, { status: 403 });

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

    const sr = base44.asServiceRole;
    const normalizedName = normalizeIdentityName(raw_driver_name);

    const match = await matchPersonIdentity(sr, {
      name: raw_driver_name,
      dob: raw_dob || null,
      license_number: raw_license_number || null,
      external_uid: raw_external_uid || null,
      series_name: raw_series_name || null,
    });

    const signals = match.signals;
    const confidence = match.confidence;
    const action = match.action;
    const matchedIdentity = match.identity;
    const now = new Date().toISOString();

    // ── Evidence is always recorded ─────────────────────────────────────────
    const evidenceStatus = action === 'ATTACHED' ? 'attached'
      : action === 'NEW_IDENTITY' ? 'attached' : 'unresolved';

    const evidenceRecord = await sr.entities.IdentityEvidence.create({
      identity_id: matchedIdentity?.id || null,
      status: evidenceStatus,
      source_type,
      source_name,
      source_record_id: source_record_id || null,
      import_run_id: import_run_id || null,
      raw_driver_name,
      raw_car_number: raw_car_number || null,
      raw_team_name: raw_team_name || null,
      raw_series_name: raw_series_name || null,
      raw_season: raw_season || null,
      raw_dob: raw_dob || null,
      raw_license_number: raw_license_number || null,
      raw_external_uid: raw_external_uid || null,
      confidence_signals: signals,
      confidence_weight: confidence,
      verified: action === 'ATTACHED' && confidence >= 95,
    }).catch(() => ({ id: null }));

    // ── BLOCKED — a trusted signal contradicts the record ───────────────────
    if (action === 'BLOCKED') {
      const queueItem = await sr.entities.IdentityReviewQueue.create({
        status: 'pending',
        priority: 'critical',
        candidate_a_identity_id: null,
        candidate_a_name: null,
        candidate_a_confidence: 0,
        evidence_id: evidenceRecord.id,
        confidence_score: 0,
        confidence_signals: signals,
        conflict_type: match.reason === 'DOB_CONFLICT' ? 'dob_conflict' : 'license_conflict',
        import_run_id: import_run_id || null,
        series_context: raw_series_name || null,
        season_context: raw_season || null,
      }).catch(() => ({ id: null }));

      if (evidenceRecord.id) {
        await sr.entities.IdentityEvidence.update(evidenceRecord.id, { review_queue_id: queueItem.id }).catch(() => null);
      }

      return Response.json({
        action: 'BLOCKED',
        identity_id: null,
        review_queue_id: queueItem.id,
        evidence_id: evidenceRecord.id,
        confidence_score: 0,
        confidence_level: 'unverified',
        signals,
        reason: match.reason,
      });
    }

    // ── REVIEW — a human decides; nothing is attached and nothing is created ─
    if (action === 'REVIEW') {
      const queueItem = await sr.entities.IdentityReviewQueue.create({
        status: 'pending',
        priority: 'normal',
        candidate_a_identity_id: matchedIdentity?.id || null,
        candidate_a_name: matchedIdentity?.canonical_name || null,
        candidate_a_confidence: confidence,
        evidence_id: evidenceRecord.id,
        confidence_score: confidence,
        confidence_signals: signals,
        conflict_type: 'name_only_match',
        import_run_id: import_run_id || null,
        series_context: raw_series_name || null,
        season_context: raw_season || null,
      }).catch(() => ({ id: null }));

      if (evidenceRecord.id) {
        await sr.entities.IdentityEvidence.update(evidenceRecord.id, { review_queue_id: queueItem.id }).catch(() => null);
      }

      return Response.json({
        action: 'REVIEW',
        identity_id: matchedIdentity?.id || null,
        review_queue_id: queueItem.id,
        evidence_id: evidenceRecord.id,
        confidence_score: confidence,
        confidence_level: confidenceLevelFromScore(confidence),
        signals,
        reason: match.reason,
      });
    }

    // ── NEW_IDENTITY — only when there was no candidate at all ─────────────
    if (action === 'NEW_IDENTITY') {
      const isSurnameFirst = detectSurnameFirst(raw_driver_name);

      const newIdentity = await sr.entities.PersonIdentity.create({
        status: 'active',
        confidence_level: confidenceLevelFromScore(confidence),
        confidence_score: confidence,
        canonical_name: isSurnameFirst ? invertSurnameFirst(raw_driver_name) : raw_driver_name,
        date_of_birth: raw_dob || null,
        license_number: raw_license_number || null,
        external_uid: raw_external_uid || null,
        data_source: source_name,
      });

      await sr.entities.IdentityAlias.create({
        identity_id: newIdentity.id,
        alias_name: raw_driver_name,
        alias_normalized: normalizedName,
        alias_type: 'source_variant',
        confidence,
        source: source_name,
        source_type: 'import',
        is_primary: true,
        active: true,
      }).catch(() => null);

      if (isSurnameFirst) {
        const inverted = invertSurnameFirst(raw_driver_name);
        await sr.entities.IdentityAlias.create({
          identity_id: newIdentity.id,
          alias_name: inverted,
          alias_normalized: normalizeIdentityName(inverted),
          alias_type: 'surname_first',
          confidence: 55,
          source: source_name,
          source_type: 'inferred',
          is_primary: false,
          active: true,
        }).catch(() => null);
      }

      if (evidenceRecord.id) {
        await sr.entities.IdentityEvidence.update(evidenceRecord.id, {
          identity_id: newIdentity.id,
          status: 'attached',
        }).catch(() => null);
      }

      await sr.entities.AuditLog.create({
        entity_type: 'PersonIdentity',
        entity_id: newIdentity.id,
        entity_name: newIdentity.canonical_name,
        action: 'created',
        after_data: { confidence_score: confidence, source_name, raw_driver_name },
        performed_by: user.id,
        performed_by_name: user.full_name,
        timestamp: now,
        notes: 'Identity created via resolvePersonIdentity from ' + source_name,
      }).catch(() => null);

      return Response.json({
        action: 'NEW_IDENTITY',
        identity_id: newIdentity.id,
        review_queue_id: null,
        evidence_id: evidenceRecord.id,
        confidence_score: confidence,
        confidence_level: confidenceLevelFromScore(confidence),
        signals,
        reason: match.reason,
      });
    }

    // ── ATTACHED — a trusted signal confirmed the match ────────────────────
    const existingAlias = await sr.entities.IdentityAlias
      .filter({ identity_id: matchedIdentity.id, alias_normalized: normalizedName }).catch(() => []);

    if (!(existingAlias || []).length && normalizedName) {
      await sr.entities.IdentityAlias.create({
        identity_id: matchedIdentity.id,
        alias_name: raw_driver_name,
        alias_normalized: normalizedName,
        alias_type: 'source_variant',
        confidence,
        source: source_name,
        source_type: 'import',
        is_primary: false,
        active: true,
      }).catch(() => null);
    }

    if (confidence > (matchedIdentity.confidence_score || 0)) {
      await sr.entities.PersonIdentity.update(matchedIdentity.id, {
        confidence_score: confidence,
        confidence_level: confidenceLevelFromScore(confidence),
      }).catch(() => null);
    }

    if (evidenceRecord.id) {
      await sr.entities.IdentityEvidence.update(evidenceRecord.id, {
        identity_id: matchedIdentity.id,
        status: 'attached',
        verified: confidence >= 95,
      }).catch(() => null);
    }

    await sr.entities.AuditLog.create({
      entity_type: 'PersonIdentity',
      entity_id: matchedIdentity.id,
      entity_name: matchedIdentity.canonical_name,
      action: 'updated',
      after_data: { confidence_score: confidence, source_name, raw_driver_name, signals },
      performed_by: user.id,
      performed_by_name: user.full_name,
      timestamp: now,
      notes: 'Evidence attached from ' + source_name + ' — score ' + confidence,
    }).catch(() => null);

    return Response.json({
      action: 'ATTACHED',
      identity_id: matchedIdentity.id,
      review_queue_id: null,
      evidence_id: evidenceRecord.id,
      confidence_score: confidence,
      confidence_level: confidenceLevelFromScore(confidence),
      signals,
      reason: match.reason,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}