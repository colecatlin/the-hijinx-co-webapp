/**
 * importDriversBulk — Phase 3B Identity-First bulk driver import.
 *
 * Phase 3B hardening:
 *   - Source-link idempotency (DriverImportIdentityLink)
 *   - Name-only identity matches return review (not auto-attach)
 *   - class_not_in_series distinct from class_not_found
 *   - Full cleanup details in row response
 *   - Controlled fixture exclusion
 *
 * Chain: PersonIdentity → RacerProfile → SeasonParticipation → Driver (legacy)
 *
 * Admin only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { ensureRaceCoreId } from '../../shared/racecoreId.ts';
import {
  normalizeSeasonYear, trimName, normalizeNumber, normalizeIdentityName,
  computeSourceKey, hasTrustedEvidence, loadFixtureIdentityIds,
  findSourceLinks, createSourceLink, readOnlyIdentityMatch,
  resolveSeries, resolveClass, findCompatibleDrivers, validateSourceLinkRecords,
} from '../../shared/driverImportHelpers.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { season_year, rows, dry_run = true } = body;

    const normalizedSeasonYear = normalizeSeasonYear(season_year);
    if (!normalizedSeasonYear) {
      return Response.json({
        success: false,
        error: 'season_year is required and must normalize to exactly four digits. Received: ' + (season_year || 'null'),
      }, { status: 400 });
    }

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return Response.json({ success: false, error: 'rows is required and must be a non-empty array' }, { status: 400 });
    }

    const sr = base44.asServiceRole;
    const isDryRun = dry_run !== false;
    const importRunId = 'bulk_driver_' + Date.now();
    const fixtureIds = await loadFixtureIdentityIds(sr);

    const rowResults = [];
    let createdRows = 0, resolvedRows = 0, readyRows = 0, reviewRows = 0, blockedRows = 0, errorRows = 0;
    let personIdentitiesCreated = 0, racerProfilesCreated = 0, seasonParticipationsCreated = 0, driversCreated = 0;

    for (let i = 0; i < rows.length; i++) {
      const rawRow = rows[i];
      const rowNumber = i + 1;

      const result = {
        row_number: rowNumber,
        normalized_input: {},
        resolution_status: 'ready',
        review_required: false,
        cleanup_required: false,
        failed_step: null,
        source_key: null,
        source_link_id: null,
        records_created_before_failure: { person_identity_id: null, racer_profile_id: null, season_participation_id: null, legacy_driver_id: null },
        records_modified_before_failure: { person_identity_id: null, racer_profile_id: null, season_participation_id: null, legacy_driver_id: null },
        errors: [],
        warnings: [],
        resolved_ids: { person_identity_id: null, person_racecore_id: null, racer_profile_id: null, racer_racecore_id: null, season_participation_id: null, participation_racecore_id: null, legacy_driver_id: null, driver_racecore_id: null, series_id: null, class_id: null },
        created_records: { person_identity: false, racer_profile: false, season_participation: false, legacy_driver: false },
        reused_records: { person_identity: false, racer_profile: false, season_participation: false, legacy_driver: false },
      };

      const createdForCleanup = [];

      try {
        // ── Step 1: Normalize and validate row ──────────────────────────────
        const first_name = trimName(rawRow.first_name);
        const last_name = trimName(rawRow.last_name);
        const number = normalizeNumber(rawRow.number);
        const series = trimName(rawRow.series);
        const classValue = trimName(rawRow.class);
        result.normalized_input = { first_name, last_name, number, series, class: classValue };

        if (!first_name) { result.resolution_status = 'blocked'; result.errors.push({ code: 'missing_first_name', message: 'first_name is required' }); }
        if (!last_name) { result.resolution_status = 'blocked'; result.errors.push({ code: 'missing_last_name', message: 'last_name is required' }); }
        if (!series) { result.resolution_status = 'blocked'; result.errors.push({ code: 'missing_series', message: 'series is required' }); }
        if (!classValue) { result.resolution_status = 'blocked'; result.errors.push({ code: 'missing_class', message: 'class is required' }); }
        if (result.errors.length > 0) { result.failed_step = 'row_validation'; blockedRows++; rowResults.push(result); continue; }

        const displayName = first_name + ' ' + last_name;
        const firstNameNorm = normalizeIdentityName(first_name) || first_name.toLowerCase().trim();
        const lastNameNorm = normalizeIdentityName(last_name) || last_name.toLowerCase().trim();

        // ── Step 2: Resolve Series ──────────────────────────────────────────
        const seriesResult = await resolveSeries(sr, series);
        if (seriesResult.status === 'blocked') {
          result.resolution_status = 'blocked'; result.failed_step = 'series_resolution';
          result.errors.push({ code: 'series_not_found', message: 'Series not found: ' + series });
          blockedRows++; rowResults.push(result); continue;
        }
        if (seriesResult.status === 'review') {
          result.resolution_status = 'review'; result.review_required = true; result.failed_step = 'series_resolution';
          result.errors.push({ code: 'series_ambiguous', message: 'Multiple Series matched: ' + seriesResult.matches.map(m => m.name).join(', '), matches: seriesResult.matches });
          reviewRows++; rowResults.push(result); continue;
        }
        const resolvedSeries = seriesResult.series;
        result.resolved_ids.series_id = resolvedSeries.id;
        if (resolvedSeries.season_year && resolvedSeries.season_year !== normalizedSeasonYear) {
          result.warnings.push({ code: 'season_year_mismatch', message: 'Import season_year (' + normalizedSeasonYear + ') differs from Series.season_year (' + resolvedSeries.season_year + '). Using import-level value.' });
        }

        // ── Step 3: Resolve Class (Phase 3B: class_not_in_series) ───────────
        const classResult = await resolveClass(sr, resolvedSeries.id, classValue);
        if (classResult.status === 'blocked') {
          result.resolution_status = 'blocked'; result.failed_step = 'class_resolution';
          result.errors.push({ code: classResult.error, message: classResult.error === 'class_not_in_series' ? 'Class "' + classValue + '" exists but does not belong to series "' + resolvedSeries.name + '"' : 'Class not found: ' + classValue, matches: classResult.matches || [] });
          blockedRows++; rowResults.push(result); continue;
        }
        if (classResult.status === 'review') {
          result.resolution_status = 'review'; result.review_required = true; result.failed_step = 'class_resolution';
          result.errors.push({ code: 'class_ambiguous', message: 'Multiple classes matched: ' + classResult.matches.map(m => m.name).join(', '), matches: classResult.matches });
          reviewRows++; rowResults.push(result); continue;
        }
        const resolvedClass = classResult.classRecord;
        result.resolved_ids.class_id = resolvedClass.id;

        // ── Phase 3B: Compute source_key ───────────────────────────────────
        const sourceKey = computeSourceKey('bulk_driver_csv', firstNameNorm, lastNameNorm, resolvedSeries.id, normalizedSeasonYear, resolvedClass.id, number);
        result.source_key = sourceKey;

        // ── Phase 3B: Check for existing source link ────────────────────────
        const existingLinks = await findSourceLinks(sr, sourceKey);

        if (existingLinks.length === 1) {
          const link = existingLinks[0];
          if (link.status === 'resolved') {
            const validationIssues = await validateSourceLinkRecords(sr, link);
            if (validationIssues.length === 0) {
              result.source_link_id = link.id;
              result.reused_records = { person_identity: true, racer_profile: true, season_participation: true, legacy_driver: true };
              result.resolved_ids.person_identity_id = link.person_identity_id;
              result.resolved_ids.racer_profile_id = link.racer_profile_id;
              result.resolved_ids.season_participation_id = link.season_participation_id;
              result.resolved_ids.legacy_driver_id = link.legacy_driver_id;
              const pi = await sr.entities.PersonIdentity.get(link.person_identity_id).catch(() => null);
              const rp = await sr.entities.RacerProfile.get(link.racer_profile_id).catch(() => null);
              const sp = await sr.entities.SeasonParticipation.get(link.season_participation_id).catch(() => null);
              const dr = await sr.entities.Driver.get(link.legacy_driver_id).catch(() => null);
              if (pi) result.resolved_ids.person_racecore_id = pi.racecore_id;
              if (rp) result.resolved_ids.racer_racecore_id = rp.racecore_id;
              if (sp) result.resolved_ids.participation_racecore_id = sp.racecore_id;
              if (dr) result.resolved_ids.driver_racecore_id = dr.racecore_id;
              result.resolution_status = 'resolved';
              if (isDryRun) result.warnings.push({ code: 'dry_run', message: 'Outcome is projected — not committed. Existing source link would be reused.' });
              resolvedRows++; rowResults.push(result); continue;
            } else {
              result.source_link_id = link.id; result.resolution_status = 'error'; result.failed_step = 'source_link_validation';
              result.errors.push({ code: 'source_link_invalid', message: 'Existing source link references missing records: ' + validationIssues.join(', '), link_id: link.id });
              errorRows++; rowResults.push(result); continue;
            }
          } else {
            result.source_link_id = link.id; result.resolution_status = link.status === 'partial' ? 'error' : link.status;
            result.review_required = link.status === 'review'; result.failed_step = 'source_link_existing';
            result.errors.push({ code: 'source_link_' + link.status, message: 'Existing source link has status: ' + link.status, link_id: link.id });
            if (link.status === 'partial') {
              result.cleanup_required = true;
              result.records_created_before_failure = { person_identity_id: link.person_identity_id || null, racer_profile_id: link.racer_profile_id || null, season_participation_id: link.season_participation_id || null, legacy_driver_id: link.legacy_driver_id || null };
            }
            if (link.status === 'review') reviewRows++; else if (link.status === 'blocked') blockedRows++; else errorRows++;
            rowResults.push(result); continue;
          }
        } else if (existingLinks.length > 1) {
          result.resolution_status = 'review'; result.review_required = true; result.failed_step = 'source_link_duplicate';
          result.errors.push({ code: 'duplicate_source_key_links', message: 'Multiple active source links found for the same source_key', link_ids: existingLinks.map(l => l.id) });
          reviewRows++; rowResults.push(result); continue;
        }

        // No existing source link — proceed to identity resolution

        // ── Dry-run: project outcomes without writing ────────────────────────
        if (isDryRun) {
          const identityMatch = await readOnlyIdentityMatch(sr, displayName, series, fixtureIds);
          let projectedStatus = 'ready';
          let projectedCreated = { person_identity: false, racer_profile: false, season_participation: false, legacy_driver: false };
          let projectedReused = { person_identity: false, racer_profile: false, season_participation: false, legacy_driver: false };

          if (identityMatch.action === 'ATTACHED' && identityMatch.identity_id) {
            if (!hasTrustedEvidence(identityMatch.signals)) {
              projectedStatus = 'review'; result.review_required = true;
              result.warnings.push({ code: 'name_only_identity_match', message: 'Identity match is name-only (no trusted evidence). Requires admin review before attaching.', candidate_identity_ids: [identityMatch.identity_id], candidate_canonical_names: [identityMatch.identity?.canonical_name], candidate_confidence: identityMatch.confidence, signals: identityMatch.signals });
            } else {
              const existingProfiles = await sr.entities.RacerProfile.filter({ person_identity_id: identityMatch.identity_id, is_archived: false }).catch(() => []);
              if (existingProfiles.length === 1) {
                projectedReused.person_identity = true; projectedReused.racer_profile = true;
                const existingPart = await sr.entities.SeasonParticipation.filter({ racer_profile_id: existingProfiles[0].id, series_id: resolvedSeries.id, season_year: normalizedSeasonYear, racer_type: 'Driver', is_archived: false }).catch(() => []);
                if (existingPart.length >= 1) projectedReused.season_participation = true; else projectedCreated.season_participation = true;
                const identity = await sr.entities.PersonIdentity.get(identityMatch.identity_id).catch(() => null);
                const compatibleDrivers = identity ? await findCompatibleDrivers(sr, existingProfiles[0], identity) : [];
                if (compatibleDrivers.length === 1) projectedReused.legacy_driver = true;
                else if (compatibleDrivers.length === 0) projectedCreated.legacy_driver = true;
                else { projectedStatus = 'review'; result.review_required = true; result.warnings.push({ code: 'driver_ambiguous', message: 'Multiple compatible Drivers found: ' + compatibleDrivers.map(d => d.id).join(', ') }); }
              } else if (existingProfiles.length === 0) {
                projectedReused.person_identity = true; projectedCreated.racer_profile = true; projectedCreated.season_participation = true; projectedCreated.legacy_driver = true;
              } else {
                projectedStatus = 'review'; result.review_required = true; result.warnings.push({ code: 'racer_profile_ambiguous', message: 'Multiple RacerProfiles found for identity' });
              }
            }
          } else if (identityMatch.action === 'REVIEW') {
            projectedStatus = 'review'; result.review_required = true;
            result.warnings.push({ code: 'identity_review', message: 'Identity match requires review (confidence: ' + identityMatch.confidence + ')', identity_candidates: [identityMatch.identity_id] });
          } else {
            projectedCreated = { person_identity: true, racer_profile: true, season_participation: true, legacy_driver: true };
          }

          result.resolution_status = projectedStatus; result.created_records = projectedCreated; result.reused_records = projectedReused;
          result.warnings.push({ code: 'dry_run', message: 'Outcome is projected — not committed. Dry-run matching is read-only and may differ from commit results.' });
          if (projectedStatus === 'ready' || projectedStatus === 'created') readyRows++; else if (projectedStatus === 'review') reviewRows++;
          rowResults.push(result); continue;
        }

        // ── COMMIT MODE ─────────────────────────────────────────────────────

        // ── Step 4: Resolve or create PersonIdentity ────────────────────────
        const identityRes = await base44.functions.invoke('resolvePersonIdentity', {
          raw_driver_name: displayName, raw_series_name: series, raw_season: normalizedSeasonYear,
          raw_car_number: number || null, source_type: 'csv_import', source_name: 'import_drivers_bulk', import_run_id: importRunId,
        });
        const identityData = identityRes?.data;
        if (!identityData || identityData.error) {
          result.resolution_status = 'error'; result.failed_step = 'person_identity_resolution';
          result.errors.push({ code: 'identity_resolution_failed', message: identityData?.error || 'resolvePersonIdentity failed' });
          errorRows++; rowResults.push(result); continue;
        }
        if (identityData.action === 'BLOCKED') {
          result.resolution_status = 'blocked'; result.review_required = true; result.failed_step = 'person_identity_resolution';
          result.errors.push({ code: 'identity_blocked', message: 'Identity conflict: ' + (identityData.reason || 'blocked'), review_queue_id: identityData.review_queue_id });
          blockedRows++; rowResults.push(result); continue;
        }
        if (identityData.action === 'REVIEW') {
          result.resolution_status = 'review'; result.review_required = true; result.failed_step = 'person_identity_resolution';
          result.warnings.push({ code: 'identity_review', message: 'Identity match requires review (confidence: ' + identityData.confidence_score + ')', review_queue_id: identityData.review_queue_id });
          reviewRows++; rowResults.push(result); continue;
        }

        // Phase 3B: Fixture exclusion
        if (fixtureIds.has(identityData.identity_id)) {
          result.resolution_status = 'review'; result.review_required = true; result.failed_step = 'fixture_exclusion';
          result.warnings.push({ code: 'fixture_identity_match', message: 'Matched identity is a controlled test fixture. Requires admin review before attaching.', candidate_identity_id: identityData.identity_id });
          reviewRows++; rowResults.push(result); continue;
        }

        // Phase 3B: Name-only match check
        if (identityData.action === 'ATTACHED' && !hasTrustedEvidence(identityData.signals)) {
          result.resolution_status = 'review'; result.review_required = true; result.failed_step = 'person_identity_resolution';
          result.warnings.push({ code: 'name_only_identity_match', message: 'Identity match is name-only (no trusted evidence: no external_uid, license, or DOB match). Requires admin review before attaching.', candidate_identity_ids: [identityData.identity_id], candidate_confidence: identityData.confidence_score, signals: identityData.signals });
          result.warnings.push({ code: 'no_downstream_records_created', message: 'No RacerProfile, SeasonParticipation, or Driver record was created for this row.' });
          reviewRows++; rowResults.push(result); continue;
        }

        // ATTACHED (with trusted evidence) or NEW_IDENTITY — proceed
        const personIdentityId = identityData.identity_id;
        result.resolved_ids.person_identity_id = personIdentityId;
        if (identityData.action === 'NEW_IDENTITY') {
          result.created_records.person_identity = true; createdForCleanup.push({ entity: 'PersonIdentity', id: personIdentityId });
          result.records_created_before_failure.person_identity_id = personIdentityId; personIdentitiesCreated++;
        } else { result.reused_records.person_identity = true; }

        // ── Step 5: Ensure PERS RaceCore ID ─────────────────────────────────
        const persIdResult = await ensureRaceCoreId(base44, 'PersonIdentity', personIdentityId);
        if (!persIdResult.success || persIdResult.duplicate_detected) {
          result.resolution_status = 'error'; result.failed_step = 'pers_id_assignment';
          result.errors.push({ code: persIdResult.duplicate_detected ? 'pers_id_duplicate' : 'pers_id_failed', message: persIdResult.error || 'Failed to assign PERS RaceCore ID', conflicting_entity_ids: persIdResult.conflicting_entity_ids || [] });
          result.cleanup_required = createdForCleanup.length > 0; result.resolved_ids.person_racecore_id = persIdResult.racecore_id || null;
          errorRows++; rowResults.push(result); continue;
        }
        result.resolved_ids.person_racecore_id = persIdResult.racecore_id;

        // ── Step 6: Resolve or create RacerProfile ──────────────────────────
        const racerProfileRes = await base44.functions.invoke('resolveRacerProfile', {
          person_identity_id: personIdentityId, creation_reason: 'racer_import', allow_create: true, display_name: displayName, legacy_driver_id: null,
        });
        const racerProfileData = racerProfileRes?.data;
        if (!racerProfileData || racerProfileData.resolution_status === 'error') {
          result.resolution_status = 'error'; result.failed_step = 'racer_profile_resolution';
          result.errors.push({ code: 'racer_profile_failed', message: racerProfileData?.error || 'resolveRacerProfile failed' });
          result.cleanup_required = createdForCleanup.length > 0; errorRows++; rowResults.push(result); continue;
        }
        if (racerProfileData.resolution_status === 'review' || racerProfileData.resolution_status === 'blocked') {
          result.resolution_status = racerProfileData.resolution_status; result.review_required = racerProfileData.review_required; result.failed_step = 'racer_profile_resolution';
          result.warnings.push({ code: 'racer_profile_' + racerProfileData.resolution_status, message: 'RacerProfile resolution: ' + racerProfileData.resolution_status, matching_profile_ids: racerProfileData.matching_profile_ids });
          result.cleanup_required = createdForCleanup.length > 0; reviewRows++; rowResults.push(result); continue;
        }
        const racerProfileId = racerProfileData.racer_profile_id;
        result.resolved_ids.racer_profile_id = racerProfileId;
        if (racerProfileData.created) {
          result.created_records.racer_profile = true; createdForCleanup.push({ entity: 'RacerProfile', id: racerProfileId });
          result.records_created_before_failure.racer_profile_id = racerProfileId; racerProfilesCreated++;
        } else { result.reused_records.racer_profile = true; }

        // ── Step 7: Ensure RACR RaceCore ID ────────────────────────────────
        const racrIdResult = await ensureRaceCoreId(base44, 'RacerProfile', racerProfileId);
        if (!racrIdResult.success || racrIdResult.duplicate_detected) {
          result.resolution_status = 'error'; result.failed_step = 'racr_id_assignment';
          result.errors.push({ code: racrIdResult.duplicate_detected ? 'racr_id_duplicate' : 'racr_id_failed', message: racrIdResult.error || 'Failed to assign RACR RaceCore ID', conflicting_entity_ids: racrIdResult.conflicting_entity_ids || [] });
          result.cleanup_required = createdForCleanup.length > 0; errorRows++; rowResults.push(result); continue;
        }
        result.resolved_ids.racer_racecore_id = racrIdResult.racecore_id;

        // ── Step 8: Resolve or create SeasonParticipation ──────────────────
        const seasonPartRes = await base44.functions.invoke('resolveSeasonParticipation', {
          racer_profile_id: racerProfileId, series_id: resolvedSeries.id, season_year: normalizedSeasonYear, racer_type: 'Driver', legacy_driver_id: null, allow_create: true,
        });
        const seasonPartData = seasonPartRes?.data;
        if (!seasonPartData || seasonPartData.resolution_status === 'error') {
          result.resolution_status = 'error'; result.failed_step = 'season_participation_resolution';
          result.errors.push({ code: 'season_participation_failed', message: seasonPartData?.error || 'resolveSeasonParticipation failed' });
          result.cleanup_required = createdForCleanup.length > 0; errorRows++; rowResults.push(result); continue;
        }
        if (seasonPartData.resolution_status === 'review' || seasonPartData.resolution_status === 'blocked') {
          result.resolution_status = seasonPartData.resolution_status; result.review_required = seasonPartData.review_required; result.failed_step = 'season_participation_resolution';
          result.warnings.push({ code: 'season_participation_' + seasonPartData.resolution_status, message: 'SeasonParticipation resolution: ' + seasonPartData.resolution_status, matching_participation_ids: seasonPartData.matching_participation_ids });
          result.cleanup_required = createdForCleanup.length > 0; reviewRows++; rowResults.push(result); continue;
        }
        const participationId = seasonPartData.participation_id;
        result.resolved_ids.season_participation_id = participationId;
        if (seasonPartData.created) {
          result.created_records.season_participation = true; createdForCleanup.push({ entity: 'SeasonParticipation', id: participationId });
          result.records_created_before_failure.season_participation_id = participationId; seasonParticipationsCreated++;
        } else { result.reused_records.season_participation = true; }

        // ── Step 9: Ensure PART RaceCore ID ────────────────────────────────
        const partIdResult = await ensureRaceCoreId(base44, 'SeasonParticipation', participationId);
        if (!partIdResult.success || partIdResult.duplicate_detected) {
          result.resolution_status = 'error'; result.failed_step = 'part_id_assignment';
          result.errors.push({ code: partIdResult.duplicate_detected ? 'part_id_duplicate' : 'part_id_failed', message: partIdResult.error || 'Failed to assign PART RaceCore ID', conflicting_entity_ids: partIdResult.conflicting_entity_ids || [] });
          result.cleanup_required = createdForCleanup.length > 0; errorRows++; rowResults.push(result); continue;
        }
        result.resolved_ids.participation_racecore_id = partIdResult.racecore_id;

        // ── Step 10: Resolve or create legacy Driver ───────────────────────
        const identity = await sr.entities.PersonIdentity.get(personIdentityId).catch(() => null);
        const racerProfile = await sr.entities.RacerProfile.get(racerProfileId).catch(() => null);
        const compatibleDrivers = identity && racerProfile ? await findCompatibleDrivers(sr, racerProfile, identity) : [];
        let legacyDriver = null; let driverCreated = false;

        if (compatibleDrivers.length === 1) {
          legacyDriver = compatibleDrivers[0]; result.reused_records.legacy_driver = true;
        } else if (compatibleDrivers.length > 1) {
          result.resolution_status = 'review'; result.review_required = true; result.failed_step = 'driver_resolution';
          result.warnings.push({ code: 'driver_ambiguous', message: 'Multiple compatible Drivers found: ' + compatibleDrivers.map(d => d.id).join(', '), driver_ids: compatibleDrivers.map(d => d.id) });
          result.cleanup_required = createdForCleanup.length > 0; reviewRows++; rowResults.push(result); continue;
        } else {
          const newDriverData = { first_name, last_name, primary_series_id: resolvedSeries.id, primary_class_id: resolvedClass.id, visibility_status: 'draft', racing_status: 'Active' };
          if (number) newDriverData.primary_number = number;
          try {
            legacyDriver = await sr.entities.Driver.create(newDriverData);
            driverCreated = true; result.created_records.legacy_driver = true; createdForCleanup.push({ entity: 'Driver', id: legacyDriver.id });
            result.records_created_before_failure.legacy_driver_id = legacyDriver.id; driversCreated++;
          } catch (e) {
            result.resolution_status = 'error'; result.failed_step = 'driver_creation';
            result.errors.push({ code: 'driver_create_failed', message: 'Failed to create legacy Driver: ' + e.message });
            result.cleanup_required = createdForCleanup.length > 0; errorRows++; rowResults.push(result); continue;
          }
        }
        const driverId = legacyDriver.id;
        result.resolved_ids.legacy_driver_id = driverId;

        // ── Step 11: Ensure DRVR RaceCore ID ────────────────────────────────
        const drvIdResult = await ensureRaceCoreId(base44, 'Driver', driverId);
        if (!drvIdResult.success || drvIdResult.duplicate_detected) {
          result.resolution_status = 'error'; result.failed_step = 'drvr_id_assignment';
          result.errors.push({ code: drvIdResult.duplicate_detected ? 'drvr_id_duplicate' : 'drvr_id_failed', message: drvIdResult.error || 'Failed to assign DRVR RaceCore ID', conflicting_entity_ids: drvIdResult.conflicting_entity_ids || [] });
          result.cleanup_required = createdForCleanup.length > 0; errorRows++; rowResults.push(result); continue;
        }
        result.resolved_ids.driver_racecore_id = drvIdResult.racecore_id;

        // ── Step 12: Apply safe compatibility links ──────────────────────────
        if (racerProfile && !racerProfile.legacy_driver_id) {
          try { await sr.entities.RacerProfile.update(racerProfileId, { legacy_driver_id: driverId }); result.records_modified_before_failure.racer_profile_id = racerProfileId; } catch (e) { }
        } else if (racerProfile && racerProfile.legacy_driver_id && racerProfile.legacy_driver_id !== driverId) {
          result.warnings.push({ code: 'racer_profile_driver_link_conflict', message: 'RacerProfile.legacy_driver_id already set to a different value: ' + racerProfile.legacy_driver_id });
        }
        if (identity && !identity.canonical_driver_id) {
          try { await sr.entities.PersonIdentity.update(personIdentityId, { canonical_driver_id: driverId }); result.records_modified_before_failure.person_identity_id = personIdentityId; } catch (e) { }
        } else if (identity && identity.canonical_driver_id && identity.canonical_driver_id !== driverId) {
          result.warnings.push({ code: 'identity_driver_link_conflict', message: 'PersonIdentity.canonical_driver_id already set to a different value: ' + identity.canonical_driver_id });
        }
        const participation = await sr.entities.SeasonParticipation.get(participationId).catch(() => null);
        if (participation && !participation.legacy_driver_id) {
          try { await sr.entities.SeasonParticipation.update(participationId, { legacy_driver_id: driverId }); result.records_modified_before_failure.season_participation_id = participationId; } catch (e) { }
        } else if (participation && participation.legacy_driver_id && participation.legacy_driver_id !== driverId) {
          result.warnings.push({ code: 'participation_driver_link_conflict', message: 'SeasonParticipation.legacy_driver_id already set to a different value: ' + participation.legacy_driver_id });
        }

        // ── Conflict checks for reused Driver ───────────────────────────────
        if (!driverCreated && legacyDriver) {
          if (number && legacyDriver.primary_number && legacyDriver.primary_number !== number) {
            result.warnings.push({ code: 'primary_number_conflict', message: 'Existing Driver primary_number (' + legacyDriver.primary_number + ') differs from import (' + number + '). Keeping existing.' });
          }
          if (legacyDriver.primary_class_id && legacyDriver.primary_class_id !== resolvedClass.id) {
            result.warnings.push({ code: 'primary_class_conflict', message: 'Existing Driver primary_class_id differs from import class. Keeping existing.' });
          }
        }

        // ── Phase 3B: Create source link after success ──────────────────────
        const concurrentLinks = await findSourceLinks(sr, sourceKey);
        if (concurrentLinks.length === 0) {
          const linkResult = await createSourceLink(sr, {
            source_key: sourceKey, source_type: 'bulk_driver_csv', season_year: normalizedSeasonYear,
            first_name_normalized: firstNameNorm, last_name_normalized: lastNameNorm, number_normalized: number,
            series_id: resolvedSeries.id, class_id: resolvedClass.id,
            person_identity_id: personIdentityId, racer_profile_id: racerProfileId,
            season_participation_id: participationId, legacy_driver_id: driverId,
            import_run_id: importRunId, status: 'resolved', is_archived: false,
          });
          if (linkResult.id) result.source_link_id = linkResult.id;
        } else if (concurrentLinks.length === 1) {
          result.source_link_id = concurrentLinks[0].id;
          result.warnings.push({ code: 'concurrent_source_link', message: 'A source link was created by a concurrent call. Reusing existing link.' });
        } else {
          result.warnings.push({ code: 'duplicate_source_key_links', message: 'Multiple source links found after commit. Requires admin review.', link_ids: concurrentLinks.map(l => l.id) });
        }

        // ── Set final row status ────────────────────────────────────────────
        if (result.created_records.person_identity || result.created_records.racer_profile || result.created_records.season_participation || result.created_records.legacy_driver) {
          result.resolution_status = 'created'; createdRows++;
        } else { result.resolution_status = 'resolved'; resolvedRows++; }

      } catch (err) {
        result.resolution_status = 'error'; result.failed_step = result.failed_step || 'unexpected_error';
        result.errors.push({ code: 'unexpected_error', message: err.message });
        result.cleanup_required = createdForCleanup.length > 0;
        for (const c of createdForCleanup) {
          if (c.entity === 'PersonIdentity') result.records_created_before_failure.person_identity_id = c.id;
          if (c.entity === 'RacerProfile') result.records_created_before_failure.racer_profile_id = c.id;
          if (c.entity === 'SeasonParticipation') result.records_created_before_failure.season_participation_id = c.id;
          if (c.entity === 'Driver') result.records_created_before_failure.legacy_driver_id = c.id;
        }
        errorRows++;
      }
      rowResults.push(result);
    }

    const summary = {
      total_rows: rows.length, created_rows: createdRows, resolved_rows: resolvedRows,
      ready_rows: readyRows, review_rows: reviewRows, blocked_rows: blockedRows, error_rows: errorRows,
      person_identities_created: personIdentitiesCreated, racer_profiles_created: racerProfilesCreated,
      season_participations_created: seasonParticipationsCreated, drivers_created: driversCreated,
    };

    return Response.json({ success: true, dry_run: isDryRun, season_year: normalizedSeasonYear, summary, rows: rowResults });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});