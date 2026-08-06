/**
 * upsertOperationalEntry — Phase 4 Authoritative Entry Orchestration
 *
 * Connects event-specific Entry creation to the approved identity architecture:
 *
 *   PersonIdentity → RacerProfile → SeasonParticipation → Entry
 *
 * Every new Entry receives:
 *   - participation_id  (permanent competitor-context relationship)
 *   - driver_id         (temporary legacy compatibility)
 *   - racecore_id       (ENTR prefix, assigned via ensureRaceCoreId)
 *
 * Participation resolution priority:
 *   Path A — participation_id supplied directly
 *   Path B — driver_id supplied, resolve PersonIdentity → RacerProfile → SeasonParticipation
 *
 * The modern logical duplicate key is:
 *   event_id + participation_id + event_class_id
 *
 * Returns the Phase 4 partial-failure contract with resolved_ids, created/reused/updated
 * records, cleanup_required, review_required, and resolution_status.
 *
 * Authorization preserved: admin, or event/series/track collaborator.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { ensureRaceCoreId } from '../../shared/racecoreId.ts';

const VALID_RACER_TYPES = ['Driver', 'Rider', 'Pilot', 'Co-driver', 'Navigator', 'Other'];

// ── Helpers ──────────────────────────────────────────────────────────────────

function normalizeName(name) {
  if (!name) return '';
  return String(name).toLowerCase().replace(/[^\w\s]/g, '').trim();
}

function normalizeSeasonYear(raw) {
  if (!raw) return null;
  const str = String(raw).trim();
  if (!str) return null;
  const match = str.match(/\d{4}/);
  return match ? match[0] : null;
}

function buildLogicalKey(eventId, participationId, eventClassId) {
  if (!eventId || !participationId) return null;
  return `entry:${eventId}:${participationId}:${eventClassId || 'none'}`;
}

function buildLegacyNormalizedKey(eventId, driverId, driverName, classId) {
  if (!eventId) return null;
  const classPart = classId || 'none';
  if (driverId) return `entry:${eventId}:${driverId}:${classPart}`;
  if (driverName) return `entry:${eventId}:${normalizeName(driverName)}:${classPart}`;
  return null;
}

async function isEventCollaborator(base44, userId, eventId, seriesId, trackId) {
  const collabs = await base44.asServiceRole.entities.EntityCollaborator.filter({ user_id: userId }).catch(() => []);
  const allowed = new Set(['owner', 'editor']);
  return collabs.some(c =>
    allowed.has(c.role) && (
      (c.entity_type === 'Event'  && c.entity_id === eventId) ||
      (c.entity_type === 'Series' && seriesId && c.entity_id === seriesId) ||
      (c.entity_type === 'Track'  && trackId  && c.entity_id === trackId)
    )
  );
}

function emptyResult() {
  return {
    resolution_status: 'error',
    review_required: false,
    cleanup_required: false,
    failed_step: null,
    errors: [],
    warnings: [],
    records_created_before_failure: {
      person_identity_id: null,
      racer_profile_id: null,
      season_participation_id: null,
      legacy_driver_id: null,
      entry_id: null,
    },
    records_modified_before_failure: {
      person_identity_id: null,
      racer_profile_id: null,
      season_participation_id: null,
      legacy_driver_id: null,
      entry_id: null,
    },
    resolved_ids: {
      person_identity_id: null,
      person_racecore_id: null,
      racer_profile_id: null,
      racer_racecore_id: null,
      season_participation_id: null,
      participation_racecore_id: null,
      legacy_driver_id: null,
      driver_racecore_id: null,
      entry_id: null,
      entry_racecore_id: null,
      event_id: null,
      series_id: null,
      event_class_id: null,
    },
    created_records: {
      person_identity: false,
      racer_profile: false,
      season_participation: false,
      legacy_driver: false,
      entry: false,
    },
    reused_records: {
      person_identity: false,
      racer_profile: false,
      season_participation: false,
      legacy_driver: false,
      entry: false,
    },
    updated_records: {
      entry: false,
    },
  };
}

// ── Participation Resolution ─────────────────────────────────────────────────

/**
 * Path A: participation_id supplied. Load, validate, derive legacy driver.
 */
