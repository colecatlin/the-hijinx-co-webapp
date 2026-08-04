/**
 * importDriversBulk — Phase 3 Identity-First bulk driver import.
 *
 * Connects the existing bulk driver CSV import to the approved
 * person-centered identity architecture:
 *
 *   PersonIdentity → RacerProfile → SeasonParticipation → Driver (legacy)
 *
 * Input:
 *   {
 *     season_year: "2026",
 *     rows: [
 *       { first_name, last_name, number, series, class }
 *     ],
 *     dry_run: true
 *   }
 *
 * Rules:
 *   - season_year is required (import-level, not per-row)
 *   - racer_type is always "Driver"
 *   - Does NOT create Entry, Results, Standings, Team, Vehicle, etc.
 *   - Does NOT create Series or Class records
 *   - Dry-run performs read-only matching only
 *   - Commit creates/updates records through existing resolver functions
 *
 * Admin only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { ensureRaceCoreId } from '../../shared/racecoreId.ts';

// ── Normalization helpers ────────────────────────────────────────────────────

function normalizeSeasonYear(raw) {
  if (!raw) return null;
  const str = String(raw).trim();
  if (!str) return null;
  if (!/^\d{4}$/.test(str)) return null;
  return str;
}

function trimName(value) {
  if (!value) return '';
  return String(value).trim();
}

function normalizeNumber(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function normalizeForMatch(value) {
  if (!value) return '';
  return value.trim().toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeClassName(name) {
  if (!name) return '';
  let n = name.trim().toLowerCase();
  n = n.replace(/([a-z])(\d)/g, '$1 $2');
  n = n.replace(/(\d)([a-z])/g, '$1 $2');
  n = n.replace(/[-_]/g, ' ');
  n = n.replace(/\s+/g, ' ').trim();
  return n;
}

// ── Identity name normalization (mirrors resolvePersonIdentity) ───────────────

function normalizeIdentityName(name) {
  if (!name || typeof name !== 'string') return null;
  let n = name.trim();
  if (!n) return null;
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

function confidenceLevelFromScore(score) {
  if (score >= 95) return 'verified';
  if (score >= 80) return 'high';
  if (score >= 60) return 'medium';
  if (score >= 40) return 'low';
  return 'unverified';
}

// ── Read-only identity matching (for dry-run) ────────────────────────────────
// Mirrors resolvePersonIdentity matching logic without writing.

async function readOnlyIdentityMatch(sr, rawDriverName, rawSeriesName) {
  const normalizedName = normalizeIdentityName(rawDriverName);
  if (!normalizedName) {
    return { action: 'NEW_IDENTITY', identity_id: null, confidence: 0, signals: [] };
  }

  let bestScore = 0;
  let bestCandidate = null;
  const signals = [];

  const allIdentities = await sr.entities.PersonIdentity
    .filter({ status: 'active' }).catch(() => []);

  const allAliases = await sr.entities.IdentityAlias
    .filter({ active: true }).catch(() => []);

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
      const typeWeights = {
        legal: 85, abbreviation: 75, informal: 70,
        nickname: 60, surname_first: 55, source_variant: 50,
        manual: 50, maiden_name: 45, married_name: 45,
      };
      const w = typeWeights[alias.alias_type] || 50;
      score += w;
      candidateSignals.push('alias_' + alias.alias_type + ':' + w);
      break;
    }

    if (rawSeriesName && identity.data_source === rawSeriesName) {
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
    const confidence = Math.min(bestScore, 100);
    signals.push(...bestCandidate.signals);

    let action;
    if (confidence >= 95) action = 'ATTACHED';
    else if (confidence >= 80) action = 'REVIEW';
    else action = 'NEW_IDENTITY';

    return {
      action,
      identity_id: bestCandidate.identity.id,
      confidence,
      confidence_level: confidenceLevelFromScore(confidence),
      signals,
    };
  }

  return {
    action: 'NEW_IDENTITY',
    identity_id: null,
    confidence: 0,
    confidence_level: 'unverified',
    signals,
  };
}

// ── Series resolution ────────────────────────────────────────────────────────

async function resolveSeries(sr, seriesValue) {
  if (!seriesValue) return { status: 'blocked', error: 'series_not_found', matches: [] };

  const trimmed = seriesValue.trim();

  // 1. Exact internal ID
  try {
    const byId = await sr.entities.Series.get(trimmed);
    if (byId) return { status: 'ok', series: byId, match_method: 'internal_id' };
  } catch (e) { /* not found */ }

  // 2. Exact case-insensitive name
  let byName = await sr.entities.Series.filter({}).catch(() => []);
  const nameMatches = byName.filter(s =>
    s.name && s.name.toLowerCase() === trimmed.toLowerCase()
  );

  if (nameMatches.length === 1) return { status: 'ok', series: nameMatches[0], match_method: 'name' };
  if (nameMatches.length > 1) {
    return {
      status: 'review',
      error: 'series_ambiguous',
      matches: nameMatches.map(s => ({ id: s.id, name: s.name })),
    };
  }

  // 3. EntityAlias for Series
  const seriesAliases = await sr.entities.EntityAlias
    .filter({ entity_type: 'Series', active: true }).catch(() => []);
  const aliasNormalized = normalizeForMatch(trimmed);
  const aliasMatches = seriesAliases.filter(a =>
    a.alias_normalized === aliasNormalized
  );

  if (aliasMatches.length === 1) {
    const seriesId = aliasMatches[0].entity_id;
    try {
      const series = await sr.entities.Series.get(seriesId);
      if (series) return { status: 'ok', series, match_method: 'alias' };
    } catch (e) { /* not found */ }
  }
  if (aliasMatches.length > 1) {
    // Resolve each alias to its series
    const seriesIds = [...new Set(aliasMatches.map(a => a.entity_id))];
    if (seriesIds.length === 1) {
      try {
        const series = await sr.entities.Series.get(seriesIds[0]);
        if (series) return { status: 'ok', series, match_method: 'alias' };
      } catch (e) { /* not found */ }
    }
    return {
      status: 'review',
      error: 'series_ambiguous',
      matches: aliasMatches.map(a => ({ id: a.entity_id, name: a.alias_name })),
    };
  }

  // 4. Normalized name
  const normalizedTarget = normalizeForMatch(trimmed);
  const normalizedMatches = byName.filter(s =>
    s.name && normalizeForMatch(s.name) === normalizedTarget
  );

  if (normalizedMatches.length === 1) return { status: 'ok', series: normalizedMatches[0], match_method: 'normalized_name' };
  if (normalizedMatches.length > 1) {
    return {
      status: 'review',
      error: 'series_ambiguous',
      matches: normalizedMatches.map(s => ({ id: s.id, name: s.name })),
    };
  }

  return { status: 'blocked', error: 'series_not_found', matches: [] };
}

