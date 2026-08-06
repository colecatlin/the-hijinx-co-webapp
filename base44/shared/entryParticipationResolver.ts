/**
 * entryParticipationResolver.ts — Shared SeasonParticipation resolution for Entry creation.
 *
 * Used by:
 *   - base44/functions/upsertOperationalEntry/entry.ts (authoritative Entry orchestration)
 *   - base44/functions/commitResolvedImport/entry.ts (import commit path)
 *   - base44/functions/smartCSVImport/entry.ts (CSV import path)
 *
 * Resolves a SeasonParticipation for a given Driver + Event context, creating
 * one if needed and allowed. Returns the participation_id and legacy_driver_id.
 *
 * This is the SINGLE source of truth for participation resolution logic —
 * frontend code must never duplicate this; it must call upsertOperationalEntry.
 */
import { ensureRaceCoreId } from './racecoreId.ts';

const VALID_RACER_TYPES = ['Driver', 'Rider', 'Pilot', 'Co-driver', 'Navigator', 'Other'];

export function normalizeSeasonYear(raw) {
  if (!raw) return null;
  const str = String(raw).trim();
  if (!str) return null;
  const match = str.match(/\d{4}/);
  return match ? match[0] : null;
}

/**
 * Resolve a SeasonParticipation for a Driver in an Event's Series + season.
 *
 * Returns:
 *   { status: 'resolved'|'created'|'review'|'not_found'|'error',
 *     participation_id, legacy_driver_id, racer_profile_id, person_identity_id,
 *     participation_created, error }
 */
export async function resolveParticipationForEntry(
  sr,
  base44,
  driverId,
  eventSeriesId,
  eventSeasonYear,
  racerType = 'Driver',
  allowCreate = true,
  dryRun = false
) {
  if (!driverId) {
    return { status: 'error', error: 'driver_id is required for participation resolution' };
  }
  if (!eventSeriesId) {
    return { status: 'error', error: 'eventSeriesId is required for participation resolution' };
  }
  if (!eventSeasonYear) {
    return { status: 'error', error: 'eventSeasonYear is required for participation resolution' };
  }

  const resolvedRacerType = VALID_RACER_TYPES.includes(racerType) ? racerType : 'Driver';
  const seasonYear = String(eventSeasonYear);

  // ── Load Driver ───────────────────────────────────────────────────────
  let driver = null;
  try {
    driver = await sr.entities.Driver.get(driverId);
  } catch (e) {
    return { status: 'error', error: 'Driver not found: ' + driverId };
  }

  if (!driver) {
    return { status: 'error', error: 'Driver not found: ' + driverId };
  }

  // ── Resolve PersonIdentity ────────────────────────────────────────────
  let personIdentity = null;

  try {
    const byCanonical = await sr.entities.PersonIdentity.filter({ canonical_driver_id: driverId });
    if (byCanonical && byCanonical.length === 1) {
      personIdentity = byCanonical[0];
    } else if (byCanonical && byCanonical.length > 1) {
      return {
        status: 'review',
        error: 'Driver maps to multiple PersonIdentity records via canonical_driver_id',
        detail: byCanonical.map(p => p.id),
      };
    }
  } catch (e) {}

  if (!personIdentity) {
    // Search by merged_driver_ids
    try {
      const allIdentities = await sr.entities.PersonIdentity.list('-created_date', 500);
      for (const pi of allIdentities) {
        if (Array.isArray(pi.merged_driver_ids) && pi.merged_driver_ids.includes(driverId)) {
          if (personIdentity) {
            return {
              status: 'review',
              error: 'Driver maps to multiple PersonIdentity records via merged_driver_ids',
            };
          }
          personIdentity = pi;
        }
      }
    } catch (e) {}
  }

  if (!personIdentity) {
    return {
      status: 'review',
      error: 'No PersonIdentity found for Driver ' + driverId + '. Identity backfill required.',
    };
  }

  // ── Resolve RacerProfile ──────────────────────────────────────────────
  let racerProfiles = [];
  try {
    racerProfiles = await sr.entities.RacerProfile.filter({ person_identity_id: personIdentity.id });
  } catch (e) {
    racerProfiles = [];
  }

  if (racerProfiles.length === 0) {
    return {
      status: 'review',
      error: 'No RacerProfile found for PersonIdentity ' + personIdentity.id,
    };
  }

  if (racerProfiles.length > 1) {
    return {
      status: 'review',
      error: 'Multiple RacerProfiles found for PersonIdentity ' + personIdentity.id,
      detail: racerProfiles.map(rp => rp.id),
    };
  }

  const racerProfile = racerProfiles[0];

  // ── Resolve or create SeasonParticipation ────────────────────────────
  const matchFilter = {
    racer_profile_id: racerProfile.id,
    series_id: eventSeriesId,
    season_year: seasonYear,
    racer_type: resolvedRacerType,
    is_archived: false,
  };

  let existingParticipations = [];
  try {
    existingParticipations = await sr.entities.SeasonParticipation.filter(matchFilter);
  } catch (e) {
    existingParticipations = [];
  }

  if (existingParticipations.length === 1) {
    return {
      status: 'resolved',
      participation_id: existingParticipations[0].id,
      legacy_driver_id: driverId,
      racer_profile_id: racerProfile.id,
      person_identity_id: personIdentity.id,
      participation_created: false,
    };
  }

  if (existingParticipations.length > 1) {
    return {
      status: 'review',
      error: 'Multiple SeasonParticipation records found',
      detail: existingParticipations.map(p => p.id),
    };
  }

  // No match — create if allowed
  if (!allowCreate || dryRun) {
    return {
      status: 'not_found',
      error: 'No SeasonParticipation found and allow_create is false',
    };
  }

  const newPartData = {
    racer_profile_id: racerProfile.id,
    person_identity_id: personIdentity.id,
    series_id: eventSeriesId,
    season_year: seasonYear,
    racer_type: resolvedRacerType,
    status: 'Active',
    is_primary: false,
    is_archived: false,
    legacy_driver_id: driverId,
  };

  let newParticipation = null;
  try {
    newParticipation = await sr.entities.SeasonParticipation.create(newPartData);
  } catch (e) {
    return { status: 'error', error: 'Failed to create SeasonParticipation: ' + e.message };
  }

  // Assign RaceCore ID
  await ensureRaceCoreId(base44, 'SeasonParticipation', newParticipation.id).catch(() => {});

  return {
    status: 'created',
    participation_id: newParticipation.id,
    legacy_driver_id: driverId,
    racer_profile_id: racerProfile.id,
    person_identity_id: personIdentity.id,
    participation_created: true,
  };
}