async function resolveByParticipationId(sr, participationId, eventSeriesId, eventSeasonYear) {
  let participation = null;
  try {
    participation = await sr.entities.SeasonParticipation.get(participationId);
  } catch (e) {
    return { status: 'error', error: 'SeasonParticipation not found: ' + participationId };
  }

  if (!participation) {
    return { status: 'error', error: 'SeasonParticipation not found: ' + participationId };
  }

  if (participation.is_archived) {
    return { status: 'blocked', error: 'SeasonParticipation is archived: ' + participationId };
  }

  // Validate series and season against Event
  if (participation.series_id !== eventSeriesId) {
    return {
      status: 'blocked',
      error: 'participation_series_event_mismatch',
      detail: 'Participation series ' + participation.series_id + ' does not match Event series ' + eventSeriesId,
    };
  }

  if (String(participation.season_year) !== String(eventSeasonYear)) {
    return {
      status: 'blocked',
      error: 'participation_season_event_mismatch',
      detail: 'Participation season ' + participation.season_year + ' does not match Event season ' + eventSeasonYear,
    };
  }

  // Load RacerProfile
  let racerProfile = null;
  if (participation.racer_profile_id) {
    try {
      racerProfile = await sr.entities.RacerProfile.get(participation.racer_profile_id);
    } catch (e) {
      racerProfile = null;
    }
  }

  // Load PersonIdentity
  let personIdentity = null;
  const personIdentityId = participation.person_identity_id || racerProfile?.person_identity_id || null;
  if (personIdentityId) {
    try {
      personIdentity = await sr.entities.PersonIdentity.get(personIdentityId);
    } catch (e) {
      personIdentity = null;
    }
  }

  // Resolve legacy driver_id from participation → racerProfile → personIdentity
  const legacyDriverCandidates = [
    participation.legacy_driver_id,
    racerProfile?.legacy_driver_id,
    personIdentity?.canonical_driver_id,
  ].filter(Boolean);

  const legacyDriverId = legacyDriverCandidates.length > 0 ? legacyDriverCandidates[0] : null;

  if (legacyDriverCandidates.length > 1 && !legacyDriverCandidates.every(v => v === legacyDriverCandidates[0])) {
    return {
      status: 'review',
      error: 'Multiple conflicting legacy Driver IDs found for this Participation',
      detail: legacyDriverCandidates,
    };
  }

  return {
    status: 'resolved',
    participation,
    racerProfile,
    personIdentity,
    legacyDriverId,
    racerProfileId: participation.racer_profile_id,
    personIdentityId: personIdentityId,
  };
}

/**
 * Path B: driver_id supplied without participation_id.
 * Resolve PersonIdentity → RacerProfile → SeasonParticipation (create if needed).
 */