// ── Class resolution ─────────────────────────────────────────────────────────

async function resolveClass(sr, seriesId, classValue) {
  if (!classValue) return { status: 'blocked', error: 'class_not_found', matches: [] };

  const trimmed = classValue.trim();

  // Load all classes for this series
  const seriesClasses = await sr.entities.SeriesClass
    .filter({ series_id: seriesId }).catch(() => []);

  // 1. Exact internal ID
  try {
    const byId = await sr.entities.SeriesClass.get(trimmed);
    if (byId && byId.series_id === seriesId) {
      return { status: 'ok', classRecord: byId, match_method: 'internal_id' };
    }
  } catch (e) { /* not found */ }

  // 2. Exact case-insensitive class_name
  const nameMatches = seriesClasses.filter(c =>
    c.class_name && c.class_name.toLowerCase() === trimmed.toLowerCase()
  );

  if (nameMatches.length === 1) return { status: 'ok', classRecord: nameMatches[0], match_method: 'class_name' };
  if (nameMatches.length > 1) {
    return {
      status: 'review',
      error: 'class_ambiguous',
      matches: nameMatches.map(c => ({ id: c.id, name: c.class_name })),
    };
  }

  // 3. EntityAlias for SeriesClass
  const classAliases = await sr.entities.EntityAlias
    .filter({ entity_type: 'SeriesClass', active: true }).catch(() => []);
  const aliasNormalized = normalizeForMatch(trimmed);
  const aliasMatches = classAliases.filter(a =>
    a.alias_normalized === aliasNormalized
  );

  // Filter aliases to those belonging to classes in this series
  const seriesClassIds = new Set(seriesClasses.map(c => c.id));
  const validAliasMatches = aliasMatches.filter(a => seriesClassIds.has(a.entity_id));

  if (validAliasMatches.length === 1) {
    const classId = validAliasMatches[0].entity_id;
    const classRecord = seriesClasses.find(c => c.id === classId);
    if (classRecord) return { status: 'ok', classRecord, match_method: 'alias' };
  }
  if (validAliasMatches.length > 1) {
    return {
      status: 'review',
      error: 'class_ambiguous',
      matches: validAliasMatches.map(a => ({ id: a.entity_id, name: a.alias_name })),
    };
  }

  // 4. Normalized class name
  const normalizedTarget = normalizeClassName(trimmed);
  const normalizedMatches = seriesClasses.filter(c =>
    c.class_name && normalizeClassName(c.class_name) === normalizedTarget
  );

  if (normalizedMatches.length === 1) return { status: 'ok', classRecord: normalizedMatches[0], match_method: 'normalized_name' };
  if (normalizedMatches.length > 1) {
    return {
      status: 'review',
      error: 'class_ambiguous',
      matches: normalizedMatches.map(c => ({ id: c.id, name: c.class_name })),
    };
  }

  return { status: 'blocked', error: 'class_not_found', matches: [] };
}

