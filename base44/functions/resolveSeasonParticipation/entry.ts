/**
 * resolveSeasonParticipation — HTTP handler.
 *
 * Resolves or creates a SeasonParticipation for a RacerProfile in a Series
 * during a specific season year and racer type.
 *
 * Input:
 *   {
 *     racer_profile_id: "required-internal-id",
 *     series_id: "required-internal-id",
 *     season_year: "2026",
 *     racer_type: "Driver",
 *     legacy_driver_id: null,
 *     allow_create: true
 *   }
 *
 * Output:
 *   {
 *     resolution_status: "resolved"|"created"|"not_found"|"review"|"blocked"|"error",
 *     review_required: false,
 *     created: false,
 *     racer_profile_id: "string",
 *     person_identity_id: "string",
 *     participation_id: "string|null",
 *     racecore_id: "PART000000001|null",
 *     series_id: "string",
 *     season_year: "2026",
 *     racer_type: "Driver",
 *     matching_participation_ids: []
 *   }
 *
 * Admin only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { ensureRaceCoreId } from '../../shared/racecoreId.ts';

const VALID_RACER_TYPES = ['Driver', 'Rider', 'Pilot', 'Co-driver', 'Navigator', 'Other'];

function normalizeSeasonYear(raw) {
  if (!raw) return null;
  const str = String(raw).trim();
  if (!str) return null;
  const match = str.match(/\d{4}/);
  if (match) return match[0];
  return null;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const {
      racer_profile_id,
      series_id,
      season_year,
      racer_type,
      legacy_driver_id,
      allow_create = false,
    } = body;

    const sr = base44.asServiceRole;

    // ── Validate racer_profile_id ───────────────────────────────────────
    if (!racer_profile_id) {
      return Response.json({
        resolution_status: 'error',
        review_required: false,
        created: false,
        racer_profile_id: null,
        person_identity_id: null,
        participation_id: null,
        racecore_id: null,
        series_id: series_id || null,
        season_year: season_year || null,
        racer_type: racer_type || null,
        matching_participation_ids: [],
        error: 'racer_profile_id is required',
      }, { status: 400 });
    }

    let racerProfile = null;
    try {
      racerProfile = await sr.entities.RacerProfile.get(racer_profile_id);
    } catch (e) {
      racerProfile = null;
    }

    if (!racerProfile) {
      return Response.json({
        resolution_status: 'error',
        review_required: false,
        created: false,
        racer_profile_id: racer_profile_id,
        person_identity_id: null,
        participation_id: null,
        racecore_id: null,
        series_id: series_id || null,
        season_year: season_year || null,
        racer_type: racer_type || null,
        matching_participation_ids: [],
        error: 'RacerProfile not found: ' + racer_profile_id,
      }, { status: 400 });
    }

    // ── Validate series_id ──────────────────────────────────────────────
    if (!series_id) {
      return Response.json({
        resolution_status: 'error',
        review_required: false,
        created: false,
        racer_profile_id: racer_profile_id,
        person_identity_id: racerProfile.person_identity_id || null,
        participation_id: null,
        racecore_id: null,
        series_id: null,
        season_year: season_year || null,
        racer_type: racer_type || null,
        matching_participation_ids: [],
        error: 'series_id is required',
      }, { status: 400 });
    }

    let series = null;
    try {
      series = await sr.entities.Series.get(series_id);
    } catch (e) {
      series = null;
    }

    if (!series) {
      return Response.json({
        resolution_status: 'error',
        review_required: false,
        created: false,
        racer_profile_id: racer_profile_id,
        person_identity_id: racerProfile.person_identity_id || null,
        participation_id: null,
        racecore_id: null,
        series_id: series_id,
        season_year: season_year || null,
        racer_type: racer_type || null,
        matching_participation_ids: [],
        error: 'Series not found: ' + series_id,
      }, { status: 400 });
    }

    // ── Normalize and validate season_year ──────────────────────────────
    const normalizedSeasonYear = normalizeSeasonYear(season_year);

    if (!normalizedSeasonYear) {
      return Response.json({
        resolution_status: 'error',
        review_required: false,
        created: false,
        racer_profile_id: racer_profile_id,
        person_identity_id: racerProfile.person_identity_id || null,
        participation_id: null,
        racecore_id: null,
        series_id: series_id,
        season_year: season_year || null,
        racer_type: racer_type || null,
        matching_participation_ids: [],
        error: 'season_year must normalize to a four-digit string. Received: ' + season_year,
      }, { status: 400 });
    }

    // ── Validate racer_type ─────────────────────────────────────────────
    const resolvedRacerType = racer_type || 'Driver';

    if (!VALID_RACER_TYPES.includes(resolvedRacerType)) {
      return Response.json({
        resolution_status: 'error',
        review_required: false,
        created: false,
        racer_profile_id: racer_profile_id,
        person_identity_id: racerProfile.person_identity_id || null,
        participation_id: null,
        racecore_id: null,
        series_id: series_id,
        season_year: normalizedSeasonYear,
        racer_type: resolvedRacerType,
        matching_participation_ids: [],
        error: 'Invalid racer_type: ' + resolvedRacerType + '. Valid values: ' + VALID_RACER_TYPES.join(', '),
      }, { status: 400 });
    }

    // ── Derive person_identity_id from RacerProfile ─────────────────────
    const personIdentityId = racerProfile.person_identity_id || null;

    // ── Search for existing matching SeasonParticipation ───────────────
    const matchFilter = {
      racer_profile_id: racer_profile_id,
      series_id: series_id,
      season_year: normalizedSeasonYear,
      racer_type: resolvedRacerType,
      is_archived: false,
    };

    let existingParticipations = [];
    try {
      existingParticipations = await sr.entities.SeasonParticipation.filter(matchFilter);
    } catch (e) {
      existingParticipations = [];
    }

    // ── If exactly one match, reuse it ──────────────────────────────────
    if (existingParticipations.length === 1) {
      const participation = existingParticipations[0];

      // Ensure it has a racecore_id (idempotent)
      const idResult = await ensureRaceCoreId(base44, 'SeasonParticipation', participation.id);
      const racecoreId = idResult.success ? idResult.racecore_id : (participation.racecore_id || null);

      return Response.json({
        resolution_status: 'resolved',
        review_required: false,
        created: false,
        racer_profile_id: racer_profile_id,
        person_identity_id: personIdentityId,
        participation_id: participation.id,
        racecore_id: racecoreId,
        series_id: series_id,
        season_year: normalizedSeasonYear,
        racer_type: resolvedRacerType,
        matching_participation_ids: [],
      });
    }

    // ── If more than one match, return review ───────────────────────────
    if (existingParticipations.length > 1) {
      return Response.json({
        resolution_status: 'review',
        review_required: true,
        created: false,
        racer_profile_id: racer_profile_id,
        person_identity_id: personIdentityId,
        participation_id: null,
        racecore_id: null,
        series_id: series_id,
        season_year: normalizedSeasonYear,
        racer_type: resolvedRacerType,
        matching_participation_ids: existingParticipations.map(function(p) { return p.id; }),
      });
    }

    // ── No match exists ─────────────────────────────────────────────────
    if (!allow_create) {
      return Response.json({
        resolution_status: 'not_found',
        review_required: false,
        created: false,
        racer_profile_id: racer_profile_id,
        person_identity_id: personIdentityId,
        participation_id: null,
        racecore_id: null,
        series_id: series_id,
        season_year: normalizedSeasonYear,
        racer_type: resolvedRacerType,
        matching_participation_ids: [],
      });
    }

    // ── Create SeasonParticipation ─────────────────────────────────────
    const newParticipationData = {
      racer_profile_id: racer_profile_id,
      person_identity_id: personIdentityId,
      series_id: series_id,
      season_year: normalizedSeasonYear,
      racer_type: resolvedRacerType,
      status: 'Active',
      is_primary: false,
      is_archived: false,
    };

    // Set legacy_driver_id only when explicitly provided
    if (legacy_driver_id && typeof legacy_driver_id === 'string') {
      newParticipationData.legacy_driver_id = legacy_driver_id;
    }

    let newParticipation = null;
    try {
      newParticipation = await sr.entities.SeasonParticipation.create(newParticipationData);
    } catch (e) {
      return Response.json({
        resolution_status: 'error',
        review_required: false,
        created: false,
        racer_profile_id: racer_profile_id,
        person_identity_id: personIdentityId,
        participation_id: null,
        racecore_id: null,
        series_id: series_id,
        season_year: normalizedSeasonYear,
        racer_type: resolvedRacerType,
        matching_participation_ids: [],
        error: 'Failed to create SeasonParticipation: ' + e.message,
      }, { status: 500 });
    }

    // ── Assign RaceCore ID via ensureRaceCoreId ─────────────────────────
    const idResult = await ensureRaceCoreId(base44, 'SeasonParticipation', newParticipation.id);
    const racecoreId = idResult.success ? idResult.racecore_id : null;

    // ── Re-query to detect concurrent duplicates ────────────────────────
    let recheckParticipations = [];
    try {
      recheckParticipations = await sr.entities.SeasonParticipation.filter(matchFilter);
    } catch (e) {
      recheckParticipations = [];
    }

    // If more than one match now exists, a concurrent call also created one
    if (recheckParticipations.length > 1) {
      return Response.json({
        resolution_status: 'review',
        review_required: true,
        created: true,
        racer_profile_id: racer_profile_id,
        person_identity_id: personIdentityId,
        participation_id: newParticipation.id,
        racecore_id: racecoreId,
        series_id: series_id,
        season_year: normalizedSeasonYear,
        racer_type: resolvedRacerType,
        matching_participation_ids: recheckParticipations.map(function(p) { return p.id; }),
      });
    }

    return Response.json({
      resolution_status: 'created',
      review_required: false,
      created: true,
      racer_profile_id: racer_profile_id,
      person_identity_id: personIdentityId,
      participation_id: newParticipation.id,
      racecore_id: racecoreId,
      series_id: series_id,
      season_year: normalizedSeasonYear,
      racer_type: resolvedRacerType,
      matching_participation_ids: [],
    });

  } catch (error) {
    return Response.json({
      resolution_status: 'error',
      review_required: false,
      created: false,
      racer_profile_id: null,
      person_identity_id: null,
      participation_id: null,
      racecore_id: null,
      series_id: null,
      season_year: null,
      racer_type: null,
      matching_participation_ids: [],
      error: error.message,
    }, { status: 500 });
  }
}