async function resolveByDriverId(sr, base44, driverId, eventSeriesId, eventSeasonYear, racerType, allowCreate, dryRun) {
  // Load Driver
  let driver = null;
  try {
    driver = await sr.entities.Driver.get(driverId);
  } catch (e) {
    return { status: 'error', error: 'Driver not found: ' + driverId };
  }

  if (!driver) {
    return { status: 'error', error: 'Driver not found: ' + driverId };
  }

  // Resolve PersonIdentity through confirmed relationships
  let personIdentity = null;

  // Search by canonical_driver_id
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

  // Search by merged_driver_ids
  if (!personIdentity) {
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
      error: 'No PersonIdentity found for Driver ' + driverId + '. Identity backfill required before Entry creation.',
    };
  }

  // Resolve exactly one RacerProfile
  let racerProfiles = [];
  try {
    racerProfiles = await sr.entities.RacerProfile.filter({ person_identity_id: personIdentity.id });
  } catch (e) {
    racerProfiles = [];
  }

  if (racerProfiles.length === 0) {
    return {
      status: 'review',
      error: 'No RacerProfile found for PersonIdentity ' + personIdentity.id + '. Profile backfill required.',
    };
  }

  if (racerProfiles.length > 1) {
    return {
      status: 'review',
      error: 'Multiple RacerProfiles found for PersonIdentity ' + personIdentity.id + '. Admin must select one.',
      detail: racerProfiles.map(rp => rp.id),
    };
  }

  const racerProfile = racerProfiles[0];

  // Resolve or create SeasonParticipation
  const matchFilter = {
    racer_profile_id: racerProfile.id,
    series_id: eventSeriesId,
    season_year: String(eventSeasonYear),
    racer_type: racerType,
    is_archived: false,
  };

  let existingParticipations = [];
  try {
    existingParticipations = await sr.entities.SeasonParticipation.filter(matchFilter);
  } catch (e) {
    existingParticipations = [];
  }

  let participation = null;
  let participationCreated = false;

  if (existingParticipations.length === 1) {
    participation = existingParticipations[0];
  } else if (existingParticipations.length > 1) {
    return {
      status: 'review',
      error: 'Multiple SeasonParticipation records found for RacerProfile + Series + season',
      detail: existingParticipations.map(p => p.id),
    };
  } else if (allowCreate && !dryRun) {
    // Create SeasonParticipation
    const newPartData = {
      racer_profile_id: racerProfile.id,
      person_identity_id: personIdentity.id,
      series_id: eventSeriesId,
      season_year: String(eventSeasonYear),
      racer_type: racerType,
      status: 'Active',
      is_primary: false,
      is_archived: false,
      legacy_driver_id: driverId,
    };

    try {
      participation = await sr.entities.SeasonParticipation.create(newPartData);
      participationCreated = true;
    } catch (e) {
      return { status: 'error', error: 'Failed to create SeasonParticipation: ' + e.message };
    }
  } else if (dryRun) {
    // Project creation without writing
    return {
      status: 'resolved',
      participation: null,
      participation_projected: true,
      participationCreated: false,
      racerProfile,
      personIdentity,
      legacyDriverId: driverId,
      racerProfileId: racerProfile.id,
      personIdentityId: personIdentity.id,
    };
  } else {
    return {
      status: 'not_found',
      error: 'No SeasonParticipation found and allow_create is false',
    };
  }

  return {
    status: 'resolved',
    participation,
    participationCreated,
    racerProfile,
    personIdentity,
    legacyDriverId: driverId,
    racerProfileId: racerProfile.id,
    personIdentityId: personIdentity.id,
  };
}