// ── Legacy Driver compatibility ──────────────────────────────────────────────

async function findCompatibleDrivers(sr, racerProfile, identity) {
  const driverIds = new Set();

  // 1. RacerProfile.legacy_driver_id
  if (racerProfile.legacy_driver_id) driverIds.add(racerProfile.legacy_driver_id);

  // 2. PersonIdentity.canonical_driver_id
  if (identity.canonical_driver_id) driverIds.add(identity.canonical_driver_id);

  // 3. PersonIdentity.merged_driver_ids
  if (identity.merged_driver_ids && Array.isArray(identity.merged_driver_ids)) {
    for (const did of identity.merged_driver_ids) {
      if (did) driverIds.add(did);
    }
  }

  // Load and validate each driver
  const drivers = [];
  for (const did of driverIds) {
    try {
      const driver = await sr.entities.Driver.get(did);
      if (driver) drivers.push(driver);
    } catch (e) { /* not found */ }
  }

  return drivers;
}

// ── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { season_year, rows, dry_run = true } = body;

    // ── Validate season_year ──────────────────────────────────────────
    const normalizedSeasonYear = normalizeSeasonYear(season_year);
    if (!normalizedSeasonYear) {
      return Response.json({
        success: false,
        error: 'season_year is required and must normalize to exactly four digits. Received: ' + (season_year || 'null'),
      }, { status: 400 });
    }

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return Response.json({
        success: false,
        error: 'rows is required and must be a non-empty array',
      }, { status: 400 });
    }

    const sr = base44.asServiceRole;
    const isDryRun = dry_run !== false;

    // ── Preload all Series for efficiency ─────────────────────────────
    const allSeries = await sr.entities.Series.filter({}).catch(() => []);

    // ── Process each row ──────────────────────────────────────────────
    const rowResults = [];
    let createdRows = 0, resolvedRows = 0, readyRows = 0, reviewRows = 0, blockedRows = 0, errorRows = 0;
    let personIdentitiesCreated = 0, racerProfilesCreated = 0, seasonParticipationsCreated = 0, driversCreated = 0;

    for (let i = 0; i < rows.length; i++) {
      const rawRow = rows[i];
      const rowNumber = i + 1;

      // ── Initialize row result ──────────────────────────────────────
      const result = {
        row_number: rowNumber,
        normalized_input: {},
        resolution_status: 'ready',
        review_required: false,
        cleanup_required: false,
        errors: [],
        warnings: [],
        resolved_ids: {
          person_identity_id: null,
          person_racecore_id: null,
          racer_profile_id: null,
          racer_racecore_id: null,
          season_participation_id: null,
          participation_racecore_id: null,
          legacy_driver_id: null,
          driver_racecore_id: null,
          series_id: null,
          class_id: null,
        },
        created_records: {
          person_identity: false,
          racer_profile: false,
          season_participation: false,
          legacy_driver: false,
        },
        reused_records: {
          person_identity: false,
          racer_profile: false,
          season_participation: false,
          legacy_driver: false,
        },
      };

      // Track records created for cleanup reporting
      const createdForCleanup = [];

      try {
        // ── Step 1: Normalize row ────────────────────────────────────
        const first_name = trimName(rawRow.first_name);
        const last_name = trimName(rawRow.last_name);
        const number = normalizeNumber(rawRow.number);
        const series = trimName(rawRow.series);
        const classValue = trimName(rawRow.class);

        result.normalized_input = { first_name, last_name, number, series, class: classValue };

        // Validate required fields
        if (!first_name) {
          result.resolution_status = 'blocked';
          result.errors.push({ code: 'missing_first_name', message: 'first_name is required' });
        }
        if (!last_name) {
          result.resolution_status = 'blocked';
          result.errors.push({ code: 'missing_last_name', message: 'last_name is required' });
        }
        if (!series) {
          result.resolution_status = 'blocked';
          result.errors.push({ code: 'missing_series', message: 'series is required' });
        }
        if (!classValue) {
          result.resolution_status = 'blocked';
          result.errors.push({ code: 'missing_class', message: 'class is required' });
        }

        if (result.errors.length > 0) {
          blockedRows++;
          rowResults.push(result);
          continue;
        }

        const displayName = first_name + ' ' + last_name;

        // ── Step 2: Resolve Series ───────────────────────────────────
        const seriesResult = await resolveSeries(sr, series);
        if (seriesResult.status === 'blocked') {
          result.resolution_status = 'blocked';
          result.errors.push({ code: 'series_not_found', message: 'Series not found: ' + series });
          blockedRows++;
          rowResults.push(result);
          continue;
        }
        if (seriesResult.status === 'review') {
          result.resolution_status = 'review';
          result.review_required = true;
          result.errors.push({
            code: 'series_ambiguous',
            message: 'Multiple Series matched: ' + seriesResult.matches.map(m => m.name).join(', '),
            matches: seriesResult.matches,
          });
          reviewRows++;
          rowResults.push(result);
          continue;
        }

        const resolvedSeries = seriesResult.series;
        result.resolved_ids.series_id = resolvedSeries.id;

        // Season year warning
        if (resolvedSeries.season_year && resolvedSeries.season_year !== normalizedSeasonYear) {
          result.warnings.push({
            code: 'season_year_mismatch',
            message: 'Import season_year (' + normalizedSeasonYear + ') differs from Series.season_year (' + resolvedSeries.season_year + '). Using import-level value.',
          });
        }

        // ── Step 3: Resolve Class ────────────────────────────────────
        const classResult = await resolveClass(sr, resolvedSeries.id, classValue);
        if (classResult.status === 'blocked') {
          result.resolution_status = 'blocked';
          result.errors.push({ code: 'class_not_found', message: 'Class not found: ' + classValue });
          blockedRows++;
          rowResults.push(result);
          continue;
        }
        if (classResult.status === 'review') {
          result.resolution_status = 'review';
          result.review_required = true;
          result.errors.push({
            code: 'class_ambiguous',
            message: 'Multiple classes matched: ' + classResult.matches.map(m => m.name).join(', '),
            matches: classResult.matches,
          });
          reviewRows++;
          rowResults.push(result);
          continue;
        }

        const resolvedClass = classResult.classRecord;
        result.resolved_ids.class_id = resolvedClass.id;

        // ── Dry-run: project outcomes without writing ─────────────────
        if (isDryRun) {
          // Read-only identity match
          const identityMatch = await readOnlyIdentityMatch(sr, displayName, series);

          let projectedStatus = 'ready';
          let projectedCreated = { person_identity: false, racer_profile: false, season_participation: false, legacy_driver: false };
          let projectedReused = { person_identity: false, racer_profile: false, season_participation: false, legacy_driver: false };

          if (identityMatch.action === 'ATTACHED' && identityMatch.identity_id) {
            // Existing identity — check for RacerProfile
            const existingProfiles = await sr.entities.RacerProfile
              .filter({ person_identity_id: identityMatch.identity_id, is_archived: false }).catch(() => []);

            if (existingProfiles.length === 1) {
              projectedReused.person_identity = true;
              projectedReused.racer_profile = true;

              // Check for existing SeasonParticipation
              const existingPart = await sr.entities.SeasonParticipation
                .filter({
                  racer_profile_id: existingProfiles[0].id,
                  series_id: resolvedSeries.id,
                  season_year: normalizedSeasonYear,
                  racer_type: 'Driver',
                  is_archived: false,
                }).catch(() => []);

              if (existingPart.length >= 1) {
                projectedReused.season_participation = true;
              } else {
                projectedCreated.season_participation = true;
              }

              // Check for legacy Driver
              const identity = await sr.entities.PersonIdentity.get(identityMatch.identity_id).catch(() => null);
              const compatibleDrivers = identity ? await findCompatibleDrivers(sr, existingProfiles[0], identity) : [];
              if (compatibleDrivers.length === 1) {
                projectedReused.legacy_driver = true;
              } else if (compatibleDrivers.length === 0) {
                projectedCreated.legacy_driver = true;
              } else {
                projectedStatus = 'review';
                result.review_required = true;
                result.warnings.push({
                  code: 'driver_ambiguous',
                  message: 'Multiple compatible Drivers found: ' + compatibleDrivers.map(d => d.id).join(', '),
                });
              }
            } else if (existingProfiles.length === 0) {
              projectedReused.person_identity = true;
              projectedCreated.racer_profile = true;
              projectedCreated.season_participation = true;
              projectedCreated.legacy_driver = true;
            } else {
              projectedStatus = 'review';
              result.review_required = true;
              result.warnings.push({
                code: 'racer_profile_ambiguous',
                message: 'Multiple RacerProfiles found for identity',
              });
            }
          } else if (identityMatch.action === 'REVIEW') {
            projectedStatus = 'review';
            result.review_required = true;
            result.warnings.push({
              code: 'identity_review',
              message: 'Identity match requires review (confidence: ' + identityMatch.confidence + ')',
              identity_candidates: [identityMatch.identity_id],
            });
          } else {
            // NEW_IDENTITY
            projectedCreated.person_identity = true;
            projectedCreated.racer_profile = true;
            projectedCreated.season_participation = true;
            projectedCreated.legacy_driver = true;
          }

          result.resolution_status = projectedStatus;
          result.created_records = projectedCreated;
          result.reused_records = projectedReused;
          result.warnings.push({
            code: 'dry_run',
            message: 'Outcome is projected — not committed. Dry-run matching is read-only and may differ from commit results.',
          });

          if (projectedStatus === 'ready' || projectedStatus === 'created') {
            readyRows++;
          } else if (projectedStatus === 'review') {
            reviewRows++;
          }

          rowResults.push(result);
          continue;
        }

        // ── COMMIT MODE ───────────────────────────────────────────────

        // ── Step 4: Resolve or create PersonIdentity ─────────────────
        const identityRes = await base44.functions.invoke('resolvePersonIdentity', {
          raw_driver_name: displayName,
          raw_series_name: series,
          raw_season: normalizedSeasonYear,
          raw_car_number: number || null,
          source_type: 'csv_import',
          source_name: 'import_drivers_bulk',
          import_run_id: 'bulk_driver_' + Date.now(),
        });

        const identityData = identityRes?.data;
        if (!identityData || identityData.error) {
          result.resolution_status = 'error';
          result.errors.push({
            code: 'identity_resolution_failed',
            message: identityData?.error || 'resolvePersonIdentity failed',
          });
          result.cleanup_required = createdForCleanup.length > 0;
          errorRows++;
          rowResults.push(result);
          continue;
        }

        if (identityData.action === 'BLOCKED') {
          result.resolution_status = 'blocked';
          result.review_required = true;
          result.errors.push({
            code: 'identity_blocked',
            message: 'Identity conflict: ' + (identityData.reason || 'blocked'),
            review_queue_id: identityData.review_queue_id,
          });
          blockedRows++;
          rowResults.push(result);
          continue;
        }

        if (identityData.action === 'REVIEW') {
          result.resolution_status = 'review';
          result.review_required = true;
          result.warnings.push({
            code: 'identity_review',
            message: 'Identity match requires review (confidence: ' + identityData.confidence_score + ')',
            review_queue_id: identityData.review_queue_id,
          });
          reviewRows++;
          rowResults.push(result);
          continue;
        }

        // ATTACHED or NEW_IDENTITY — proceed
        const personIdentityId = identityData.identity_id;
        result.resolved_ids.person_identity_id = personIdentityId;

        if (identityData.action === 'NEW_IDENTITY') {
          result.created_records.person_identity = true;
          createdForCleanup.push({ entity: 'PersonIdentity', id: personIdentityId });
          personIdentitiesCreated++;
        } else {
          result.reused_records.person_identity = true;
        }

        // ── Step 5: Ensure PERS RaceCore ID ──────────────────────────
        const persIdResult = await ensureRaceCoreId(base44, 'PersonIdentity', personIdentityId);
        if (!persIdResult.success) {
          result.resolution_status = 'error';
          result.errors.push({
            code: 'pers_id_failed',
            message: persIdResult.error || 'Failed to assign PERS RaceCore ID',
          });
          if (persIdResult.duplicate_detected) {
            result.errors[0].conflicting_entity_ids = persIdResult.conflicting_entity_ids;
          }
          result.cleanup_required = createdForCleanup.length > 0;
          result.resolved_ids.person_racecore_id = persIdResult.racecore_id || null;
          errorRows++;
          rowResults.push(result);
          continue;
        }
        if (persIdResult.duplicate_detected) {
          result.resolution_status = 'error';
          result.errors.push({
            code: 'pers_id_duplicate',
            message: 'Duplicate PERS RaceCore ID detected',
            conflicting_entity_ids: persIdResult.conflicting_entity_ids,
          });
          result.cleanup_required = createdForCleanup.length > 0;
          errorRows++;
          rowResults.push(result);
          continue;
        }
        result.resolved_ids.person_racecore_id = persIdResult.racecore_id;

        // ── Step 6: Resolve or create RacerProfile ───────────────────
        const racerProfileRes = await base44.functions.invoke('resolveRacerProfile', {
          person_identity_id: personIdentityId,
          creation_reason: 'racer_import',
          allow_create: true,
          display_name: displayName,
          legacy_driver_id: null,
        });

        const racerProfileData = racerProfileRes?.data;
        if (!racerProfileData || racerProfileData.resolution_status === 'error') {
          result.resolution_status = 'error';
          result.errors.push({
            code: 'racer_profile_failed',
            message: racerProfileData?.error || 'resolveRacerProfile failed',
          });
          result.cleanup_required = createdForCleanup.length > 0;
          errorRows++;
          rowResults.push(result);
          continue;
        }

        if (racerProfileData.resolution_status === 'review' || racerProfileData.resolution_status === 'blocked') {
          result.resolution_status = racerProfileData.resolution_status;
          result.review_required = racerProfileData.review_required;
          result.warnings.push({
            code: 'racer_profile_' + racerProfileData.resolution_status,
            message: 'RacerProfile resolution: ' + racerProfileData.resolution_status,
            matching_profile_ids: racerProfileData.matching_profile_ids,
          });
          reviewRows++;
          rowResults.push(result);
          continue;
        }

        const racerProfileId = racerProfileData.racer_profile_id;
        result.resolved_ids.racer_profile_id = racerProfileId;

        if (racerProfileData.created) {
          result.created_records.racer_profile = true;
          createdForCleanup.push({ entity: 'RacerProfile', id: racerProfileId });
          racerProfilesCreated++;
        } else {
          result.reused_records.racer_profile = true;
        }

        // ── Step 7: Ensure RACR RaceCore ID ──────────────────────────
        const racrIdResult = await ensureRaceCoreId(base44, 'RacerProfile', racerProfileId);
        if (!racrIdResult.success || racrIdResult.duplicate_detected) {
          result.resolution_status = 'error';
          result.errors.push({
            code: racrIdResult.duplicate_detected ? 'racr_id_duplicate' : 'racr_id_failed',
            message: racrIdResult.error || 'Failed to assign RACR RaceCore ID',
            conflicting_entity_ids: racrIdResult.conflicting_entity_ids || [],
          });
          result.cleanup_required = createdForCleanup.length > 0;
          errorRows++;
          rowResults.push(result);
          continue;
        }
        result.resolved_ids.racer_racecore_id = racrIdResult.racecore_id;

        // ── Step 8: Resolve or create SeasonParticipation ───────────
        const seasonPartRes = await base44.functions.invoke('resolveSeasonParticipation', {
          racer_profile_id: racerProfileId,
          series_id: resolvedSeries.id,
          season_year: normalizedSeasonYear,
          racer_type: 'Driver',
          legacy_driver_id: null,
          allow_create: true,
        });

        const seasonPartData = seasonPartRes?.data;
        if (!seasonPartData || seasonPartData.resolution_status === 'error') {
          result.resolution_status = 'error';
          result.errors.push({
            code: 'season_participation_failed',
            message: seasonPartData?.error || 'resolveSeasonParticipation failed',
          });
          result.cleanup_required = createdForCleanup.length > 0;
          errorRows++;
          rowResults.push(result);
          continue;
        }

        if (seasonPartData.resolution_status === 'review' || seasonPartData.resolution_status === 'blocked') {
          result.resolution_status = seasonPartData.resolution_status;
          result.review_required = seasonPartData.review_required;
          result.warnings.push({
            code: 'season_participation_' + seasonPartData.resolution_status,
            message: 'SeasonParticipation resolution: ' + seasonPartData.resolution_status,
            matching_participation_ids: seasonPartData.matching_participation_ids,
          });
          reviewRows++;
          rowResults.push(result);
          continue;
        }

        const participationId = seasonPartData.participation_id;
        result.resolved_ids.season_participation_id = participationId;

        if (seasonPartData.created) {
          result.created_records.season_participation = true;
          createdForCleanup.push({ entity: 'SeasonParticipation', id: participationId });
          seasonParticipationsCreated++;
        } else {
          result.reused_records.season_participation = true;
        }

        // ── Step 9: Ensure PART RaceCore ID ──────────────────────────
        const partIdResult = await ensureRaceCoreId(base44, 'SeasonParticipation', participationId);
        if (!partIdResult.success || partIdResult.duplicate_detected) {
          result.resolution_status = 'error';
          result.errors.push({
            code: partIdResult.duplicate_detected ? 'part_id_duplicate' : 'part_id_failed',
            message: partIdResult.error || 'Failed to assign PART RaceCore ID',
            conflicting_entity_ids: partIdResult.conflicting_entity_ids || [],
          });
          result.cleanup_required = createdForCleanup.length > 0;
          errorRows++;
          rowResults.push(result);
          continue;
        }
        result.resolved_ids.participation_racecore_id = partIdResult.racecore_id;

        // ── Step 10: Resolve or create legacy Driver ─────────────────
        // Load the identity and racer profile for driver search
        const identity = await sr.entities.PersonIdentity.get(personIdentityId).catch(() => null);
        const racerProfile = await sr.entities.RacerProfile.get(racerProfileId).catch(() => null);

        const compatibleDrivers = identity && racerProfile
          ? await findCompatibleDrivers(sr, racerProfile, identity)
          : [];

        let legacyDriver = null;
        let driverCreated = false;

        if (compatibleDrivers.length === 1) {
          legacyDriver = compatibleDrivers[0];
          result.reused_records.legacy_driver = true;
        } else if (compatibleDrivers.length > 1) {
          result.resolution_status = 'review';
          result.review_required = true;
          result.warnings.push({
            code: 'driver_ambiguous',
            message: 'Multiple compatible Drivers found: ' + compatibleDrivers.map(d => d.id).join(', '),
            driver_ids: compatibleDrivers.map(d => d.id),
          });
          reviewRows++;
          rowResults.push(result);
          continue;
        } else {
          // No compatible Driver — create one
          const newDriverData = {
            first_name: first_name,
            last_name: last_name,
            primary_series_id: resolvedSeries.id,
            primary_class_id: resolvedClass.id,
            visibility_status: 'draft',
            racing_status: 'Active',
          };
          if (number) {
            newDriverData.primary_number = number;
          }

          try {
            legacyDriver = await sr.entities.Driver.create(newDriverData);
            driverCreated = true;
            result.created_records.legacy_driver = true;
            createdForCleanup.push({ entity: 'Driver', id: legacyDriver.id });
            driversCreated++;
          } catch (e) {
            result.resolution_status = 'error';
            result.errors.push({
              code: 'driver_create_failed',
              message: 'Failed to create legacy Driver: ' + e.message,
            });
            result.cleanup_required = createdForCleanup.length > 0;
            errorRows++;
            rowResults.push(result);
            continue;
          }
        }

        const driverId = legacyDriver.id;
        result.resolved_ids.legacy_driver_id = driverId;

        // ── Step 11: Ensure DRVR RaceCore ID ─────────────────────────
        const drvIdResult = await ensureRaceCoreId(base44, 'Driver', driverId);
        if (!drvIdResult.success || drvIdResult.duplicate_detected) {
          result.resolution_status = 'error';
          result.errors.push({
            code: drvIdResult.duplicate_detected ? 'drvr_id_duplicate' : 'drvr_id_failed',
            message: drvIdResult.error || 'Failed to assign DRVR RaceCore ID',
            conflicting_entity_ids: drvIdResult.conflicting_entity_ids || [],
          });
          result.cleanup_required = createdForCleanup.length > 0;
          errorRows++;
          rowResults.push(result);
          continue;
        }
        result.resolved_ids.driver_racecore_id = drvIdResult.racecore_id;

        // ── Step 12: Apply safe compatibility links ───────────────────
        // Only set if empty — never overwrite nonempty

        // RacerProfile.legacy_driver_id
        if (racerProfile && !racerProfile.legacy_driver_id) {
          try {
            await sr.entities.RacerProfile.update(racerProfileId, { legacy_driver_id: driverId });
          } catch (e) { /* non-blocking */ }
        } else if (racerProfile && racerProfile.legacy_driver_id && racerProfile.legacy_driver_id !== driverId) {
          result.warnings.push({
            code: 'racer_profile_driver_link_conflict',
            message: 'RacerProfile.legacy_driver_id already set to a different value: ' + racerProfile.legacy_driver_id,
          });
        }

        // PersonIdentity.canonical_driver_id
        if (identity && !identity.canonical_driver_id) {
          try {
            await sr.entities.PersonIdentity.update(personIdentityId, { canonical_driver_id: driverId });
          } catch (e) { /* non-blocking */ }
        } else if (identity && identity.canonical_driver_id && identity.canonical_driver_id !== driverId) {
          result.warnings.push({
            code: 'identity_driver_link_conflict',
            message: 'PersonIdentity.canonical_driver_id already set to a different value: ' + identity.canonical_driver_id,
          });
        }

        // SeasonParticipation.legacy_driver_id
        const participation = await sr.entities.SeasonParticipation.get(participationId).catch(() => null);
        if (participation && !participation.legacy_driver_id) {
          try {
            await sr.entities.SeasonParticipation.update(participationId, { legacy_driver_id: driverId });
          } catch (e) { /* non-blocking */ }
        } else if (participation && participation.legacy_driver_id && participation.legacy_driver_id !== driverId) {
          result.warnings.push({
            code: 'participation_driver_link_conflict',
            message: 'SeasonParticipation.legacy_driver_id already set to a different value: ' + participation.legacy_driver_id,
          });
        }

        // ── Conflict checks for reused Driver ─────────────────────────
        if (!driverCreated && legacyDriver) {
          // primary_number conflict
          if (number && legacyDriver.primary_number && legacyDriver.primary_number !== number) {
            result.warnings.push({
              code: 'primary_number_conflict',
              message: 'Existing Driver primary_number (' + legacyDriver.primary_number + ') differs from import (' + number + '). Keeping existing.',
            });
          }

          // primary_class_id conflict
          if (legacyDriver.primary_class_id && legacyDriver.primary_class_id !== resolvedClass.id) {
            result.warnings.push({
              code: 'primary_class_conflict',
              message: 'Existing Driver primary_class_id differs from import class. Keeping existing.',
            });
          }
        }

        // ── Set final row status ─────────────────────────────────────
        if (result.created_records.person_identity || result.created_records.racer_profile ||
            result.created_records.season_participation || result.created_records.legacy_driver) {
          result.resolution_status = 'created';
          createdRows++;
        } else {
          result.resolution_status = 'resolved';
          resolvedRows++;
        }

      } catch (err) {
        result.resolution_status = 'error';
        result.errors.push({ code: 'unexpected_error', message: err.message });
        result.cleanup_required = createdForCleanup.length > 0;
        errorRows++;
      }

      rowResults.push(result);
    }

    // ── Build summary ─────────────────────────────────────────────────
    const summary = {
      total_rows: rows.length,
      created_rows: createdRows,
      resolved_rows: resolvedRows,
      ready_rows: readyRows,
      review_rows: reviewRows,
      blocked_rows: blockedRows,
      error_rows: errorRows,
      person_identities_created: personIdentitiesCreated,
      racer_profiles_created: racerProfilesCreated,
      season_participations_created: seasonParticipationsCreated,
      drivers_created: driversCreated,
    };

    return Response.json({
      success: true,
      dry_run: isDryRun,
      season_year: normalizedSeasonYear,
      summary,
      rows: rowResults,
    });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});