// ── Main Handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const result = emptyResult();

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ ...result, errors: ['Unauthorized'] }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { payload = {}, source_path = 'unknown', dry_run = false } = body;

    if (!payload.event_id) {
      return Response.json({ ...result, errors: ['payload.event_id is required'] }, { status: 400 });
    }

    const sr = base44.asServiceRole;

    // ── Authorization (preserved from existing) ───────────────────────────
    if (user.role !== 'admin') {
      const event = await sr.entities.Event.filter({ id: payload.event_id }).then(r => r?.[0]).catch(() => null);
      const allowed = await isEventCollaborator(base44, user.id, payload.event_id, event?.series_id || null, event?.track_id || null);
      if (!allowed) {
        return Response.json({ ...result, errors: ['Forbidden: must be admin or event/series/track collaborator'] }, { status: 403 });
      }
    }

    // ── Step 1: Load Event ───────────────────────────────────────────────
    let event = null;
    try {
      event = await sr.entities.Event.get(payload.event_id);
    } catch (e) {
      event = null;
    }

    if (!event) {
      result.failed_step = 'load_event';
      result.errors.push('Event not found: ' + payload.event_id);
      return Response.json(result, { status: 400 });
    }

    result.resolved_ids.event_id = event.id;

    // ── Step 2: Resolve Event Series and season ─────────────────────────
    const eventSeriesId = event.series_id || null;
    const eventSeasonYear = normalizeSeasonYear(event.season);

    if (!eventSeriesId) {
      result.failed_step = 'event_series_resolution';
      result.errors.push({ code: 'event_series_missing', message: 'Event has no series_id. Cannot create Entry.' });
      return Response.json(result, { status: 400 });
    }

    if (!eventSeasonYear) {
      result.failed_step = 'event_season_resolution';
      result.errors.push({ code: 'event_season_missing', message: 'Event has no usable season year. Received: ' + event.season });
      return Response.json(result, { status: 400 });
    }

    // Validate supplied series_id against Event series_id
    if (payload.series_id && payload.series_id !== eventSeriesId) {
      result.failed_step = 'series_validation';
      result.errors.push({ code: 'entry_series_event_mismatch', message: 'Supplied series_id ' + payload.series_id + ' does not match Event series_id ' + eventSeriesId });
      return Response.json(result, { status: 400 });
    }

    result.resolved_ids.series_id = eventSeriesId;

    // ── Step 3: Validate EventClass if supplied ──────────────────────────
    const eventClassId = payload.event_class_id || null;
    const seriesClassId = payload.series_class_id || null;

    if (eventClassId) {
      let eventClass = null;
      try {
        eventClass = await sr.entities.EventClass.get(eventClassId);
      } catch (e) {
        eventClass = null;
      }

      if (!eventClass) {
        result.failed_step = 'event_class_validation';
        result.errors.push({ code: 'event_class_not_found', message: 'EventClass not found: ' + eventClassId });
        return Response.json(result, { status: 400 });
      }

      if (eventClass.event_id !== event.id) {
        result.failed_step = 'event_class_validation';
        result.errors.push({ code: 'event_class_event_mismatch', message: 'EventClass ' + eventClassId + ' belongs to Event ' + eventClass.event_id + ', not ' + event.id });
        return Response.json(result, { status: 400 });
      }

      result.resolved_ids.event_class_id = eventClassId;
    } else if (seriesClassId && !eventClassId) {
      // Resolve EventClass for this Event + SeriesClass
      let matchingEventClasses = [];
      try {
        matchingEventClasses = await sr.entities.EventClass.filter({
          event_id: event.id,
          series_class_id: seriesClassId,
        });
      } catch (e) {
        matchingEventClasses = [];
      }

      if (matchingEventClasses.length === 1) {
        result.resolved_ids.event_class_id = matchingEventClasses[0].id;
      } else if (matchingEventClasses.length === 0) {
        result.failed_step = 'event_class_resolution';
        result.errors.push({ code: 'event_class_not_found', message: 'No EventClass found for Event ' + event.id + ' and SeriesClass ' + seriesClassId });
        return Response.json(result, { status: 400 });
      } else {
        result.failed_step = 'event_class_resolution';
        result.errors.push({ code: 'event_class_ambiguous', message: 'Multiple EventClasses found for Event ' + event.id + ' and SeriesClass ' + seriesClassId, detail: matchingEventClasses.map(ec => ec.id) });
        return Response.json(result, { status: 400 });
      }
    }

    const resolvedEventClassId = result.resolved_ids.event_class_id || eventClassId || null;

    // ── Step 4: Resolve SeasonParticipation ─────────────────────────────
    const racerType = payload.racer_type || 'Driver';

    if (!VALID_RACER_TYPES.includes(racerType)) {
      result.failed_step = 'racer_type_validation';
      result.errors.push('Invalid racer_type: ' + racerType + '. Valid: ' + VALID_RACER_TYPES.join(', '));
      return Response.json(result, { status: 400 });
    }

    let participationResolution = null;

    if (payload.participation_id) {
      // Path A: participation_id supplied
      participationResolution = await resolveByParticipationId(sr, payload.participation_id, eventSeriesId, eventSeasonYear);
    } else if (payload.driver_id) {
      // Path B: driver_id supplied, resolve participation
      participationResolution = await resolveByDriverId(sr, base44, payload.driver_id, eventSeriesId, eventSeasonYear, racerType, true, dry_run);
    } else {
      result.failed_step = 'participation_resolution';
      result.errors.push('Either participation_id or driver_id is required');
      return Response.json(result, { status: 400 });
    }

    if (participationResolution.status === 'error' || participationResolution.status === 'blocked' || participationResolution.status === 'review') {
      result.failed_step = 'participation_resolution';
      result.resolution_status = participationResolution.status === 'blocked' ? 'blocked' : participationResolution.status === 'review' ? 'review' : 'error';
      result.review_required = participationResolution.status === 'review';
      result.errors.push(participationResolution.error || JSON.stringify(participationResolution));
      return Response.json(result, { status: participationResolution.status === 'blocked' ? 400 : 500 });
    }

    const participation = participationResolution.participation;
    const participationId = participation?.id || null;
    const legacyDriverId = participationResolution.legacyDriverId || payload.driver_id || null;
    const racerProfileId = participationResolution.racerProfileId || null;
    const personIdentityId = participationResolution.personIdentityId || null;

    if (!participationId && !dry_run) {
      result.failed_step = 'participation_resolution';
      result.errors.push('Failed to resolve a valid SeasonParticipation');
      return Response.json(result, { status: 400 });
    }

    // Track resolved IDs
    result.resolved_ids.season_participation_id = participationId;
    result.resolved_ids.racer_profile_id = racerProfileId;
    result.resolved_ids.person_identity_id = personIdentityId;
    result.resolved_ids.legacy_driver_id = legacyDriverId;

    if (participationResolution.participationCreated) {
      result.created_records.season_participation = true;
      result.records_created_before_failure.season_participation_id = participationId;
    } else if (participationId) {
      result.reused_records.season_participation = true;
    }

    // ── Step 5: Validate legacy Driver exists ────────────────────────────
    if (legacyDriverId) {
      let legacyDriver = null;
      try {
        legacyDriver = await sr.entities.Driver.get(legacyDriverId);
      } catch (e) {
        legacyDriver = null;
      }

      if (!legacyDriver) {
        if (participationResolution.participationCreated && !dry_run) {
          result.cleanup_required = true;
        }
        result.failed_step = 'legacy_driver_validation';
        result.errors.push('Legacy Driver not found: ' + legacyDriverId);
        return Response.json(result, { status: 400 });
      }

      result.reused_records.legacy_driver = true;
      result.resolved_ids.driver_racecore_id = legacyDriver.racecore_id || null;
    }

    // ── Dry run: return projected result ─────────────────────────────────
    if (dry_run) {
      result.resolution_status = 'projected';
      result.review_required = false;
      result.warnings.push('Dry run: no records created or modified.');
      return Response.json(result);
    }

    // ── Step 6: Validate optional Team ───────────────────────────────────
    if (payload.team_id) {
      let team = null;
      try {
        team = await sr.entities.Team.get(payload.team_id);
      } catch (e) {
        team = null;
      }
      if (!team) {
        if (participationResolution.participationCreated) {
          result.cleanup_required = true;
          result.records_created_before_failure.season_participation_id = participationId;
        }
        result.failed_step = 'team_validation';
        result.errors.push('Team not found: ' + payload.team_id);
        return Response.json(result, { status: 400 });
      }
    }

    // ── Step 7: Validate optional Vehicle ───────────────────────────────
    if (payload.vehicle_id) {
      let vehicle = null;
      try {
        vehicle = await sr.entities.Vehicle.get(payload.vehicle_id);
      } catch (e) {
        vehicle = null;
      }
      if (!vehicle) {
        if (participationResolution.participationCreated) {
          result.cleanup_required = true;
          result.records_created_before_failure.season_participation_id = participationId;
        }
        result.failed_step = 'vehicle_validation';
        result.errors.push('Vehicle not found: ' + payload.vehicle_id);
        return Response.json(result, { status: 400 });
      }
    }

    // ── Step 8: Resolve car_number ──────────────────────────────────────
    let carNumber = payload.car_number || null;
    if (!carNumber && legacyDriverId) {
      // Default from Driver.primary_number only if no supplied number
      try {
        const driver = await sr.entities.Driver.get(legacyDriverId);
        if (driver?.primary_number) carNumber = String(driver.primary_number);
      } catch (e) {}
    }

    // ── Step 9: Build Entry data ────────────────────────────────────────
    const classIdForKey = resolvedEventClassId || seriesClassId || null;
    const logicalKey = buildLogicalKey(event.id, participationId, resolvedEventClassId);
    const legacyNormalizedKey = buildLegacyNormalizedKey(event.id, legacyDriverId, payload.driver_name, classIdForKey);

    const entryData = {
      event_id: event.id,
      driver_id: legacyDriverId,
      participation_id: participationId,
      series_id: eventSeriesId,
      car_number: carNumber || '',
    };

    // Preserve event-specific fields from payload
    if (resolvedEventClassId) entryData.event_class_id = resolvedEventClassId;
    if (seriesClassId) entryData.series_class_id = seriesClassId;
    if (payload.team_id) entryData.team_id = payload.team_id;
    if (payload.vehicle_id) entryData.vehicle_id = payload.vehicle_id;
    if (payload.transponder_id) entryData.transponder_id = payload.transponder_id;
    if (payload.entry_status) entryData.entry_status = payload.entry_status;
    if (payload.payment_status) entryData.payment_status = payload.payment_status;
    if (payload.tech_status) entryData.tech_status = payload.tech_status;
    if (payload.waiver_status) entryData.waiver_status = payload.waiver_status;
    if (payload.license_status) entryData.license_status = payload.license_status;
    if (payload.notes) entryData.notes = payload.notes;
    if (payload.flags) entryData.flags = payload.flags;
    if (payload.created_by_user_id) entryData.created_by_user_id = payload.created_by_user_id;
    if (payload.updated_by_user_id) entryData.updated_by_user_id = payload.updated_by_user_id;

    if (logicalKey) entryData.normalized_entry_key = logicalKey;

    // ── Step 10: Find existing Entry (logical key first) ─────────────────
    let existing = null;
    let matchMethod = 'none';

    // Primary: logical key (event_id + participation_id + event_class_id)
    if (logicalKey) {
      const byLogicalKey = await sr.entities.Entry.filter({ normalized_entry_key: logicalKey }).catch(() => []);
      if (byLogicalKey?.length === 1) {
        existing = byLogicalKey[0];
        matchMethod = 'logical_key';
      } else if (byLogicalKey?.length > 1) {
        // Multiple matches — review required
        result.resolution_status = 'review';
        result.review_required = true;
        result.failed_step = 'duplicate_detection';
        result.errors.push({ code: 'multiple_logical_matches', message: 'Multiple Entries match the logical key', entry_ids: byLogicalKey.map(e => e.id) });
        if (participationResolution.participationCreated) {
          result.cleanup_required = true;
          result.records_created_before_failure.season_participation_id = participationId;
        }
        return Response.json(result, { status: 409 });
      }
    }

    // Fallback 1: event_id + driver_id + class (legacy composite)
    if (!existing && legacyDriverId) {
      const filters = { event_id: event.id, driver_id: legacyDriverId };
      if (resolvedEventClassId) filters.event_class_id = resolvedEventClassId;
      else if (seriesClassId) filters.series_class_id = seriesClassId;

      const byComposite = await sr.entities.Entry.filter(filters).catch(() => []);
      if (byComposite?.length === 1) {
        existing = byComposite[0];
        matchMethod = 'event_driver_class';
      } else if (byComposite?.length > 1) {
        // Log duplicate, pick best
        await sr.entities.OperationLog.create({
          operation_type: 'operational_duplicate_detected',
          entity_name: 'Entry',
          status: 'success',
          metadata: { entity_type: 'entry', source_path, event_id: event.id, driver_id: legacyDriverId, count: byComposite.length },
        }).catch(() => {});
        existing = byComposite.sort((a, b) => {
          const score = r => (r.normalized_entry_key ? 4 : 0) + (r.entry_status === 'Checked In' || r.entry_status === 'Teched' ? 2 : 0) + (r.transponder_id ? 1 : 0);
          return score(b) - score(a);
        })[0];
        matchMethod = 'event_driver_class_ambiguous';
      }
    }

    // ── Step 11: Create or update Entry ─────────────────────────────────
    let record;
    let action;

    if (existing) {
      // Update existing Entry — add participation_id if missing, preserve racecore_id
      const updatePayload = { ...entryData };
      // Don't overwrite participation_id if already set and matches
      if (existing.participation_id && existing.participation_id !== participationId) {
        result.resolution_status = 'review';
        result.review_required = true;
        result.failed_step = 'participation_conflict';
        result.errors.push({
          code: 'participation_conflict',
          message: 'Existing Entry has a different participation_id',
          existing_participation_id: existing.participation_id,
          new_participation_id: participationId,
        });
        return Response.json(result, { status: 409 });
      }

      // Preserve existing racecore_id
      if (existing.racecore_id) {
        delete updatePayload.racecore_id;
      }

      record = await sr.entities.Entry.update(existing.id, updatePayload);
      action = 'updated';
      result.updated_records.entry = true;
      result.records_modified_before_failure.entry_id = existing.id;
    } else {
      record = await sr.entities.Entry.create(entryData);
      action = 'created';
      result.created_records.entry = true;
      result.records_created_before_failure.entry_id = record.id;
    }

    result.resolved_ids.entry_id = record.id;

    // ── Step 12: Assign ENTR RaceCore ID ────────────────────────────────
    if (!record.racecore_id) {
      const idResult = await ensureRaceCoreId(base44, 'Entry', record.id);
      if (idResult.success) {
        // Re-read to get the assigned racecore_id
        try {
          const updated = await sr.entities.Entry.get(record.id);
          record = updated;
        } catch (e) {}
      } else if (idResult.duplicate_detected) {
        // Hard error on duplicate
        result.resolution_status = 'error';
        result.cleanup_required = true;
        result.failed_step = 'racecore_id_assignment';
        result.errors.push({
          code: 'duplicate_racecore_id',
          message: idResult.error,
          conflicting_entity_ids: idResult.conflicting_entity_ids,
        });
        result.records_created_before_failure.entry_id = record.id;
        return Response.json(result, { status: 500 });
      } else {
        result.warnings.push('Failed to assign ENTR RaceCore ID: ' + (idResult.error || 'unknown'));
      }
    }

    result.resolved_ids.entry_racecore_id = record.racecore_id || null;

    // ── Step 13: Set final status ───────────────────────────────────────
    result.resolution_status = action === 'created' ? 'created' : 'updated';
    result.review_required = false;
    result.cleanup_required = false;

    // ── Operation log (preserved) ───────────────────────────────────────
    await sr.entities.OperationLog.create({
      operation_type: action === 'created' ? 'operational_entry_created' : 'operational_entry_updated',
      entity_name: 'Entry',
      entity_id: record.id,
      event_id: record.event_id,
      status: 'success',
      metadata: {
        entity_type: 'entry',
        source_path,
        normalized_entry_key: logicalKey,
        matched_by: matchMethod,
        participation_id: participationId,
        legacy_driver_id: legacyDriverId,
      },
    }).catch(() => {});

    // Add backward-compatible fields for existing callers
    result.action = action;
    result.record = record;
    result.normalized_key = logicalKey;
    result.match_method = matchMethod;

    return Response.json(result);

  } catch (error) {
    result.resolution_status = 'error';
    result.failed_step = result.failed_step || 'unexpected_error';
    result.errors.push(error.message);
    if (error.stack) result.warnings.push(error.stack);
    return Response.json(result, { status: 500 });
  }
});